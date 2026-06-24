"use client";

import dynamic from "next/dynamic";
import AppShell from "@/components/layout/AppShell";

const DiscordHub = dynamic(() => import("@/components/discord/DiscordHub"), { ssr: false });

export default function DiscordPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 bg-clip-text text-transparent animate-text-gradient tracking-tight">Discord Chat</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time team chat and voice channels for your projects.</p>
        </div>
        <DiscordHub />
      </div>
    </AppShell>
  );
}
