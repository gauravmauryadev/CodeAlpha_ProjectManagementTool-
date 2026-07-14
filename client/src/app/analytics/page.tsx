"use client";

import { Calendar, DownloadCloud, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0">
          <div>
            <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight text-white mb-2">
              System Performance
            </h1>
            <p className="text-[14px] md:text-[15px] font-medium text-slate-400">
              Real-time velocity and efficiency metrics across all engineering squads.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => alert('Filter by last 30 days applied!')} className="h-11 px-4 rounded-xl bg-[#12141D] border border-white/5 hover:bg-white/5 text-slate-300 text-[13px] font-bold flex items-center gap-2 transition-all shadow-xl">
              <Calendar className="w-4 h-4 text-slate-400" /> Last 30 Days
            </button>
            <button onClick={() => alert('Exporting report...')} className="h-11 px-5 rounded-xl bg-[#6c61f8] hover:bg-[#5b52f6] text-white text-[13px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25">
              <DownloadCloud className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto custom-scrollbar pb-10">
          
          {/* Top Row */}
          <div className="lg:col-span-8 flex flex-col bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl relative overflow-hidden group">
            <div className="flex items-start justify-between mb-8 z-10">
              <div>
                <h3 className="text-[18px] font-bold text-white mb-1">Project Progress</h3>
                <p className="text-[12px] font-medium text-slate-400">Cumulative throughput vs. estimated roadmap</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#6c61f8]"></div>
                  <span className="text-[11px] font-bold text-white">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-500"></div>
                  <span className="text-[11px] font-bold text-slate-400">Projection</span>
                </div>
              </div>
            </div>

            {/* Glowing Spline Chart Mock */}
            <div className="flex-1 w-full relative min-h-[200px]">
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 800 200">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6c61f8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#12141D" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Area */}
                <path d="M0,180 C150,150 250,200 400,100 C500,20 650,150 800,20 L800,200 L0,200 Z" fill="url(#gradient)" />
                {/* Line */}
                <path d="M0,180 C150,150 250,200 400,100 C500,20 650,150 800,20" fill="none" stroke="#6c61f8" strokeWidth="5" filter="url(#glow)" strokeLinecap="round" />
                {/* Current Point */}
                <circle cx="450" cy="70" r="4" fill="white" className="animate-pulse" />
                <circle cx="450" cy="70" r="12" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="2" className="animate-ping" />
              </svg>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl flex flex-col">
            <h3 className="text-[18px] font-bold text-white mb-1">Team Workload</h3>
            <p className="text-[12px] font-medium text-slate-400 mb-8">Resource allocation distribution</p>
            
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px]">
              {/* Donut Chart Mock */}
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1A1C23" strokeWidth="12" />
                  {/* Backend 45% */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#6c61f8" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="138.16" className="transition-all duration-1000 ease-out" />
                  {/* Frontend 30% */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#5b52f6" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="175.84" strokeOpacity="0.6" className="transition-all duration-1000 ease-out" style={{ transformOrigin: "center", transform: "rotate(162deg)" }} />
                  {/* Design 15% */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="213.52" className="transition-all duration-1000 ease-out" style={{ transformOrigin: "center", transform: "rotate(270deg)" }} />
                  {/* QA 10% */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#c4b5fd" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="226.08" className="transition-all duration-1000 ease-out" style={{ transformOrigin: "center", transform: "rotate(324deg)" }} />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[28px] font-black text-white leading-none">124</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Tickets</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-y-4 mt-6">
              <div className="flex items-center gap-2"><Circle className="w-2.5 h-2.5 text-[#6c61f8] fill-current" /><span className="text-[11px] font-bold text-slate-300">Backend (45%)</span></div>
              <div className="flex items-center gap-2"><Circle className="w-2.5 h-2.5 text-[#5b52f6] fill-current opacity-60" /><span className="text-[11px] font-bold text-slate-300">Frontend (30%)</span></div>
              <div className="flex items-center gap-2"><Circle className="w-2.5 h-2.5 text-[#8b5cf6] fill-current" /><span className="text-[11px] font-bold text-slate-300">Design (15%)</span></div>
              <div className="flex items-center gap-2"><Circle className="w-2.5 h-2.5 text-[#c4b5fd] fill-current" /><span className="text-[11px] font-bold text-slate-400">QA (10%)</span></div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="lg:col-span-4 bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl flex flex-col relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[18px] font-bold text-white">Velocity</h3>
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest">+8.4%</span>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 h-[150px] mb-6">
              <div className="w-full bg-white/5 rounded-sm hover:bg-white/10 transition-colors h-[40%]"></div>
              <div className="w-full bg-white/5 rounded-sm hover:bg-white/10 transition-colors h-[55%]"></div>
              <div className="w-full bg-white/5 rounded-sm hover:bg-white/10 transition-colors h-[45%]"></div>
              <div className="w-full bg-white/5 rounded-sm hover:bg-white/10 transition-colors h-[70%]"></div>
              <div className="w-full bg-white/5 rounded-sm hover:bg-white/10 transition-colors h-[60%]"></div>
              <div className="w-full bg-white/5 rounded-sm hover:bg-white/10 transition-colors h-[85%]"></div>
              <div className="w-full bg-[#6c61f8] rounded-sm h-[100%] shadow-[0_0_15px_rgba(108,97,248,0.3)]"></div>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sprints 10-15</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg 42 Pts</span>
            </div>
          </div>

          <div className="lg:col-span-8 bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[18px] font-bold text-white">Weekly Productivity</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => alert('Navigated to previous week')} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
                <button onClick={() => alert('Navigated to next week')} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
            
            <div className="flex-1 relative flex flex-col h-[150px]">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
              </div>
              
              <div className="flex-1 flex items-end justify-between px-2 sm:px-6 relative z-10 gap-2 sm:gap-6 mt-4">
                {[
                  { d: "Mon", h1: "40%", h2: "30%" },
                  { d: "Tue", h1: "60%", h2: "45%" },
                  { d: "Wed", h1: "85%", h2: "55%" },
                  { d: "Thu", h1: "70%", h2: "65%" },
                  { d: "Fri", h1: "95%", h2: "80%" },
                  { d: "Sat", h1: "20%", h2: "10%" },
                  { d: "Sun", h1: "15%", h2: "15%" },
                ].map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="flex-1 w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div className="w-1/2 max-w-[12px] bg-white/10 group-hover:bg-white/20 transition-colors rounded-sm rounded-b-none" style={{ height: day.h2 }}></div>
                      <div className="w-1/2 max-w-[12px] bg-[#6c61f8]/80 group-hover:bg-[#6c61f8] transition-colors rounded-sm rounded-b-none" style={{ height: day.h1 }}></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between px-2 sm:px-6 mt-4">
                 {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="flex-1 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">{d}</div>
                 ))}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </AppShell>
  );
}
