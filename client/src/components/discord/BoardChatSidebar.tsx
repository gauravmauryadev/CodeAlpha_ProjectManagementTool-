"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Hash, 
  Send, 
  MessageSquare,
  Volume2,
  X,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Calendar,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn, getInitials, getHexColor, getAvatarColor } from "@/lib/utils";
import { livekitApi, projectApi, meetingApi } from "@/lib/api";
import type { Message, Project } from "@/types";
import type { Socket } from "socket.io-client";
import Tooltip from "@/components/ui/Tooltip";

// LiveKit imports
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, Room, RoomEvent } from "livekit-client";

interface BoardChatSidebarProps {
  projectId: string;
  socket: Socket | null;
  onClose: () => void;
}

// Custom LiveKit Call UI Component
function LiveKitCallView({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Connection Status */}
      <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-950 rounded-xl mb-3 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LiveKit Connected
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">
            {participants.length} participant{participants.length !== 1 ? "s" : ""} in call
          </span>
        </div>
        <Tooltip content="Leave Call" position="left">
          <button 
            onClick={onLeave} 
            className="w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black/20">
        <GridLayout
          tracks={tracks}
          style={{ height: "100%" }}
        >
          <ParticipantTile />
        </GridLayout>
      </div>

      {/* Controls */}
      <div className="mt-3">
        <ControlBar 
          variation="minimal"
          controls={{
            camera: true,
            microphone: true,
            screenShare: true,
            leave: false,
            chat: false,
          }}
        />
      </div>

      {/* Audio renderer for remote participants */}
      <RoomAudioRenderer />
    </div>
  );
}

export default function BoardChatSidebar({ projectId, socket, onClose }: BoardChatSidebarProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"chat" | "voice" | "discord" | "attendance">("chat");
  const [project, setProject] = useState<Project | null>(null);
  
  // Attendance State
  const [meetings, setMeetings] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attendanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // LiveKit States
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Resize State
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    
    // Disable pointer events on iframes to prevent them from stealing mouse events during drag
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.style.pointerEvents = 'none');
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Re-enable pointer events on iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => iframe.style.pointerEvents = '');

      // Sync the final width to React state
      if (sidebarRef.current) {
        setSidebarWidth(sidebarRef.current.offsetWidth);
      }
    }
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current && sidebarRef.current) {
      // Sidebar is on the right, so width is (window.innerWidth - mouseX)
      const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
      if (newWidth > 280 && newWidth < 800) {
        // Update DOM directly for smooth 60fps dragging without React re-renders
        sidebarRef.current.style.width = `${newWidth}px`;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    projectApi.getOne(projectId).then(res => setProject(res.data.project || res.data));
    meetingApi.getAttendance(projectId).then(res => {
      setMeetings(res.data.meetings);
      const uniqueMembers = Array.from(new Map(res.data.projectMembers.map((m: any) => [m._id, m])).values());
      setMembers(uniqueMembers);
    }).catch(e => console.error(e));
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (attendanceTimeoutRef.current) clearTimeout(attendanceTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Socket Events Setup (Chat only)
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("joinProject", { projectId });

    socket.on("messageHistory", (history: Message[]) => {
      setMessages(history);
    });

    socket.on("newMessage", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("userTyping", ({ userName, isTyping }: { userName: string; isTyping: boolean }) => {
      setTyping(isTyping ? `${userName} is typing...` : "");
    });

    return () => {
      socket.off("messageHistory");
      socket.off("newMessage");
      socket.off("userTyping");
    };
  }, [socket, projectId, user]);

  // Chat Actions
  const handleTyping = () => {
    if (!socket || !user) return;
    socket.emit("typing", { projectId, userName: user.name, isTyping: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { projectId, userName: user.name, isTyping: false });
    }, 1500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !user) return;
    
    socket.emit("sendMessage", {
      projectId,
      senderId: user.id || user._id,
      text: input
    });
    
    setInput("");
    socket.emit("typing", { projectId, userName: user.name, isTyping: false });
  };

  // LiveKit: Join Call
  const joinLiveKitCall = async () => {
    if (!projectId) return;
    setIsConnecting(true);
    setCallError(null);

    try {
      const roomName = `project-${projectId}`;
      const res = await livekitApi.getToken(roomName);
      setLivekitToken(res.data.token);
      setActiveTab("voice");
      
      // Bonus: Automatically mark attendance after 10 minutes in call
      attendanceTimeoutRef.current = setTimeout(async () => {
        try {
          await meetingApi.markAttendance(projectId);
          // Refresh attendance data silently
          meetingApi.getAttendance(projectId).then(attRes => {
            setMeetings(attRes.data.meetings);
          });
        } catch (attErr) {
          console.error("Failed to mark attendance automatically", attErr);
        }
      }, 10 * 60 * 1000); // 10 minutes

    } catch (err: any) {
      console.error("Failed to get LiveKit token:", err);
      setCallError(err.response?.data?.message || "Failed to join call. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  // LiveKit: Leave Call
  const leaveLiveKitCall = () => {
    setLivekitToken(null);
    if (attendanceTimeoutRef.current) {
      clearTimeout(attendanceTimeoutRef.current);
      attendanceTimeoutRef.current = null;
    }
  };

  return (
    <div 
      ref={sidebarRef}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className="fixed inset-0 z-[150] w-full md:relative md:z-0 md:w-[var(--sidebar-width)] bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl flex-shrink-0"
    >
      {/* Resizer Handle */}
      <div
        onMouseDown={startResizing}
        className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 z-50 transition-colors"
      />

      {/* Sidebar Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/60 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Team Collaboration</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer active:scale-90 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-950 p-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "chat" ? "bg-indigo-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          )}
        >
          <Hash className="w-3.5 h-3.5" /> Text Chat
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative",
            activeTab === "voice" ? "bg-indigo-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          )}
        >
          <Volume2 className="w-3.5 h-3.5" /> Call
          {livekitToken && (
            <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative",
            activeTab === "attendance" ? "bg-indigo-600 text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          )}
        >
          <Calendar className="w-3.5 h-3.5" /> Standups
        </button>
        {project?.discordServerId && project?.discordChannelId && (
          <button
            onClick={() => {
              setActiveTab("discord");
              meetingApi.markAttendance(projectId).then(() => {
                meetingApi.getAttendance(projectId).then(res => setMeetings(res.data.meetings));
              }).catch(console.error);
            }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative",
              activeTab === "discord" ? "bg-[#5865F2] text-white shadow" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Hash className="w-3.5 h-3.5" /> Discord
          </button>
        )}
      </div>

      {/* TAB CONTENT: Chat */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/60 dark:bg-slate-900/60">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/25 mx-auto mb-2 flex items-center justify-center">
                  <Hash className="w-6 h-6 text-indigo-400" />
                </div>
                <h4 className="text-slate-800 dark:text-slate-200 font-bold text-sm">Welcome to Team Chat</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Send a message to start communicating with your team.</p>
              </div>
            )}
            {messages.map((msg) => {
              const senderName = typeof msg.sender === "object" ? msg.sender.name : "User";
              const color = getHexColor(senderName);
              const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={msg._id} className="flex gap-2.5 py-0.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate" style={{ color }}>{senderName}</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">{time}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal break-words mt-0.5">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator & Input */}
          <div className="p-3 bg-white/40 dark:bg-slate-950/30 border-t border-slate-200 dark:border-slate-800 relative">
            {typing && (
              <p className="absolute -top-4 left-4 text-[9px] text-indigo-400 font-medium animate-pulse">{typing}</p>
            )}
            <form onSubmit={handleSend} className="flex items-center bg-white dark:bg-slate-950 rounded-xl px-3 border border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                placeholder="Message team..."
                className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-500 py-2.5 outline-none"
              />
              <button type="submit" className="p-1 text-indigo-400 hover:text-indigo-300 active:scale-90 transition-all cursor-pointer">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Voice & Video (LiveKit) */}
      {activeTab === "voice" && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/60 dark:bg-slate-900/60 p-4">
          {!livekitToken ? (
            /* Join Call Screen */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/40 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center mb-4">
                <Volume2 className="w-8 h-8 text-indigo-400" />
              </div>
              <h4 className="text-slate-800 dark:text-slate-200 font-bold text-base">Join Voice & Video</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed max-w-[240px]">
                HD audio/video calls powered by LiveKit. Screen share, talk, and coordinate in real-time.
              </p>

              {callError && (
                <p className="text-xs text-red-400 mb-3 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">{callError}</p>
              )}

              <button
                onClick={joinLiveKitCall}
                disabled={isConnecting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Join Call
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Active Call — LiveKit Room */
            <LiveKitRoom
              serverUrl={LIVEKIT_URL}
              token={livekitToken}
              connect={true}
              video={true}
              audio={true}
              onDisconnected={() => leaveLiveKitCall()}
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
              data-lk-theme="default"
            >
              <LiveKitCallView onLeave={leaveLiveKitCall} />
            </LiveKitRoom>
          )}
        </div>
      )}

      {/* TAB CONTENT: Discord */}
      {activeTab === "discord" && project?.discordServerId && project?.discordChannelId && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#36393f] relative">
          <div className="bg-[#202225] text-white text-[11px] px-4 py-2.5 flex items-center justify-between shadow-sm z-10 border-b border-[#18191c]">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Hash className="w-4 h-4 text-[#5865F2]" /> Connected to Discord
            </div>
            <a
              href={`https://discord.com/channels/${project.discordServerId}/${project.discordChannelId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                meetingApi.markAttendance(projectId).then(() => {
                  meetingApi.getAttendance(projectId).then(res => setMeetings(res.data.meetings));
                }).catch(console.error);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-[10px] font-bold text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              Open in App
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <iframe
            src={`https://e.widgetbot.io/channels/${project.discordServerId}/${project.discordChannelId}`}
            height="100%"
            width="100%"
            style={{ border: 'none', borderRadius: '0', flex: 1 }}
            allow="clipboard-write; fullscreen"
            title="Discord Chat"
          ></iframe>
        </div>
      )}

      {/* TAB CONTENT: Attendance / Standups */}
      {activeTab === "attendance" && (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/25 mx-auto mb-3 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-slate-800 dark:text-slate-200 font-bold">Daily Standups</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Join a call to auto-mark attendance, or just view the report below.</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Meetings (Last 7 Days)</h4>
            
            {meetings.length === 0 ? (
              <div className="text-center py-4 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-500">
                No meetings recorded yet.
              </div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting._id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {new Date(meeting.dateString).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {meeting.attendees?.length || 0} Attended
                    </span>
                  </div>
                  <div className="space-y-2">
                    {members.map(member => {
                      const isPresent = meeting.attendees?.some((a: any) => a._id === member._id);
                      return (
                        <div key={member._id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white", getAvatarColor(member.name))}>
                              {getInitials(member.name)}
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate w-32">{member.name}</span>
                          </div>
                          {isPresent ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-red-400/50" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
