"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListChecks,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  FolderKanban,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils";

type FilterStatus = "all" | "todo" | "inprogress" | "done";
type FilterPriority = "all" | "low" | "medium" | "high";

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("all");

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  // Collect all tasks across all projects
  const allTasks: Array<{
    task: any;
    projectName: string;
    projectId: string;
  }> = [];

  projects.forEach((project) => {
    if (project.tasks && Array.isArray(project.tasks)) {
      project.tasks.forEach((task: any) => {
        allTasks.push({
          task,
          projectName: project.name,
          projectId: project._id,
        });
      });
    }
  });

  // Apply filters
  const filteredTasks = allTasks.filter(({ task }) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter)
      return false;
    if (
      search &&
      !task.title?.toLowerCase().includes(search.toLowerCase()) &&
      !task.description?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const statusCounts = {
    all: allTasks.length,
    todo: allTasks.filter((t) => t.task.status === "todo").length,
    inprogress: allTasks.filter((t) => t.task.status === "inprogress").length,
    done: allTasks.filter((t) => t.task.status === "done").length,
  };

  const priorityColor: Record<string, string> = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    high: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  const statusIcon: Record<string, React.ReactNode> = {
    todo: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    inprogress: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  };

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 shrink-0">
          <div>
            <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight text-white mb-2">
              All Tasks
            </h1>
            <p className="text-[14px] md:text-[15px] font-medium text-slate-400">
              View and manage tasks across all your projects in one place.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 shrink-0">
          {(
            [
              { key: "all", label: "Total Tasks", color: "text-white" },
              { key: "todo", label: "To Do", color: "text-slate-400" },
              {
                key: "inprogress",
                label: "In Progress",
                color: "text-amber-400",
              },
              { key: "done", label: "Completed", color: "text-emerald-400" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={cn(
                "p-5 rounded-[20px] border transition-all text-left",
                statusFilter === s.key
                  ? "bg-indigo-500/10 border-indigo-500/20"
                  : "bg-[#12141D] border-white/5 hover:bg-white/5"
              )}
            >
              <div
                className={cn(
                  "text-[24px] font-black mb-1",
                  s.color
                )}
              >
                {statusCounts[s.key]}
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                {s.label}
              </div>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#12141D] border border-white/5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            {(["all", "low", "medium", "high"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[12px] font-bold border transition-all capitalize",
                  priorityFilter === p
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    : "bg-[#12141D] text-slate-400 border-white/5 hover:bg-white/5"
                )}
              >
                {p === "all" ? "All Priority" : p}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-20 bg-[#12141D] border border-white/5 rounded-2xl">
              <ListChecks className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
              <p className="text-[14px] font-semibold text-slate-400">
                No tasks found.
              </p>
              <p className="text-[12px] text-slate-500 mt-1">
                Try adjusting your filters or create tasks in a project.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(({ task, projectName, projectId }, idx) => (
                <div
                  key={task._id || idx}
                  onClick={() => router.push(`/board/${projectId}`)}
                  className="group flex flex-col md:flex-row md:items-center gap-4 p-5 bg-[#12141D] border border-white/5 rounded-[16px] hover:bg-[#161925] hover:border-white/10 transition-all cursor-pointer"
                >
                  {/* Status + Title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1 shrink-0">
                      {statusIcon[task.status] || statusIcon.todo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <FolderKanban className="w-3 h-3" /> {projectName}
                        </span>
                        {task.dueDate && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{" "}
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0 ml-7 md:ml-0">
                    {task.priority && (
                      <span
                        className={cn(
                          "text-[10px] font-black px-2.5 py-1 rounded-md border uppercase tracking-widest",
                          priorityColor[task.priority] ||
                            priorityColor.low
                        )}
                      >
                        {task.priority}
                      </span>
                    )}
                    {task.assignee && typeof task.assignee === "object" && (
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                          getAvatarColor(task.assignee.name || "U")
                        )}
                        title={task.assignee.name}
                      >
                        {getInitials(task.assignee.name || "U")}
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
