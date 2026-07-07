"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Users,
  Settings,
  Bell,
  Shield,
  LogOut,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 127.14 96.36"
    fill="currentColor"
    {...props}
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.5,2.92-2.3a75.6,75.6,0,0,0,72.16,0c.93.8,1.91,1.57,2.92,2.3a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,50.7,122.64,27.78,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
  </svg>
);

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Summary" },
  { href: "/discord", icon: FolderKanban, label: "Board" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/teams", icon: Users, label: "Teams" },
];

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <>
      {/* Dark overlay when sidebar is open on mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          "fixed left-0 top-0 h-screen bg-[#FFFFFF] dark:bg-[#1e1e1e] border-r border-slate-200 dark:border-white/5 flex flex-col py-5 shadow-sm z-[60] transition-all duration-300",
          // Desktop - always visible expanded
          "md:w-[240px] md:translate-x-0",
          // Mobile - slide in/out
          isOpen ? "w-[240px] translate-x-0" : "w-[240px] -translate-x-full md:translate-x-0"
        )}
      >
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="md:hidden w-10 h-10 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all mb-2 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-6 mb-8 mt-2 transition-transform hover:scale-[1.02]"
          title="OmniPlan"
        >
          <div className="flex w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-extrabold text-lg tracking-tighter">OP</span>
          </div>
          <span className="text-slate-800 dark:text-white font-bold text-xl tracking-tight hidden md:block">OmniPlan</span>
        </Link>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "w-full h-12 rounded-md flex items-center gap-3 px-4 transition-all group",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-medium"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Admin Link (conditional) */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              onClick={onClose}
              className={cn(
                "w-full h-12 rounded-md flex items-center gap-3 px-4 transition-all group mt-2",
                pathname === "/admin"
                  ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-medium"
              )}
            >
              <Shield className="w-5 h-5 shrink-0" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Logout at bottom */}
        <div className="px-4 w-full mt-auto">
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full h-12 rounded-md flex items-center gap-3 px-4 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-all cursor-pointer mb-2 font-medium"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
