"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useDiscordStore } from "@/store/useDiscordStore";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { getInitials } from "@/lib/utils";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const { joinServer } = useDiscordStore();
  
  const [serverDetails, setServerDetails] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const code = params.code as string;
    if (!code) return;

    const fetchServerDetails = async () => {
      try {
        const res = await api.get(`/discord/invite/${code}`);
        setServerDetails(res.data.server);
      } catch (err: any) {
        setError(err.response?.data?.message || "Invalid or expired invite.");
      } finally {
        setLoading(false);
      }
    };

    fetchServerDetails();
  }, [params.code]);

  const handleAcceptInvite = async () => {
    const code = params.code as string;
    if (!token) {
      sessionStorage.setItem("pendingInvite", code);
      router.push("/login");
      return;
    }

    setJoining(true);
    try {
      await joinServer(code);
      router.push("/discord");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to join server.");
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 dark:from-[#0E0A22] dark:via-[#050212] dark:to-[#0A051B] p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_60%)]" />
      
      <div className="bg-white dark:bg-[#313338] p-8 rounded-md shadow-sm max-w-[440px] w-full text-center relative z-10 border border-slate-200 dark:border-[#1e1f22]">
        {loading ? (
          <div className="py-12">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
            <p className="text-slate-500 dark:text-[#b5bac1] font-medium">Fetching invite details...</p>
          </div>
        ) : error ? (
          <div className="py-8">
            <div className="w-20 h-20 bg-slate-100 dark:bg-[#383a40] rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-[26px] font-extrabold text-slate-800 dark:text-[#f2f3f5] mb-3 leading-tight">Invite Invalid</h2>
            <p className="text-slate-500 dark:text-[#b5bac1] text-[15px] mb-8 leading-relaxed">This invite may have expired, or you might not have permission to join.</p>
            <button 
              onClick={() => router.push("/discord")}
              className="w-full bg-indigo-600 dark:bg-[#5865F2] hover:bg-indigo-700 dark:hover:bg-[#4752C4] text-white py-3.5 rounded-md text-[15px] font-semibold transition-colors shadow-sm shadow-indigo-500/20"
            >
              Continue to Discord
            </button>
          </div>
        ) : serverDetails && (
          <div className="py-6">
            <div className="w-24 h-24 bg-indigo-600 dark:bg-[#5865F2] rounded-md mx-auto flex items-center justify-center mb-6 text-4xl font-extrabold text-white shadow-sm shadow-indigo-500/20 transform hover:scale-105 transition-transform">
              {getInitials(serverDetails.name)}
            </div>
            <p className="text-slate-500 dark:text-[#b5bac1] text-[13px] font-bold uppercase tracking-widest mb-2">
              You've been invited to join a server
            </p>
            <h2 className="text-[32px] font-black text-slate-800 dark:text-[#f2f3f5] mb-4 leading-tight tracking-tight">
              {serverDetails.name}
            </h2>
            <div className="flex items-center justify-center gap-6 text-slate-500 dark:text-[#b5bac1] text-sm mb-10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#23a55a] shadow-[0_0_8px_rgba(35,165,90,0.6)]"></div>
                <span className="font-medium">{Math.max(1, Math.floor(serverDetails.memberCount * 0.4))} Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#80848e]"></div>
                <span className="font-medium">{serverDetails.memberCount} Members</span>
              </div>
            </div>

            <button 
              onClick={handleAcceptInvite}
              disabled={joining}
              className="w-full bg-indigo-600 dark:bg-[#5865F2] hover:bg-indigo-700 dark:hover:bg-[#4752C4] text-white py-4 rounded-md text-[16px] font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm shadow-indigo-500/20 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              {joining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                "Accept Invite"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
