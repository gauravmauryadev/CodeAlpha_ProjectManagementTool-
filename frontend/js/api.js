// Use relative path since the backend serves the frontend statically
const API_URL = '/api';

const api = {
  getToken() {
    return localStorage.getItem('token');
  },
  setToken(token) {
    localStorage.setItem('token', token);
  },
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  },

  timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds
    const isFuture = diff < 0;
    const absDiff = Math.abs(diff);

    if (absDiff < 60) return isFuture ? 'in a few seconds' : 'just now';
    if (absDiff < 3600) {
      const mins = Math.floor(absDiff / 60);
      return isFuture ? `in ${mins}m` : `${mins}m ago`;
    }
    if (absDiff < 86400) {
      const hrs = Math.floor(absDiff / 3600);
      return isFuture ? `in ${hrs}h` : `${hrs}h ago`;
    }
    if (absDiff < 2592000) {
      const days = Math.floor(absDiff / 86400);
      return isFuture ? `in ${days}d` : `${days}d ago`;
    }
    if (absDiff < 31536000) {
      const months = Math.floor(absDiff / 2592000);
      return isFuture ? `in ${months}mo` : `${months}mo ago`;
    }
    const years = Math.floor(absDiff / 31536000);
    return isFuture ? `in ${years}y` : `${years}y ago`;
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const config = {
      headers: {},
      ...options
    };
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
      config.headers['Content-Type'] = 'application/json';
    } else if (!(config.body instanceof FormData)) {
       config.headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        this.logout();
        return;
      }
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  },

  register(name, email, password) { return this.request('/auth/register', { method: 'POST', body: { name, email, password } }); },
  login(email, password) { return this.request('/auth/login', { method: 'POST', body: { email, password } }); },
  googleLogin(token) { return this.request('/auth/google', { method: 'POST', body: { token } }); },
  getMe() { return this.request('/auth/me'); },
  searchUsers(search) { return this.request(`/auth/users?search=${encodeURIComponent(search)}`); },
  getProjects() { return this.request('/projects'); },
  createProject(data) { return this.request('/projects', { method: 'POST', body: data }); },
  getProject(id) { return this.request(`/projects/${id}`); },
  updateProject(id, data) { return this.request(`/projects/${id}`, { method: 'PUT', body: data }); },
  deleteProject(id) { return this.request(`/projects/${id}`, { method: 'DELETE' }); },
  addMember(projectId, email) { return this.request(`/projects/${projectId}/members`, { method: 'POST', body: { email } }); },
  removeMember(projectId, userId) { return this.request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }); },
  getTasks(projectId) { return this.request(`/tasks?project=${projectId}`); },
  createTask(data) { return this.request('/tasks', { method: 'POST', body: data }); },
  updateTask(id, data) { return this.request(`/tasks/${id}`, { method: 'PUT', body: data }); },
  deleteTask(id) { return this.request(`/tasks/${id}`, { method: 'DELETE' }); },
  getComments(taskId) { return this.request(`/comments?task=${taskId}`); },
  addComment(text, taskId) { return this.request('/comments', { method: 'POST', body: { text, task: taskId } }); },
  deleteComment(id) { return this.request(`/comments/${id}`, { method: 'DELETE' }); },
  getInvites() { return this.request('/invites'); },
  acceptInvite(id) { return this.request(`/invites/${id}/accept`, { method: 'POST' }); },
  rejectInvite(id) { return this.request(`/invites/${id}/reject`, { method: 'POST' }); },
  getStats() { return this.request('/auth/stats'); },
  updateProfile(data) { return this.request('/auth/profile', { method: 'PUT', body: data }); },
  getDueTodayTasks() { return this.request('/tasks/due-today'); },
  aiBreakdown(taskId) { return this.request(`/tasks/${taskId}/ai-breakdown`, { method: 'POST' }); }
};
