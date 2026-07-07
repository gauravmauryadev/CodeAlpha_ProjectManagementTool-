"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import AppSidebar from "./AppSidebar";
import FloatingIcons from "./FloatingIcons";
import { User, LogOut, Sun, Moon, Menu, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0e0e11] text-slate-900 dark:text-slate-100 flex relative overflow-hidden">
      <div className="relative z-10 flex flex-row w-full h-[100dvh]">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 md:ml-[240px] overflow-y-auto h-[100dvh] relative animate-fade-in-up">

          {/* Mobile Top Bar with Hamburger + Branding + Controls */}
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

          {/* Desktop Top Left Back Button */}
          {pathname !== "/dashboard" && pathname !== "/" && !pathname.startsWith("/board") && (
            <div className="hidden md:flex absolute top-5 left-8 z-[100] items-center">
              <button
                onClick={() => router.back()}
                className="px-4 h-10 rounded-full flex items-center justify-center gap-2 bg-white/40 dark:bg-[#14112c]/40 border border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white cursor-pointer font-bold text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          )}

          {/* Desktop Top Right Header Controls */}
          <div className="hidden md:flex absolute top-5 right-6 z-[100] items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 dark:bg-[#14112c]/40 border border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white cursor-pointer"
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            
            {user && (
              <div className="group perspective-1000 relative">
                <Link href="/profile" className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/10 hover-lift shadow-sm animate-glow-pulse overflow-hidden", !user.avatar && getAvatarColor(user.name || "U"))}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user.name || "U")
                  )}
                </Link>
                
                {/* Hover Popup */}
                <div className="absolute top-full right-0 mt-3 w-64 bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-md p-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] translate-y-[-20px] scale-90 origin-top-right group-hover:translate-y-0 group-hover:scale-100">
                  <div className="px-3 py-3 border-b border-slate-200/50 dark:border-white/5 mb-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 hover:translate-x-1 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 cursor-pointer">
                    <User className="w-4 h-4 text-indigo-400" /> My Profile
                  </Link>
                  <button onClick={() => useAuthStore.getState().logout()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md hover:bg-rose-500/10 hover:translate-x-1 text-sm font-medium text-rose-400 transition-all duration-200 mt-1 cursor-pointer">
                    <LogOut className="w-4 h-4 text-rose-400" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
