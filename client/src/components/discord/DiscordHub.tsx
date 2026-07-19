"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { 
  Hash, Volume2, Send, Users, Mic, MicOff, Headphones, PhoneOff, 
  Monitor, Video, VideoOff, Plus, Compass, Link2, Copy, Check, UserPlus, ChevronRight,
  ChevronDown, Settings, FolderPlus, Calendar, Grid, Bell, Shield, Edit2
} from "lucide-react";
import { connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/useAuthStore";
import { useDiscordStore } from "@/store/useDiscordStore";
import { cn, getInitials, getHexColor, getAvatarColor } from "@/lib/utils";
import type { Message } from "@/types";
import type { Socket } from "socket.io-client";
import Tooltip from "@/components/ui/Tooltip";

export default function DiscordHub() {
  const { user } = useAuthStore();
  const { 
    servers, activeServerId, fetchServers, 
    createServer, joinServer, createChannel, deleteServer, setActiveServer 
  } = useDiscordStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeChannel, setActiveChannel] = useState<{ id: string; name: string, type: "text" | "voice" } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  // Modals
  const [showAddServer, setShowAddServer] = useState(false);
  const [addServerStep, setAddServerStep] = useState<1 | 2 | 3 | 4>(1);
  const [serverNameInput, setServerNameInput] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(""), 3000); };
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState("server");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [hideMutedChannels, setHideMutedChannels] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAppDirectoryModal, setShowAppDirectoryModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // WebRTC
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<{ id: string; name: string } | null>(null);
  const [showVideoGrid, setShowVideoGrid] = useState(true);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [callParticipants, setCallParticipants] = useState<
    { socketId: string; userId: string; userName: string; isSpeaking?: boolean; isScreenSharing?: boolean }[]
  >([]);
  const [participantStreams, setParticipantStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const activeServer = servers.find(s => s._id === activeServerId);

  // Initialize socket
  useEffect(() => {
    if (!user) return;
    const s = connectSocket();
    setSocket(s);
    s.emit("authenticate", { userId: user.id || user._id, userName: user.name });

    s.on("onlineUsers", (ids: string[]) => setOnlineUsers(ids));
    s.on("messageHistory", (msgs: Message[]) => setMessages(msgs));
    s.on("newMessage", (msg: Message) => setMessages((prev) => [...prev, msg]));
    s.on("userTyping", ({ userName, isTyping }: { userName: string; isTyping: boolean }) => {
      setTyping(isTyping ? `${userName} is typing...` : "");
    });

    // WebRTC Logic
    s.on("existingParticipants", ({ participants }: { participants: any[] }) => {
      setCallParticipants(participants);
      participants.forEach((p) => {
        if (p.socketId !== s.id) {
          initiatePeerConnection(p.socketId, localStreamRef.current);
        }
      });
    });

    s.on("userJoinedCall", (user: any) => {
      setCallParticipants((prev) => [...prev, user]);
      createPeerConnection(user.socketId, localStreamRef.current);
    });

    s.on("userLeftCall", ({ socketId }: { socketId: string }) => {
      setCallParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      if (peersRef.current.has(socketId)) {
        peersRef.current.get(socketId)?.close();
        peersRef.current.delete(socketId);
      }
      setParticipantStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      const audioEl = document.getElementById(`audio-${socketId}`);
      if (audioEl) audioEl.remove();
    });

    s.on("offer", async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current.get(from) || createPeerConnection(from, localStreamRef.current);
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        s.emit("answer", { to: from, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    s.on("answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote desc for answer:", err);
        }
      }
    });

    s.on("iceCandidate", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      }
    });

    s.on("userSpeaking", ({ socketId, isSpeaking }: { socketId: string; isSpeaking: boolean }) => {
      setCallParticipants((prev) => prev.map((p) => (p.socketId === socketId ? { ...p, isSpeaking } : p)));
    });

    s.on("userScreenSharing", ({ socketId, isSharing }: { socketId: string; isSharing: boolean }) => {
      setCallParticipants((prev) => prev.map((p) => (p.socketId === socketId ? { ...p, isScreenSharing: isSharing } : p)));
    });

    return () => {
      s.disconnect();
      leaveVoiceChannel();
    };
  }, [user]);

  // Peer Connection Helpers
  const createPeerConnection = useCallback((targetSocketId: string, stream: MediaStream | null) => {
    const existing = peersRef.current.get(targetSocketId);
    if (existing) existing.close();

    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    if (stream) {
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getVideoTracks().forEach((track) => peer.addTrack(track, screenStreamRef.current!));
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) socket?.emit("iceCandidate", { to: targetSocketId, candidate: event.candidate });
    };

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setParticipantStreams((prev) => {
        const next = new Map(prev);
        next.set(targetSocketId, remoteStream);
        return next;
      });

      const audioTrack = remoteStream.getAudioTracks()[0];
      if (audioTrack) {
        let audioEl = document.getElementById(`audio-${targetSocketId}`) as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.id = `audio-${targetSocketId}`;
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.muted = deafened;
      }
    };

    peer.onnegotiationneeded = async () => {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket?.emit("offer", { to: targetSocketId, offer });
      } catch (err) {
        console.error("Negotiation error:", err);
      }
    };

    peersRef.current.set(targetSocketId, peer);
    return peer;
  }, [socket, deafened]);

  const initiatePeerConnection = useCallback(async (targetSocketId: string, stream: MediaStream | null) => {
    const peer = createPeerConnection(targetSocketId, stream);
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket?.emit("offer", { to: targetSocketId, offer });
    } catch (err) {
      console.error("Failed to create offer:", err);
    }
  }, [socket, createPeerConnection]);

  const handleFeatureClick = (feature: string, tab?: string) => {
    setShowServerDropdown(false);
    if (tab) {
      setSettingsTab(tab);
      setShowSettingsModal(true);
    } else if (feature === "Leave Server") {
      setShowLeaveModal(true);
    } else {
      setToastMessage(`${feature} is a premium feature coming soon!`);
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  // Voice Channel Actions
  const joinVoiceChannel = async (channelId: string, channelName: string) => {
    if (activeVoiceChannel?.id === channelId) return;
    if (activeVoiceChannel) leaveVoiceChannel();

    setActiveVoiceChannel({ id: channelId, name: channelName });
    setShowVideoGrid(true);
    setMicMuted(false);
    setDeafened(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      let wasSpeaking = false;
      speechIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || micMuted) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const isSpeaking = sum > 500;
        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          socket?.emit("speaking", { projectId: channelId, isSpeaking });
        }
      }, 200);

      socket?.emit("joinCall", { 
        projectId: channelId, 
        userId: user?.id || user?._id, 
        userName: user?.name, 
        serverId: activeServer?._id,
        channelName 
      });
    } catch (err) {
      console.error("Failed to get audio stream:", err);
      socket?.emit("joinCall", { 
        projectId: channelId, 
        userId: user?.id || user?._id, 
        userName: user?.name, 
        serverId: activeServer?._id,
        channelName 
      }); // Join as listener
    }
  };

  const leaveVoiceChannel = useCallback(() => {
    if (!activeVoiceChannel) return;
    socket?.emit("leaveCall", { projectId: activeVoiceChannel.id });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    
    callParticipants.forEach((p) => {
      const audioEl = document.getElementById(`audio-${p.socketId}`);
      if (audioEl) audioEl.remove();
    });

    setActiveVoiceChannel(null);
    setCallParticipants([]);
    setParticipantStreams(new Map());
    setLocalVideoActive(false);
  }, [activeVoiceChannel, callParticipants, socket]);

  const switchChannel = (channelId: string, channelName: string) => {
    if (activeChannel?.id === channelId) return;
    if (activeChannel) {
      socket?.emit("leaveChannel", activeChannel.id);
    }
    setActiveChannel({ id: channelId, name: channelName, type: "text" });
    setMessages([]);
    socket?.emit("joinChannel", channelId);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChannel || !user) return;
    socket?.emit("sendMessage", { channel: activeChannel.id, text: input, sender: user.id || user._id });
    setInput("");
    socket?.emit("typing", { channel: activeChannel.id, isTyping: false });
  };

  const handleTyping = () => {
    if (!activeChannel) return;
    socket?.emit("typing", { channel: activeChannel.id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("typing", { channel: activeChannel.id, isTyping: false });
    }, 2000);
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    await createServer(serverNameInput);
    setServerNameInput("");
    setShowAddServer(false);
    setAddServerStep(1);
  };

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteCodeInput.trim();
    if (code.includes("/invite/")) {
      code = code.split("/invite/").pop() || code;
    } else if (code.includes("/")) {
      code = code.split("/").pop() || code;
    }
    await joinServer(code);
    setInviteCodeInput("");
    setShowAddServer(false);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServer) return;
    await createChannel(activeServer._id, newChannelName, newChannelType);
    setNewChannelName("");
    setShowAddChannel(false);
  };

  const copyInvite = () => {
    if (activeServer) {
      const inviteUrl = `${window.location.origin}/invite/${activeServer.inviteCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasVideo = (stream: MediaStream | undefined) => stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const safeName = (name: string) => name.toLowerCase().replace(/\s+/g, "-").substring(0, 20);

  const groupedChannels = useMemo(() => {
    if (!activeServer) return {};
    const grouped: Record<string, typeof activeServer.channels> = {};
    activeServer.channels.forEach((c) => {
      const cat = (c.category || (c.type === "voice" ? "VOICE CHANNELS" : "TEXT CHANNELS")).toUpperCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(c);
    });
    return grouped;
  }, [activeServer]);

  return (
    <div className="flex flex-1 h-full w-full bg-slate-50/80 dark:bg-[#1e1f22] overflow-hidden shadow-sm border-t border-slate-200/50 dark:border-[#1e1f22]">
      
      {/* 1. Extreme Left Sidebar (Servers List) */}
      <div className="w-[72px] bg-slate-50/80 dark:bg-[#1e1f22] border-r border-slate-200/50 dark:border-[#1e1f22] flex flex-col items-center py-3 flex-shrink-0 gap-2 overflow-y-auto hide-scrollbar">
        <Tooltip content="Direct Messages" position="right">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-[#313338] flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer hover:rounded-md relative">
            <Compass className="w-6 h-6" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-0 bg-white dark:bg-[#313338] rounded-r-full transition-all duration-200" />
          </div>
        </Tooltip>
        
        <div className="w-8 h-[2px] bg-white dark:bg-[#313338] rounded my-1" />

        {servers.map((server) => {
          const isActive = activeServerId === server._id;
          return (
            <Tooltip key={server._id} content={server.name} position="right">
              <div 
                onClick={() => setActiveServer(server._id)}
                className={cn(
                  "w-12 h-12 flex items-center justify-center text-white font-bold text-lg cursor-pointer transition-all duration-200 relative group",
                  isActive ? "bg-indigo-500 rounded-md" : "bg-white dark:bg-[#313338] rounded-full hover:bg-indigo-500 hover:rounded-md"
                )}
              >
                {getInitials(server.name)}
                <div className={cn(
                  "absolute -left-3 top-1/2 -translate-y-1/2 w-2 bg-white dark:bg-[#313338] rounded-r-full transition-all duration-200",
                  isActive ? "h-10" : "h-0 group-hover:h-5"
                )} />
              </div>
            </Tooltip>
          );
        })}

        <Tooltip content="Add a Server" position="right">
          <div 
            onClick={() => { 
              setShowAddServer(true); 
              setAddServerStep(1); 
              setServerNameInput(`${user?.name || "My"}'s server`);
            }}
            className="w-12 h-12 rounded-full bg-white dark:bg-[#313338] flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer hover:rounded-md group relative"
          >
            <Plus className="w-6 h-6" />
          </div>
        </Tooltip>
      </div>

      {/* 2. Server Channels Sidebar */}
      <div className="w-[240px] bg-white/60 dark:bg-[#2b2d31] flex flex-col flex-shrink-0">
        {activeServer ? (
          <>
            <div className="relative">
              <div className="p-4 border-b border-slate-200/50 dark:border-[#1e1f22] font-bold text-sm text-slate-800 dark:text-[#f2f3f5] flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-[#35373c] transition-colors" onClick={() => setShowServerDropdown(!showServerDropdown)}>
                <span className="truncate">{activeServer.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-[#b5bac1]" />
              </div>
              
              {showServerDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowServerDropdown(false)}></div>
                  <div className="absolute top-14 left-2 w-[220px] bg-[#111214] rounded-lg shadow-sm z-50 p-2 border border-slate-200/50 dark:border-[#1e1f22]">
                    <button onClick={() => { setShowBoostModal(true); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center group transition-colors cursor-pointer">Server Boost <span className="text-pink-400 group-hover:text-white">🚀</span></button>
                    <div className="my-1 border-b border-[#2b2d31]" />
                    <button onClick={() => { setShowInviteModal(true); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-[#5865F2] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Invite to Server <UserPlus className="w-4 h-4"/></button>
                    <button onClick={() => handleFeatureClick("Server Settings", "server")} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Server Settings <Settings className="w-4 h-4"/></button>
                    <button onClick={() => { setNewChannelType("text"); setShowAddChannel(true); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Create Channel <Plus className="w-4 h-4"/></button>
                    <button onClick={() => { setShowAddCategory(true); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Create Category <FolderPlus className="w-4 h-4"/></button>
                    <button onClick={() => { setShowEventModal(true); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Create Event <Calendar className="w-4 h-4"/></button>
                    <button onClick={() => { setShowAppDirectoryModal(true); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">App Directory <Grid className="w-4 h-4"/></button>
                    <div className="my-1 border-b border-[#2b2d31]" />
                    <button onClick={() => handleFeatureClick("Notification Settings", "notifications")} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Notification Settings <Bell className="w-4 h-4"/></button>
                    <button onClick={() => handleFeatureClick("Privacy Settings", "privacy")} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Privacy Settings <Shield className="w-4 h-4"/></button>
                    <div className="my-1 border-b border-[#2b2d31]" />
                    <button onClick={() => handleFeatureClick("Edit Per-server Profile", "profile")} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Edit Per-server Profile <Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => { setHideMutedChannels(!hideMutedChannels); setShowServerDropdown(false); }} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-slate-700 dark:text-[#dbdee1] hover:bg-indigo-600 hover:text-white flex justify-between items-center transition-colors cursor-pointer">{hideMutedChannels ? "Show Muted Channels" : "Hide Muted Channels"}</button>
                    <div className="my-1 border-b border-[#2b2d31]" />
                    <button onClick={() => handleFeatureClick("Leave Server")} className="w-full text-left px-2 py-1.5 rounded-sm text-sm font-medium text-rose-500 hover:bg-rose-500 hover:text-white flex justify-between items-center transition-colors cursor-pointer">Leave Server</button>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              <div className="px-2 space-y-0.5">
                <div onClick={() => setShowEventModal(true)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#35373c] text-slate-400 dark:text-[#949ba4] hover:text-slate-700 cursor-pointer transition-colors font-medium text-[15px]">
                  <Calendar className="w-5 h-5" />
                  Events
                </div>
                <div onClick={() => setShowBoostModal(true)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#35373c] text-slate-400 dark:text-[#949ba4] hover:text-slate-700 cursor-pointer transition-colors font-medium text-[15px]">
                  <div className="w-5 h-5 flex items-center justify-center -ml-0.5"><span className="text-pink-400">🚀</span></div>
                  Server Boosts
                </div>
              </div>

              <div className="my-2 border-b border-slate-200/50 dark:border-[#1e1f22] mx-4" />

              {Object.entries(groupedChannels).map(([category, channels]) => (
                <div key={category}>
                  <div className="flex items-center justify-between px-4 mb-2 group">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#949ba4] uppercase tracking-wider group-hover:text-slate-700 transition-colors">{category}</p>
                    <Plus onClick={() => { setNewChannelType("text"); setShowAddChannel(true); }} className="w-3.5 h-3.5 text-slate-400 dark:text-[#949ba4] hover:text-slate-700 cursor-pointer" />
                  </div>
                  <div className="space-y-0.5">
                    {channels.map((c) => {
                      if (c.type === "text") {
                        return (
                          <button key={c._id} onClick={() => switchChannel(c._id, c.name)} className={cn("w-full flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-sm transition-colors", activeChannel?.id === c._id ? "bg-slate-100 dark:bg-[#383a40] text-slate-800 dark:text-[#f2f3f5]" : "text-slate-400 dark:text-[#949ba4] hover:bg-slate-100 dark:hover:bg-[#35373c] hover:text-slate-800")} style={{ width: "calc(100% - 16px)" }}>
                            <Hash className="w-4 h-4 flex-shrink-0 opacity-60" /> {safeName(c.name)}
                          </button>
                        );
                      } else {
                        return (
                          <div key={c._id} className="mx-2" style={{ width: "calc(100% - 16px)" }}>
                            <button onClick={() => joinVoiceChannel(c._id, c.name)} className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left", activeVoiceChannel?.id === c._id ? "bg-[#35373c] text-emerald-400" : "text-slate-400 dark:text-[#949ba4] hover:bg-slate-100 dark:hover:bg-[#35373c] hover:text-slate-800")}>
                              <Volume2 className="w-4 h-4 flex-shrink-0" /> {safeName(c.name)}
                            </button>
                            {activeVoiceChannel?.id === c._id && (
                              <div className="pl-6 py-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white relative", getAvatarColor(user?.name || "U"))}>
                                    {getInitials(user?.name || "U")}
                                  </div>
                                  <span className="text-[11px] text-slate-700 dark:text-[#dbdee1] font-medium truncate">{user?.name} (You)</span>
                                  {micMuted && <MicOff className="w-3 h-3 text-rose-500 ml-auto mr-1" />}
                                </div>
                                {callParticipants.map((part) => (
                                  <div key={part.socketId} className="flex items-center gap-2">
                                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white relative", getAvatarColor(part.userName), part.isSpeaking && "ring-2 ring-[#23a55a]")}>
                                      {getInitials(part.userName)}
                                    </div>
                                    <span className="text-[11px] text-slate-700 dark:text-[#dbdee1] font-medium truncate">{part.userName}</span>
                                    {(part.isScreenSharing || hasVideo(participantStreams.get(part.socketId))) && (
                                      <span className="text-[8px] font-extrabold bg-rose-500 text-white px-1 py-0.2 rounded ml-auto mr-1 animate-pulse">LIVE</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-[#949ba4] text-xs px-4 text-center">
            Select or create a server to start chatting
          </div>
        )}

        {/* User Status */}
        <div className="p-2.5 bg-[#232428] flex items-center gap-2.5 mt-auto">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white relative flex-shrink-0" style={{ background: getHexColor(user?.name || "U") }}>
            {getInitials(user?.name || "U")}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#232428]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-[#f2f3f5] truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 dark:text-[#949ba4]">Online</p>
          </div>
          <div className="flex gap-0.5">
            <button onClick={() => setMicMuted(!micMuted)} className={cn("w-7 h-7 rounded flex items-center justify-center cursor-pointer", micMuted ? "text-rose-500" : "text-slate-500 dark:text-[#b5bac1] hover:text-slate-800")}>
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={() => setDeafened(!deafened)} className={cn("w-7 h-7 rounded flex items-center justify-center cursor-pointer", deafened ? "text-rose-500" : "text-slate-500 dark:text-[#b5bac1] hover:text-slate-800")}>
              <Headphones className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Chat/Voice Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#313338]">
        {activeServer && activeChannel ? (
          <>
            <div className="px-4 py-3 border-b border-slate-200/50 dark:border-[#1e1f22] flex items-center gap-2.5 shadow-sm z-10">
              <Hash className="w-5 h-5 text-slate-400 dark:text-[#949ba4]" />
              <span className="font-semibold text-slate-800 dark:text-[#f2f3f5] text-sm">{safeName(activeChannel.name)}</span>
              <div className="flex-1" />
              <button onClick={() => setShowMembers(!showMembers)} className={cn("p-1.5 rounded cursor-pointer", showMembers ? "text-slate-800 dark:text-[#f2f3f5] bg-[#3f4147]" : "text-slate-500 dark:text-[#b5bac1] hover:text-slate-800")}>
                <Users className="w-5 h-5" />
              </button>
            </div>

            <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="text-center py-8 mt-4 max-w-[420px] mx-auto">
                  <h3 className="text-slate-800 dark:text-[#f2f3f5] font-extrabold text-[32px] mb-2 leading-tight">Welcome to<br/>{activeServer.name}</h3>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-[15px] leading-relaxed mb-6">This is your brand new, shiny server. Here are some steps to help you get started. For more, check out our <span className="text-indigo-500 hover:underline cursor-pointer">Getting Started guide.</span></p>
                  
                  <div className="space-y-2 text-left">
                    <button onClick={() => setShowInviteModal(true)} className="w-full flex items-center gap-4 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[22px]">✨</div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-[#f2f3f5] flex-1">Invite your friends</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    <button onClick={() => handleFeatureClick("Server Settings", "server")} className="w-full flex items-center gap-4 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[22px]">🎨</div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-[#f2f3f5] flex-1">Personalize your server with an icon</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    <button onClick={() => { document.querySelector<HTMLInputElement>('input[type="text"]')?.focus() }} className="w-full flex items-center gap-4 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[22px]">💬</div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-[#f2f3f5] flex-1">Send your first message</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    <button onClick={() => setShowDownloadModal(true)} className="w-full flex items-center gap-4 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[22px]">⬇️</div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-[#f2f3f5] flex-1">Download the Discord App</span>
                      <div className="w-5 h-5 rounded-full bg-[#23a55a] flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white"/></div>
                    </button>
                    <button onClick={() => setShowAppDirectoryModal(true)} className="w-full flex items-center gap-4 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[22px]">🎮</div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-[#f2f3f5] flex-1">Add your first app</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                  </div>
                </div>
              )}
              {messages.map((msg) => {
                const senderName = typeof msg.sender === "object" ? msg.sender.name : "User";
                const color = getHexColor(senderName);
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={msg._id} className="flex gap-3 py-1 hover:bg-[#2e3035] px-2 rounded transition-colors group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: color }}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color }}>{senderName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#949ba4]">{time}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-[#dbdee1] leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 pb-4 relative">
              {typing && <p className="absolute -top-5 left-5 text-[10px] text-slate-400 dark:text-[#949ba4] font-semibold">{typing}</p>}
              <form onSubmit={handleSend} className="flex items-center bg-slate-100 dark:bg-[#383a40] rounded-lg px-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                  placeholder={`Message #${safeName(activeChannel.name)}`}
                  className="flex-1 bg-transparent text-sm text-slate-700 dark:text-[#dbdee1] placeholder-[#5d5f6a] py-3 px-2 outline-none"
                />
                <button type="submit" className="p-2 text-slate-500 dark:text-[#b5bac1] hover:text-slate-800 cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-[#949ba4]">
            <Compass className="w-16 h-16 opacity-20 mb-4" />
            <p>Select a text channel to start chatting</p>
          </div>
        )}
      </div>

      {/* 4. Members Sidebar */}
      {showMembers && activeServer && (
        <div className="w-[240px] bg-white/60 dark:bg-[#2b2d31] border-l border-slate-200/50 dark:border-[#1e1f22] p-3 overflow-y-auto flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400 dark:text-[#949ba4] uppercase tracking-wider mb-3">Members — {activeServer.members.length}</p>
          <div className="space-y-0.5">
            {activeServer.members.map((m: any) => {
              const isOnline = onlineUsers.includes(m._id) || m._id === user?.id;
              return (
                <div key={m._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#35373c] transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white relative" style={{ background: getHexColor(m.name) }}>
                    {getInitials(m.name)}
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31]", isOnline ? "bg-[#23a55a]" : "bg-[#80848e]")} />
                  </div>
                  <span className={cn("text-sm font-medium", isOnline ? "text-slate-800 dark:text-[#f2f3f5]" : "text-slate-400 dark:text-[#949ba4]")}>{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddServer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#313338] w-full max-w-md rounded-md shadow-sm overflow-hidden flex flex-col">
            
            {addServerStep === 1 && (
              <>
                <div className="p-6 text-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Create Your Server</h2>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-4">Your server is where you and your friends hang out. Make yours and start talking.</p>
                  
                  <div className="space-y-2 mt-4 text-left">
                    <button onClick={() => setAddServerStep(2)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white"><img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a69f118df70ad7828d4_icon_clyde_blurple_RGB.svg" className="w-5 h-5 opacity-80"/></div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">Create My Own</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    
                    <p className="text-[11px] font-bold text-slate-500 dark:text-[#b5bac1] uppercase mt-4 mb-2">Start from a template</p>
                    
                    <button onClick={() => setAddServerStep(2)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[18px]">🎮</div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">Gaming</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    
                    <button onClick={() => setAddServerStep(2)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[18px]">🤝</div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">Friends</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    
                    <button onClick={() => setAddServerStep(2)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[18px]">📚</div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">Study Group</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>

                    <button onClick={() => setAddServerStep(2)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[18px]">🏫</div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">School Club</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-[#2b2d31] p-4 text-center flex flex-col items-center">
                  <h3 className="text-slate-800 dark:text-[#f2f3f5] text-lg font-bold mb-2">Have an invite already?</h3>
                  <button onClick={() => setAddServerStep(4)} className="bg-[#4e5058] hover:bg-[#6d6f78] text-white w-full py-2.5 rounded font-medium transition-colors cursor-pointer">Join a Server</button>
                </div>
              </>
            )}

            {addServerStep === 2 && (
              <>
                <div className="p-6 text-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Tell Us More About Your Server</h2>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">In order to help you with your setup, is your new server for just a few friends or a larger community?</p>
                  
                  <div className="space-y-2 mt-4 text-left">
                    <button onClick={() => setAddServerStep(3)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[18px]">🦊</div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">For me and my friends</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                    <button onClick={() => setAddServerStep(3)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-[#2b2d31] hover:bg-slate-50 dark:hover:bg-[#3f4147] rounded-lg transition-colors border border-slate-200/50 dark:border-[#1e1f22] group cursor-pointer">
                      <div className="w-8 h-8 flex items-center justify-center text-[18px]">🌍</div>
                      <span className="font-bold text-slate-800 dark:text-[#f2f3f5] flex-1">For a club or community</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#949ba4] group-hover:text-slate-700"/>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#b5bac1] mt-6">Not sure? You can <span onClick={() => setAddServerStep(3)} className="text-indigo-500 hover:underline cursor-pointer">skip this question</span> for now.</p>
                </div>
                <div className="bg-white/60 dark:bg-[#2b2d31] p-4 flex justify-between items-center">
                  <button onClick={() => setAddServerStep(1)} className="text-slate-800 dark:text-[#f2f3f5] text-sm hover:underline cursor-pointer">Back</button>
                </div>
              </>
            )}

            {addServerStep === 3 && (
              <>
                <div className="p-6 text-center flex-1">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Customize Your Server</h2>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">Give your new server a personality with a name and an icon. You can always change it later.</p>
                  
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#5865F2] mx-auto mb-6 flex items-center justify-center text-[#5865F2] cursor-pointer hover:bg-indigo-600/10 transition-colors">
                    <div className="flex flex-col items-center">
                      <Plus className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold uppercase">Upload</span>
                    </div>
                  </div>

                  <form id="create-server-form" onSubmit={handleCreateServer} className="text-left flex flex-col h-full">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-2">Server Name</label>
                      <input type="text" required value={serverNameInput} onChange={(e) => setServerNameInput(e.target.value)} className="w-full bg-slate-50/80 dark:bg-[#1e1f22] text-slate-800 dark:text-[#f2f3f5] p-2.5 rounded text-sm outline-none mb-4" placeholder={`${user?.name}'s server`} />
                      <p className="text-[10px] text-slate-500 dark:text-[#b5bac1]">By creating a server, you agree to CodeAlpha's Community Guidelines.</p>
                    </div>
                  </form>
                </div>
                <div className="bg-white/60 dark:bg-[#2b2d31] p-4 flex justify-between items-center">
                  <button onClick={() => setAddServerStep(2)} className="text-slate-800 dark:text-[#f2f3f5] text-sm hover:underline cursor-pointer">Back</button>
                  <button type="submit" form="create-server-form" onClick={(e) => {
                    const form = document.getElementById("create-server-form") as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }} className="bg-indigo-600 dark:bg-[#5865F2] hover:bg-indigo-700 dark:hover:bg-[#4752C4] text-white px-6 py-2.5 rounded font-medium transition-colors cursor-pointer">Create</button>
                </div>
              </>
            )}

            {addServerStep === 4 && (
              <>
                <div className="p-6 text-center flex-1">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Join a Server</h2>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">Enter an invite below to join an existing server.</p>
                  
                  <form id="join-server-form" onSubmit={handleJoinServer} className="text-left">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-2">Invite Link</label>
                    <input type="text" required value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} className="w-full bg-slate-50/80 dark:bg-[#1e1f22] text-slate-800 dark:text-[#f2f3f5] p-2.5 rounded text-sm outline-none" placeholder="hWk82m..." />
                    
                    <div className="mt-4 p-3 bg-slate-50/80 dark:bg-[#1e1f22] rounded-lg text-left">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-1">Invites should look like</p>
                      <p className="text-sm text-slate-400 dark:text-[#949ba4]">hWk82m</p>
                      <p className="text-sm text-slate-400 dark:text-[#949ba4]">https://discord.gg/hWk82m</p>
                    </div>
                  </form>
                </div>
                <div className="bg-white/60 dark:bg-[#2b2d31] p-4 flex justify-between items-center">
                  <button onClick={() => setAddServerStep(1)} className="text-slate-800 dark:text-[#f2f3f5] text-sm hover:underline cursor-pointer">Back</button>
                  <button type="submit" form="join-server-form" onClick={(e) => {
                    const form = document.getElementById("join-server-form") as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }} className="bg-indigo-600 dark:bg-[#5865F2] hover:bg-indigo-700 dark:hover:bg-[#4752C4] text-white px-6 py-2.5 rounded font-medium transition-colors cursor-pointer">Join Server</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {showInviteModal && activeServer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#313338] w-full max-w-sm rounded-md shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-slate-800 dark:text-[#f2f3f5] font-bold uppercase text-xs">Invite friends to {activeServer.name}</h2>
            </div>
            <div className="flex bg-slate-50/80 dark:bg-[#1e1f22] rounded p-1 items-center">
              <input type="text" readOnly value={typeof window !== 'undefined' ? `${window.location.origin}/invite/${activeServer.inviteCode}` : activeServer.inviteCode} className="flex-1 bg-transparent text-slate-700 dark:text-[#dbdee1] p-2 outline-none font-mono text-sm" />
              <button onClick={copyInvite} className={cn("px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5", copied ? "bg-[#23a55a] text-white" : "bg-indigo-600 dark:bg-[#5865F2] text-white hover:bg-indigo-700 dark:hover:bg-[#4752C4]")}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#949ba4] mt-2">Share this code with others to grant them access to this server.</p>
            <button onClick={() => setShowInviteModal(false)} className="mt-6 w-full py-2 text-slate-800 dark:text-[#f2f3f5] hover:underline text-sm">Close</button>
          </div>
        </div>
      )}

      {showAddChannel && activeServer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#313338] w-full max-w-sm rounded-md shadow-sm p-6">
            <h2 className="text-slate-800 dark:text-[#f2f3f5] font-bold mb-4">Create Channel</h2>
            <form onSubmit={handleCreateChannel}>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-2">Channel Name</label>
              <div className="flex items-center bg-slate-50/80 dark:bg-[#1e1f22] rounded px-3 py-2 mb-4">
                <Hash className="w-4 h-4 text-slate-400 dark:text-[#949ba4] mr-2" />
                <input type="text" required value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="flex-1 bg-transparent text-slate-800 dark:text-[#f2f3f5] text-sm outline-none" placeholder="new-channel" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddChannel(false)} className="text-slate-800 dark:text-[#f2f3f5] hover:underline text-sm">Cancel</button>
                <button type="submit" className="bg-indigo-600 dark:bg-[#5865F2] hover:bg-indigo-700 dark:hover:bg-[#4752C4] text-white px-4 py-2 rounded text-sm font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-white/60 dark:bg-[#2b2d31] border-l-4 border-[#5865F2] text-slate-800 dark:text-[#f2f3f5] px-4 py-3 rounded shadow-sm flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-6 h-6 rounded-full bg-indigo-600/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-[#5865F2]" />
          </div>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
      {/* Settings Modal (Discord Style Full Overlay) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[150] bg-white dark:bg-[#313338] flex">
          {/* Left Sidebar */}
          <div className="w-60 bg-white/60 dark:bg-[#2b2d31] flex flex-col items-end py-14 px-4 flex-shrink-0 border-r border-slate-200/50/50">
            <div className="w-full max-w-[192px]">
              <div className="text-[11px] font-bold text-slate-400 dark:text-[#949ba4] mb-2 px-2">SERVER SETTINGS</div>
              <div onClick={() => setSettingsTab("server")} className={cn("px-2 py-1.5 rounded mb-0.5 cursor-pointer text-[15px] font-medium transition-colors", settingsTab === "server" ? "bg-slate-100 dark:bg-[#383a40] text-slate-800 dark:text-[#f2f3f5]" : "text-slate-500 dark:text-[#b5bac1] hover:bg-slate-100 dark:hover:bg-[#35373c] hover:text-slate-700")}>Overview</div>
              <div onClick={() => setSettingsTab("privacy")} className={cn("px-2 py-1.5 rounded mb-0.5 cursor-pointer text-[15px] font-medium transition-colors", settingsTab === "privacy" ? "bg-slate-100 dark:bg-[#383a40] text-slate-800 dark:text-[#f2f3f5]" : "text-slate-500 dark:text-[#b5bac1] hover:bg-slate-100 dark:hover:bg-[#35373c] hover:text-slate-700")}>Privacy Settings</div>
              <div className="my-2 border-b border-slate-200/50 dark:border-[#1e1f22]" />
              <div className="text-[11px] font-bold text-slate-400 dark:text-[#949ba4] mb-2 px-2 mt-4">USER SETTINGS</div>
              <div onClick={() => setSettingsTab("profile")} className={cn("px-2 py-1.5 rounded mb-0.5 cursor-pointer text-[15px] font-medium transition-colors", settingsTab === "profile" ? "bg-slate-100 dark:bg-[#383a40] text-slate-800 dark:text-[#f2f3f5]" : "text-slate-500 dark:text-[#b5bac1] hover:bg-slate-100 dark:hover:bg-[#35373c] hover:text-slate-700")}>Profiles</div>
              <div onClick={() => setSettingsTab("notifications")} className={cn("px-2 py-1.5 rounded mb-0.5 cursor-pointer text-[15px] font-medium transition-colors", settingsTab === "notifications" ? "bg-slate-100 dark:bg-[#383a40] text-slate-800 dark:text-[#f2f3f5]" : "text-slate-500 dark:text-[#b5bac1] hover:bg-slate-100 dark:hover:bg-[#35373c] hover:text-slate-700")}>Notifications</div>
              <div className="my-2 border-b border-slate-200/50 dark:border-[#1e1f22]" />
              <div onClick={() => { setShowSettingsModal(false); setShowLeaveModal(true); }} className="px-2 py-1.5 rounded mb-0.5 cursor-pointer text-[15px] font-medium text-rose-500 hover:bg-rose-500 hover:text-white transition-colors">Leave Server</div>
            </div>
          </div>
          
          {/* Right Content */}
          <div className="flex-1 bg-white dark:bg-[#313338] relative overflow-y-auto">
            <div className="max-w-[740px] px-10 py-14">
              {settingsTab === "server" && (
                <div className="animate-in fade-in">
                  <h2 className="text-slate-800 dark:text-[#f2f3f5] font-bold text-xl mb-6">Server Overview</h2>
                  <div className="flex gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full bg-indigo-600 dark:bg-[#5865F2] flex items-center justify-center text-white text-3xl font-bold cursor-pointer relative group flex-shrink-0">
                      {getInitials(activeServer?.name || "Server")}
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold uppercase">Change</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-2 block">Server Name</label>
                      <input type="text" defaultValue={activeServer?.name} className="w-full bg-slate-50/80 dark:bg-[#1e1f22] text-slate-800 dark:text-[#f2f3f5] px-3 py-2.5 rounded border border-slate-200/50 dark:border-[#1e1f22] focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="my-10 border-b border-slate-200/50 dark:border-[#1e1f22]" />
                  <div className="bg-white/60 dark:bg-[#2b2d31] p-4 rounded text-slate-700 dark:text-[#dbdee1] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-[#f2f3f5]">Need to delete your server?</h3>
                      <p className="text-sm text-slate-500 dark:text-[#b5bac1] mt-1">This action cannot be undone.</p>
                    </div>
                    <button onClick={() => { setShowSettingsModal(false); setShowDeleteModal(true); }} className="px-4 py-2 border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white rounded font-medium transition-colors text-sm">Delete Server</button>
                  </div>
                </div>
              )}
              {settingsTab === "profile" && (
                <div className="animate-in fade-in">
                  <h2 className="text-slate-800 dark:text-[#f2f3f5] font-bold text-xl mb-6">Server Profiles</h2>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">Personalize your identity in this server. Changes here only apply to <strong>{activeServer?.name}</strong>.</p>
                  <label className="text-xs font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-2 block">Server Nickname</label>
                  <input type="text" placeholder={user?.name || "Nickname"} className="w-full bg-slate-50/80 dark:bg-[#1e1f22] text-slate-800 dark:text-[#f2f3f5] px-3 py-2.5 rounded border border-slate-200/50 dark:border-[#1e1f22] focus:border-indigo-500 outline-none mb-4" />
                  <button onClick={() => { setShowSettingsModal(false); handleFeatureClick("Profile Updates"); }} className="px-4 py-2 bg-indigo-600 dark:bg-[#5865F2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors text-sm">Save Changes</button>
                </div>
              )}
              {(settingsTab === "privacy" || settingsTab === "notifications") && (
                <div className="animate-in fade-in">
                  <h2 className="text-slate-800 dark:text-[#f2f3f5] font-bold text-xl mb-6 capitalize">{settingsTab} Settings</h2>
                  <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">This feature will be fully functional in a future update. For now, you can view the layout.</p>
                  <div className="bg-white/60 dark:bg-[#2b2d31] p-4 rounded text-slate-700 dark:text-[#dbdee1] flex items-center justify-between opacity-50 pointer-events-none">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-[#f2f3f5]">Example Setting Toggle</h3>
                      <p className="text-sm text-slate-500 dark:text-[#b5bac1] mt-1">Placeholder for setting configuration.</p>
                    </div>
                    <div className="w-10 h-6 bg-[#23a55a] rounded-full relative"><div className="w-4 h-4 bg-white dark:bg-[#313338] rounded-full absolute right-1 top-1"></div></div>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="absolute top-14 right-[20%] flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setShowSettingsModal(false)}>
              <div className="w-9 h-9 rounded-full border-2 border-[#b5bac1] group-hover:bg-[#b5bac1] flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-slate-500 dark:text-[#b5bac1] group-hover:text-[#313338] rotate-45" />
              </div>
              <span className="text-[13px] font-bold text-slate-500 dark:text-[#b5bac1] group-hover:text-slate-700">ESC</span>
            </div>
          </div>
        </div>
      )}

      {/* Leave Server Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-[#313338] w-[90vw] max-w-[440px] rounded shadow-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-4">Leave '{activeServer?.name}'</h2>
              <p className="text-slate-700 dark:text-[#dbdee1] text-sm">Are you sure you want to leave <strong>{activeServer?.name}</strong>? You won't be able to rejoin this server unless you are re-invited.</p>
            </div>
            <div className="bg-white/60 dark:bg-[#2b2d31] p-4 flex justify-end gap-3 mt-4">
              <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 hover:underline text-slate-700 dark:text-[#dbdee1] text-sm">Cancel</button>
              <button onClick={() => { setShowLeaveModal(false); showToast("You left the server."); }} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded font-medium transition-colors text-sm">Leave Server</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Server Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-[#313338] w-[90vw] max-w-[440px] rounded shadow-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-4">Delete '{activeServer?.name}'</h2>
              <p className="text-slate-700 dark:text-[#dbdee1] text-sm bg-[#eda145]/10 p-3 rounded border border-[#eda145]/30">Are you sure you want to delete <strong>{activeServer?.name}</strong>? This action cannot be undone.</p>
            </div>
            <div className="bg-white/60 dark:bg-[#2b2d31] p-4 flex justify-end gap-3 mt-4">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 hover:underline text-slate-700 dark:text-[#dbdee1] text-sm" disabled={isDeleting}>Cancel</button>
              <button onClick={async () => {
                if (activeServer) {
                  setIsDeleting(true);
                  try {
                    await deleteServer(activeServer._id);
                    setShowDeleteModal(false);
                    showToast("Server deleted.");
                  } catch (err: any) {
                    showToast("Failed to delete server.");
                  } finally {
                    setIsDeleting(false);
                  }
                }
              }} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded font-medium transition-colors text-sm disabled:opacity-50" disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Server"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-[#313338] w-[90vw] max-w-[440px] rounded shadow-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-pink-500 to-indigo-500 rounded-full flex items-center justify-center text-3xl mb-4">🚀</div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Unlock Perks with Server Boost</h2>
              <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">Level up <strong>{activeServer?.name}</strong> to unlock custom emojis, better audio quality, and animated server icons!</p>
              <button onClick={() => { showToast("Boost purchased!"); setShowBoostModal(false); }} className="w-full py-2.5 bg-indigo-600 dark:bg-[#5865F2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors text-sm mb-3">Boost This Server</button>
              <button onClick={() => setShowBoostModal(false)} className="w-full py-2.5 hover:underline text-slate-700 dark:text-[#dbdee1] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-[#313338] w-[90vw] max-w-[460px] rounded shadow-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Create Category</h2>
              <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-4">Categories help you organize your channels.</p>
              <label className="text-xs font-bold text-slate-500 dark:text-[#b5bac1] uppercase mb-2 block">Category Name</label>
              <input type="text" placeholder="New Category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-slate-50/80 dark:bg-[#1e1f22] text-slate-800 dark:text-[#f2f3f5] px-3 py-2.5 rounded border border-slate-200/50 dark:border-[#1e1f22] focus:border-indigo-500 outline-none" />
            </div>
            <div className="bg-white/60 dark:bg-[#2b2d31] p-4 flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }} className="px-4 py-2 hover:underline text-slate-700 dark:text-[#dbdee1] text-sm">Cancel</button>
              <button onClick={() => { 
                if (newCategoryName.trim()) {
                  showToast(`Category "${newCategoryName}" created!`);
                  setNewCategoryName("");
                  setShowAddCategory(false);
                }
              }} className="px-4 py-2 bg-indigo-600 dark:bg-[#5865F2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors text-sm">Create Category</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-[#313338] w-[90vw] max-w-[500px] rounded shadow-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200/50 dark:border-[#1e1f22]">
              <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5]">Create Event</h2>
            </div>
            <div className="p-6 text-center">
              <Calendar className="w-16 h-16 text-[#5865F2] mx-auto mb-4" />
              <p className="text-slate-700 dark:text-[#dbdee1] mb-6">Schedule voice chats, gaming sessions, and more. Your community will get notified when the event starts.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowEventModal(false)} className="px-6 py-2 bg-[#3f4147] hover:bg-[#4b4d54] text-white rounded font-medium transition-colors text-sm">Cancel</button>
                <button onClick={() => { showToast("Event created successfully!"); setShowEventModal(false); }} className="px-6 py-2 bg-indigo-600 dark:bg-[#5865F2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors text-sm">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Directory Modal */}
      {showAppDirectoryModal && (
        <div className="fixed inset-0 z-[150] bg-white dark:bg-[#313338] flex flex-col animate-in fade-in">
          <div className="p-4 border-b border-slate-200/50 dark:border-[#1e1f22] flex items-center justify-between shadow-sm z-10 bg-white dark:bg-[#313338]">
            <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5] flex items-center gap-2"><Grid className="w-5 h-5"/> App Directory</h2>
            <button onClick={() => setShowAppDirectoryModal(false)} className="w-8 h-8 rounded-full bg-slate-50/80 dark:bg-[#1e1f22] flex items-center justify-center hover:bg-rose-500 group transition-colors">
              <Plus className="w-5 h-5 text-slate-500 dark:text-[#b5bac1] group-hover:text-white rotate-45" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 bg-white/60 dark:bg-[#2b2d31]">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-[#f2f3f5] mb-2">Discover Apps</h3>
                <p className="text-slate-500 dark:text-[#b5bac1]">Level up your server with integrations, games, and moderation bots.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="bg-white dark:bg-[#313338] p-4 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-[#3f4147] transition-colors border border-slate-200/50 dark:border-[#1e1f22]" onClick={() => { showToast(`App ${i} added!`); setShowAppDirectoryModal(false); }}>
                    <div className="w-12 h-12 bg-indigo-500 rounded-lg mb-3 flex items-center justify-center text-white font-bold">Bot {i}</div>
                    <h4 className="font-bold text-slate-800 dark:text-[#f2f3f5] mb-1">Awesome Bot {i}</h4>
                    <p className="text-slate-500 dark:text-[#b5bac1] text-xs line-clamp-2">The best moderation and music bot for your community. Contains dozens of fun commands!</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-[#313338] w-[90vw] max-w-[460px] rounded shadow-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 dark:bg-[#5865F2] rounded-md flex items-center justify-center text-3xl mb-4 text-white"><Monitor className="w-8 h-8"/></div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-[#f2f3f5] mb-2">Get the Desktop App</h2>
              <p className="text-slate-500 dark:text-[#b5bac1] text-sm mb-6">Discord is best experienced on the desktop app. Get features like screen sharing, global push-to-talk, and hardware acceleration.</p>
              <button onClick={() => { showToast("Download started..."); setShowDownloadModal(false); }} className="w-full py-3 bg-indigo-600 dark:bg-[#5865F2] hover:bg-[#4752c4] text-white rounded font-bold transition-colors mb-3">Download for Windows</button>
              <button onClick={() => setShowDownloadModal(false)} className="w-full py-2 hover:underline text-slate-500 dark:text-[#b5bac1] text-sm">I'll use the web version for now</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
