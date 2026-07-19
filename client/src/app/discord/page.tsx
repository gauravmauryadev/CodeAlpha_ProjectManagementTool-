"use client";

import dynamic from "next/dynamic";
import AppShell from "@/components/layout/AppShell";

const DiscordHub = dynamic(() => import("@/components/discord/DiscordHub"), { ssr: false });

export default function DiscordPage() {
  return (
    <AppShell>
      <div className="dark flex flex-col h-full min-h-[calc(100vh-80px)] w-full">
        <DiscordHub />
      </div>
    </AppShell>
  );
}

