"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Circle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { taskApi } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────
interface TaskItem {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  project?: any;
  assignee?: any;
}

// ─── Helpers ─────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function isPast(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  todo: { icon: Circle, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20 text-slate-300", label: "To Do" },
  inprogress: { icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20 text-blue-300", label: "In Progress" },
  done: { icon: CheckCircle2, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20 text-purple-300", label: "Done" },
};

const priorityDot: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-purple-400",
  low: "bg-blue-400",
};

// ─── Component ───────────────────────────────
export default function CalendarPage() {
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();

  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ─── Fetch all tasks across projects ───
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const load = async () => {
      if (projects.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          projects.map((p) => taskApi.getByProject(p._id).catch(() => null))
        );
        const combined: TaskItem[] = [];
        results.forEach((res, idx) => {
          if (!res?.data?.tasks) return;
          let tasks = res.data.tasks;
          if (tasks && !Array.isArray(tasks) && typeof tasks === "object") {
            tasks = [...(tasks.todo || []), ...(tasks.inprogress || []), ...(tasks.done || [])];
          }
          if (Array.isArray(tasks)) {
            combined.push(
              ...tasks.map((t: any) => ({ ...t, _projectName: projects[idx]?.name }))
            );
          }
        });
        setAllTasks(combined);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projects]);

  // ─── Build calendar grid ───
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Previous month padding
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to 42 for 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // ─── Map tasks to dates ───
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    allTasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = new Date(task.dueDate).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [allTasks]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const tasksThisMonth = allTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    return {
      total: tasksThisMonth.length,
      done: tasksThisMonth.filter((t) => t.status === "done").length,
      overdue: tasksThisMonth.filter(
        (t) => t.status !== "done" && t.dueDate && isPast(new Date(t.dueDate))
      ).length,
      upcoming: tasksThisMonth.filter(
        (t) => t.status !== "done" && t.dueDate && !isPast(new Date(t.dueDate))
      ).length,
    };
  }, [allTasks, month, year]);

  // ─── Selected date tasks ───
  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate.get(selectedDate.toDateString()) || [];
  }, [selectedDate, tasksByDate]);

  // ─── Navigation ───
  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold text-white tracking-tight flex items-center gap-3">
              <CalendarIcon className="w-7 h-7 text-indigo-500" />
              Calendar
            </h1>
            <p className="text-[13px] text-slate-400 font-medium mt-1">
              View all task deadlines across your projects.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Tasks This Month", value: stats.total, color: "text-indigo-400" },
            { label: "Completed", value: stats.done, color: "text-emerald-400" },
            { label: "Upcoming", value: stats.upcoming, color: "text-amber-400" },
            { label: "Overdue", value: stats.overdue, color: "text-rose-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="p-5 bg-[#12141D] border border-white/5 rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className={cn("text-3xl font-black tracking-tight", s.color)}>{s.value}</div>
              <div className="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Grid */}
          <div className="flex-1 bg-[#12141D] border border-white/5 rounded-2xl shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/5 bg-[#12141D] relative z-20">
              <div className="flex items-center gap-4">
                <button
                  onClick={goToPrevMonth}
                  className="w-9 h-9 rounded-xl bg-[#1A1C23] border border-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h2 className="text-xl font-bold text-white min-w-[180px] text-center tracking-tight">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="w-9 h-9 rounded-xl bg-[#1A1C23] border border-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer active:scale-95"
              >
                Today
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-[#161925]/50">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                  const dateKey = date.toDateString();
                  const dayTasks = tasksByDate.get(dateKey) || [];
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);
                  const hasOverdue =
                    dayTasks.some((t) => t.status !== "done") && isPast(date) && !isTodayDate;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "relative min-h-[100px] md:min-h-[120px] p-2 border-b border-r border-white/5 text-left transition-all cursor-pointer group hover:bg-white/5",
                        !isCurrentMonth && "opacity-20",
                        isSelected && "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/50"
                      )}
                    >
                      {/* Date Number */}
                      <div
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1.5",
                          isTodayDate
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 group-hover:text-white"
                        )}
                      >
                        {date.getDate()}
                      </div>

                      {/* Task dots / badges */}
                      {dayTasks.length > 0 && (
                        <div className="space-y-1">
                          {dayTasks.slice(0, 2).map((task) => (
                            <div
                              key={task._id}
                              className={cn(
                                "text-[10px] leading-tight px-1.5 py-1 rounded-md truncate font-semibold border flex items-center",
                                statusConfig[task.status]?.bg || statusConfig.todo.bg,
                                hasOverdue && task.status !== "done"
                                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                                  : "text-slate-300"
                              )}
                            >
                              <span className={cn("mr-1.5 shrink-0 inline-block w-1.5 h-1.5 rounded-full", priorityDot[task.priority] || priorityDot.low)} />
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-[10px] text-indigo-400 font-bold px-1.5">
                              +{dayTasks.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar - Selected Day Details */}
          <div className="w-full lg:w-[380px] shrink-0">
            <div className="bg-[#12141D] border border-white/5 rounded-2xl shadow-xl sticky top-24 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>
              
              <div className="p-5 md:p-6 border-b border-white/5 relative z-20">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a day"}
                </h3>
                {selectedDate && (
                  <p className="text-[13px] font-medium text-slate-400 mt-1">
                    {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? "s" : ""} scheduled
                  </p>
                )}
              </div>

              <div className="p-5 max-h-[500px] overflow-y-auto space-y-3 custom-scrollbar">
                {!selectedDate ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                    <p className="text-[13px] font-semibold text-slate-400">
                      Click on a date to see tasks
                    </p>
                  </div>
                ) : selectedDayTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                    <p className="text-[13px] font-semibold text-slate-400">
                      No tasks due on this day
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">You're all clear! 🎉</p>
                  </div>
                ) : (
                  selectedDayTasks.map((task) => {
                    const cfg = statusConfig[task.status] || statusConfig.todo;
                    const StatusIcon = cfg.icon;
                    const isOverdue = task.status !== "done" && task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

                    return (
                      <div
                        key={task._id}
                        className={cn(
                          "p-4 rounded-xl border transition-all hover:bg-white/5",
                          isOverdue
                            ? "border-rose-500/20 bg-rose-500/5"
                            : "border-white/5 bg-[#161925]"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <StatusIcon
                            className={cn(
                              "w-4 h-4 mt-0.5 shrink-0",
                              isOverdue ? "text-rose-400" : cfg.color,
                              task.status === "inprogress" && "animate-spin"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-bold text-slate-200 leading-snug">
                              {task.title}
                            </h4>
                            {(task as any)._projectName && (
                              <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
                                {(task as any)._projectName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                  task.priority === "high"
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : task.priority === "medium"
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                )}
                              >
                                {task.priority}
                              </span>
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                  cfg.bg
                                )}
                              >
                                {cfg.label}
                              </span>
                              {isOverdue && (
                                <span className="text-[9px] font-bold text-rose-400 flex items-center gap-1 uppercase tracking-wider">
                                  <AlertTriangle className="w-3 h-3" />
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
