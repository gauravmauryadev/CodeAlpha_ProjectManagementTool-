// Check auth
const user = api.getUser();
if (!user || user.role !== 'admin') {
    alert('Access denied! Admin only.');
    window.location.href = '/dashboard.html';
}

// Set Header Avatar
document.getElementById('navAvatarInitials').textContent = user.name.charAt(0).toUpperCase();
document.getElementById('userNameDisplay').textContent = user.name;

// Profile Dropdown Toggle
const profileBtn = document.querySelector('.user-profile-btn');
if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.querySelector('.profile-dropdown');
        if (dropdown) dropdown.classList.toggle('active');
    });
}
window.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.profile-dropdown');
    if (dropdown && !e.target.closest('.profile-dropdown-wrap')) {
        dropdown.classList.remove('active');
    }
});

// State
let allUsers = [];
let allProjects = [];
let allTasks = [];
let allMessages = [];

// Init
loadAdminData();

async function loadAdminData() {
    try {
        const [stats, usersData, projectsData, tasksData, messagesData] = await Promise.all([
            api.request('/admin/stats'),
            api.request('/admin/users'),
            api.request('/admin/projects'),
            api.request('/admin/tasks'),
            api.request('/admin/messages')
        ]);

        // Stats
        document.getElementById('aStatUsers').textContent = stats.totalUsers;
        document.getElementById('aStatProjects').textContent = stats.totalProjects;
        document.getElementById('aStatTasks').textContent = stats.totalTasks;
        document.getElementById('aStatMessages').textContent = stats.totalMessages;
        document.getElementById('aStatRecent').textContent = stats.recentUsers;

        // Task distribution bar
        const total = stats.totalTasks || 1;
        const todoP = (stats.tasksByStatus.todo / total * 100).toFixed(1);
        const progP = (stats.tasksByStatus.inprogress / total * 100).toFixed(1);
        const doneP = (stats.tasksByStatus.done / total * 100).toFixed(1);
        document.getElementById('barTodo').style.width = todoP + '%';
        document.getElementById('barProgress').style.width = progP + '%';
        document.getElementById('barDone').style.width = doneP + '%';
        document.getElementById('aBarTodo').textContent = stats.tasksByStatus.todo;
        document.getElementById('aBarProgress').textContent = stats.tasksByStatus.inprogress;
        document.getElementById('aBarDone').textContent = stats.tasksByStatus.done;

        // Render tables
        allUsers = usersData.users || [];
        allProjects = projectsData.projects || [];
        allTasks = tasksData.tasks || [];
        allMessages = messagesData.messages || [];

        renderUsers(allUsers);
        renderProjects(allProjects);
        renderTasks(allTasks);
        renderMessages(allMessages);
    } catch (err) {
        console.error(err);
        alert('Failed to load admin data: ' + err.message);
    }
}

// ---- RENDER USERS ----
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">No users found</td></tr>'; return; }

    const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];
    tbody.innerHTML = users.map(u => {
        const color = colors[u.name.charCodeAt(0) % colors.length];
        const date = api.timeAgo(u.createdAt);
        const isCurrentUser = user.id === u._id;
        return `<tr>
            <td><div class="user-cell"><div class="avatar" style="background: ${color};">${u.name.charAt(0).toUpperCase()}</div><span style="font-weight: 600; color: #e2e8f0;">${u.name}</span></div></td>
            <td>${u.email}</td>
            <td><span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role || 'user'}</span></td>
            <td>${date}</td>
            <td style="display: flex; gap: 0.5rem;">
                ${u.role !== 'admin' ? `<button class="admin-btn admin-btn-success" onclick="makeAdmin('${u._id}')">Make Admin</button>` : ''}
                ${!isCurrentUser ? `<button class="admin-btn admin-btn-danger" onclick="deleteUser('${u._id}', '${u.name}')">Delete</button>` : '<span style="font-size:0.75rem;color:#64748b;">You</span>'}
            </td>
        </tr>`;
    }).join('');
}

// ---- RENDER PROJECTS ----
function renderProjects(projects) {
    const tbody = document.getElementById('projectsTableBody');
    if (projects.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">No projects found</td></tr>'; return; }

    tbody.innerHTML = projects.map(p => {
        const owner = p.owner ? p.owner.name : 'Unknown';
        const memberCount = p.members ? p.members.length : 0;
        const date = api.timeAgo(p.createdAt);
        return `<tr>
            <td style="font-weight: 600; color: #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${p.color || '#6366f1'};"></div>
                    <a href="/board.html?id=${p._id}" style="color: var(--primary); text-decoration: none; font-weight: 700;">${p.name}</a>
                </div>
            </td>
            <td>${owner}</td>
            <td>${memberCount} members</td>
            <td>${date}</td>
            <td><button class="admin-btn admin-btn-danger" onclick="deleteProject('${p._id}', '${p.name}')">Delete</button></td>
        </tr>`;
    }).join('');
}

// ---- RENDER TASKS ----
function renderTasks(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    if (tasks.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">No tasks found</td></tr>'; return; }

    tbody.innerHTML = tasks.map(t => {
        const projectName = t.project ? t.project.name : 'N/A';
        const assignee = t.assignee ? t.assignee.name : 'Unassigned';
        return `<tr>
            <td style="font-weight: 600; color: #e2e8f0;">${t.title}</td>
            <td>${projectName}</td>
            <td>${assignee}</td>
            <td><span class="status-badge status-${t.status}">${t.status}</span></td>
            <td class="priority-${t.priority}">${t.priority}</td>
        </tr>`;
    }).join('');
}

// ---- RENDER MESSAGES ----
function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (messages.length === 0) { container.innerHTML = '<div class="admin-empty">No messages yet</div>'; return; }

    const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];
    container.innerHTML = messages.map(m => {
        const color = colors[(m.sender?.name || 'U').charCodeAt(0) % colors.length];
        const time = api.timeAgo(m.createdAt);
        const senderName = m.sender ? m.sender.name : 'Unknown';
        return `<div class="admin-msg">
            <div class="msg-avatar" style="background: ${color};">${senderName.charAt(0).toUpperCase()}</div>
            <div class="msg-body">
                <div>
                    <span class="msg-name">${senderName}</span>
                    <span class="msg-time">${time}</span>
                    <span class="msg-channel">#${m.channel || 'unknown'}</span>
                </div>
                <div class="msg-text">${escapeHtml(m.text)}</div>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---- TABS ----
function switchAdminTab(tab, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    el.classList.add('active');
}

// ---- ACTIONS ----
async function makeAdmin(userId) {
    if (!confirm('Are you sure you want to make this user an Admin?')) return;
    try {
        await api.request(`/admin/users/${userId}/role`, { method: 'PUT', body: { role: 'admin' } });
        alert('User is now an Admin!');
        loadAdminData();
    } catch (err) { alert(err.message); }
}

async function deleteUser(userId, name) {
    if (!confirm(`DELETE user "${name}"? This cannot be undone!`)) return;
    try {
        await api.request(`/admin/users/${userId}`, { method: 'DELETE' });
        alert('User deleted.');
        loadAdminData();
    } catch (err) { alert(err.message); }
}

async function deleteProject(projectId, name) {
    if (!confirm(`DELETE project "${name}" and all its tasks? This cannot be undone!`)) return;
    try {
        await api.request(`/admin/projects/${projectId}`, { method: 'DELETE' });
        alert('Project deleted.');
        loadAdminData();
    } catch (err) { alert(err.message); }
}

// ---- SEARCH ----
function searchAdmin(query) {
    query = query.toLowerCase();
    const activeTab = document.querySelector('.tab-content.active').id;

    if (activeTab === 'tab-users') {
        renderUsers(allUsers.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)));
    } else if (activeTab === 'tab-projects') {
        renderProjects(allProjects.filter(p => p.name.toLowerCase().includes(query)));
    } else if (activeTab === 'tab-tasks') {
        renderTasks(allTasks.filter(t => t.title.toLowerCase().includes(query)));
    } else if (activeTab === 'tab-messages') {
        renderMessages(allMessages.filter(m => (m.text || '').toLowerCase().includes(query) || (m.sender?.name || '').toLowerCase().includes(query)));
    }
}
