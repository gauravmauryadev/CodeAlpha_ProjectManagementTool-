"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { projectApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Edit2, Eye, Save, Sparkles, FileText } from "lucide-react";
import type { Socket } from "socket.io-client";
import Tooltip from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface WikiTabProps {
  projectId: string;
  socket: Socket | null;
}

export default function WikiTab({ projectId, socket }: WikiTabProps) {
  const { user } = useAuthStore();
  const [wikiText, setWikiText] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial wiki content
  useEffect(() => {
    const fetchWiki = async () => {
      try {
        const res = await projectApi.getOne(projectId);
        const p = res.data.project || res.data;
        setWikiText(p.wiki || `# ${p.name} Documentation\n\nStart writing collaborative docs here...`);
      } catch (err) {
        console.error("Failed to fetch wiki:", err);
      }
    };
    fetchWiki();
  }, [projectId]);

  // Listen to real-time wiki updates from sockets
  useEffect(() => {
    if (!socket) return;

    socket.on("wikiUpdated", ({ wiki, userId }: { wiki: string; userId: string }) => {
      const currentUserId = user?.id || user?._id;
      if (userId !== currentUserId) {
        setWikiText(wiki);
      }
    });

    return () => {
      socket.off("wikiUpdated");
    };
  }, [socket, user]);

  // Debounced Auto-save and Socket Emit
  const handleWikiChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setWikiText(text);
    setSaveStatus("saving");

    // Clear previous save timeout
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Set new save timeout (1 second debounce)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await projectApi.updateWiki(projectId, text);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save wiki error:", err);
        setSaveStatus("error");
      }
    }, 1000);
  };

  // Convert simple markdown to html for preview
  const renderMarkdown = (text: string) => {
    if (!text) return "<p className='text-slate-500 italic'>Empty documentation. Click Edit to start writing.</p>";
    
    // Simple markdown parser
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold text-slate-100 border-b border-white/5 pb-2 mb-4 mt-6">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-slate-100 pb-1 mb-3 mt-5">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-slate-250 mb-2 mt-4">$1</h3>');

    // Bold & Italic
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li class="list-disc ml-6 text-slate-300 my-1">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="list-disc ml-6 text-slate-300 my-1">$1</li>');

    // Paragraphs (split by double newlines)
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map(p => {
        if (p.trim().startsWith('<h') || p.trim().startsWith('<li')) return p;
        return `<p class="text-slate-200 leading-relaxed my-3">${p.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("");

    return html;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#13112b]/40 backdrop-blur-xl border border-white/5 rounded-md overflow-hidden shadow-sm">
      {/* Editor Controls */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#13112b]/60">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Collaborative Wiki Docs</h2>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all duration-300",
            saveStatus === "saved" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            saveStatus === "saving" && "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
            saveStatus === "error" && "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {saveStatus === "saved" && "● Saved"}
            {saveStatus === "saving" && "● Saving..."}
            {saveStatus === "error" && "● Save failed"}
          </span>
        </div>

        {/* Mode Toggles */}
        <div className="flex bg-black/20 p-0.5 rounded-md border border-white/5">
          <button
            onClick={() => setMode("preview")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              mode === "preview" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={() => setMode("edit")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              mode === "edit" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Wiki
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-8 h-[calc(100vh-220px)]">
        {mode === "edit" ? (
          <div className="h-full flex flex-col gap-2">
            <textarea
              value={wikiText}
              onChange={handleWikiChange}
              placeholder="# Project Documentation&#10;&#10;Write here using basic markdown syntax..."
              className="w-full flex-1 h-full p-6 rounded-md bg-[#0e0a22]/50 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-mono text-sm leading-relaxed shadow-sm"
              autoFocus
            />
            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Markdown formatting is supported. Changes are saved automatically in real-time.
            </p>
          </div>
        ) : (
          <div 
            className="prose max-w-none text-slate-100 select-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(wikiText) }}
          />
        )}
      </div>
    </div>
  );
}
