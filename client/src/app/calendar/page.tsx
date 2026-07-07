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
  todo: { icon: Circle, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-300 dark:border-slate-600", label: "To Do" },
  inprogress: { icon: Loader2, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-400/30", label: "In Progress" },
  done: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-400/30", label: "Done" },
};

const priorityDot: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
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
        let combined: TaskItem[] = [];
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
            <h1 className="text-xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <CalendarIcon className="w-7 h-7 text-indigo-500" />
              Calendar
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1">
              View all task deadlines across your projects.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            { label: "Tasks This Month", value: stats.total, color: "text-indigo-500" },
            { label: "Completed", value: stats.done, color: "text-emerald-500" },
            { label: "Upcoming", value: stats.upcoming, color: "text-amber-500" },
            { label: "Overdue", value: stats.overdue, color: "text-rose-500" },
          ].map((s) => (
            <div
              key={s.label}
              className="p-4 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm text-center"
            >
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Grid */}
          <div className="flex-1 bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={goToPrevMonth}
                  className="w-8 h-8 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 min-w-[180px] text-center">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="w-8 h-8 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer active:scale-95"
              >
                Today
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
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
                        "relative min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 border-b border-r border-slate-100 dark:border-white/5 text-left transition-all cursor-pointer group hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5",
                        !isCurrentMonth && "opacity-30",
                        isSelected && "bg-indigo-50 dark:bg-indigo-500/10 ring-2 ring-inset ring-indigo-500/40"
                      )}
                    >
                      {/* Date Number */}
                      <div
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1",
                          isTodayDate
                            ? "bg-indigo-600 text-white font-bold"
                            : "text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        )}
                      >
                        {date.getDate()}
                      </div>

                      {/* Task dots / badges */}
                      {dayTasks.length > 0 && (
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 2).map((task) => (
                            <div
                              key={task._id}
                              className={cn(
                                "text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium border",
                                statusConfig[task.status]?.bg || statusConfig.todo.bg,
                                hasOverdue && task.status !== "done"
                                  ? "border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10"
                                  : ""
                              )}
                            >
                              <span className={cn("mr-1 inline-block w-1.5 h-1.5 rounded-full", priorityDot[task.priority] || priorityDot.low)} />
                              {task.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-[9px] text-indigo-500 dark:text-indigo-400 font-semibold px-1">
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
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="bg-white dark:bg-[#14112c]/45 border border-slate-200 dark:border-white/10 rounded-md shadow-sm sticky top-24">
              <div className="p-4 md:p-5 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a day"}
                </h3>
                {selectedDate && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? "s" : ""} scheduled
                  </p>
                )}
              </div>

              <div className="p-4 md:p-5 max-h-[500px] overflow-y-auto space-y-3">
                {!selectedDate ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Click on a date to see tasks
                    </p>
                  </div>
                ) : selectedDayTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-10 h-10 text-emerald-300 dark:text-emerald-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No tasks due on this day
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">You&apos;re all clear! 🎉</p>
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
                          "p-3.5 rounded-md border transition-all",
                          isOverdue
                            ? "border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5"
                            : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <StatusIcon
                            className={cn(
                              "w-4 h-4 mt-0.5 shrink-0",
                              isOverdue ? "text-rose-500" : cfg.color,
                              task.status === "inprogress" && "animate-spin"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                              {task.title}
                            </h4>
                            {(task as any)._projectName && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                                {(task as any)._projectName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize",
                                  task.priority === "high"
                                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                                    : task.priority === "medium"
                                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                )}
                              >
                                {task.priority}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                                  cfg.bg
                                )}
                              >
                                {cfg.label}
                              </span>
                              {isOverdue && (
                                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
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
