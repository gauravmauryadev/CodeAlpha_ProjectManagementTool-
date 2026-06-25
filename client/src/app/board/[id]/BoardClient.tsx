"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Trash2,
  MessageSquare,
  X,
  Send,
  Users,
  Clock,
  GripVertical,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";
import { commentApi, projectApi } from "@/lib/api";
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils";
import type { Task, Comment, Project } from "@/types";
import Tooltip from "@/components/ui/Tooltip";

const columns = [
  { id: "todo", label: "To Do", color: "border-slate-200", bg: "bg-slate-100/60", icon: "📋" },
  { id: "inprogress", label: "In Progress", color: "border-amber-200", bg: "bg-amber-50/60", icon: "⚡" },
  { id: "done", label: "Done", color: "border-emerald-200", bg: "bg-emerald-50/60", icon: "✅" },
];

export default function BoardClient() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuthStore();
  const { tasks, fetchTasks, createTask, updateTask, deleteTask } = useProjectStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [showMembers, setShowMembers] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const res = await projectApi.getOne(projectId);
      setProject(res.data.project || res.data);
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    fetchTasks(projectId);
  }, [projectId, fetchTasks, loadProject]);

  const handleAddTask = async (status: string) => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle, status, priority: newPriority, project: projectId });
    setNewTitle("");
    setShowAddTask(null);
    fetchTasks(projectId);
  };

  const handleDrop = async (status: string) => {
    if (!draggedTask) return;
    await updateTask(draggedTask, { status });
    setDraggedTask(null);
    fetchTasks(projectId);
  };

  const loadComments = async (taskId: string) => {
    try {
      const res = await commentApi.getByTask(taskId);
      setComments(res.data.comments || res.data || []);
    } catch { setComments([]); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    await commentApi.create(newComment, selectedTask._id);
    setNewComment("");
    loadComments(selectedTask._id);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    fetchTasks(projectId);
    setSelectedTask(null);
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    try {
      await projectApi.addMember(projectId, addMemberEmail);
      setAddMemberEmail("");
      loadProject();
    } catch { /* ignore */ }
  };

  const priorityStyles = {
    low: "bg-blue-50 text-blue-600 border-blue-100",
    medium: "bg-amber-50 text-amber-600 border-amber-100",
    high: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <AppShell>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 border-b border-black/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Tooltip content="Back to dashboard" position="right">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-9 h-9 rounded-xl bg-white/45 border border-white/60 hover:bg-white/70 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-800" />
              </button>
            </Tooltip>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{project?.name || "Loading..."}</h1>
              <p className="text-xs text-slate-500">{project?.description || "Kanban Board"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Members avatars */}
            <div className="flex -space-x-2 mr-2">
              {project?.members?.slice(0, 5).map((m) => (
                <div key={typeof m === "object" ? m._id : m} className={cn("w-8 h-8 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white", getAvatarColor(typeof m === "object" ? m.name : "U"))}>
                  {getInitials(typeof m === "object" ? m.name : "U")}
                </div>
              ))}
            </div>
            <Tooltip content="Manage members" position="left">
              <button
                onClick={() => setShowMembers(true)}
                className="px-4 py-2 rounded-xl bg-white/45 border border-white/60 hover:bg-white/70 hover:-translate-y-0.5 active:scale-97 text-sm font-medium text-slate-800 flex items-center gap-2 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <Users className="w-4 h-4" /> Members
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-5 h-full min-w-max">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="w-[340px] flex flex-col"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.id)}
                >
                  {/* Column Header */}
                  <div className={cn("flex items-center justify-between px-4 py-3 rounded-xl mb-3 border", col.color, col.bg)}>
                    <div className="flex items-center gap-2">
                      <span>{col.icon}</span>
                      <span className="font-semibold text-sm text-slate-800">{col.label}</span>
                      <span className="ml-1.5 text-xs text-slate-500 bg-white/50 px-1.5 py-0.5 rounded-md border border-black/5">{colTasks.length}</span>
                    </div>
                    <Tooltip content={`Add task to ${col.label}`} position="bottom">
                      <button
                        onClick={() => setShowAddTask(col.id)}
                        className="w-6 h-6 rounded-md hover:bg-white/40 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-650" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                    {colTasks.map((task) => (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={() => setDraggedTask(task._id)}
                        onClick={() => { setSelectedTask(task); loadComments(task._id); }}
                        className="group p-4 rounded-xl border border-white/60 bg-white/45 hover:bg-white/70 hover:border-indigo-500/30 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />
                          <h4 className="text-sm font-medium text-slate-800 flex-1">{task.title}</h4>
                          <Tooltip content="Delete task" position="top">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 active:scale-90 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md border", priorityStyles[task.priority])}>{task.priority}</span>
                          {task.dueDate && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Task Form */}
                    {showAddTask === col.id && (
                      <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-50/30">
                        <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title..." autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddTask(col.id)} className="w-full px-3 py-2 rounded-lg bg-white/40 border border-black/10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-2" />
                        <div className="flex items-center gap-2">
                          <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")} className="px-2 py-1 rounded-lg bg-white border border-black/10 text-xs text-slate-700 focus:outline-none">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <div className="flex-1" />
                          <button onClick={() => setShowAddTask(null)} className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 active:scale-95 transition-all cursor-pointer">Cancel</button>
                          <button onClick={() => handleAddTask(col.id)} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-xs font-semibold text-white cursor-pointer">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />
          <div className="w-[420px] bg-white/95 backdrop-blur-xl border-l border-white/80 flex flex-col h-full shadow-2xl text-slate-800 animate-in slide-in-from-right duration-250">
            <div className="p-5 border-b border-black/5 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">{selectedTask.title}</h3>
              <Tooltip content="Close details" position="left">
                <button onClick={() => setSelectedTask(null)} className="w-8 h-8 rounded-lg hover:bg-black/5 active:scale-90 flex items-center justify-center transition-all cursor-pointer"><X className="w-4 h-4" /></button>
              </Tooltip>
            </div>
            <div className="p-5 space-y-4 border-b border-black/5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16">Status</span>
                <select value={selectedTask.status} onChange={(e) => { updateTask(selectedTask._id, { status: e.target.value }); setSelectedTask({ ...selectedTask, status: e.target.value as Task["status"] }); fetchTasks(projectId); }} className="px-3 py-1.5 rounded-lg bg-white border border-black/10 text-xs text-slate-700 focus:outline-none">
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16">Priority</span>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border", priorityStyles[selectedTask.priority])}>{selectedTask.priority}</span>
              </div>
            </div>
            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">Comments</span>
                <span className="text-xs text-slate-500">({comments.length})</span>
              </div>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0", getAvatarColor(c.user?.name || "U"))}>
                      {getInitials(c.user?.name || "U")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{c.user?.name}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Add Comment */}
            <div className="p-4 border-t border-black/5">
              <div className="flex gap-2">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} placeholder="Add a comment..." className="flex-1 px-3 py-2 rounded-lg bg-white/40 border border-black/10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
                <Tooltip content="Send comment" position="top">
                  <button onClick={handleAddComment} className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 hover:-translate-y-0.5 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"><Send className="w-4 h-4" /></button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">Team Members</h3>
              <Tooltip content="Close panel" position="left">
                <button onClick={() => setShowMembers(false)} className="w-8 h-8 rounded-lg hover:bg-black/5 active:scale-90 flex items-center justify-center transition-all cursor-pointer"><X className="w-4 h-4" /></button>
              </Tooltip>
            </div>
            <div className="flex gap-2 mb-5">
              <input type="email" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} placeholder="Invite by email..." className="flex-1 px-3 py-2 rounded-lg bg-white/40 border border-black/10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
              <Tooltip content="Send invitation" position="top">
                <button onClick={handleAddMember} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 hover:-translate-y-0.5 active:scale-95 text-sm font-semibold text-white transition-all cursor-pointer">Invite</button>
              </Tooltip>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {project?.members?.map((m) => {
                const name = typeof m === "object" ? m.name : "User";
                const email = typeof m === "object" ? m.email : "";
                return (
                  <div key={typeof m === "object" ? m._id : m} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white", getAvatarColor(name))}>{getInitials(name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-800">{name}</p>
                      <p className="text-xs text-slate-500 truncate">{email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
