"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  ListChecks,
  Trash2,
  ExternalLink,
  Shield,
  Search,
  BarChart3,
  Eye,
  X,
  ArrowLeft,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { adminApi } from "@/lib/api";
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils";
import type { User, Project } from "@/types";

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalProjects: 0, totalTasks: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tab, setTab] = useState<"users" | "projects">("users");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      const [statsRes, usersRes, projectsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getProjects(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data || []);
      setProjects(projectsRes.data.projects || projectsRes.data || []);
    } catch { /* ignore */ }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    await adminApi.deleteUser(id);
    loadData();
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Delete this project permanently?")) return;
    await adminApi.deleteProject(id);
    loadData();
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/dashboard")} className="p-2.5 rounded-md bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shadow-sm cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm shadow-rose-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 bg-clip-text text-transparent animate-text-gradient tracking-tight">Admin Panel</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Full platform control.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} gradient="from-indigo-500 to-purple-600" />
          <StatCard icon={FolderKanban} label="Total Projects" value={stats.totalProjects} gradient="from-emerald-500 to-teal-600" />
          <StatCard icon={ListChecks} label="Total Tasks" value={stats.totalTasks} gradient="from-amber-500 to-orange-600" />
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4 sm:gap-0">
          <div className="flex gap-1 bg-slate-200/50 dark:bg-[#14112c]/60 border border-slate-300/20 dark:border-white/5 rounded-md p-1 w-full sm:w-auto">
            {(["users", "projects"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setSearch(""); }} className={cn("flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all", tab === t ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200")}>
                {t}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="pl-10 pr-4 py-2 rounded-md bg-white/40 dark:bg-[#13102c]/50 border-2 border-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64 animate-border-pulse" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border-2 border-transparent bg-white dark:bg-[#14112c]/45 shadow-sm overflow-hidden animate-border-pulse overflow-x-auto">
          {tab === "users" ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="border-b border-black/[0.03] dark:border-white/5 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white", getAvatarColor(u.name))}>{getInitials(u.name)}</div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", u.role === "admin" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20")}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(u.createdAt || "")}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedUser(u)} className="p-2 rounded-md hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"><Eye className="w-5 h-5" /></button>
                        <button onClick={() => handleDeleteUser(u._id)} className="p-2 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Owner</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Members</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const ownerName = typeof p.owner === "object" ? p.owner.name : "Unknown";
                  return (
                    <tr key={p._id} className="border-b border-black/[0.03] dark:border-white/5 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: p.color || "#6366f1" }}>{p.name.charAt(0)}</div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{ownerName}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{p.members?.length || 0}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/board/${p._id}`} className="p-2 rounded-md hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"><ExternalLink className="w-5 h-5" /></a>
                          <button onClick={() => handleDeleteProject(p._id)} className="p-2 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-md bg-white dark:bg-[#14112c] rounded-md border-2 border-transparent shadow-sm overflow-hidden flex flex-col relative animate-fade-in-up animate-border-pulse">
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Banner */}
            <div className="h-32 bg-slate-100 dark:bg-white/5 relative">
              {selectedUser.banner ? (
                <img src={selectedUser.banner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
              )}
            </div>
            
            {/* Avatar & Info */}
            <div className="px-6 pb-6 relative">
              <div className="w-20 h-20 rounded-md border-4 border-white dark:border-[#14112c] bg-slate-100 dark:bg-[#1a163a] flex items-center justify-center shadow-sm absolute -top-10 overflow-hidden">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className={cn("text-2xl font-bold w-full h-full flex items-center justify-center text-white", getAvatarColor(selectedUser.name))}>
                    {getInitials(selectedUser.name)}
                  </span>
                )}
              </div>
              
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedUser.name}</h2>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", selectedUser.role === "admin" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20")}>
                    {selectedUser.role}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{selectedUser.email}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Joined Date</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatDate(selectedUser.createdAt || "")}</p>
                  </div>
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">User ID</p>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-200 truncate" title={selectedUser._id}>{selectedUser._id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, gradient }: { icon: React.ElementType; label: string; value: number; gradient: string }) {
  return (
    <div className="p-5 rounded-md border-2 border-transparent bg-white dark:bg-[#14112c]/45 hover:bg-slate-50 dark:hover:bg-[#1a163a]/60 shadow-sm transition-all group animate-border-pulse">
      <div className="flex items-center gap-4">
        <div className={cn("w-11 h-11 rounded-md bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform", gradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}
