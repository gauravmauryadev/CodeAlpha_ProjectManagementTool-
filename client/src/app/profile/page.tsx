"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Camera, Save, Loader2, CheckCircle2, ExternalLink, Unlink, 
  Rocket, Terminal, Shield, Flame, CreditCard, MoreVertical,
  ChevronDown, Building, X
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { authApi, githubApi } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

function ProfileContent() {
  const { user, setUser } = useAuthStore();
  const { projects } = useProjectStore();
  
  // Edit Form State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [discordId, setDiscordId] = useState((user as any)?.discordId || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // GitHub State
  const searchParams = useSearchParams();
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean; username: string | null }>({ connected: false, username: null });
  const [githubLoading, setGithubLoading] = useState(true);

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

  useEffect(() => {
    const githubParam = searchParams.get("github");
    const username = searchParams.get("username");
    if (githubParam === "connected" && username) {
      setGithubStatus({ connected: true, username });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      if (user.avatar) setAvatar(user.avatar);
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
    } catch {}
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size should be less than 2MB" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const data: Record<string, string> = { name };
      if (avatar !== user?.avatar) data.avatar = avatar;
      if (discordId !== (user as any)?.discordId) data.discordId = discordId;
      if (newPassword) {
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
      }
      const res = await authApi.updateProfile(data);
      if (res.data?.user) setUser(res.data.user);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => {
        setIsEditModalOpen(false);
        setMessage(null);
      }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-10">
        
        {/* Top Profile Card */}
        <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 mb-8 shadow-xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
          {/* Avatar Section */}
          <div className="relative shrink-0">
            {user?.avatar || avatar ? (
              <img src={user?.avatar || avatar} alt={user?.name || "Avatar"} className="w-32 h-32 md:w-40 md:h-40 rounded-[24px] object-cover border border-white/10 shadow-2xl" />
            ) : (
              <div className={cn("w-32 h-32 md:w-40 md:h-40 rounded-[24px] flex items-center justify-center text-4xl font-bold text-white border border-white/10 shadow-2xl", getAvatarColor(user?.name || "U"))}>
                {getInitials(user?.name || "User")}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-[#6c61f8] text-white p-1 rounded-full border-[3px] border-[#12141D]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          
          {/* Info Section */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-[26px] md:text-[32px] font-extrabold text-white tracking-tight leading-tight truncate">
                  {user?.name}
                </h1>
                <p className="text-[13px] font-medium text-slate-400 mt-1">
                  {user?.role || "Principal System Architect"} • {user?.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-5 py-2 rounded-full bg-[#6c61f8] hover:bg-[#5b52f6] text-white text-[13px] font-bold transition-all shadow-lg shadow-indigo-500/25"
                >
                  Edit Profile
                </button>
                <button onClick={() => window.navigator.clipboard.share ? window.navigator.share({ title: 'OmniPlan Profile', url: window.location.href }) : alert('Copied to clipboard!')} className="px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[13px] font-bold transition-all">
                  Share
                </button>
              </div>
            </div>

            <p className="text-[14px] text-slate-300 leading-relaxed font-medium max-w-3xl mb-8">
              Pioneering distributed systems at OmniPlan. Focused on building high-performance, resilient cloud architectures. Obsessed with minimalist design and developer experience. Leading the core infrastructure team for Project Horizon.
            </p>

            <div className="flex items-center gap-8 md:gap-12">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projects</div>
                <div className="text-[18px] font-black text-white">{projects.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Commits</div>
                <div className="text-[18px] font-black text-white">3.2k</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Followers</div>
                <div className="text-[18px] font-black text-white">850</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          
          {/* Left Column (Achievements & Activity) */}
          <div className="xl:col-span-5 flex flex-col gap-6 md:gap-8">
            
            {/* Achievements Card */}
            <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
              <h3 className="text-[12px] font-black text-white uppercase tracking-widest mb-6">Achievements</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                    <Rocket className="w-6 h-6 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 text-center">Early Adopter</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                    <Terminal className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 text-center">Power User</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 text-center">Top Contributor</span>
                </div>
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-rose-500" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 text-center">Hot Streak</span>
                </div>
              </div>
              <button onClick={() => window.location.href = '/dashboard'} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[12px] font-bold text-white transition-colors">
                View All 15 Badges
              </button>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl flex-1">
              <h3 className="text-[12px] font-black text-white uppercase tracking-widest mb-6">Recent Activity</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px before:h-full before:w-[2px] before:bg-white/5">
                {[
                  { title: "Merged PR #482 into 'main'", desc: "Project: Neural Engine • 2h ago" },
                  { title: "Created Workspace \"Alpha Design\"", desc: "Workspace • 5h ago" },
                  { title: "Updated Security Policy", desc: "Settings • Yesterday" }
                ].map((item, i) => (
                  <div key={i} className="relative flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-[#12141D] mt-1 shrink-0 z-10" />
                    <div>
                      <p className="text-[14px] font-bold text-slate-200">{item.title}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Integrations & Billing) */}
          <div className="xl:col-span-7 flex flex-col gap-6 md:gap-8">
            
            {/* Workspace Settings / Integrations */}
            <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Building className="w-5 h-5 text-slate-400" />
                <h3 className="text-[15px] font-bold text-white">Workspace & Integrations</h3>
              </div>

              {/* Github Integration */}
              <div className="bg-[#161925] border border-white/5 rounded-[16px] p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <GithubIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-white">GitHub Connection</h4>
                    <p className="text-[12px] font-medium text-slate-400 mt-0.5">
                      {githubStatus.connected ? `Connected as @${githubStatus.username}` : "Link repositories and sync PRs"}
                    </p>
                  </div>
                </div>
                {githubLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                ) : githubStatus.connected ? (
                  <button onClick={handleGithubDisconnect} className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[12px] font-bold transition-all">
                    Disconnect
                  </button>
                ) : (
                  <button onClick={handleGithubConnect} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all">
                    Connect Account
                  </button>
                )}
              </div>

              {/* Workspace Settings form-like mock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#161925] border border-white/5 rounded-[12px] p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Default Branch</div>
                    <div className="text-[13px] font-bold text-white">main</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>
                <div className="bg-[#161925] border border-white/5 rounded-[12px] p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Region</div>
                    <div className="text-[13px] font-bold text-white">US-East (Virginia)</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Billing & Subscription */}
            <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                  <h3 className="text-[15px] font-bold text-white">Billing & Subscription</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                  Enterprise Plan
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#161925] border border-white/5 rounded-[16px] p-5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Current Balance</div>
                  <div className="text-[24px] font-black text-white">$0.00</div>
                </div>
                <div className="bg-[#161925] border border-white/5 rounded-[16px] p-5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Next Billing Date</div>
                  <div className="text-[16px] font-bold text-white mt-2">Oct 12, 2026</div>
                </div>
                <div className="bg-[#161925] border border-white/5 rounded-[16px] p-5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Seats Used</div>
                  <div className="text-[16px] font-bold text-white mt-2">42 / 50</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center font-black italic text-white text-xs">VISA</div>
                  <div>
                    <div className="text-[13px] font-bold text-white">•••• •••• •••• 4242</div>
                    <div className="text-[11px] font-medium text-slate-500">Expires 12/26</div>
                  </div>
                </div>
                <MoreVertical className="w-5 h-5 text-slate-500 cursor-pointer" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161925] border border-white/10 rounded-[24px] w-full max-w-[500px] p-6 md:p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-[20px] font-extrabold text-white mb-6">Edit Profile</h2>

            {message && (
              <div className={cn("mb-6 p-4 rounded-xl text-[13px] font-bold border", message.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400")}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* DP Update */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#12141D] border border-white/5 shrink-0">
                  {avatar ? <img src={avatar} alt="dp" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold">{getInitials(name)}</div>}
                </div>
                <label className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] font-bold text-white cursor-pointer transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Change Picture
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#12141D] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Discord User ID</label>
                <input type="text" value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="e.g. 1234567890" className="w-full px-4 py-3 rounded-xl bg-[#12141D] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Change Password</label>
                <div className="space-y-3">
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current Password" className="w-full px-4 py-3 rounded-xl bg-[#12141D] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="w-full px-4 py-3 rounded-xl bg-[#12141D] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-3.5 mt-2 rounded-xl bg-[#6c61f8] hover:bg-[#5b52f6] text-[14px] font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </form>
          </div>
        </div>
      )}
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
