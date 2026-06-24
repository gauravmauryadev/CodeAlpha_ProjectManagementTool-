"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Layers, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { GoogleLogin } from "@react-oauth/google";
import FloatingIcons from "@/components/layout/FloatingIcons";

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
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden">
      <FloatingIcons />
      {/* Left: Branding Panel — Premium Animated */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 items-center justify-center p-12 overflow-hidden">
        {/* Animated Background Glow Orbs */}
        <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-indigo-400/15 rounded-full blur-[100px] animate-float pointer-events-none" />
        <div className="absolute bottom-[10%] right-[10%] w-[250px] h-[250px] bg-purple-400/15 rounded-full blur-[90px] animate-float pointer-events-none" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[60%] left-[50%] w-[180px] h-[180px] bg-pink-400/10 rounded-full blur-[70px] animate-float pointer-events-none" style={{ animationDelay: "4s" }} />

        <div className="relative z-10 max-w-md flex flex-col items-center text-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
            <img src="/logo.png" alt="OmniPlan" className="w-11 h-11 object-contain drop-shadow-lg animate-float" />
            <span className="text-xl font-bold text-slate-800">
              Omni<span className="text-indigo-600">Plan</span>
            </span>
          </div>

          {/* Floating Illustration */}
          <div className="relative mb-8 animate-fade-in-up flex justify-center" style={{ animationDelay: "150ms" }}>
            {/* Subtle Glow Behind Image */}
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl scale-110 animate-glow-pulse pointer-events-none" />
            
            <img
              src="/auth-illustration.png"
              alt="Team Collaboration"
              className="w-80 h-auto relative z-10 animate-float mix-blend-multiply contrast-125 saturate-110"
              style={{
                // Radial gradient mask to fade out the harsh edges of the fake checkerboard seamlessly into the background
                maskImage: "radial-gradient(circle at center, black 40%, transparent 75%)",
                WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 75%)"
              }}
            />
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-extrabold leading-tight mb-3 text-slate-900 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            Manage projects.
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Chat with your team.</span>
            <br />
            Ship faster.
          </h2>

          <p className="text-slate-500 leading-relaxed text-sm mb-8 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            Kanban boards, real-time messaging, and video calls — all in one
            beautiful workspace designed for modern teams.
          </p>

          {/* Animated Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
            {["Kanban Boards", "Team Chat", "Video Calls", "Admin Panel"].map((item, i) => (
              <span
                key={item}
                className="px-3 py-1.5 rounded-full border border-indigo-200 bg-white/80 text-indigo-700 text-xs font-semibold shadow-sm hover:shadow-md hover:border-indigo-400 hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                style={{ animationDelay: `${600 + i * 100}ms` }}
              >
                {item}
              </span>
            ))}
          </div>

          {/* Decorative dots */}
          <div className="mt-8 flex gap-2 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "200ms" }} />
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: "400ms" }} />
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/logo.png" alt="OmniPlan" className="w-8 h-8 object-contain drop-shadow-md" />
            <span className="text-lg font-bold text-slate-800">
              Omni<span className="text-indigo-600">Plan</span>
            </span>
          </div>

          <h1 className="text-2xl font-black mb-1.5">
            <span className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 bg-clip-text text-transparent animate-text-gradient">Welcome back</span>
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            Enter your credentials to access your workspace.
          </p>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm pr-12 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google login failed")}
                theme="outline"
                shape="rectangular"
                text="continue_with"
                size="large"
              />
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
            >
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
