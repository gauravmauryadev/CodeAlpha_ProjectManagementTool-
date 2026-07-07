"use client";

import Link from "next/link";
import { m as motion, LazyMotion, domAnimation } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Video,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
  ChevronRight
} from "lucide-react";
import FloatingIcons from "@/components/layout/FloatingIcons";

const features = [
  {
    icon: LayoutDashboard,
    title: "Kanban Boards",
    description: "Drag-and-drop task management with real-time sync across your entire team.",
    gradient: "from-indigo-500 to-purple-600",
    glowColor: "rgba(99, 102, 241, 0.4)",
    tag: "Core",
  },
  {
    icon: MessageSquare,
    title: "Team Chat",
    description: "Discord-style channels for every project. Text, voice, and video built in.",
    gradient: "from-emerald-500 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.4)",
    tag: "Real-time",
  },
  {
    icon: Video,
    title: "Video Calls",
    description: "LiveKit-powered HD group video calls with screen sharing and noise suppression.",
    gradient: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.4)",
    tag: "HD Quality",
  },
  {
    icon: Shield,
    title: "Admin Control",
    description: "Full admin dashboard with god-mode access to all projects, users, and analytics.",
    gradient: "from-rose-500 to-pink-600",
    glowColor: "rgba(244, 63, 94, 0.4)",
    tag: "Enterprise",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LandingPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token, router]);

  return (
    <LazyMotion features={domAnimation}>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 dark:from-[#0e0e11] dark:via-[#14112c] dark:to-[#0e0e11] text-slate-800 dark:text-slate-100 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      <FloatingIcons />
      
      {/* Background Aurora / Spotlight effect (Light Theme) */}
      <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/20 blur-[120px] transform-gpu" />
        <div className="absolute bottom-[10%] right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-400/20 blur-[150px] transform-gpu" />
      </div>

      {/* NAV */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/50 dark:border-white/5 bg-white/40 dark:bg-[#0e0e11]/60 backdrop-blur-xl shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="OmniPlan" className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Omni<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Plan</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors hidden sm:block"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors shadow-sm shadow-indigo-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="pt-40 pb-20 px-6 relative z-10 flex flex-col items-center justify-center min-h-screen text-center">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-white/60 dark:bg-indigo-500/10 backdrop-blur-md text-sm text-indigo-700 dark:text-indigo-400 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold">The Next Generation of Team Collaboration</span>
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-6 md:mb-8 text-slate-900 dark:text-white">
            Where Projects
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-text-gradient bg-300%">
              Meet Communication.
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed font-medium px-4 md:px-0">
            Combine Kanban boards, Discord-style chat, and HD video calls in one powerful, unified workspace. Stop switching tabs and start shipping faster.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4 px-4 sm:px-0">
            <Link
              href="/register"
              className="group relative inline-flex h-12 sm:h-14 items-center justify-center overflow-hidden rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 px-6 sm:px-8 font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:scale-105 hover:shadow-indigo-500/40"
            >
              <span className="mr-2">Start for Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 sm:h-14 items-center justify-center rounded-md border border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/5 px-6 sm:px-8 font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all hover:bg-white/90 dark:hover:bg-white/10 hover:scale-105 shadow-sm"
            >
              View Dashboard
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 md:mt-16 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free forever plan</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited Real-time Chat</span>
          </motion.div>
        </motion.div>

        {/* Floating App Preview - Light Theme */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, type: "spring", bounce: 0.3 }}
          className="mt-24 w-full max-w-6xl mx-auto rounded-md border border-white/80 dark:border-white/10 bg-white/40 dark:bg-white/5 p-2 backdrop-blur-xl shadow-sm shadow-indigo-500/15"
        >
          <div className="rounded-md overflow-hidden bg-slate-50 aspect-[16/9] relative border border-slate-200 flex items-center justify-center shadow-inner">
            {/* Fake App UI Mockup via CSS (Light Mode) */}
            <div className="absolute inset-0 bg-slate-50 flex">
               {/* Left Sidebar */}
               <div className="w-16 border-r border-slate-200 bg-white flex flex-col items-center py-4 gap-4">
                  <div className="w-10 h-10 rounded-md bg-indigo-600 shadow-sm shadow-indigo-200" />
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
               </div>
               
               {/* Main Content Area */}
               <div className="flex-1 flex flex-col">
                  {/* Header */}
                  <div className="h-14 border-b border-slate-200 bg-white flex items-center px-6">
                    <div className="w-32 h-4 rounded-md bg-slate-200" />
                  </div>
                  {/* Kanban Columns */}
                  <div className="flex-1 p-6 flex gap-4 bg-slate-50/50">
                     <div className="flex-1 bg-white rounded-md border border-slate-200 shadow-sm flex flex-col p-4 gap-3">
                        <div className="w-20 h-3 rounded bg-slate-200" />
                        <div className="h-24 rounded-lg bg-indigo-50 border border-indigo-100" />
                        <div className="h-24 rounded-lg bg-slate-50 border border-slate-100" />
                     </div>
                     <div className="flex-1 bg-white rounded-md border border-slate-200 shadow-sm flex flex-col p-4 gap-3">
                        <div className="w-24 h-3 rounded bg-slate-200" />
                        <div className="h-24 rounded-lg bg-orange-50 border border-orange-100" />
                     </div>
                     <div className="flex-1 bg-white rounded-md border border-slate-200 shadow-sm flex flex-col p-4 gap-3">
                        <div className="w-16 h-3 rounded bg-slate-200" />
                        <div className="h-24 rounded-lg bg-emerald-50 border border-emerald-100" />
                        <div className="h-24 rounded-lg bg-slate-50 border border-slate-100" />
                     </div>
                  </div>
               </div>

               {/* Right Sidebar (Discord) */}
               <div className="w-72 border-l border-slate-200 bg-white p-4 flex flex-col">
                  {/* Video Call Active Box */}
                  <div className="h-40 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-200 mb-4 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  {/* Chat Area */}
                  <div className="flex-1 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-end p-3">
                     <div className="h-8 rounded-lg bg-slate-200 w-full" />
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-5 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Powerful Features
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 md:mb-6 text-slate-900 dark:text-white leading-tight">
              Everything your team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">needs</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Replace multiple tools with one unified workspace designed for modern, remote teams.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative p-8 rounded-md bg-white/70 dark:bg-[#14112c]/45 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm shadow-slate-200/50 dark:shadow-none hover:bg-white dark:hover:bg-[#14112c]/70 hover:shadow-sm hover:shadow-indigo-500/10 transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${f.gradient} transition-opacity duration-500`} />
                <div className={`w-14 h-14 rounded-md bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 shadow-sm relative z-10`}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white relative z-10">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed relative z-10 font-medium">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50/60 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-bold mb-5 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              Simple Process
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3 md:mb-4 text-slate-900 dark:text-white">
              How it <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">works</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
              Get your team up and running in 4 simple steps.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: "01", title: "CREATE ACCOUNT", desc: "Sign up for free in seconds. No credit card needed." },
              { num: "02", title: "SET UP PROJECT", desc: "Create a Kanban board and invite your team members." },
              { num: "03", title: "COLLABORATE", desc: "Chat in real-time with Discord-style channels." },
              { num: "04", title: "SHIP FASTER", desc: "Track progress and deliver projects on time." },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-6 rounded-md bg-white/70 dark:bg-[#14112c]/45 backdrop-blur-sm shadow-sm border border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-[#14112c]/70 transition-all duration-300"
              >
                <span className="text-4xl font-black mb-4 block tracking-tight bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent group-hover:scale-105 origin-left transition-transform duration-300">
                  {step.num}
                </span>
                <h4 className="text-sm font-extrabold uppercase tracking-wider mb-3 text-slate-800 dark:text-slate-200">
                  {step.title}
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed font-medium">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK & INTEGRATIONS */}
      <section className="py-24 px-6 relative z-10 border-y border-indigo-100/50 dark:border-white/5 bg-white/30 dark:bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-200 dark:border-teal-500/30 bg-teal-50/60 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-bold mb-5 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-teal-500" />
              Built for Scale
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 md:mb-4 text-slate-900 dark:text-white">
              Powered by modern <span className="bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent">technology</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
              Our platform uses industry-standard tools and APIs to ensure maximum performance, security, and reliability.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "LiveKit", desc: "HD Video Calling", icon: Video, color: "text-amber-500", bg: "bg-amber-50" },
              { name: "Discord", desc: "WidgetBot Chat", icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-50" },
              { name: "MongoDB", desc: "Cloud Database", icon: Layers, color: "text-emerald-500", bg: "bg-emerald-50" },
              { name: "Cloudinary", desc: "Media Storage", icon: Zap, color: "text-blue-500", bg: "bg-blue-50" },
              { name: "JWT Auth", desc: "Secure Login", icon: Shield, color: "text-rose-500", bg: "bg-rose-50" },
            ].map((tech, i) => (
              <motion.div 
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center justify-center p-6 rounded-md bg-white dark:bg-[#14112c]/45 shadow-sm shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/10 hover:-translate-y-1 transition-all"
              >
                <div className={`w-12 h-12 rounded-md ${tech.bg} flex items-center justify-center mb-4`}>
                  <tech.icon className={`w-6 h-6 ${tech.color}`} />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{tech.name}</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">{tech.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-24 px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-[3rem] overflow-hidden relative shadow-sm shadow-indigo-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
          <div className="relative p-8 sm:p-12 md:p-24 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-4 md:mb-6 leading-tight">
              Ready to transform your workflow?
            </h2>
            <p className="text-lg sm:text-xl text-indigo-100 mb-8 md:mb-10 max-w-2xl mx-auto">
              Join the new standard of project management. No credit card required. Free forever.
            </p>
            <Link
              href="/register"
              className="inline-flex h-12 sm:h-14 items-center justify-center rounded-md bg-white px-8 sm:px-10 font-bold text-indigo-600 transition-all hover:scale-105 hover:shadow-sm hover:shadow-white/20 w-full sm:w-auto"
            >
              Create Free Workspace
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/5 md:backdrop-blur-md py-12 px-6 relative z-10 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="OmniPlan" className="w-6 h-6 object-contain" />
            <span className="font-bold text-slate-900 dark:text-white">OmniPlan</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} Developed by Gaurav Maurya.
          </p>
        </div>
      </footer>
    </div>
    </LazyMotion>
  );
}
