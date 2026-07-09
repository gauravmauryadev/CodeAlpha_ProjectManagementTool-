"use client";

import { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  Video,
  ArrowRight,
  Plus,
  UserPlus,
  Loader2,
  TrendingUp,
  MoreHorizontal
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import Tooltip from "@/components/ui/Tooltip";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const mockRoles = ["LEAD DEVELOPER", "LEAD DESIGNER", "PRODUCT MANAGER", "DATA SCIENTIST", "ENGINEER"];
const mockDepts = ["Core Systems & Security", "UI/UX & Brand Identity", "Growth & Roadmap Strategy", "Analytics", "Backend Ops"];
const mockMetrics = [
  { label: "FOCUS ALLOCATION", val: "92%" },
  { label: "CURRENT CAPACITY", val: "75%" },
  { label: "DELIVERY VELOCITY", val: "88%" },
];

const activityFeed = [
  {
    user: "Jordan Vance",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
    action: "pushed 4 commits to core/helios-engine",
    time: "12 MINUTES AGO",
    quote: '"Optimized shard allocation logic for high-concurrency environments."',
    type: "commit"
  },
  {
    user: "Elena Rodriguez",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    action: "updated the Aether Design System",
    time: "1 HOUR AGO",
    type: "update"
  },
  {
    user: "System",
    avatar: "bot",
    action: "Deployment Success: v2.4.0-alpha is now live on Staging",
    time: "3 HOURS AGO",
    type: "system"
  },
  {
    user: "Marcus Chen",
    avatar: "https://i.pravatar.cc/150?u=a048581f4e29026701d",
    action: "shared a new Q4 Performance Report",
    time: "5 HOURS AGO",
    type: "document"
  }
];

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
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header Content */}
        <div className="px-6 md:px-10 pt-8 pb-6 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight text-white mb-2">
                Team Management
              </h1>
              <p className="text-[14px] md:text-[15px] font-medium text-slate-400 leading-relaxed">
                Oversee your elite engineering unit. Monitor individual performance velocity, project allocation, and team synergy in real-time.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3 hidden sm:flex">
                <div className="w-10 h-10 rounded-full border-2 border-[#0B0D14] bg-[#1a1c23] overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" alt="avatar" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#0B0D14] bg-[#1a1c23] overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede" alt="avatar" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#0B0D14] bg-[#1A1C23] flex items-center justify-center text-xs font-bold text-slate-300 z-10">
                  +12
                </div>
              </div>
              <button className="h-11 px-5 rounded-xl bg-[#6c61f8] hover:bg-[#5b52f6] text-white text-[13px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25">
                <UserPlus className="w-4 h-4" /> Invite Member
              </button>
            </div>
          </div>

          {/* Filters & Stats Row */}
          <div className="flex flex-col xl:flex-row justify-between gap-6 items-start xl:items-center">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-3">
              {["All Members", "Engineering", "Product Design", "Operations", "Marketing"].map((filter, i) => (
                <button
                  key={filter}
                  className={cn(
                    "px-4 py-2 rounded-full text-[13px] font-bold transition-all border",
                    i === 0
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      : "bg-[#1A1C23] text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-300"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Stats Block */}
            <div className="flex items-center gap-8 bg-[#12141D] border border-white/5 rounded-2xl px-8 py-3 shadow-xl">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">Utilization</span>
                <span className="text-xl font-black text-white">84%</span>
              </div>
              <div className="w-px h-10 bg-white/5"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">Open Seats</span>
                <span className="text-xl font-black text-white">3</span>
              </div>
              <div className="w-px h-10 bg-white/5"></div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">Velocity</span>
                <span className="text-xl font-black text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> 12.4
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 custom-scrollbar">
          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* Members Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : membersList.length === 0 ? (
                <div className="text-center py-20 bg-[#12141D] border border-white/5 rounded-2xl">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                  <p className="text-[14px] font-semibold text-slate-400">No team members found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {membersList.map(({ member, projectNames }, idx) => {
                    const isCurrentUser = member._id === (user as any)?._id || member._id === (user as any)?.id;
                    const role = mockRoles[idx % mockRoles.length];
                    const dept = mockDepts[idx % mockDepts.length];
                    const metric = mockMetrics[idx % mockMetrics.length];
                    const isActiveNow = idx % 3 === 1;

                    return (
                      <div
                        key={member._id}
                        className="group flex flex-col bg-[#12141D] border border-white/5 rounded-[20px] p-6 shadow-xl hover:bg-[#161925] hover:border-white/10 transition-all"
                      >
                        {/* Top Info */}
                        <div className="flex justify-between items-start mb-6">
                          <div className="relative">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-[#0B0D14]" />
                            ) : (
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-[#0B0D14]", getAvatarColor(member.name || "U"))}>
                                {getInitials(member.name || "U")}
                              </div>
                            )}
                            <div className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#12141D]", isActiveNow ? "bg-emerald-500" : "bg-slate-500")} />
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[9px] font-black px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/10 uppercase tracking-widest">
                              {role}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {isActiveNow ? "Active now" : `Active ${idx * 2 + 2}m ago`}
                            </span>
                          </div>
                        </div>

                        {/* Name & Dept */}
                        <div className="mb-6">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[18px] font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                              {member.name}
                            </h3>
                            {isCurrentUser && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-medium text-slate-400 mt-1 truncate">
                            {dept}
                          </p>
                        </div>

                        {/* Progress Bar Metric */}
                        <div className="mb-6">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">
                            <span>{metric.label}</span>
                            <span>{metric.val}</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: metric.val }}></div>
                          </div>
                        </div>

                        {/* Projects Pills */}
                        <div className="flex flex-wrap gap-2 mb-8">
                          {projectNames.slice(0, 3).map((pn) => (
                            <span key={pn} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/5 truncate max-w-[120px]">
                              {pn}
                            </span>
                          ))}
                          {projectNames.length > 3 && (
                            <span className="text-[11px] font-semibold px-2 py-1.5 rounded-lg bg-white/5 text-indigo-400">
                              +{projectNames.length - 3}
                            </span>
                          )}
                          {projectNames.length === 0 && (
                            <span className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-slate-500 border border-white/5">
                              No active projects
                            </span>
                          )}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex gap-2">
                            <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                              <Video className="w-4 h-4" />
                            </button>
                          </div>
                          <button className="text-[12px] font-bold text-slate-300 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
                            View Profile <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Add Member Card */}
                  <button className="group flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-white/10 rounded-[20px] p-6 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all min-h-[300px]">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <span className="text-[15px] font-bold text-white mb-1">Add Member</span>
                    <span className="text-[12px] font-medium text-slate-500 text-center">Grow your unit with top talent</span>
                  </button>
                </div>
              )}
            </div>

            {/* Activity Feed Sidebar */}
            <div className="w-full xl:w-[380px] shrink-0">
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 shadow-xl sticky top-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[15px] font-bold text-white">Activity Feed</h3>
                  <button className="text-[12px] font-bold text-slate-300 hover:text-indigo-400 transition-colors">
                    View All
                  </button>
                </div>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                  {activityFeed.map((item, i) => (
                    <div key={i} className="relative flex items-start gap-4 group">
                      <div className="w-8 h-8 rounded-full border-2 border-[#12141D] bg-[#1a1c23] shrink-0 flex items-center justify-center z-10 overflow-hidden relative">
                         {item.avatar === 'bot' ? (
                            <div className="w-full h-full bg-indigo-500 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-white"/></div>
                         ) : (
                            <img src={item.avatar} alt="user" className="w-full h-full object-cover" />
                         )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-[13px] font-medium text-slate-300 leading-snug">
                          <span className="font-bold text-white mr-1.5">{item.user}</span>
                          {item.action}
                        </p>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 block">
                          {item.time}
                        </span>
                        {item.quote && (
                          <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5 text-[12px] font-medium text-slate-400 italic">
                            {item.quote}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
