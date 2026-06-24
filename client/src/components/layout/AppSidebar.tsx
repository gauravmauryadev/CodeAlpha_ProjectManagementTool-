"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
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
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/discord", icon: DiscordIcon, label: "Discord" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "#", icon: Bell, label: "Notifications" },
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
          // Base styles - always a vertical left sidebar
          "fixed left-0 top-0 h-screen bg-[#64748b] dark:bg-[#000000] border-r border-slate-500 dark:border-white/5 flex flex-col items-center justify-start py-5 shadow-2xl z-[60] transition-all duration-300",
          // Desktop - always visible
          "md:w-[72px] md:translate-x-0",
          // Mobile - slide in/out
          isOpen ? "w-[72px] translate-x-0" : "w-[72px] -translate-x-full md:translate-x-0"
        )}
      >
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all mb-2 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex w-12 h-12 rounded-xl bg-white/5 items-center justify-center hover:scale-105 transition-transform mb-4"
        >
          <img src="/logo.png" alt="OmniPlan" className="w-8 h-8 object-contain drop-shadow-md" />
        </Link>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center justify-center gap-1.5 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-300 dark:text-slate-400 hover:text-white hover:bg-indigo-500/20"
                )}
              >
                <item.icon className="w-6 h-6" />
                {/* Premium Tooltip */}
                <span className="absolute left-[56px] px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-[#14112c]/95 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap opacity-0 scale-95 translate-x-[-8px] group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 ease-out shadow-md">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Admin Link (conditional) */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              onClick={onClose}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                pathname === "/admin"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-300 dark:text-slate-400 hover:text-white hover:bg-indigo-500/20"
              )}
            >
              <Shield className="w-6 h-6" />
              <span className="absolute left-[56px] px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-[#14112c]/95 border border-slate-200/50 dark:border-white/5 backdrop-blur-xl text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap opacity-0 scale-95 translate-x-[-8px] group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-200 ease-out shadow-md">
                Admin Panel
              </span>
            </Link>
          )}
        </nav>

        {/* Logout at bottom */}
        <button
          onClick={() => { logout(); onClose(); }}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer mb-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>
    </>
  );
}
