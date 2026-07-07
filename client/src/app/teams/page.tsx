"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Crown,
  Mail,
  FolderKanban,
  Loader2,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function TeamsPage() {
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  // Collect unique members across all projects
  const allMembers = new Map<string, { member: TeamMember; projectNames: string[] }>();
  projects.forEach((project) => {
    if (project.members && Array.isArray(project.members)) {
      project.members.forEach((m: any) => {
        const member = typeof m === "object" ? m : null;
        if (!member || !member._id) return;
        const existing = allMembers.get(member._id);
        if (existing) {
          if (!existing.projectNames.includes(project.name)) {
            existing.projectNames.push(project.name);
          }
        } else {
          allMembers.set(member._id, {
            member: { _id: member._id, name: member.name, email: member.email, avatar: member.avatar },
            projectNames: [project.name],
          });
        }
      });
    }
    // Also add owner
    const owner = typeof project.owner === "object" ? project.owner as any : null;
    if (owner && owner._id) {
      const existing = allMembers.get(owner._id);
      if (existing) {
        if (!existing.projectNames.includes(project.name)) {
          existing.projectNames.push(project.name);
        }
      } else {
        allMembers.set(owner._id, {
          member: { _id: owner._id, name: owner.name, email: owner.email, avatar: owner.avatar },
          projectNames: [project.name],
        });
      }
    }
  });

  const membersList = Array.from(allMembers.values());

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-500" />
              Teams
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1">
              All collaborators across your projects.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center">
            <div className="text-2xl font-bold text-indigo-500">{membersList.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Team Members</div>
          </div>
          <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center">
            <div className="text-2xl font-bold text-emerald-500">{projects.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active Projects</div>
          </div>
          <div className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center hidden md:block">
            <div className="text-2xl font-bold text-amber-500">
              {membersList.length > 0
                ? Math.round(projects.length / membersList.length * 10) / 10
                : 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Projects/Member</div>
          </div>
        </div>

        {/* Members Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : membersList.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No team members found.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Create a project and invite collaborators to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {membersList.map(({ member, projectNames }) => {
              const isCurrentUser = member._id === (user as any)?._id || member._id === (user as any)?.id;

              return (
                <div
                  key={member._id}
                  className="group p-5 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-white/10 shadow-sm"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-white/10 shadow-sm",
                          getAvatarColor(member.name || "U")
                        )}
                      >
                        {getInitials(member.name || "U")}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {member.name}
                        </h3>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {member.email}
                      </p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <FolderKanban className="w-3 h-3 text-slate-400 shrink-0" />
                        {projectNames.slice(0, 3).map((pn) => (
                          <span
                            key={pn}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 truncate max-w-[100px]"
                          >
                            {pn}
                          </span>
                        ))}
                        {projectNames.length > 3 && (
                          <span className="text-[10px] text-indigo-500 font-semibold">
                            +{projectNames.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
