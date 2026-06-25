"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Save, Loader2, Mail, Calendar, Shield, CheckCircle2, XCircle, ExternalLink, Unlink } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi, githubApi } from "@/lib/api";
import { cn, getInitials, getAvatarColor, formatDate } from "@/lib/utils";

// Custom GitHub icon (lucide-react doesn't include brand icons)
const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

function ProfileContent() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [banner, setBanner] = useState((user as any)?.banner || "");
  const [discordId, setDiscordId] = useState((user as any)?.discordId || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // GitHub Integration State
  const searchParams = useSearchParams();
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; username: string | null }>({ connected: false, username: null });
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubMsg, setGithubMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch GitHub connection status
  useEffect(() => {
    const fetchGithubStatus = async () => {
      try {
        const res = await githubApi.getStatus();
        setGithubStatus({ connected: res.data.connected, username: res.data.username });
      } catch { /* ignore */ }
      setGithubLoading(false);
    };
    fetchGithubStatus();
  }, []);

  // Check for GitHub callback query params
  useEffect(() => {
    const githubParam = searchParams.get("github");
    const username = searchParams.get("username");
    if (githubParam === "connected" && username) {
      setGithubStatus({ connected: true, username });
      setGithubMsg({ type: "success", text: `GitHub connected as @${username}!` });
    } else if (githubParam === "error") {
      setGithubMsg({ type: "error", text: "Failed to connect GitHub. Please try again." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.avatar) setAvatar(user.avatar);
      if ((user as any).banner) setBanner((user as any).banner);
      if ((user as any).discordId) setDiscordId((user as any).discordId);
    }
  }, [user]);

  const handleGithubConnect = () => {
    window.location.href = githubApi.getLoginUrl();
  };

  const handleGithubDisconnect = async () => {
    try {
      await githubApi.disconnect();
      setGithubStatus({ connected: false, username: null });
      setGithubMsg({ type: "success", text: "GitHub disconnected." });
    } catch {
      setGithubMsg({ type: "error", text: "Failed to disconnect GitHub." });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size should be less than 2MB" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setMessage({ type: "error", text: "Cover image size should be less than 4MB" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBanner(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const data: Record<string, string> = { name };
      if (avatar !== user?.avatar) {
        data.avatar = avatar;
      }
      if (banner !== (user as any)?.banner) {
        data.banner = banner;
      }
      if (discordId !== (user as any)?.discordId) {
        data.discordId = discordId;
      }
      if (newPassword) {
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
      }
      const res = await authApi.updateProfile(data);
      if (res.data?.user) setUser(res.data.user);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile. Ensure image is < 10MB." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Profile Header */}
        <div className="relative mb-10">
          {/* Banner */}
          <div className="group relative h-36 rounded-2xl border-2 border-transparent shadow-sm overflow-hidden bg-white dark:bg-[#14112c] animate-border-pulse">
            {banner ? (
              <img src={banner} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20" />
            )}
            
            <label className="absolute top-4 right-4 p-2 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200 text-white flex items-center gap-2 shadow-lg">
              <Camera className="w-4 h-4" />
              <span className="text-xs font-semibold">Change Cover</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
          </div>
          
          {/* Avatar */}
          <div className="absolute -bottom-10 md:-bottom-10 left-4 md:left-8 flex flex-col md:flex-row items-start md:items-end gap-2 md:gap-5 z-10">
            <div className="relative group">
              {avatar ? (
                <img src={avatar} alt={user?.name || "Avatar"} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl ring-4 ring-white dark:ring-[#0E0A22] object-cover shadow-xl bg-slate-100 dark:bg-[#14112c]" />
              ) : (
                <div className={cn("w-20 h-20 md:w-24 md:h-24 rounded-2xl ring-4 ring-white dark:ring-[#0E0A22] flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-xl", getAvatarColor(user?.name || "U"))}>
                  {getInitials(user?.name || "User")}
                </div>
              )}
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl cursor-pointer transition-all duration-200">
                <Camera className="w-6 h-6 text-white mb-1" />
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Change DP</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="mb-0 md:mb-2 bg-white/80 dark:bg-[#0E0A22]/80 md:bg-transparent md:dark:bg-transparent backdrop-blur-sm md:backdrop-blur-none px-2 py-1 md:p-0 rounded-xl md:rounded-none">
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 bg-clip-text text-transparent animate-text-gradient tracking-tight leading-none">{user?.name}</h1>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 md:text-slate-500 md:dark:text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-20 md:mt-14 mb-8">
          <div className="p-4 rounded-xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 shadow-sm animate-border-pulse">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 mb-1">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-medium">Email</span>
            </div>
            <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{user?.email}</p>
          </div>
          <div className="p-4 rounded-xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 shadow-sm animate-border-pulse">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium">Role</span>
            </div>
            <p className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">{user?.role || "Member"}</p>
          </div>
          <div className="p-4 rounded-xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 shadow-sm animate-border-pulse">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Joined</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-250">{user?.createdAt ? formatDate(user.createdAt) : "N/A"}</p>
          </div>
        </div>

        {/* GitHub Integration Card */}
        <div className="p-4 md:p-6 rounded-2xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 shadow-sm animate-border-pulse mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white/10 flex items-center justify-center">
                <GithubIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">GitHub Integration</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connect your GitHub to link repos, track commits & auto-sync PRs.</p>
              </div>
            </div>

            {githubStatus.connected && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            )}
          </div>

          {githubMsg && (
            <div className={cn("mb-4 p-3 rounded-xl border text-sm font-medium", githubMsg.type === "success" ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-400" : "border-red-500/10 bg-red-500/5 text-red-400")}>
              {githubMsg.text}
            </div>
          )}

          {githubLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : githubStatus.connected ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-white/10 flex items-center justify-center">
                  <GithubIcon className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">@{githubStatus.username}</p>
                  <a href={`https://github.com/${githubStatus.username}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                    View Profile <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <button onClick={handleGithubDisconnect} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={handleGithubConnect} className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15 text-white text-sm font-semibold shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer">
              <GithubIcon className="w-5 h-5" />
              Connect GitHub Account
            </button>
          )}
        </div>

        {/* Edit Form */}
        <div className="p-4 md:p-6 rounded-2xl border-2 border-transparent bg-white dark:bg-[#14112c]/45 shadow-sm animate-border-pulse">
          <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100">Edit Profile</h2>

          {message && (
            <div className={cn("mb-5 p-3.5 rounded-xl border text-sm font-medium", message.type === "success" ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-400" : "border-red-500/10 bg-red-500/5 text-red-400")}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-100/50 dark:bg-[#13102c]/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Email</label>
              <input type="email" value={email} disabled className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-[#13102c]/35 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-450 text-sm cursor-not-allowed" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Discord User ID</label>
              <input type="text" value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="e.g. 123456789012345678" className="w-full px-4 py-3 rounded-xl bg-slate-100/50 dark:bg-[#13102c]/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Right click your Discord profile and select "Copy User ID".</p>
            </div>

            <div className="border-t border-slate-200 dark:border-white/5 pt-5 mt-5">
              <h3 className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-350">Change Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-slate-100/50 dark:bg-[#13102c]/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-slate-100/50 dark:bg-[#13102c]/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 disabled:opacity-50 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
