import { create } from "zustand";
import api from "@/lib/api";

export interface DiscordChannel {
  _id: string;
  name: string;
  type: "text" | "voice";
  category?: string;
}

export interface DiscordServer {
  _id: string;
  name: string;
  owner: string;
  members: any[];
  channels: DiscordChannel[];
  inviteCode: string;
}

interface DiscordState {
  servers: DiscordServer[];
  activeServerId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  createServer: (name: string) => Promise<void>;
  joinServer: (inviteCode: string) => Promise<void>;
  createChannel: (serverId: string, name: string, type: "text" | "voice") => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  setActiveServer: (serverId: string) => void;
}

export const useDiscordStore = create<DiscordState>((set, get) => ({
  servers: [],
  activeServerId: null,
  isLoading: false,
  error: null,

  fetchServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get("/discord");
      const servers = res.data.servers;
      set({ 
        servers, 
        isLoading: false,
        activeServerId: get().activeServerId || (servers.length > 0 ? servers[0]._id : null)
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to load servers", isLoading: false });
    }
  },

  createServer: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post("/discord", { name });
      const newServer = res.data.server;
      set((state) => ({
        servers: [...state.servers, newServer],
        activeServerId: newServer._id,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to create server", isLoading: false });
    }
  },

  joinServer: async (inviteCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/discord/join/${inviteCode}`);
      const server = res.data.server;
      set((state) => ({
        servers: state.servers.find(s => s._id === server._id) ? state.servers : [...state.servers, server],
        activeServerId: server._id,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to join server", isLoading: false });
      throw err;
    }
  },

  createChannel: async (serverId: string, name: string, type: "text" | "voice") => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/discord/${serverId}/channels`, { name, type });
      const updatedServer = res.data.server;
      set((state) => ({
        servers: state.servers.map(s => s._id === serverId ? updatedServer : s),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to create channel", isLoading: false });
      throw err;
    }
  },

  deleteServer: async (serverId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/discord/${serverId}`);
      set((state) => {
        const newServers = state.servers.filter(s => s._id !== serverId);
        return {
          servers: newServers,
          activeServerId: state.activeServerId === serverId 
            ? (newServers.length > 0 ? newServers[0]._id : null) 
            : state.activeServerId,
          isLoading: false
        };
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || "Failed to delete server", isLoading: false });
      throw err;
    }
  },

  setActiveServer: (serverId: string) => {
    set({ activeServerId: serverId });
  }
}));
