"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      const pendingInvite = sessionStorage.getItem("pendingInvite");
      if (pendingInvite) {
        sessionStorage.removeItem("pendingInvite");
        router.push("/invite/" + pendingInvite);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Login failed. Check your credentials.";
      setError(msg);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    if (credentialResponse.credential) {
      try {
        await googleLogin(credentialResponse.credential);
        const pendingInvite = sessionStorage.getItem("pendingInvite");
        if (pendingInvite) {
          sessionStorage.removeItem("pendingInvite");
          router.push("/invite/" + pendingInvite);
        } else {
          router.push("/dashboard");
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || "Google Login failed.";
        setError(msg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Top Navbar */}
      <div className="w-full flex items-center justify-between p-6 lg:px-10 z-50">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="OmniPlan" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold text-white tracking-tight">OmniPlan</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-sm text-slate-300 hover:text-white font-medium transition-colors hidden sm:block cursor-pointer">Support</button>
          <Link href="/register" className="text-sm bg-purple-200/10 hover:bg-purple-200/20 text-purple-200 px-4 py-2 rounded-full font-medium transition-colors border border-purple-500/20">
            Request Access
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center lg:px-10 pb-10 gap-8 lg:gap-16 z-10 w-full max-w-7xl mx-auto">
        
        {/* Left Side: 3D Illustration / Graphic */}
        <div className="hidden lg:flex flex-col flex-1 w-full relative h-[600px] bg-gradient-to-b from-[#151928] to-[#0d101b] rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
          {/* Decorative floating elements simulating the image */}
          <div className="absolute top-10 left-1/4 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] animate-pulse"></div>
          <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-blue-500/15 rounded-full blur-[80px]"></div>
          
          {/* Floating glass blocks */}
          <div className="absolute top-20 right-20 w-28 h-28 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl rotate-12 animate-float shadow-xl"></div>
          <div className="absolute bottom-32 left-16 w-36 h-36 bg-white/5 backdrop-blur-md border border-white/10 rounded-full animate-float shadow-2xl" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 right-10 w-20 h-20 bg-purple-500/10 backdrop-blur-lg border border-purple-500/20 rounded-lg -rotate-12 animate-float shadow-lg" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 right-40 w-16 h-16 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-sm rotate-45 animate-float" style={{ animationDelay: '1.5s' }}></div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full p-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-slate-300 uppercase mb-8 shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
              Enterprise Ready
            </div>
            
            <h1 className="text-5xl md:text-[56px] font-extrabold tracking-tight text-white leading-[1.05] mb-6">
              Experience the <br />
              next dimension <br />
              of SaaS.
            </h1>
            
            <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto leading-relaxed font-medium">
              Join 2,000+ teams building high-performance systems with OmniPlan's automated infrastructure.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-[440px] flex-shrink-0 px-6 lg:px-0">
          <div className="bg-[#12141D] rounded-[28px] p-8 sm:p-10 border border-white/5 shadow-2xl relative overflow-hidden">
            {/* Subtle highlight top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-8 font-medium">Enter your details to access your workspace.</p>

            {error && (
              <div className="mb-6 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="w-full mb-6 flex justify-center bg-[#1A1C23] border border-white/5 rounded-xl overflow-hidden hover:bg-white/5 transition-colors">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google login failed")}
                theme="filled_black"
                shape="rectangular"
                text="continue_with"
                size="large"
              />
            </div>

            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Or continue with email</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0B0F19] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <Link href="#" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Forgot?</Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-[#0B0F19] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-sm transition-all tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center pt-1 pb-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded-md border-white/10 bg-[#0B0F19] text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
                />
                <label htmlFor="remember" className="ml-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#D2A8FF] hover:bg-[#c490ff] text-[#1e1e1e] text-sm font-extrabold shadow-[0_0_20px_rgba(210,168,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin border-black" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400 font-medium">
              Don't have an account?{" "}
              <Link href="/register" className="text-[#D2A8FF] hover:text-white transition-colors font-bold">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between p-6 lg:px-10 text-[11px] font-semibold text-slate-500 z-50">
        <p>© 2024 OmniPlan Systems Inc. All rights reserved.</p>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <Link href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-slate-400 transition-colors">Security</Link>
          <Link href="#" className="hover:text-slate-400 transition-colors">Status</Link>
        </div>
      </div>
    </div>
  );
}
