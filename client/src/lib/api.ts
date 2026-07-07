import axios, { AxiosError } from "axios";

const isProd = typeof window !== "undefined" && window.location.hostname.includes("onrender.com");
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (isProd ? "https://codealpha-projectmanagementtool-0rio.onrender.com/api" : "http://localhost:5000/api");

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Don't redirect if the failed request was a login or register attempt
      const url = error.config?.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),
  register: (name: string, email: string, password: string) =>
    apiClient.post("/auth/register", { name, email, password }),
  googleLogin: (token: string) => apiClient.post("/auth/google", { token }),
  getMe: () => apiClient.get("/auth/me"),
  searchUsers: (search: string) =>
    apiClient.get(`/auth/users?search=${encodeURIComponent(search)}`),
  getStats: () => apiClient.get("/auth/stats"),
  updateProfile: (data: Record<string, unknown>) =>
    apiClient.put("/auth/profile", data),
};

// ==================== PROJECTS ====================
export const projectApi = {
  getAll: () => apiClient.get("/projects"),
  getOne: (id: string) => apiClient.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/projects/${id}`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
  addMember: (projectId: string, email: string) =>
    apiClient.post(`/projects/${projectId}/members`, { email }),
  removeMember: (projectId: string, userId: string) =>
    apiClient.delete(`/projects/${projectId}/members/${userId}`),
  updateWiki: (id: string, wiki: string) =>
    apiClient.put(`/projects/${id}/wiki`, { wiki }),
};

// ==================== TASKS ====================
export const taskApi = {
  getByProject: (projectId: string) =>
    apiClient.get(`/tasks?project=${projectId}`),
  create: (data: Record<string, unknown>) => apiClient.post("/tasks", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
  aiBreakdown: (id: string) => apiClient.post(`/tasks/${id}/ai-breakdown`),
};

// ==================== COMMENTS ====================
export const commentApi = {
  getByTask: (taskId: string) => apiClient.get(`/comments?task=${taskId}`),
  create: (text: string, taskId: string) =>
    apiClient.post("/comments", { text, task: taskId }),
  delete: (id: string) => apiClient.delete(`/comments/${id}`),
};

// ==================== INVITES ====================
export const inviteApi = {
  getAll: () => apiClient.get("/invites"),
  accept: (id: string) => apiClient.post(`/invites/${id}/accept`),
  reject: (id: string) => apiClient.post(`/invites/${id}/reject`),
};

// ==================== ADMIN ====================
export const adminApi = {
  getStats: () => apiClient.get("/admin/stats"),
  getUsers: () => apiClient.get("/admin/users"),
  getProjects: () => apiClient.get("/admin/projects"),
  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),
  deleteProject: (id: string) => apiClient.delete(`/admin/projects/${id}`),
};

// ==================== LIVEKIT ====================
export const livekitApi = {
  getToken: (roomName: string) =>
    apiClient.post("/livekit/token", { roomName }),
};

// ==================== GITHUB ====================
export const githubApi = {
  getStatus: () => apiClient.get("/github/status"),
  disconnect: () => apiClient.post("/github/disconnect"),
  getRepos: () => apiClient.get("/github/repos"),
  linkRepo: (projectId: string, repoFullName: string) =>
    apiClient.post("/github/link", { projectId, repoFullName }),
  unlinkRepo: (projectId: string) =>
    apiClient.post("/github/unlink", { projectId }),
  getCommits: (projectId: string) =>
    apiClient.get(`/github/commits/${projectId}`),
  getPulls: (projectId: string) =>
    apiClient.get(`/github/pulls/${projectId}`),
  getActivity: (projectId: string) =>
    apiClient.get(`/github/activity/${projectId}`),
  createIssue: (taskId: string) =>
    apiClient.post(`/github/issues/${taskId}`),
  // Returns the URL to redirect the user to for OAuth
  getLoginUrl: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const isProd = typeof window !== "undefined" && window.location.hostname.includes("onrender.com");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ||
      (isProd ? "https://codealpha-projectmanagementtool-0rio.onrender.com/api" : "http://localhost:5000/api");
    return `${baseUrl}/github/login?token=${token}`;
  },
};

// ==================== DISCORD ====================
export const discordApi = {
  updateSettings: (projectId: string, settings: { discordWebhookUrl?: string, discordServerId?: string, discordChannelId?: string }) =>
    apiClient.post(`/discord/settings/${projectId}`, settings),
};

// ==================== MEETINGS ====================
export const meetingApi = {
  markAttendance: (projectId: string) =>
    apiClient.post(`/meetings/${projectId}/attend`),
  getAttendance: (projectId: string) =>
    apiClient.get(`/meetings/${projectId}`),
};

export default apiClient;
