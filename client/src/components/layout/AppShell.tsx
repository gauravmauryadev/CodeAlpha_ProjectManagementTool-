"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import AppSidebar from "./AppSidebar";
import FloatingIcons from "./FloatingIcons";
import { User, LogOut, Sun, Moon, Menu } from "lucide-react";
import Link from "next/link";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    <div className="min-h-screen bg-[#eef2f6] dark:bg-gradient-to-br dark:from-[#07050F] dark:via-[#0E0A22] dark:to-[#05030A] text-slate-800 dark:text-slate-100 flex relative overflow-hidden">
      {/* Background ambient glows (Dark mode only to reduce light mode glare) */}
      <div className="hidden dark:block absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="hidden dark:block absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none z-0" />
      
      {/* Flying project management stickers background */}
      <FloatingIcons />
      
      <div className="relative z-10 flex flex-row w-full h-screen">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 md:ml-[72px] overflow-y-auto h-screen relative animate-fade-in-up">

          {/* Mobile Top Bar with Hamburger + Branding + Controls */}
          <div className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-[50] bg-white/70 dark:bg-[#0E0A22]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src="/logo.png" alt="OmniPlan" className="w-7 h-7 object-contain drop-shadow-md" />
                <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  Omni<span className="text-indigo-600 dark:text-indigo-500">Plan</span>
                </span>
              </Link>
            </div>
            {/* Right: Theme + Logout + Avatar */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:scale-105 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {user && (
                <>
                  <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <Link href="/profile" className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10 shadow-md overflow-hidden", !user.avatar && getAvatarColor(user.name || "U"))}>
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

          {/* Desktop Top Right Header Controls */}
          <div className="hidden md:flex absolute top-5 right-6 z-[100] items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 dark:bg-[#14112c]/40 border border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-lg hover:scale-105 transition-all text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white cursor-pointer"
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            
            {user && (
              <div className="group perspective-1000 relative">
                <Link href="/profile" className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/10 hover-lift shadow-lg animate-glow-pulse overflow-hidden", !user.avatar && getAvatarColor(user.name || "U"))}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user.name || "U")
                  )}
                </Link>
                
                {/* Hover Popup */}
                <div className="absolute top-full right-0 mt-3 w-64 bg-white/95 dark:bg-[#14112c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] translate-y-[-20px] scale-90 origin-top-right group-hover:translate-y-0 group-hover:scale-100">
                  <div className="px-3 py-3 border-b border-slate-200/50 dark:border-white/5 mb-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 hover:translate-x-1 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all duration-200 cursor-pointer">
                    <User className="w-4 h-4 text-indigo-400" /> My Profile
                  </Link>
                  <button onClick={() => useAuthStore.getState().logout()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 hover:translate-x-1 text-sm font-medium text-rose-400 transition-all duration-200 mt-1 cursor-pointer">
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
