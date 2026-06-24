"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  FolderKanban,
  ListChecks,
  CheckCircle2,
  Search,
  ArrowRight,
  Camera,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { Project } from "@/types";
import Tooltip from "@/components/ui/Tooltip";
import { inviteApi } from "@/lib/api";
import { Bell } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { projects, fetchProjects, createProject, isLoading } = useProjectStore();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [invites, setInvites] = useState<any[]>([]);
  const [acceptingInvite, setAcceptingInvite] = useState<any>(null);
  const [onboardForm, setOnboardForm] = useState({ role: "", reason: "" });

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

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 pr-0 md:pr-[130px] gap-4 md:gap-0 mt-12 md:mt-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 bg-clip-text text-transparent animate-text-gradient">
                Welcome back, {user?.name?.split(" ")[0]}!
              </span>{" "}
              <span className="inline-block hover:animate-[wave_1s_ease-in-out_infinite] origin-bottom-right">👋</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Here&apos;s your workspace overview.
            </p>
          </div>
          <Tooltip content="Create new project board" position="left">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </Tooltip>
        </div>

        {/* Invites Section */}
        {invites.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl border-2 border-transparent bg-indigo-500/5 animate-fade-in-up animate-border-pulse">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" /> Pending Invitations
            </h2>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite._id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#14112c]/60 border-2 border-transparent shadow-sm hover-lift transition-all animate-border-pulse">
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
                    <button onClick={() => setAcceptingInvite(invite)} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer">Accept</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon={FolderKanban}
            label="Total Projects"
            value={projects.length}
            gradient="from-indigo-500 to-purple-600"
          />
          <StatCard
            icon={ListChecks}
            label="Active"
            value={projects.length}
            gradient="from-amber-500 to-orange-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Team Role"
            value={user?.role === "admin" ? "Admin" : "Member"}
            gradient="from-emerald-500 to-teal-600"
            isText
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-white/5 border-2 border-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all animate-border-pulse hover:shadow-lg"
          />
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderKanban className="w-12 h-12 text-slate-500 dark:text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
              No projects yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Create your first project to get started.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-95 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all duration-200 cursor-pointer"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border-2 border-transparent rounded-2xl p-6 shadow-2xl text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse">
            <h3 className="text-lg font-bold mb-5 text-slate-800 dark:text-slate-100">Create New Project</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Project Icon / DP
                </label>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl border-2 border-dashed border-indigo-500/30 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-white/5 relative group cursor-pointer">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 hover:-translate-y-0.5 active:scale-97 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 hover:-translate-y-0.5 active:scale-97 text-white text-sm font-semibold shadow-md shadow-indigo-600/15 transition-all duration-200 cursor-pointer"
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
          <div className="w-full max-w-md bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border-2 border-transparent rounded-2xl p-6 shadow-2xl text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-200 animate-border-pulse">
            <h3 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">Join Project</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Please fill out this quick intro before joining <strong>{acceptingInvite.project?.name}</strong>.</p>
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">What will be your role?</label>
                <input type="text" value={onboardForm.role} onChange={(e) => setOnboardForm({...onboardForm, role: e.target.value})} placeholder="e.g., Developer, Designer, QA..." required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Why are you joining?</label>
                <textarea value={onboardForm.reason} onChange={(e) => setOnboardForm({...onboardForm, reason: e.target.value})} rows={2} placeholder="Just a brief reason..." required className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAcceptingInvite(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white text-sm font-semibold shadow-md shadow-emerald-600/15 transition-all cursor-pointer">Submit & Join</button>
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
    <div className="p-5 rounded-2xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 hover:bg-slate-50 dark:hover:bg-slate-50/10 shadow-sm hover-lift transition-all animate-fade-in-up group animate-border-pulse">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
            gradient
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className={cn("font-bold text-slate-800 dark:text-slate-100", isText ? "text-base" : "text-2xl")}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const ownerName =
    typeof project.owner === "object" ? project.owner.name : "Unknown";

  const done = project.taskCounts?.done || 0;
  const total = project.taskCounts?.total || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <a
      href={`/board/${project._id}`}
      className="group block p-5 rounded-2xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 hover:bg-slate-50 dark:hover:bg-slate-50/10 hover-lift shadow-sm animate-fade-in-up animate-border-pulse"
    >
      <div className="flex items-start justify-between mb-3">
        {project.image ? (
          <img 
            src={project.image} 
            alt={project.name} 
            className="w-10 h-10 rounded-xl object-cover shadow-md shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300" 
          />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300"
            style={{
              background: project.color || "#6366f1",
            }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}
        <ArrowRight className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300" />
      </div>

      <h3 className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors duration-200">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 mb-4 leading-relaxed">
          {project.description}
        </p>
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
          {project.members?.slice(0, 4).map((m) => (
            <div
              key={typeof m === "object" ? m._id : m}
              className={cn(
                "w-6.5 h-6.5 rounded-full ring-2 ring-[#110e28] flex items-center justify-center text-[9px] font-bold text-white shadow-sm hover:scale-110 transition-transform duration-200",
                getAvatarColor(typeof m === "object" ? m.name : "U")
              )}
            >
              {getInitials(typeof m === "object" ? m.name : "U")}
            </div>
          ))}
          {(project.members?.length || 0) > 4 && (
            <div className="w-6.5 h-6.5 rounded-full ring-2 ring-[#110e28] bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-350 hover:scale-110 transition-transform duration-200">
              +{project.members.length - 4}
            </div>
          )}
        </div>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {timeAgo(project.createdAt)}
        </span>
      </div>
    </a>
  );
}
