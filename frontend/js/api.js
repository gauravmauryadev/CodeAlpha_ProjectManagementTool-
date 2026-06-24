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
  updateProfile(data) { return this.request('/auth/profile', { method: 'PUT', body: data }); }
};
