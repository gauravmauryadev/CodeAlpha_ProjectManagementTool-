import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { authApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<any>;
  googleLogin: (token: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  syncProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          const { token, user } = res.data;
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register(name, email, password);
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            set({ user: res.data.user, token: res.data.token, isLoading: false });
          } else {
            set({ isLoading: false });
          }
          return res.data;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      googleLogin: async (credential) => {
        set({ isLoading: true });
        try {
          const res = await authApi.googleLogin(credential);
          const { token, user } = res.data;
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        set({ user: null, token: null });
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },

      setUser: (user) => {
        localStorage.setItem("user", JSON.stringify(user));
        set({ user });
      },

      syncProfile: async () => {
        try {
          const res = await authApi.getMe();
          if (res.data?.user) {
            get().setUser(res.data.user);
          }
        } catch {
          // silently fail
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
