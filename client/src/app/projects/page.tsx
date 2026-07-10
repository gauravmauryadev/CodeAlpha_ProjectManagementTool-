"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Calendar,
  Users,
  BarChart,
  ArrowRight,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils";

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    if (
      search &&
      !project.name.toLowerCase().includes(search.toLowerCase()) &&
      !project.description?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 shrink-0">
          <div>
            <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight text-white mb-2">
              Projects
            </h1>
            <p className="text-[14px] md:text-[15px] font-medium text-slate-400">
              Manage and view all your workspaces and projects.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard?create=true")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#12141D] border border-white/5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 bg-[#12141D] border border-white/5 rounded-2xl">
              <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
              <p className="text-[14px] font-semibold text-slate-400">
                No projects found.
              </p>
              <p className="text-[12px] text-slate-500 mt-1">
                Try a different search or create a new project.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project) => {
                const totalTasks = (project as any).tasks?.length || 0;
                const completedTasks =
                  (project as any).tasks?.filter((t: any) => t.status === "done")
                    .length || 0;
                const progress =
                  totalTasks > 0
                    ? Math.round((completedTasks / totalTasks) * 100)
                    : 0;

                return (
                  <div
                    key={project._id}
                    onClick={() => router.push(`/board/${project._id}`)}
                    className="group bg-[#12141D] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col relative overflow-hidden"
                  >
                    {/* Top Section */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <FolderKanban className="w-6 h-6 text-indigo-400" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle menu
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title & Desc */}
                    <h3 className="text-[18px] font-bold text-white mb-2 truncate">
                      {project.name}
                    </h3>
                    <p className="text-[13px] text-slate-400 line-clamp-2 mb-6 min-h-[40px]">
                      {project.description || "No description provided."}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-slate-400">
                        <BarChart className="w-4 h-4" />
                        <span className="text-[12px] font-bold">
                          {progress}% Done
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="text-[12px] font-bold">
                          {project.members?.length || 1} Mem
                        </span>
                      </div>
                    </div>

                    {/* Footer - Members & Arrow */}
                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {project.members?.slice(0, 3).map((m: any, i: number) => {
                          const memberName = typeof m === "object" ? m.name : "U";
                          return (
                            <div
                              key={i}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#12141D]",
                                getAvatarColor(memberName)
                              )}
                              title={memberName}
                            >
                              {getInitials(memberName)}
                            </div>
                          );
                        })}
                        {(project.members?.length || 0) > 3 && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 bg-[#161925] border-2 border-[#12141D]">
                            +{(project.members?.length || 0) - 3}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-indigo-400 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
