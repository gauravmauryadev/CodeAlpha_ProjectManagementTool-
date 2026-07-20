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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line } from "recharts";
import { Bell, Circle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { projects, fetchProjects, createProject, isLoading } = useProjectStore();
  const [search, setSearch] = useState("");
  const { setCreateModalOpen } = useProjectStore();
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiProgressText, setAiProgressText] = useState("");
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
      try {
        const promises = projects.map(p => taskApi.getByProject(p._id).catch(() => null));
        const results = await Promise.all(promises);
        
        const combined: any[] = [];
        results.forEach(res => {
          if (!res || !res.data || !res.data.tasks) return;
          let tasks = res.data.tasks;
          if (tasks && !Array.isArray(tasks) && typeof tasks === "object") {
            tasks = [...(tasks.todo||[]), ...(tasks.inprogress||[]), ...(tasks.done||[])];
          }
          if (Array.isArray(tasks)) {
            combined.push(...tasks);
          }
        });
        
        combined.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllTasks(combined);
      } catch (e) { /* ignore */ }
    };
    fetchAllTasks();
  }, [projects]);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

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
          project: newProjectId,
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
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 relative w-full">
        <div className="flex flex-col gap-8 w-full">
          
          {/* Header Row */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 w-full animate-fade-in-up">
            <div className="flex flex-col">
              <h1 className="text-[40px] md:text-[48px] font-extrabold text-white tracking-tight leading-[1.1] mb-3">
                Good Morning,<br/>{user?.name?.split(" ")[0] || "Alex"}.
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-md font-medium">
                You have <span className="text-indigo-400 font-bold">{allTasks.filter(t => t.status !== 'done').length} tasks</span> to complete today across <span className="text-indigo-400 font-bold">{projects.length} active projects</span>.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
              <div onClick={() => router.push('/projects')} className="flex-1 min-w-[140px] flex flex-col justify-center p-5 bg-[#12141D] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-white/5 text-slate-300">
                    <FolderKanban className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Projects</span>
                </div>
                <span className="text-3xl font-bold text-white ml-10 tracking-tight">{projects.length}</span>
              </div>
              
              <div onClick={() => router.push('/tasks')} className="flex-1 min-w-[140px] flex flex-col justify-center p-5 bg-[#12141D] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <CheckCircle2 className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Tasks</span>
                </div>
                <span className="text-3xl font-bold text-white ml-10 tracking-tight">{allTasks.filter(t => t.status !== 'done').length}</span>
              </div>
              
              <div onClick={() => router.push('/analytics')} className="flex-1 min-w-[140px] flex flex-col justify-center p-5 bg-[#12141D] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Sparkles className="w-4 h-4"/>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Velocity</span>
                </div>
                <span className="text-3xl font-bold text-white ml-10 tracking-tight">
                  {allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Chart */}
            <div className="lg:col-span-2 bg-[#12141D] border border-white/5 rounded-[24px] p-6 flex flex-col relative overflow-hidden">
              {/* Subtle top gradient */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Productivity Overview</h3>
                  <p className="text-xs font-medium text-slate-500">Cumulative output across all engineering sprints</p>
                </div>
                <div onClick={() => alert('Filter options coming soon!')} className="px-3 py-1.5 rounded-lg bg-[#1A1C23] border border-white/5 text-xs text-slate-300 font-bold cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-2">
                  Last 30 Days <span className="text-[9px]">▼</span>
                </div>
              </div>
              <div className="flex-1 min-h-[220px] w-full flex items-center justify-center">
                 <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={[{name:'1', val:10}, {name:'2', val:30}, {name:'3', val:20}, {name:'4', val:50}, {name:'5', val:35}, {name:'6', val:70}, {name:'7', val:50}]}>
                    <Line 
                      type="monotone" 
                      dataKey="val" 
                      stroke="#818cf8" 
                      strokeWidth={3} 
                      dot={{r:5, fill:"#12141D", strokeWidth:3, stroke:"#818cf8"}} 
                      activeDot={{r:7, fill:"#818cf8", stroke:"#fff", strokeWidth:2}} 
                    />
                  </LineChart>
                 </ResponsiveContainer>
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white">Today's Tasks</h3>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                  {allTasks.filter(t => t.status !== 'done').length} Left
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {allTasks.filter(t => t.status !== 'done').slice(0, 4).map((task, i) => {
                   const pillColors = ["bg-rose-500/10 text-rose-400", "bg-purple-500/10 text-purple-400", "bg-blue-500/10 text-blue-400", "bg-orange-500/10 text-orange-400"];
                   const pColor = pillColors[i % pillColors.length];
                   return (
                    <div key={i} onClick={() => router.push(`/board/${task.project._id || task.project}`)} className="flex items-center justify-between p-3.5 rounded-xl bg-[#161925] border border-transparent hover:border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await taskApi.update(task._id, { status: "done" });
                              setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: "done" } : t));
                            } catch (error) {
                              console.error("Failed to complete task:", error);
                            }
                          }}
                          className="w-4 h-4 rounded-[4px] border-2 border-slate-600 hover:bg-indigo-500/20 group-hover:border-indigo-400 transition-colors flex items-center justify-center"
                        ></div>
                        <span className="text-[13px] text-slate-200 font-semibold truncate max-w-[150px]">{task.title}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-1 rounded ${pColor} uppercase tracking-wider`}>
                        {task.priority || "High"}
                      </span>
                    </div>
                  );
                })}
                {allTasks.filter(t => t.status !== 'done').length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-medium">No tasks left! 🎉</div>
                )}
              </div>
              <button onClick={() => router.push('/tasks')} className="w-full py-3 mt-4 rounded-xl bg-[#1A1C23] border border-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer">
                Show More
              </button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Active Projects */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-bold text-white">Active Projects</h3>
                <span onClick={() => router.push('/projects')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.slice(0, 2).map((p, i) => {
                  const pTasks = allTasks.filter(t => t.project === p._id || (t.project && t.project._id === p._id));
                  const dTasks = pTasks.filter(t => t.status === 'done').length;
                  const realPct = pTasks.length > 0 ? Math.round((dTasks / pTasks.length) * 100) : 0;
                  
                  return (
                  <div key={i} onClick={() => router.push(`/board/${p._id}`)} className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 flex flex-col cursor-pointer hover:border-white/10 hover:bg-[#161925] transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/10 transition-colors"></div>
                    
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-10 h-10 rounded-xl bg-[#1A1C23] border border-white/5 flex items-center justify-center text-slate-300 shadow-sm">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <FolderKanban className="w-5 h-5 text-purple-400"/>}
                      </div>
                      <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                        {realPct === 100 ? "Completed" : "In Progress"}
                      </span>
                    </div>
                    
                    <h4 className="text-[15px] font-bold text-white mb-2">{p.name}</h4>
                    <p className="text-xs font-medium text-slate-500 mb-6 truncate">{p.description || "Infrastructure update for core processing."}</p>
                    
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Progress</span>
                        <span>{realPct}%</span>
                      </div>
                      <div className="w-full h-[6px] rounded-full bg-[#1A1C23] overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{width: `${realPct}%`}}></div>
                      </div>
                      <div className="flex items-center gap-1 mt-4">
                        {p.members?.slice(0, 3).map((m: any, j: number) => (
                          <div key={j} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#12141D] group-hover:border-[#161925] -ml-2 first:ml-0 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden transition-colors">
                            {m.user?.avatar ? <img src={m.user.avatar} className="w-full h-full object-cover" /> : getInitials(m.user?.name || "U")}
                          </div>
                        ))}
                        {(p.members?.length || 0) > 3 && (
                          <div className="w-6 h-6 rounded-full bg-[#1A1C23] border-2 border-[#12141D] group-hover:border-[#161925] -ml-2 flex items-center justify-center text-[8px] font-bold text-white transition-colors">
                            +{(p.members?.length || 0) - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
                {projects.length === 0 && (
                  <div className="col-span-2 p-10 flex flex-col items-center justify-center bg-[#12141D] border border-white/5 rounded-[24px]">
                    <span className="text-sm font-medium text-slate-400 mb-4">No active projects yet</span>
                    <button onClick={() => setCreateModalOpen(true)} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer">
                      Create your first project
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Team Activity */}
            <div className="flex flex-col">
               <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-bold text-white">Team Activity</h3>
              </div>
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                
                <div className="flex-1 flex flex-col gap-6 relative mt-2">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/5"></div>
                  
                  {allTasks.slice(0, 4).map((act, i) => (
                    <div key={i} className="flex gap-4 relative z-10">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border-4 border-[#12141D] shrink-0 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-sm">
                        {getInitials(act.assignee?.name || act.createdBy?.name || "U")}
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <p className="text-[13px] text-white font-medium leading-snug">
                          <span className="font-bold">{act.assignee?.name || act.createdBy?.name || "Alex"}</span> {act.status === "done" ? "completed" : "created"} <span className="font-semibold text-slate-300">"{act.title}"</span>
                        </p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">{timeAgo(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {allTasks.length === 0 && (
                    <div className="flex items-center justify-center h-full text-xs font-medium text-slate-500">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Very Bottom Row: Recent Files & Weekly Completion */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up mt-6" style={{ animationDelay: '0.3s' }}>
            {/* Recent Files */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-bold text-white">Recent Files</h3>
              </div>
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 flex flex-col lg:flex-row gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                
                <div onClick={() => alert('Opening Q3_Architecture_Specs.pdf...')} className="flex-1 flex items-center gap-4 p-4 rounded-xl bg-[#161925] border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Q3_Architecture_Specs.pdf</span>
                    <span className="text-xs text-slate-500">Uploaded 2 hours ago by Alex</span>
                  </div>
                </div>

                <div onClick={() => alert('Opening API_Endpoints_v4.xlsx...')} className="flex-1 flex items-center gap-4 p-4 rounded-xl bg-[#161925] border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">API_Endpoints_v4.xlsx</span>
                    <span className="text-xs text-slate-500">Uploaded 5 hours ago by Sarah</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Completion */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-bold text-white">Weekly Completion</h3>
              </div>
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-white/5"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-purple-500"
                      strokeDasharray={`${allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100) : 0}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100) : 0}%</span>
                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-1">Completed</span>
                  </div>
                </div>
              </div>
            </div>
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


