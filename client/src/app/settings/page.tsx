"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Unlink,
  Shield,
  Bell,
  Moon,
  Globe,
  Lock,
  Palette,
  CreditCard,
  X,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi, githubApi } from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

type SettingsTab = "profile" | "account" | "integrations" | "appearance";

function SettingsContent() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [discordId, setDiscordId] = useState((user as any)?.discordId || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // GitHub State
  const searchParams = useSearchParams();
  const [githubStatus, setGithubStatus] = useState<{
    connected: boolean;
    username: string | null;
  }>({ connected: false, username: null });
  const [githubLoading, setGithubLoading] = useState(true);

  useEffect(() => {
    const fetchGithubStatus = async () => {
      try {
        const res = await githubApi.getStatus();
        setGithubStatus({
          connected: res.data.connected,
          username: res.data.username,
        });
      } catch {
        /* ignore */
      }
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
      setMessage({ type: "success", text: "Settings saved successfully!" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <Camera className="w-4 h-4" /> },
    {
      key: "account",
      label: "Account & Security",
      icon: <Lock className="w-4 h-4" />,
    },
    {
      key: "integrations",
      label: "Integrations",
      icon: <Globe className="w-4 h-4" />,
    },
    {
      key: "appearance",
      label: "Appearance",
      icon: <Palette className="w-4 h-4" />,
    },
  ];

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight text-white mb-2">
            Settings
          </h1>
          <p className="text-[14px] md:text-[15px] font-medium text-slate-400">
            Manage your account preferences, integrations, and workspace
            configuration.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:w-[240px] shrink-0">
            <div className="bg-[#12141D] border border-white/5 rounded-[20px] p-3 space-y-1 sticky top-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all",
                    activeTab === tab.key
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-300 border border-transparent"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                <h3 className="text-[18px] font-bold text-white mb-6">
                  Profile Information
                </h3>

                {message && (
                  <div
                    className={cn(
                      "mb-6 p-4 rounded-xl text-[13px] font-bold border",
                      message.type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                    )}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#161925] border border-white/5 shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="dp"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-full h-full flex items-center justify-center text-xl font-bold text-white",
                            getAvatarColor(user?.name || "U")
                          )}
                        >
                          {getInitials(user?.name || "U")}
                        </div>
                      )}
                    </div>
                    <label className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] font-bold text-white cursor-pointer transition-colors flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Change Avatar
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#161925] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-[#161925] border border-white/5 text-slate-500 text-[14px] cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Email cannot be changed.
                    </p>
                  </div>

                  {/* Discord ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Discord User ID
                    </label>
                    <input
                      type="text"
                      value={discordId}
                      onChange={(e) => setDiscordId(e.target.value)}
                      placeholder="e.g. 1234567890"
                      className="w-full px-4 py-3 rounded-xl bg-[#161925] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 rounded-xl bg-[#6c61f8] hover:bg-[#5b52f6] text-[14px] font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Changes
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Account & Security Tab */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                  <h3 className="text-[18px] font-bold text-white mb-6">
                    Change Password
                  </h3>
                  <form onSubmit={handleSave} className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-[#161925] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-[#161925] border border-white/5 text-white text-[14px] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="py-3.5 px-8 rounded-xl bg-[#6c61f8] hover:bg-[#5b52f6] text-[14px] font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> Update Password
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                  <h3 className="text-[18px] font-bold text-white mb-2">
                    Account Details
                  </h3>
                  <p className="text-[12px] text-slate-400 mb-6">
                    Your account information
                  </p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-xl bg-[#161925] border border-white/5">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                          Role
                        </div>
                        <div className="text-[14px] font-bold text-white capitalize">
                          {user?.role || "Member"}
                        </div>
                      </div>
                      <Shield className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex justify-between items-center p-4 rounded-xl bg-[#161925] border border-white/5">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                          Member Since
                        </div>
                        <div className="text-[14px] font-bold text-white">
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "en-US",
                                { month: "long", year: "numeric" }
                              )
                            : "N/A"}
                        </div>
                      </div>
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                <h3 className="text-[18px] font-bold text-white mb-6">
                  Connected Services
                </h3>

                {/* GitHub */}
                <div className="bg-[#161925] border border-white/5 rounded-[16px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <GithubIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white">
                        GitHub
                      </h4>
                      <p className="text-[12px] font-medium text-slate-400 mt-0.5">
                        {githubStatus.connected
                          ? `Connected as @${githubStatus.username}`
                          : "Connect to link repos and sync PRs"}
                      </p>
                    </div>
                  </div>
                  {githubLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  ) : githubStatus.connected ? (
                    <button
                      onClick={handleGithubDisconnect}
                      className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[12px] font-bold transition-all"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleGithubConnect}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* Discord */}
                <div className="bg-[#161925] border border-white/5 rounded-[16px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 127.14 96.36" fill="currentColor">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c1-.73,2-1.5,2.92-2.3a75.6,75.6,0,0,0,72.16,0c.93.8,1.91,1.57,2.92,2.3a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,50.7,122.64,27.78,107.7,8.07Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white">
                        Discord
                      </h4>
                      <p className="text-[12px] font-medium text-slate-400 mt-0.5">
                        {discordId
                          ? `ID: ${discordId}`
                          : "Set your Discord ID in Profile tab"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      discordId
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-white/5 text-slate-500"
                    )}
                  >
                    {discordId ? "Configured" : "Not Set"}
                  </span>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="bg-[#12141D] border border-white/5 rounded-[24px] p-6 md:p-8 shadow-xl">
                <h3 className="text-[18px] font-bold text-white mb-6">
                  Appearance
                </h3>

                <div className="space-y-6">
                  {/* Theme */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {["Dark", "Light", "System"].map((theme, i) => (
                        <button
                          key={theme}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-all",
                            i === 0
                              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                              : "bg-[#161925] border-white/5 text-slate-400 hover:bg-white/5"
                          )}
                        >
                          <Moon className="w-5 h-5 mx-auto mb-2" />
                          <span className="text-[12px] font-bold">
                            {theme}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Notifications
                    </label>
                    <div className="space-y-3">
                      {[
                        "Email notifications for task updates",
                        "Desktop push notifications",
                        "Weekly digest email",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center justify-between p-4 rounded-xl bg-[#161925] border border-white/5"
                        >
                          <span className="text-[13px] font-medium text-slate-300">
                            {item}
                          </span>
                          <div className="w-10 h-6 rounded-full bg-indigo-500 relative cursor-pointer">
                            <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
