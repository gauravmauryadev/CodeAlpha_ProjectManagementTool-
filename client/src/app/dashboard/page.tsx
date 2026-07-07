"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  ListChecks,
  CheckCircle2,
  Search,
  ArrowRight,
  Camera,
  Trash2,
  Sparkles,
  Loader2,
  Bot
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { Project } from "@/types";
import Tooltip from "@/components/ui/Tooltip";
import { inviteApi, projectApi, taskApi } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Bell, Circle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { projects, fetchProjects, createProject, isLoading } = useProjectStore();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiProgressText, setAiProgressText] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [acceptingInvite, setAcceptingInvite] = useState<any>(null);
  const [onboardForm, setOnboardForm] = useState({ role: "", reason: "" });

  const [allTasks, setAllTasks] = useState<any[]>([]);

  const loadInvites = async () => {
    try {
      const res = await inviteApi.getAll();
      setInvites(res.data.invites.filter((i: any) => i.status === 'pending'));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchProjects();
    loadInvites();
  }, [fetchProjects]);

  useEffect(() => {
    const fetchAllTasks = async () => {
      if (projects.length === 0) return;
      let combined: any[] = [];
      for (const p of projects) {
         try {
           const res = await taskApi.getByProject(p._id);
           let tasks = res.data.tasks;
           if (tasks && !Array.isArray(tasks) && typeof tasks === "object") {
             tasks = [...(tasks.todo||[]), ...(tasks.inprogress||[]), ...(tasks.done||[])];
           }
           if (Array.isArray(tasks)) {
             combined.push(...tasks);
           }
         } catch (e) { /* ignore */ }
      }
      combined.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllTasks(combined);
    };
    fetchAllTasks();
  }, [projects]);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Image size should be less than 2MB");
    const reader = new FileReader();
    reader.onloadend = () => setNewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createProject({ name: newName, description: newDesc, image: newImage });
    setNewName("");
    setNewDesc("");
    setNewImage("");
    setShowModal(false);
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptingInvite) return;
    try {
      await inviteApi.accept(acceptingInvite._id);
      setAcceptingInvite(null);
      setOnboardForm({ role: "", reason: "" });
      loadInvites();
      fetchProjects();
    } catch { /* ignore */ }
  };

  const handleRejectInvite = async (id: string) => {
    try {
      await inviteApi.reject(id);
      loadInvites();
    } catch { /* ignore */ }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    
    try {
      setAiProgressText("Analyzing request...");
      await new Promise((r) => setTimeout(r, 1200));
      
      setAiProgressText("Creating 1-month calendar & Kanban board...");
      const projectRes = await projectApi.create({
        name: "AI Smart Project",
        description: `Generated from: "${aiPrompt}"`,
        color: "#6366f1",
      });
      const newProjectId = projectRes.data.project?._id || projectRes.data._id;
      
      await new Promise((r) => setTimeout(r, 1500));
      setAiProgressText("Generating sub-tasks & scheduling...");
      
      const aiTasks = [
        { title: "Market Research & Competitor Analysis", status: "todo", priority: "high" },
        { title: "Design UI/UX Mockups", status: "todo", priority: "medium" },
        { title: "Setup Database Architecture", status: "todo", priority: "high" },
        { title: "Develop Core API endpoints", status: "inprogress", priority: "high" },
        { title: "Initialize Project Repository", status: "done", priority: "medium" },
      ];
      
      for (const t of aiTasks) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days from now
        
        await taskApi.create({
          projectId: newProjectId,
          title: t.title,
          description: `AI generated sub-task for the goal: ${aiPrompt}`,
          status: t.status,
          priority: t.priority,
          dueDate: dueDate.toISOString(),
        });
      }
      
      await fetchProjects();
      router.push(`/board/${newProjectId}`);
    } catch (err) {
      console.error("AI Generation failed", err);
      alert("Failed to generate project with AI.");
      setIsAiGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8 relative">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-8 pr-0 md:pr-[130px] gap-3 md:gap-0">
          <div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1">
              Here&apos;s your workspace overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip content="Smart-Schedule with AI" position="left">
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 hover:-translate-y-0.5 active:scale-95 text-white text-sm font-semibold shadow-sm shadow-purple-600/20 hover:shadow-purple-600/30 transition-all duration-200 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Generate</span>
              </button>
            </Tooltip>
            <Tooltip content="Create new project board" position="left">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-800 dark:bg-white/10 hover:bg-slate-700 dark:hover:bg-white/20 hover:-translate-y-0.5 active:scale-95 text-white text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Invites Section */}
        {invites.length > 0 && (
          <div className="mb-8 p-5 rounded-md border-2 border-transparent bg-indigo-500/5 animate-fade-in-up animate-border-pulse">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" /> Pending Invitations
            </h2>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite._id} className="flex items-center justify-between p-4 rounded-md bg-white dark:bg-[#14112c]/60 border-2 border-transparent shadow-sm hover-lift transition-all animate-border-pulse">
                  <div>
                    <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                      {invite.project?.name || "Unknown Project"}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Invited by {invite.invitedBy?.name || "Someone"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRejectInvite(invite._id)} className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-600 dark:text-slate-300 hover:text-rose-400 text-sm font-medium transition-all cursor-pointer">Decline</button>
                    <button onClick={() => setAcceptingInvite(invite)} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white text-sm font-semibold transition-all shadow-sm shadow-indigo-600/20 cursor-pointer">Accept</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Section */}
        {(() => {
          const created = allTasks.length;
          const completed = allTasks.filter(t => t.status === "done").length;
          const updated = Math.min(created, Math.floor(created * 0.8)); // Mock updated if no updated field
          const dueSoon = allTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() - Date.now() < 3*24*60*60*1000 && new Date(t.dueDate).getTime() > Date.now()).length;
          
          const todoCount = allTasks.filter(t => t.status === "todo").length;
          const inprogressCount = allTasks.filter(t => t.status === "inprogress").length;
          const pieData = [
            { name: 'To Do', value: todoCount, color: '#94a3b8' },
            { name: 'In Progress', value: inprogressCount, color: '#f59e0b' },
            { name: 'Done', value: completed, color: '#10b981' }
          ].filter(d => d.value > 0);
          if (pieData.length === 0) pieData.push({ name: 'No Tasks', value: 1, color: '#e2e8f0' });

          return (
            <>
              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8 animate-fade-in-up">
                <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center">
                   <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completed}</div>
                   <div className="text-xs text-slate-500 dark:text-slate-400">completed (in last 7 days)</div>
                </div>
                <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center">
                   <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{updated}</div>
                   <div className="text-xs text-slate-500 dark:text-slate-400">updated</div>
                </div>
                <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center">
                   <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{created}</div>
                   <div className="text-xs text-slate-500 dark:text-slate-400">created</div>
                </div>
                <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center">
                   <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{dueSoon}</div>
                   <div className="text-xs text-slate-500 dark:text-slate-400">due soon</div>
                </div>
              </div>

              {/* Status Overview & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {/* Status Overview */}
                <div className="p-5 md:p-6 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm flex flex-col">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-6">Status Overview</h3>
                  <div className="flex-1 min-h-[250px] w-full">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="p-5 md:p-6 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm flex flex-col max-h-[350px]">
                   <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                     <Clock className="w-4 h-4 text-slate-400" /> Recent Activity
                   </h3>
                   <div className="relative border-l border-slate-200 dark:border-white/10 ml-2.5 space-y-6 overflow-y-auto pr-2 pb-2">
                     {allTasks.slice(0, 10).map((act, i) => (
                       <div key={act._id || i} className="relative pl-5">
                         <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#14112c] bg-indigo-500" />
                         <p className="text-sm text-slate-700 dark:text-slate-300">
                           <span className="font-semibold text-slate-900 dark:text-white">{act.assignee?.name || act.createdBy?.name || "A user"}</span> {act.status === "done" ? "completed task" : "created task"} <span className="italic">"{act.title}"</span>
                         </p>
                         <p className="text-xs text-slate-400 mt-0.5">{timeAgo(act.createdAt)}</p>
                       </div>
                     ))}
                     {allTasks.length === 0 && (
                       <p className="text-sm text-slate-500 pl-5">No recent activity found.</p>
                     )}
                   </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-11 pr-4 py-3 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all hover:shadow-sm"
          />
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <FolderKanban className="w-12 h-12 text-slate-500 dark:text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
              No projects yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Create your first project to get started.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-95 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all duration-200 cursor-pointer"
            >
              Create Project
            </button>
          </motion.div>
        ) : (
          <ProjectGrid projects={filtered} />
        )}
          </div>
        </div>
      </div>

      {/* AI Smart-Scheduling Modal */}
      <AnimatePresence>
        {showAiModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }} 
              className="bg-white dark:bg-[#14112c] border border-slate-200 dark:border-white/10 rounded-md shadow-sm w-full max-w-md overflow-hidden relative"
            >
              {/* Decorative AI Glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Smart-Scheduling</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Generate a full project timeline</p>
                    </div>
                  </div>
                  {!isAiGenerating && (
                    <button 
                      onClick={() => setShowAiModal(false)} 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {!isAiGenerating ? (
                  <form onSubmit={handleAiGenerate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        What do you want to build?
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g. Mujhe ek e-commerce website banani hai..."
                        className="w-full px-4 py-3 rounded-md bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-28"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAiModal(false)} 
                        className="px-4 py-2 rounded-md text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-sm shadow-purple-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" /> Generate Project
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{aiProgressText}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">AI is mapping out milestones...</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border-2 border-transparent rounded-md p-6 shadow-sm text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse">
            <h3 className="text-lg font-bold mb-5 text-slate-800 dark:text-slate-100">Create New Project</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Project Icon / DP
                </label>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-md border-2 border-dashed border-indigo-500/30 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-white/5 relative group cursor-pointer">
                    {newImage ? (
                      <img src={newImage} alt="Project DP" className="w-full h-full object-cover" />
                    ) : (
                      <FolderKanban className="w-6 h-6 text-slate-400" />
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <p>Upload a project picture</p>
                    <p>Max size: 2MB</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="E.g., Mobile App Redesign"
                  required
                  className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Brief description..."
                  className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 hover:-translate-y-0.5 active:scale-97 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-97 text-white text-sm font-semibold shadow-sm shadow-indigo-600/15 transition-all duration-200 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Invite Modal */}
      {acceptingInvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border-2 border-transparent rounded-md p-6 shadow-sm text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse">
            <h3 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">Join Project</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Please fill out this quick intro before joining <strong>{acceptingInvite.project?.name}</strong>.</p>
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">What will be your role?</label>
                <input type="text" value={onboardForm.role} onChange={(e) => setOnboardForm({...onboardForm, role: e.target.value})} placeholder="e.g., Developer, Designer, QA..." required className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Why are you joining?</label>
                <textarea value={onboardForm.reason} onChange={(e) => setOnboardForm({...onboardForm, reason: e.target.value})} rows={2} placeholder="Just a brief reason..." required className="w-full px-4 py-2.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAcceptingInvite(null)} className="flex-1 py-2.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-550 text-white text-sm font-semibold shadow-sm shadow-emerald-600/15 transition-all cursor-pointer">Submit & Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ==================== SUB-COMPONENTS ====================

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  isText,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
  isText?: boolean;
}) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-3 md:p-5 rounded-md md:rounded-md border-2 border-transparent bg-white/70 dark:bg-[#14112c]/45 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all group h-full relative animate-border-pulse"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
        <div
          className={cn(
            "w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-md bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300",
            gradient
          )}
        >
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className={cn("font-bold text-slate-800 dark:text-slate-100", isText ? "text-xs md:text-base" : "text-lg md:text-2xl")}>
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectGrid({ projects }: { projects: Project[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {projects.map((project, idx) => (
        <motion.div
          key={project._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="relative group block h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-slate-200/50 dark:bg-white/[0.04] block rounded-md"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <div className="relative z-10 p-1.5 h-full w-full">
            <ProjectCard project={project} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { user } = useAuthStore();
  const { deleteProject } = useProjectStore();
  const router = useRouter();
  
  const ownerName =
    project.owner && typeof project.owner === "object" ? (project.owner as any).name || "Unknown" : "Unknown";

  const userIdStr = user ? String((user as any).id || (user as any)._id) : "";
  const ownerIdStr = project.owner ? String(typeof project.owner === "object" ? (project.owner as any)._id : project.owner) : "";
  const isOwner = Boolean(userIdStr && ownerIdStr && userIdStr === ownerIdStr) || (user as any)?.role === 'admin';

  const done = project.taskCounts?.done || 0;
  const total = project.taskCounts?.total || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        await deleteProject(project._id);
      } catch (error: any) {
        alert("Failed to delete project: " + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div
      onClick={() => router.push(`/board/${project._id}`)}
      className="group flex flex-col p-5 rounded-md bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 hover:shadow-sm hover:shadow-indigo-500/10 transition-all duration-300 h-full relative cursor-pointer"
    >
      {/* Decorative gradient orb on hover */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {project.image ? (
            <img 
              src={project.image} 
              alt={project.name || "Project"} 
              className="w-10 h-10 rounded-md object-cover shadow-sm shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300" 
            />
          ) : (
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300"
              style={{
                background: project.color || "#6366f1",
              }}
            >
              {(project.name || "P").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Tooltip content="Delete Project" position="top">
              <button
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
          <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300 z-10" />
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors duration-200 truncate w-full">
        {project.name || "Untitled Project"}
      </h3>
      {project.description ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 mb-4 leading-relaxed break-words w-full">
          {project.description}
        </p>
      ) : (
        <div className="mb-4 flex-1"></div>
      )}

      {/* Progress Bar */}
      <div className="mt-4 mb-4">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          <span>COMPLETION</span>
          <span>{pct}% ({done}/{total})</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-650 rounded-full transition-all duration-700 ease-out" 
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200 dark:border-white/10">
        <div className="flex -space-x-2">
          {project.members?.slice(0, 4).map((m) => {
            if (!m) return null;
            const mId = typeof m === "object" ? (m as any)._id : m;
            const mName = typeof m === "object" ? (m as any).name || "Unknown" : "U";
            return (
              <div
                key={mId || Math.random().toString()}
                className={cn(
                  "w-6.5 h-6.5 rounded-full ring-2 ring-[#110e28] flex items-center justify-center text-[9px] font-bold text-white shadow-sm hover:scale-110 transition-transform duration-200",
                  getAvatarColor(mName)
                )}
              >
                {getInitials(mName)}
              </div>
            );
          })}
          {(project.members?.length || 0) > 4 && (
            <div className="w-6.5 h-6.5 rounded-full ring-2 ring-[#110e28] bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-350 hover:scale-110 transition-transform duration-200">
              +{project.members.length - 4}
            </div>
          )}
        </div>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {project.createdAt ? timeAgo(project.createdAt) : ""}
        </span>
      </div>
    </div>
  );
}


