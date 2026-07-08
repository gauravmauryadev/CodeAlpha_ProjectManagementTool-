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
  Search,
  Filter,
  Users,
  Clock,
  GripVertical,
  Pencil,
  Check,
  Settings,
  Link as LinkIcon,
  Unlink,
  Loader2,
  ExternalLink,
  FileText,
  File,
  LayoutDashboard,
  FolderKanban,
  List,
  Calendar,
  GanttChart,
  Sparkles
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";
import { commentApi, projectApi, authApi, githubApi, discordApi, taskApi } from "@/lib/api";
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils";
import type { Task, Comment, Project, User } from "@/types";
import Tooltip from "@/components/ui/Tooltip";
import { connectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import WikiTab from "@/components/project/WikiTab";
import BoardChatSidebar from "@/components/discord/BoardChatSidebar";
import { DndContext, closestCorners, TouchSensor, MouseSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { DroppableColumn, DraggableTask } from "@/components/board/DndWrappers";

const columns = [
  { id: "todo", label: "To Do", color: "border-slate-200 dark:border-white/5", bg: "bg-white dark:bg-white/5", icon: "📋" },
  { id: "inprogress", label: "In Progress", color: "border-amber-500/20 dark:border-amber-500/10", bg: "bg-amber-50 dark:bg-amber-500/5", icon: "⚡" },
  { id: "done", label: "Done", color: "border-emerald-500/20 dark:border-emerald-500/10", bg: "bg-emerald-50 dark:bg-emerald-500/5", icon: "✅" },
];

// Custom GitHub icon (lucide-react doesn't include brand icons)
const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const DiscordIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
  </svg>
);

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuthStore();
  const { tasks, fetchTasks, createTask, updateTask, deleteTask } = useProjectStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newLabel, setNewLabel] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskData, setEditTaskData] = useState<Partial<Task>>({});

  const [searchTask, setSearchTask] = useState("");
  const [filterDue, setFilterDue] = useState("all");

  // GitHub Integration state
  const [githubActivity, setGithubActivity] = useState<any[]>([]);
  const [githubPulls, setGithubPulls] = useState<any[]>([]);
  const [githubRepo, setGithubRepo] = useState<string | null>(null);
  
  // Settings & GitHub Modal
  const [showSettings, setShowSettings] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  // Discord State
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [discordServerId, setDiscordServerId] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [isSavingDiscord, setIsSavingDiscord] = useState(false);

  // Collaboration state
  const [activeTab, setActiveTab] = useState<"summary" | "list" | "board" | "calendar" | "timeline" | "docs" | "wiki" | "activity">("board");
  const [showChat, setShowChat] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const isOwner = (user?.id || user?._id) === (typeof project?.owner === 'object' ? (project?.owner as any)?._id : project?.owner);

  const getCanEditTask = (task: Task | null) => {
    return !!task; // Any project member can edit/delete any task in the board
  };

  const loadProject = useCallback(async () => {
    try {
      const res = await projectApi.getOne(projectId);
      setProject(res.data.project || res.data);
      
      const p = res.data.project || res.data;
      if (p) {
        setDiscordWebhookUrl(p.discordWebhookUrl || "");
        setDiscordServerId(p.discordServerId || "");
        setDiscordChannelId(p.discordChannelId || "");
      }
      
      // Fetch GitHub data if repo is linked
      if (res.data.project?.githubRepo || res.data.githubRepo) {
        try {
          const pullsRes = await githubApi.getPulls(projectId);
          setGithubPulls(pullsRes.data.pulls);
          setGithubRepo(pullsRes.data.repo);

          const activityRes = await githubApi.getActivity(projectId);
          setGithubActivity(activityRes.data.activity);
        } catch (e) {
          console.error("Failed to load GitHub data", e);
        }
      }
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    fetchTasks(projectId);
  }, [projectId, fetchTasks, loadProject]);

  // Setup Dnd Sensors (Mouse + Touch for mobile)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as "todo" | "inprogress" | "done";
    const task = active.data.current;

    if (task && task.status !== newStatus) {
      // Optimistic update
      updateTask(taskId, { status: newStatus });
    }
  };

  // Connect socket and listen to real-time events
  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    setSocket(s);

    s.emit("authenticate", { userId: user.id || user._id, userName: user.name });
    s.emit("joinProject", { projectId });

    s.on("taskCreated", (newTask) => {
      useProjectStore.setState((state) => {
        if (state.tasks.some((t) => t._id === newTask._id)) return state;
        return { tasks: [...state.tasks, newTask] };
      });
    });

    s.on("taskUpdated", (updatedTask) => {
      useProjectStore.setState((state) => ({
        tasks: state.tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t)),
      }));
    });

    s.on("taskDeleted", ({ taskId }) => {
      useProjectStore.setState((state) => ({
        tasks: state.tasks.filter((t) => t._id !== taskId),
      }));
    });

    s.on("projectUpdated", (updatedProject) => {
      useProjectStore.getState().updateProjectInStore(updatedProject);
    });

    return () => {
      s.off("taskCreated");
      s.off("taskUpdated");
      s.off("taskDeleted");
      s.off("projectUpdated");
    };
  }, [projectId, user]);

  const loadGithubSettings = async () => {
    setIsGithubLoading(true);
    try {
      const statusRes = await githubApi.getStatus();
      setIsGithubConnected(statusRes.data.connected);
      if (statusRes.data.connected) {
        const reposRes = await githubApi.getRepos();
        setGithubRepos(reposRes.data.repos);
      }
    } catch {
      /* ignore */
    } finally {
      setIsGithubLoading(false);
    }
  };

  const handleLinkRepo = async (repoFullName: string) => {
    setIsLinking(true);
    try {
      await githubApi.linkRepo(projectId, repoFullName);
      setGithubRepo(repoFullName);
      loadProject(); // Reload to fetch PRs/Activity
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to link repo");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkRepo = async () => {
    setIsLinking(true);
    try {
      await githubApi.unlinkRepo(projectId);
      setGithubRepo(null);
      setGithubPulls([]);
      setGithubActivity([]);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to unlink repo");
    } finally {
      setIsLinking(false);
    }
  };

  const handleSaveDiscordSettings = async () => {
    // Basic Discord Snowflake ID validation (usually 17-20 digits)
    const snowflakeRegex = /^\d{17,20}$/;
    
    if (discordServerId && !snowflakeRegex.test(discordServerId)) {
      return alert("Invalid Discord Server ID. It should be an 17-20 digit number.");
    }
    if (discordChannelId && !snowflakeRegex.test(discordChannelId)) {
      return alert("Invalid Discord Channel ID. It should be an 17-20 digit number.");
    }

    setIsSavingDiscord(true);
    try {
      await discordApi.updateSettings(projectId, {
        discordWebhookUrl,
        discordServerId,
        discordChannelId
      });
      alert("Discord settings saved successfully! ✅");
      loadProject();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save Discord settings");
    } finally {
      setIsSavingDiscord(false);
    }
  };

  const handleCreateGitHubIssue = async (taskId: string) => {
    setIsCreatingIssue(true);
    try {
      const res = await githubApi.createIssue(taskId);
      alert(`GitHub Issue #${res.data.issue.number} created successfully! ✅`);
      fetchTasks(projectId); // Refresh tasks to show the new issue link
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(res.data.task);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create GitHub Issue");
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleAIBreakdown = async (taskId: string) => {
    if (!taskId) return;
    setIsBreakingDown(true);
    try {
      await taskApi.aiBreakdown(taskId);
      await fetchTasks(projectId);
      alert("AI generated 5 sub-tasks successfully!");
    } catch (err: any) {
      console.error(err);
      alert("AI is currently busy, please try again!");
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleAddTask = async (status: string) => {
    if (!newTitle.trim()) return;
    
    const taskPayload: any = { 
        title: newTitle, 
        status, 
        priority: newPriority, 
        project: projectId 
    };

    if (newAssignee) taskPayload.assignee = newAssignee;
    if (newDueDate) taskPayload.dueDate = newDueDate;
    if (newLabel) taskPayload.labels = [newLabel];

    // Close immediately for better UX
    setShowAddTask(null);
    setNewTitle("");
    setNewPriority("medium");
    setNewAssignee("");
    setNewDueDate("");
    setNewLabel("");

    try {
      await createTask(taskPayload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = async (status: string) => {
    if (!draggedTask) return;
    const task = tasks.find(t => t._id === draggedTask);
    if (task && !getCanEditTask(task)) {
      alert("You don't have permission to move this task. Only the project owner or task assignee can make changes.");
      setDraggedTask(null);
      return;
    }
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
      setSearchResults([]);
      loadProject();
      alert("Invite sent successfully!");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to send invite");
    }
  };

  const handleEditClick = () => {
    if (!selectedTask) return;
    setIsEditingTask(true);
    setEditTaskData({
      title: selectedTask.title,
      description: selectedTask.description || "",
      priority: selectedTask.priority,
      assignee: typeof selectedTask.assignee === 'object' ? (selectedTask.assignee as any)?._id : selectedTask.assignee,
      dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : "",
      labels: selectedTask.labels || [],
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedTask || !editTaskData.title?.trim()) return;
    await updateTask(selectedTask._id, editTaskData);
    setSelectedTask({ ...selectedTask, ...editTaskData } as Task);
    setIsEditingTask(false);
  };

  useEffect(() => {
    if (addMemberEmail.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await authApi.searchUsers(addMemberEmail);
        setSearchResults(res.data.users || []);
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [addMemberEmail]);

  const priorityStyles = {
    low: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    medium: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    high: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
  };

  return (
    <AppShell>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 bg-white/40 dark:bg-[#0E0A22]/40 backdrop-blur-xl">
          <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0">
            <Tooltip content="Back to dashboard" position="right">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-9 h-9 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-200" />
              </button>
            </Tooltip>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 bg-clip-text text-transparent animate-text-gradient tracking-tight">
                {project?.name || "Loading..."}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{project?.description || "Kanban Board"}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 md:gap-5 flex-wrap md:flex-nowrap ml-auto w-full md:w-auto">
            {/* Members avatars */}
            <div className="flex items-center gap-3 mr-2">
              <div className="flex -space-x-2">
                {project?.members?.slice(0, 4).map((m) => (
                  <div key={typeof m === "object" ? m._id : m} className={cn("w-8 h-8 rounded-full ring-2 ring-white dark:ring-[#0E0A22] flex items-center justify-center text-[10px] font-bold text-white z-10 hover:z-20 transition-transform hover:scale-110 cursor-pointer", getAvatarColor(typeof m === "object" ? m.name : "U"))}>
                    {getInitials(typeof m === "object" ? m.name : "U")}
                  </div>
                ))}
                {(project?.members?.length || 0) > 4 && (
                  <div className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-[#0E0A22] bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 z-10">
                    +{(project?.members?.length || 0) - 4}
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 hidden md:block mx-1"></div>
            
            <Tooltip content="Manage members" position="bottom">
              <button
                onClick={() => setShowMembers(true)}
                className="px-3 md:px-4 py-2 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:-translate-y-0.5 active:scale-97 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-200 flex items-center gap-1 md:gap-2 transition-all duration-200 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
              >
                <Users className="w-4 h-4" /> <span className="hidden sm:inline">Members</span>
              </button>
            </Tooltip>

            <Tooltip content="Project settings" position="bottom">
              <button
                onClick={() => {
                  setShowSettings(true);
                  loadGithubSettings();
                }}
                className="w-10 h-10 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:rotate-45 active:scale-95 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
              >
                <Settings className="w-4.5 h-4.5 text-slate-500 dark:text-slate-200" />
              </button>
            </Tooltip>

            <Tooltip content="Built-in Team Chat & Calls (Slack Alternative)" position="bottom">
              <button
                onClick={() => setShowChat(!showChat)}
                className={cn(
                  "px-4 md:px-5 py-2 rounded-md border text-xs md:text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-sm cursor-pointer group",
                  showChat 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-transparent text-white hover:shadow-sm hover:shadow-indigo-500/30 hover:-translate-y-0.5" 
                    : "bg-white dark:bg-[#14112c]/80 border-indigo-500/30 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:-translate-y-0.5 active:scale-97"
                )}
              >
                <div className="relative">
                  <MessageSquare className="w-4.5 h-4.5" />
                  {!showChat && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-slate-900 animate-ping" />}
                  {!showChat && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-slate-900" />}
                </div>
                <span className="hidden sm:inline">Team Chat</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* View Selectors & Workspace Content Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main workspace */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Workspace Tab Selectors */}
            <div className="px-4 md:px-8 pt-4 border-b border-slate-200 dark:border-white/5 bg-[#FAFBFC] dark:bg-[#14112c] flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                {[
                  { id: "board", label: "Kanban Board", icon: FolderKanban },
                  { id: "wiki", label: "Documentation", icon: FileText },
                  { id: "activity", label: "GitHub Activity", icon: GithubIcon },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap",
                      activeTab === tab.id
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>


              {activeTab === "board" && (
                <div className="flex items-center gap-2 ml-auto w-full md:w-auto mt-2 md:mt-0">
                  <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search tasks..." 
                      value={searchTask}
                      onChange={(e) => setSearchTask(e.target.value)}
                      className="w-full md:w-[180px] pl-9 pr-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={filterDue}
                      onChange={(e) => setFilterDue(e.target.value)}
                      className="pl-9 pr-8 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-sm appearance-none cursor-pointer font-medium"
                    >
                      <option value="all">All Tasks</option>
                      <option value="this_week">Due This Week</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Active Tab Panel */}
            {activeTab === "board" ? (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="flex-1 overflow-x-auto p-4 md:p-6 snap-x snap-mandatory">
                  <div className="flex gap-4 md:gap-5 h-full w-max">
                    {columns.map((col) => {
                      let colTasks = tasks.filter((t) => t.status === col.id);
                      if (searchTask) colTasks = colTasks.filter(t => t.title.toLowerCase().includes(searchTask.toLowerCase()));
                      if (filterDue === "this_week") {
                         const nextWeek = new Date();
                         nextWeek.setDate(nextWeek.getDate() + 7);
                         colTasks = colTasks.filter(t => t.dueDate && new Date(t.dueDate) <= nextWeek);
                      } else if (filterDue === "overdue") {
                         colTasks = colTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
                      }
                      
                      return (
                        <DroppableColumn
                          key={col.id}
                          id={col.id}
                          className="w-[85vw] max-w-[320px] md:w-[340px] md:max-w-none flex flex-col snap-center shrink-0"
                        >
                        {/* Column Header */}
                        <div className={cn("flex items-center justify-between px-4 py-3 rounded-md mb-3 border shadow-sm", col.color, col.bg)}>
                          <div className="flex items-center gap-2">
                            <span>{col.icon}</span>
                            <span className="font-semibold text-sm text-slate-700 dark:text-slate-250">{col.label}</span>
                            <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md border border-black/5 dark:border-white/5">{colTasks.length}</span>
                          </div>
                          <Tooltip content={`Add task to ${col.label}`} position="bottom">
                            <button
                              onClick={() => setShowAddTask(col.id)}
                              className="w-6 h-6 rounded-md hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                            </button>
                          </Tooltip>
                        </div>

                        {/* Tasks */}
                        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">

                          {colTasks.map((task) => (
                            <DraggableTask
                              key={task._id}
                              id={task._id}
                              task={task}
                              disabled={!getCanEditTask(task)}
                              className="group p-4 rounded-md border-2 border-transparent bg-white dark:bg-[#14112c]/45 hover:bg-slate-50 dark:hover:bg-[#1a163a]/60 hover:border-indigo-500/40 cursor-pointer transition-all shadow-sm"
                            >
                              <div onClick={(e) => { e.stopPropagation(); setSelectedTask(task); loadComments(task._id); }}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0 flex items-start gap-1">
                                    {getCanEditTask(task) && <GripVertical className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />}
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white leading-tight">{task.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {task.assignee && (
                                      <Tooltip content={`Assigned to ${typeof task.assignee === 'object' ? task.assignee.name : 'Unknown'}`} position="top">
                                        <div className={cn("w-5 h-5 rounded-full ring-1 ring-[#14112c] flex items-center justify-center text-[8px] font-bold text-white shadow-sm", getAvatarColor(typeof task.assignee === 'object' ? task.assignee.name : "U"))}>
                                          {getInitials(typeof task.assignee === 'object' ? task.assignee.name : "U")}
                                        </div>
                                      </Tooltip>
                                    )}
                                    {getCanEditTask(task) && (
                                      <Tooltip content="Delete task" position="top">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 active:scale-90 transition-all cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md border", priorityStyles[task.priority])}>{task.priority}</span>
                                
                                {task.labels && task.labels.length > 0 && task.labels.map(label => (
                                  <span key={label} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 capitalize">{label}</span>
                                ))}

                                {task.dueDate && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(task.dueDate)}</span>
                                )}

                                {/* PR Badges */}
                                {githubPulls.filter(pr => pr.linkedTaskIds?.includes(task._id)).map(pr => (
                                  <Tooltip key={pr.id} content={`PR #${pr.number}: ${pr.title}`} position="top">
                                    <a href={pr.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border", pr.merged ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20" : pr.state === "open" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20")}>
                                      <GithubIcon className="w-2.5 h-2.5" />
                                      {pr.merged ? "Merged" : pr.state === "open" ? "Review" : "Closed"}
                                    </a>
                                  </Tooltip>
                                ))}
                              </div>
                              </div>
                            </DraggableTask>
                          ))}
                        </div>
                      </DroppableColumn>
                    );
                  })}
                </div>
              </div>
            </DndContext>
            ) : activeTab === "wiki" ? (
              <div className="flex-1 p-6 overflow-hidden">
                <WikiTab projectId={projectId} socket={socket} />
              </div>
            ) : activeTab === "activity" ? (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-md bg-slate-900 dark:bg-white/10 flex items-center justify-center">
                      <GithubIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">GitHub Activity Feed</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {githubRepo ? `Showing recent commits and PRs from ${githubRepo}` : "No repository linked to this project"}
                      </p>
                    </div>
                  </div>

                  {githubActivity.length === 0 ? (
                    <div className="text-center p-12 rounded-md border-2 border-dashed border-slate-200 dark:border-white/10">
                      <GithubIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">No recent activity found.</p>
                      {!githubRepo && (
                        <p className="text-sm mt-2 text-indigo-500">Link a repository in project settings to see activity here.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {githubActivity.map((item, i) => (
                        <a key={`${item.type}-${item.sha || item.number}-${i}`} href={item.url} target="_blank" rel="noopener noreferrer" className="block p-5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-500/50 hover:shadow-sm transition-all group">
                          <div className="flex items-start gap-4">
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.author} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-slate-500 flex-shrink-0">
                                {getInitials(item.author)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 text-sm">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.author}</span>
                                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                  {item.type === 'commit' ? (
                                    <>pushed a commit to <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">{item.sha}</span></>
                                  ) : (
                                    <>{item.state === 'open' ? 'opened' : item.state === 'merged' ? 'merged' : 'closed'} pull request <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">#{item.number}</span></>
                                  )}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 font-medium line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.type === 'commit' ? item.message : item.title}
                              </p>
                              <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                {formatDate(item.date)}
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Team Collaboration Modal (Chat & Calling) */}
          {showChat && (
            <BoardChatSidebar
              projectId={projectId}
              socket={socket}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>
      </div>

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedTask(null); setIsEditingTask(false); }} />
          <div className="w-full sm:w-[420px] bg-[#13102d]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col h-full shadow-sm text-slate-200 animate-in slide-in-from-right duration-250">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              {isEditingTask ? (
                <input
                  type="text"
                  value={editTaskData.title || ""}
                  onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                  className="w-full mr-3 px-3 py-1.5 rounded-lg bg-[#13102c] border border-white/10 text-base font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <h3 className="font-bold text-lg text-slate-100">{selectedTask.title}</h3>
              )}
              <div className="flex items-center gap-1">
                {isEditingTask ? (
                  <Tooltip content="Save Changes" position="left">
                    <button onClick={handleSaveEdit} className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-550 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"><Check className="w-4 h-4" /></button>
                  </Tooltip>
                ) : (
                  getCanEditTask(selectedTask) && (
                    <Tooltip content="Edit Task" position="left">
                      <button onClick={handleEditClick} className="w-8 h-8 rounded-lg hover:bg-white/5 active:scale-90 flex items-center justify-center text-slate-300 transition-all cursor-pointer"><Pencil className="w-4 h-4" /></button>
                    </Tooltip>
                  )
                )}
                <Tooltip content="Close details" position="left">
                  <button onClick={() => { setSelectedTask(null); setIsEditingTask(false); }} className="w-8 h-8 rounded-lg hover:bg-white/5 active:scale-90 flex items-center justify-center transition-all cursor-pointer"><X className="w-4 h-4" /></button>
                </Tooltip>
              </div>
            </div>
            <div className="p-5 space-y-4 border-b border-white/5">
              {isEditingTask ? (
                <>
                  <textarea
                    value={editTaskData.description || ""}
                    onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                    placeholder="Add description..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[#13102c] border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={editTaskData.priority}
                      onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value as any })}
                      className="px-3 py-1.5 rounded-lg bg-[#13102c] border border-white/10 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <select
                      value={editTaskData.assignee || ""}
                      onChange={(e) => setEditTaskData({ ...editTaskData, assignee: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-[#13102c] border border-white/10 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">No Assignee</option>
                      {project?.members?.map(m => {
                          const member = typeof m === "object" ? m : null;
                          return member ? <option key={member._id} value={member._id}>{member.name}</option> : null;
                      })}
                    </select>
                    <input
                      type="date"
                      value={editTaskData.dueDate || ""}
                      onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-[#13102c] border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 [color-scheme:dark] cursor-pointer"
                    />
                    <select
                      value={editTaskData.labels?.[0] || ""}
                      onChange={(e) => setEditTaskData({ ...editTaskData, labels: e.target.value ? [e.target.value] : [] })}
                      className="px-3 py-1.5 rounded-lg bg-[#13102c] border border-white/10 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">No Label</option>
                      <option value="Bug">Bug</option>
                      <option value="Feature">Feature</option>
                      <option value="Enhancement">Enhancement</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {selectedTask.description && <p className="text-sm text-slate-300 mb-2">{selectedTask.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-16">Status</span>
                      <select disabled={!getCanEditTask(selectedTask)} value={selectedTask.status} onChange={(e) => { updateTask(selectedTask._id, { status: e.target.value }); setSelectedTask({ ...selectedTask, status: e.target.value as Task["status"] }); fetchTasks(projectId); }} className="px-3 py-1.5 rounded-lg bg-[#13102c] border border-white/10 text-xs text-slate-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="todo">To Do</option>
                        <option value="inprogress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">Priority</span>
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border", priorityStyles[selectedTask.priority])}>{selectedTask.priority}</span>
                    </div>
                  </div>
                  {((selectedTask.assignee && typeof selectedTask.assignee === 'object') || selectedTask.dueDate || (selectedTask.labels && selectedTask.labels.length > 0)) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {selectedTask.assignee && typeof selectedTask.assignee === 'object' && (
                        <div className="flex items-center gap-2 bg-[#13102c] px-2 py-1 rounded-lg border border-white/5">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white", getAvatarColor(selectedTask.assignee.name))}>
                            {getInitials(selectedTask.assignee.name)}
                          </div>
                          <span className="text-xs text-slate-300">{selectedTask.assignee.name}</span>
                        </div>
                      )}
                      {selectedTask.dueDate && (
                        <div className="flex items-center gap-1.5 bg-[#13102c] px-2 py-1 rounded-lg border border-white/5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs text-slate-300">{formatDate(selectedTask.dueDate)}</span>
                        </div>
                      )}
                      {selectedTask.labels?.map(label => (
                        <span key={label} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* GITHUB ISSUE INTEGRATION */}
                  <div className="mt-4 pt-4 border-t border-white/5">
                    {selectedTask.githubIssueNumber ? (
                      <div className="flex flex-col gap-2 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <GithubIcon className="w-5 h-5 text-slate-300" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 font-medium">Linked GitHub Issue</p>
                            <a href={selectedTask.githubIssueUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-0.5">
                              Issue #{selectedTask.githubIssueNumber}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        {selectedTask.status === "inprogress" && (
                          <div className="mt-1 p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between group">
                            <code className="text-[10px] text-slate-300 font-mono">
                              git checkout -b feature/issue-{selectedTask.githubIssueNumber}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`git checkout -b feature/issue-${selectedTask.githubIssueNumber}`);
                                alert("Command copied!");
                              }}
                              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      project?.githubRepo && (
                        <button
                          onClick={() => handleCreateGitHubIssue(selectedTask._id)}
                          disabled={isCreatingIssue}
                          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md border border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition-all text-sm font-semibold disabled:opacity-50"
                        >
                          {isCreatingIssue ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <GithubIcon className="w-4 h-4" />
                          )}
                          Push to GitHub as Issue
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handleAIBreakdown(selectedTask._id)}
                      disabled={isBreakingDown || !getCanEditTask(selectedTask)}
                      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all text-sm font-semibold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                    >
                      {isBreakingDown ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          AI is thinking...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI Breakdown
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-100">Comments</span>
                <span className="text-xs text-slate-400">({comments.length})</span>
              </div>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0", getAvatarColor(c.user?.name || "U"))}>
                      {getInitials(c.user?.name || "U")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-250">{c.user?.name}</span>
                        <span className="text-[10px] text-slate-450">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Add Comment */}
            <div className="p-4 border-t border-white/5">
              {getCanEditTask(selectedTask) ? (
                <div className="flex gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} placeholder="Add a comment..." className="flex-1 px-3 py-2 rounded-lg bg-[#13102c]/50 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  <Tooltip content="Send comment" position="top">
                    <button onClick={handleAddComment} className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"><Send className="w-4 h-4" /></button>
                  </Tooltip>
                </div>
              ) : (
                <p className="text-xs text-center text-slate-500 py-1">Only the task assignee or project owner can add comments.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#13102d]/95 backdrop-blur-2xl border-2 border-transparent rounded-md p-6 shadow-sm text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-100">Team Members</h3>
              <Tooltip content="Close panel" position="left">
                <button onClick={() => setShowMembers(false)} className="w-8 h-8 rounded-lg hover:bg-white/5 active:scale-90 flex items-center justify-center transition-all cursor-pointer"><X className="w-4 h-4" /></button>
              </Tooltip>
            </div>
            <div className="relative mb-5">
              <div className="flex gap-4">
                <input type="email" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)} placeholder="Type name or email to invite..." className="flex-1 px-3 py-2 rounded-lg bg-[#13102c]/50 border border-white/10 text-sm text-slate-250 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                <Tooltip content="Send invitation" position="top">
                  <button onClick={handleAddMember} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-95 text-sm font-semibold text-white transition-all cursor-pointer">Invite</button>
                </Tooltip>
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-[calc(100%-80px)] mt-1 bg-[#1a163a] border border-white/10 rounded-md shadow-sm overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.map(u => (
                    <div key={u._id} onClick={() => { setAddMemberEmail(u.email); setSearchResults([]); }} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white", getAvatarColor(u.name))}>{getInitials(u.name)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-4 pr-1">
              {project?.members?.map((m) => {
                const name = typeof m === "object" ? m.name : "User";
                const email = typeof m === "object" ? m.email : "";
                return (
                  <div key={typeof m === "object" ? m._id : m} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-white/5">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white", getAvatarColor(name))}>{getInitials(name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-200">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#13102d]/95 backdrop-blur-2xl border-2 border-transparent rounded-md p-4 md:p-8 shadow-sm text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-100">Project Settings</h3>
                <p className="text-sm text-slate-400 mt-1">Manage integrations and project details.</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-lg hover:bg-white/5 active:scale-90 flex items-center justify-center transition-all cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="space-y-6">
              {/* GitHub Integration Section */}
              <div className="p-5 rounded-md border border-white/10 bg-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center">
                    <GithubIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">GitHub Repository</h4>
                    <p className="text-xs text-slate-400">Link a repository to auto-sync PRs and commits.</p>
                  </div>
                </div>

                {isGithubLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                ) : !isGithubConnected ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400 mb-3">You need to connect your GitHub account first.</p>
                    <button onClick={() => router.push("/profile")} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                      Go to Profile
                    </button>
                  </div>
                ) : githubRepo ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <div className="min-w-0 pr-3">
                      <p className="text-xs text-emerald-400/70 font-semibold mb-0.5">LINKED REPOSITORY</p>
                      <p className="text-sm font-bold text-emerald-400 truncate">{githubRepo}</p>
                    </div>
                    <button onClick={handleUnlinkRepo} disabled={isLinking} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50">
                      {isLinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                      Unlink
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-400 mb-2 font-semibold">SELECT A REPOSITORY TO LINK:</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {githubRepos.length === 0 ? (
                        <p className="text-sm text-slate-400 py-2">No repositories found on your account.</p>
                      ) : (
                        githubRepos.map(repo => (
                          <div key={repo.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#13102c] hover:border-indigo-500/30 transition-all">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-semibold text-slate-200 truncate">{repo.fullName}</p>
                              <p className="text-xs text-slate-500 truncate">{repo.description || "No description"}</p>
                            </div>
                            <button 
                              onClick={() => handleLinkRepo(repo.fullName)}
                              disabled={isLinking}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isLinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                              Link
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Discord Integration Section */}
              <div className="p-5 rounded-md border border-white/10 bg-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-md bg-[#5865F2] flex items-center justify-center">
                    <DiscordIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">Discord Integration</h4>
                    <p className="text-xs text-slate-400">Configure Webhooks and WidgetBot embed.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">DISCORD WEBHOOK URL (FOR NOTIFICATIONS)</label>
                    <input 
                      type="text" 
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..." 
                      className="w-full px-4 py-2 rounded-md bg-[#13102c]/50 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2]" 
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">SERVER ID (WIDGETBOT)</label>
                      <input 
                        type="text" 
                        value={discordServerId}
                        onChange={(e) => setDiscordServerId(e.target.value)}
                        placeholder="e.g. 1234567890" 
                        className="w-full px-4 py-2 rounded-md bg-[#13102c]/50 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2]" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">CHANNEL ID (WIDGETBOT)</label>
                      <input 
                        type="text" 
                        value={discordChannelId}
                        onChange={(e) => setDiscordChannelId(e.target.value)}
                        placeholder="e.g. 0987654321" 
                        className="w-full px-4 py-2 rounded-md bg-[#13102c]/50 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#5865F2]" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveDiscordSettings}
                    disabled={isSavingDiscord}
                    className="w-full px-4 py-2.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2.5"
                  >
                    <div className="flex items-center gap-2 justify-center">
                      {isSavingDiscord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Discord Settings</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-md p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-5 text-slate-800 dark:text-slate-100 flex items-center justify-between">
              Create New Task
              <button onClick={() => setShowAddTask(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 active:scale-90 flex items-center justify-center text-slate-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Task Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="What needs to be done?" 
                  autoFocus 
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(showAddTask); }} 
                  className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Priority</label>
                  <select 
                    value={newPriority} 
                    onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")} 
                    className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Label</label>
                  <select 
                    value={newLabel} 
                    onChange={(e) => setNewLabel(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">None</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="enhancement">Enhancement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Assign To</label>
                  <select 
                    value={newAssignee} 
                    onChange={(e) => setNewAssignee(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {project?.members?.map(m => {
                        const member = typeof m === "object" ? m : null;
                        return member ? <option key={member._id} value={member._id}>{member.name}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={newDueDate} 
                    onChange={(e) => setNewDueDate(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer [color-scheme:dark]" 
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button onClick={() => setShowAddTask(null)} className="flex-1 py-2.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all cursor-pointer">
                  Cancel
                </button>
                <button onClick={() => handleAddTask(showAddTask)} className="flex-1 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-550 text-white text-sm font-semibold shadow-sm shadow-indigo-600/15 transition-all cursor-pointer">
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
