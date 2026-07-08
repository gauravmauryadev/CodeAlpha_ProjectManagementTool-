"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import AppSidebar from "./AppSidebar";
import FloatingIcons from "./FloatingIcons";
import { User, LogOut, Sun, Moon, Menu, ArrowLeft, Search, Bell } from "lucide-react";
import Link from "next/link";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, syncProfile } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (mounted) {
      // Direct check of localStorage to prevent premature redirect during Zustand hydration
      const localToken = localStorage.getItem("token");
      const authStorage = localStorage.getItem("auth-storage");
      
      const hasStoredAuth = localToken || (authStorage && JSON.parse(authStorage).state?.token);

      if (!hasStoredAuth && (!token || !user)) {
        router.push("/login");
      }
    }
  }, [mounted, token, user, router]);

  useEffect(() => {
    if (mounted && token && user) {
      syncProfile();
    }
  }, [mounted, token, user, syncProfile]);

  // Render spinner during server-side render & before hydration on client
  if (!mounted || !token || !user) {
    return (
      <div className="min-h-screen bg-[#eef2f6] dark:bg-gradient-to-br dark:from-[#07050F] dark:via-[#0E0A22] dark:to-[#05030A] text-slate-800 dark:text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 flex relative overflow-hidden font-sans">
      <div className="relative z-10 flex flex-row w-full h-[100dvh]">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 md:ml-[260px] flex flex-col h-[100dvh] relative animate-fade-in-up">
          {/* Mobile Top Bar */}
          <div className="flex md:hidden items-center justify-between px-3 sm:px-4 py-3 sticky top-0 z-[50] bg-white/70 dark:bg-[#0E0A22]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5">
            {/* Left: Hamburger + Back + Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-200" />
              </button>
              
              {pathname !== "/dashboard" && pathname !== "/" && (
                <button
                  onClick={() => router.back()}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer flex-shrink-0 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-extrabold text-[10px] sm:text-xs tracking-tighter">OP</span>
                </div>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight hidden xs:block truncate">
                  Omni<span className="text-indigo-600 dark:text-indigo-500">Plan</span>
                </span>
              </Link>
            </div>
            {/* Right: Theme + Logout + Avatar */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:scale-105 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
              {user && (
                <>
                  <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <Link href="/profile" className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white ring-2 ring-white/10 shadow-sm overflow-hidden", !user.avatar && getAvatarColor(user.name || "U"))}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user.name || "U")
                    )}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Desktop Top Navbar */}
          <div className="hidden md:flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-md sticky top-0 z-[100]">
            {/* Search Bar */}
            <div className="relative w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search resources, projects..."
                className="w-full pl-10 pr-4 py-2 bg-[#121620] border border-white/5 rounded-full text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
            
            {/* Right Controls */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1 cursor-pointer group">
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Workspace</span>
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <button className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <Bell className="w-5 h-5" />
              </button>
              <button onClick={toggleTheme} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {user && (
                <Link href="/profile" className="flex items-center gap-3 ml-2 group cursor-pointer">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-bold text-white leading-tight">{user.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{user.role || "Member"}</p>
                  </div>
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden", !user.avatar && getAvatarColor(user.name || "U"))}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user.name || "U")
                    )}
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
