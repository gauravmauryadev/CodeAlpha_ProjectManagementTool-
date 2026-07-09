import Link from "next/link";
import { m as motion, LazyMotion, domAnimation } from "framer-motion";
import { Play, LayoutDashboard, TrendingUp, Bot } from "lucide-react";
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
      <div className="min-h-screen bg-[#070815] text-slate-100 relative overflow-hidden font-sans selection:bg-indigo-500/30">
        
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-[20%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

        {/* Navbar */}
        <motion.nav 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl z-50 rounded-full border border-white/5 bg-[#12141D]/90 backdrop-blur-2xl shadow-2xl"
        >
          <div className="px-6 h-[60px] flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">OmniPlan</span>
            </Link>

            {/* Links */}
            <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-400">
              <Link href="#" className="hover:text-white transition-colors">Features</Link>
              <Link href="#" className="hover:text-white transition-colors">Solutions</Link>
              <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-white transition-colors">Resources</Link>
              <Link href="#" className="hover:text-white transition-colors">Blog</Link>
            </div>

            {/* Auth */}
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-[13px] font-bold text-slate-300 hover:text-white transition-colors hidden sm:block">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2.5 text-[13px] font-bold bg-[#5b52f6] hover:bg-[#4a42d9] text-white rounded-full transition-colors shadow-lg shadow-indigo-500/25">
                Get Started
              </Link>
            </div>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6 relative z-10 min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[10px] font-black text-slate-300 tracking-[0.1em] uppercase mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                AI-Powered Workspace V2.0 is here
              </div>

              <h1 className="text-[52px] sm:text-[64px] lg:text-[76px] font-extrabold tracking-tight leading-[1.05] mb-6 text-white">
                Plan Smarter.<br />
                Build <span className="text-[#6c61f8]">Faster.</span><br />
                Deliver Better.
              </h1>

              <p className="text-[15px] sm:text-[17px] text-slate-400 max-w-lg mb-10 leading-relaxed font-semibold">
                The next generation project management engine designed for high-performance teams. Automate tedious tasks and focus on what matters with our AI-first infrastructure.
              </p>

              <div className="flex items-center gap-4 mb-14">
                <Link href="/register" className="h-12 px-8 rounded-xl bg-[#6c61f8] hover:bg-[#5b52f6] text-white text-[14px] font-bold flex items-center justify-center transition-all shadow-lg shadow-indigo-500/25 active:scale-95">
                  Start Free Trial
                </Link>
                <Link href="#" className="h-12 px-6 rounded-xl bg-[#1A1C23] border border-white/5 hover:bg-white/10 text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Play className="w-4 h-4 text-slate-400" /> Book Demo
                </Link>
                <button className="w-12 h-12 rounded-xl bg-[#1A1C23] border border-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-[3px] border-[#070815] bg-[#1a1c23] overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" alt="avatar" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-[3px] border-[#070815] bg-[#1a1c23] overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede" alt="avatar" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-[3px] border-[#070815] bg-[#1a1c23] overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&backgroundColor=ffdfbf" alt="avatar" />
                  </div>
                </div>
                <div className="text-[12px] font-bold text-slate-400">
                  Trusted by <span className="text-white">2,500+</span> engineering teams
                </div>
              </div>
            </motion.div>

            {/* Right Graphics */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative w-full aspect-[4/3] lg:aspect-square max-w-[600px] mx-auto lg:ml-auto mt-12 lg:mt-0"
            >
              {/* Main App Frame */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[75%] rounded-[24px] border border-white/5 bg-[#12141D]/50 backdrop-blur-xl shadow-2xl overflow-hidden p-6 flex flex-col gap-5">
                <div className="w-full flex-1 rounded-xl bg-white/5 border border-white/5"></div>
                <div className="w-full flex-1 flex gap-5">
                  <div className="flex-[2] rounded-xl bg-white/5 border border-white/5"></div>
                  <div className="flex-1 flex flex-col gap-5">
                    <div className="flex-1 rounded-xl bg-white/5 border border-white/5"></div>
                    <div className="flex-1 rounded-xl bg-white/5 border border-white/5"></div>
                  </div>
                </div>
              </div>

              {/* AI Assistant Floating Card */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[10%] right-[-5%] w-[260px] rounded-2xl border border-white/5 bg-[#171923]/90 p-4 shadow-2xl backdrop-blur-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#6c61f8]/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-[#6c61f8]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-white">AI Assistant</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Generating sprint plan...</div>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[70%] h-full bg-[#6c61f8] rounded-full"></div>
                </div>
              </motion.div>

              {/* Velocity Floating Card */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[5%] left-[-5%] w-[220px] rounded-2xl border border-white/5 bg-[#171923]/90 p-5 shadow-2xl backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">Velocity</span>
                  <TrendingUp className="w-3.5 h-3.5 text-[#6c61f8]" />
                </div>
                <div className="text-[28px] font-black text-white tracking-tight mb-5">+12.4%</div>
                <div className="flex items-end gap-2.5 h-[60px]">
                  <div className="flex-1 bg-white/10 rounded-[3px] h-[30%]"></div>
                  <div className="flex-1 bg-white/10 rounded-[3px] h-[50%]"></div>
                  <div className="flex-1 bg-white/10 rounded-[3px] h-[70%]"></div>
                  <div className="flex-1 bg-[#d4d1fb] rounded-[3px] h-[100%] shadow-[0_0_15px_rgba(212,209,251,0.3)]"></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

      </div>
    </LazyMotion>
  );
}
