// Check Auth
const user = api.getUser();
if (!user) {
    window.location.href = '/login.html';
}

document.getElementById('userNameDisplay').textContent = user.name;
document.getElementById('navAvatarInitials').textContent = user.name.charAt(0).toUpperCase();
document.getElementById('sidebarAvatar').textContent = user.name.charAt(0).toUpperCase();
if(document.getElementById('dropdownAvatar')) document.getElementById('dropdownAvatar').textContent = user.name.charAt(0).toUpperCase();
if(document.getElementById('dropdownName')) document.getElementById('dropdownName').textContent = user.name;
if(document.getElementById('dropdownEmail')) document.getElementById('dropdownEmail').textContent = user.email || '';
if(document.getElementById('welcomeTitle')) {
    document.getElementById('welcomeTitle').textContent = `Welcome, ${user.name.split(' ')[0]}!`;
}

// Sync latest user profile in background (to catch role updates like 'admin')
api.getMe().then(res => {
    if (res && res.user) {
        api.setUser(res.user);
        if(res.user.role === 'admin' && document.getElementById('adminPanelLink')) {
            document.getElementById('adminPanelLink').style.display = 'flex';
        }
    }
}).catch(console.error);

if(user.role === 'admin' && document.getElementById('adminPanelLink')) {
    document.getElementById('adminPanelLink').style.display = 'flex';
}

let allProjects = [];
let currentView = 'grid';

// View Toggle
function setView(view, btn) {
    currentView = view;
    document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProjects(allProjects);
}

// Filter Projects
function filterProjects(query) {
    query = query.toLowerCase();
    const filtered = allProjects.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
    renderProjects(filtered);
}

// Filter by Stat Card
function filterProjectsByStat(stat) {
    let filtered = [];
    if (stat === 'all') {
        filtered = allProjects;
    } else if (stat === 'completed') {
        filtered = allProjects.filter(p => p.taskCounts && p.taskCounts.done > 0);
    } else if (stat === 'inprogress') {
        filtered = allProjects.filter(p => p.taskCounts && p.taskCounts.inprogress > 0);
    } else if (stat === 'overdue') {
        filtered = allProjects.filter(p => {
            if (!p.taskCounts) return false;
            const overdue = (p.taskCounts.total || 0) - (p.taskCounts.done || 0) - (p.taskCounts.inprogress || 0);
            return overdue > 0;
        });
    }

    renderProjects(filtered);
}

// Modal Logic
const modal = document.getElementById('createProjectModal');
function openModal() { modal.classList.add('active'); }
function closeModal() { 
    modal.classList.remove('active'); 
    document.getElementById('createProjectForm').reset();
}

// Notifications Logic
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    document.getElementById('profileDropdown').style.display = 'none';
}

// Profile Menu Logic
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    document.getElementById('notificationDropdown').style.display = 'none';
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const notifDropdown = document.getElementById('notificationDropdown');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (!event.target.closest('.header-icon-btn') && notifDropdown.style.display === 'block') {
        notifDropdown.style.display = 'none';
    }
    if (!event.target.closest('.user-profile-btn') && !event.target.closest('#profileDropdown') && profileDropdown.style.display === 'block') {
        profileDropdown.style.display = 'none';
    }
});

// Load Invites
async function loadInvites() {
    try {
        const data = await api.getInvites();
        const allInvites = data.invites || [];
        const pendingInvites = allInvites.filter(inv => inv.status === 'pending');

        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        const section = document.getElementById('invitesSection');
        const grid = document.getElementById('invitesGrid');

        if (allInvites.length === 0) {
            list.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No new notifications.</p>';
        } else {
            list.innerHTML = allInvites.map(inv => {
                let actionHtml = '';
                if (inv.status === 'pending') {
                    actionHtml = `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem;">
                            <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="handleInvite('${inv._id}', 'accept')">Accept</button>
                            <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="handleInvite('${inv._id}', 'reject')">Decline</button>
                        </div>`;
                } else if (inv.status === 'accepted') {
                    actionHtml = `<p style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">✅ Accepted</p>`;
                } else {
                    actionHtml = `<p style="font-size: 0.75rem; color: var(--danger); margin-top: 0.25rem;">❌ Declined</p>`;
                }
                return `
                <div style="background: var(--bg); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                    <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.15rem;">${inv.project ? inv.project.name : 'Unknown'}</p>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">Invited by: ${inv.invitedBy ? inv.invitedBy.name : 'Unknown'}</p>
                    ${actionHtml}
                </div>`;
            }).join('');
        }

        if (pendingInvites.length === 0) {
            badge.style.display = 'none';
            section.style.display = 'none';
            return;
        }

        badge.style.display = 'flex';
        badge.textContent = pendingInvites.length;

        section.style.display = 'block';
        grid.innerHTML = pendingInvites.map(inv => `
            <div class="project-card" style="border-left-color: var(--warning); cursor: default;">
                <h3>📩 ${inv.project ? inv.project.name : 'Unknown'}</h3>
                <p>Invited by: <strong>${inv.invitedBy ? inv.invitedBy.name : 'Unknown'}</strong></p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="handleInvite('${inv._id}', 'accept')">Accept</button>
                    <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="handleInvite('${inv._id}', 'reject')">Decline</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load invites:', error);
    }
}

async function handleInvite(id, action) {
    try {
        if (action === 'accept') {
            await api.acceptInvite(id);
            alert('Invite accepted!');
        } else {
            await api.rejectInvite(id);
        }
        loadInvites();
        loadProjects();
    } catch (error) {
        alert(error.message);
    }
}

// Render Projects
function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');

    if (projects.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius); border: 1px dashed var(--border);">
                <p style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</p>
                <p style="color: var(--text-muted); margin-bottom: 1rem;">No projects found.</p>
                <button class="btn btn-primary" onclick="openModal()">Create your first project</button>
            </div>`;
        return;
    }

    if (currentView === 'grid') {
        grid.className = 'projects-grid';
        grid.innerHTML = projects.map(p => {
            const total = p.taskCounts ? p.taskCounts.total : 0;
            const done = p.taskCounts ? p.taskCounts.done : 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            
            // Randomly pick some aesthetic tags for the UI based on project name hash or just mock them
            const mockTags = ['#Design', '#Development', '#Urgent', '#Planning', '#Marketing'].sort(() => 0.5 - Math.random()).slice(0, 2);
            
            const isOwner = p.owner && (p.owner._id === user.id || p.owner === user.id);
            const deleteBtnHtml = isOwner ? `
                <button onclick="deleteProject(event, '${p._id}')" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border: none; padding: 0.35rem; border-radius: 6px; cursor: pointer; transition: all 0.2s;" title="Delete Project" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            ` : '';

            return `
            <div class="project-card" onclick="window.location.href='/board.html?id=${p._id}'">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: ${p.color}; opacity: 0.8; display: flex; align-items: center; justify-content: center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h3 style="margin: 0; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${p.name}</h3>
                    </div>
                    ${deleteBtnHtml}
                </div>
                
                <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.85rem; position: relative; z-index: 1;">
                    Progress: <span style="font-weight: 700; color: var(--text-main);">${progress}%</span>
                </p>
                
                <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.05); border-radius: 3px; margin-bottom: 1.25rem; overflow: hidden; position: relative; z-index: 1;">
                    <div style="height: 100%; background: ${p.color}; width: ${progress}%; border-radius: 3px; box-shadow: 0 0 10px ${p.color}; transition: width 1s ease-out;"></div>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; position: relative; z-index: 1;">
                    <span style="font-size: 0.7rem; padding: 0.2rem 0.6rem; background: var(--primary-light); color: var(--primary); border-radius: 20px; font-weight: 600;">${mockTags[0]}</span>
                    <span style="font-size: 0.7rem; padding: 0.2rem 0.6rem; background: var(--info-light); color: var(--info); border-radius: 20px; font-weight: 600;">${mockTags[1]}</span>
                </div>
                
                <div class="project-meta" style="position: relative; z-index: 1; margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.4); display: flex; justify-content: space-between; align-items: center;">
                    <div class="avatar-group" style="display: flex; align-items: center;">
                        ${p.members.slice(0, 3).map((m, i) => `
                            <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--surface); margin-left: ${i > 0 ? '-10px' : '0'}; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: white;">
                                ${(m.name || 'U').charAt(0).toUpperCase()}
                            </div>
                        `).join('')}
                        ${p.members.length > 3 ? `
                            <div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--surface); margin-left: -10px; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: var(--text-muted); z-index: 1;">
                                +${p.members.length - 3}
                            </div>
                        ` : ''}
                    </div>
                    <span style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-muted);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ${total} tasks</span>
                </div>
            </div>
            `;
        }).join('');
    } else {
        grid.className = 'task-list-view';
        grid.innerHTML = projects.map(p => {
            const isOwner = p.owner && (p.owner._id === user.id || p.owner === user.id);
            return `
            <div class="task-card-item" onclick="window.location.href='/board.html?id=${p._id}'" style="cursor: pointer; align-items: flex-start;">
                <div style="width: 6px; height: 100%; border-radius: 3px; background: ${p.color}; flex-shrink: 0; min-height: 40px;"></div>
                <div class="task-card-body" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div class="task-card-title">${p.name}</div>
                        <div class="task-card-meta">
                            <span class="badge badge-tag">👥 ${p.members.length} members</span>
                            <span class="badge badge-tag">📝 ${p.taskCounts ? p.taskCounts.total : 0} tasks</span>
                        </div>
                    </div>
                    ${p.tasks && p.tasks.length > 0 ? `
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${p.tasks.slice(0, 4).map(t => `
                            <span style="font-size: 0.75rem; background: var(--bg); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-light); display: inline-flex; align-items: center; gap: 0.3rem;">
                                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${t.status === 'done' ? 'var(--success)' : t.status === 'inprogress' ? 'var(--warning)' : 'var(--text-muted)'};"></span>
                                ${t.title}
                            </span>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                <div style="display: flex; align-items: center; margin-top: 10px;">
                    ${isOwner ? `
                        <button onclick="deleteProject(event, '${p._id}')" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border: none; padding: 0.35rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-right: 10px;" title="Delete Project" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    ` : ''}
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
        `;
        }).join('');
    }
}

// Load Projects
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    try {
        const data = await api.getProjects();
        allProjects = data.projects;

        // Update stats
        let totalTasks = 0, doneTasks = 0, inProgressTasks = 0;
        allProjects.forEach(p => {
            if (p.taskCounts) {
                totalTasks += p.taskCounts.total || 0;
                doneTasks += p.taskCounts.done || 0;
                inProgressTasks += p.taskCounts.inprogress || 0;
            }
        });

        document.getElementById('statTotal').textContent = allProjects.length;
        document.getElementById('statInProgress').textContent = inProgressTasks;
        
        const progressPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        const statCompleted = document.getElementById('statCompleted');
        if(statCompleted) statCompleted.textContent = progressPercentage + '%';
        
        const statProgressFill = document.getElementById('statProgressFill');
        if(statProgressFill) statProgressFill.style.width = progressPercentage + '%';

        renderProjects(allProjects);
    } catch (error) {
        grid.innerHTML = `<div class="alert alert-danger">Error loading projects: ${error.message}</div>`;
    }
}

// Create Project
document.getElementById('createProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    const name = document.getElementById('pName').value;
    const description = document.getElementById('pDesc').value;
    const color = document.getElementById('pColor').value;

    try {
        await api.createProject({ name, description, color });
        closeModal();
        loadProjects();
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Project';
    }
});

// Delete Project
async function deleteProject(event, projectId) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone and will delete all tasks inside it.')) return;
    
    try {
        await api.deleteProject(projectId);
        loadProjects(); // refresh list
    } catch (error) {
        alert(error.message);
    }
}

// ========================
// DUE DATE REMINDERS
// ========================

let dueTodayTasks = [];

// Calculate time remaining string
function getTimeRemaining(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;

    if (diff <= 0) {
        const overdueMins = Math.abs(Math.floor(diff / (1000 * 60)));
        if (overdueMins < 60) return { text: `${overdueMins}m overdue`, cls: 'overdue' };
        const overdueHrs = Math.floor(overdueMins / 60);
        if (overdueHrs < 24) return { text: `${overdueHrs}h overdue`, cls: 'overdue' };
        const overdueDays = Math.floor(overdueHrs / 24);
        return { text: `${overdueDays}d overdue`, cls: 'overdue' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Less than 1 day = urgent (orange pulsing)
    if (days === 0) {
        if (hours === 0) return { text: `${mins}m left`, cls: 'urgent' };
        return { text: `${hours}h ${mins}m left`, cls: 'urgent' };
    }
    // 1 day remaining
    if (days === 1) return { text: `1d ${hours}h left`, cls: 'urgent' };
    // More than 1 day = remaining (green)
    return { text: `${days}d ${hours}h left`, cls: 'remaining' };
}

// Format due time
function formatDueTime(dueDate) {
    return new Date(dueDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Load due-today tasks
async function loadDueTodayTasks() {
    try {
        const data = await api.getDueTodayTasks();
        dueTodayTasks = data.tasks || [];
        renderDueDatePanel();
        updateNotificationDropdownWithDueTasks();
    } catch (error) {
        console.error('Failed to load due-today tasks:', error);
    }
}

// Render the main due-date panel
function renderDueDatePanel() {
    const section = document.getElementById('dueDateSection');
    const grid = document.getElementById('dueDateGrid');
    const countEl = document.getElementById('dueDateCount');
    const badge = document.getElementById('notificationBadge');

    if (!dueTodayTasks || dueTodayTasks.length === 0) {
        section.style.display = 'none';
        return;
    }

    // Check if dismissed for today
    const dismissed = sessionStorage.getItem('dueDateDismissed');
    if (dismissed === new Date().toDateString()) {
        section.style.display = 'none';
        // Still update badge
        updateDueBadge();
        return;
    }

    section.style.display = 'block';
    countEl.textContent = `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} need your attention today`;

    // Update notification badge to include due tasks count
    updateDueBadge();

    grid.innerHTML = dueTodayTasks.map(task => {
        const timeInfo = task.dueDate ? getTimeRemaining(task.dueDate) : { text: 'End of day', cls: 'urgent' };
        const dueTime = task.dueDate ? formatDueTime(task.dueDate) : 'EOD';
        const projectName = task.project ? task.project.name : 'Unknown';
        const projectId = task.project ? (task.project._id || task.project) : '';
        const assigneeName = task.assignee ? task.assignee.name : 'Unassigned';
        const statusLabel = task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'In Progress' : 'Done';

        return `
            <div class="due-task-card" data-priority="${task.priority}" onclick="window.location.href='/board.html?id=${projectId}'">
                <div class="due-task-info">
                    <div class="due-task-name">${task.title}</div>
                    <div class="due-task-meta">
                        <span>📁 ${projectName}</span>
                        <span>👤 ${assigneeName}</span>
                        <span class="due-priority-badge ${task.priority}">${task.priority}</span>
                        <span style="color: var(--text-muted);">📌 ${statusLabel}</span>
                    </div>
                </div>
                <div class="due-task-time ${timeInfo.cls}">
                    ⏰ ${timeInfo.text}
                </div>
            </div>
        `;
    }).join('');
}

// Update badge count
function updateDueBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    // Combine invite count + due tasks count
    const existingInviteCount = parseInt(badge.textContent) || 0;
    const totalCount = dueTodayTasks.length;

    if (totalCount > 0 || existingInviteCount > 0) {
        badge.style.display = 'flex';
        // Keep the larger count if invites were already shown
        const inviteOnlyCount = badge.dataset.inviteCount ? parseInt(badge.dataset.inviteCount) : existingInviteCount;
        badge.textContent = inviteOnlyCount + totalCount;
    }
}

// Update notification dropdown to include due-today items
function updateNotificationDropdownWithDueTasks() {
    const list = document.getElementById('notificationList');
    if (!list || dueTodayTasks.length === 0) return;

    // Build due-date notification section
    const dueHtml = `
        <div style="margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border-light);">
                <span style="font-size: 0.85rem;">⏰</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: #ef4444;">Due Today (${dueTodayTasks.length})</span>
            </div>
            ${dueTodayTasks.map(task => {
                const timeInfo = task.dueDate ? getTimeRemaining(task.dueDate) : { text: 'Today', cls: 'urgent' };
                const projectId = task.project ? (task.project._id || task.project) : '';
                const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
                return `
                    <div class="notif-due-item" onclick="window.location.href='/board.html?id=${projectId}'">
                        <div class="notif-due-dot" style="background: ${priorityColors[task.priority] || '#6b7280'};"></div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.title}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${task.project ? task.project.name : ''} • ${timeInfo.text}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Prepend due tasks before existing notifications
    const existingContent = list.innerHTML;
    list.innerHTML = dueHtml + existingContent;
}

// Dismiss due date panel for the current session
function dismissDueDatePanel() {
    sessionStorage.setItem('dueDateDismissed', new Date().toDateString());
    document.getElementById('dueDateSection').style.display = 'none';
}

// Load Gamification & Analytics Stats
async function loadStats() {
    try {
        const res = await api.getStats();
        if (res && res.stats) {
            const { productivityScore = 0, streakDays = 0, badges = [] } = res.stats;
            
            // Render Score
            document.getElementById('productivityScore').textContent = productivityScore;
            
            // Score progress circle (Progress to next level, every 100 points)
            const scoreProgress = document.getElementById('scoreProgress');
            if (scoreProgress) {
                const levelProgress = productivityScore % 100;
                const circumference = 282.7; // 2 * pi * 45
                const offset = circumference - (levelProgress / 100) * circumference;
                scoreProgress.style.strokeDashoffset = offset;
            }

            // Render Streak (Show only if 3 or more days)
            const streakBadge = document.getElementById('streakBadge');
            const streakCount = document.getElementById('streakCount');
            if (streakBadge && streakCount) {
                if (streakDays >= 3) {
                    streakBadge.style.display = 'flex';
                    streakCount.textContent = streakDays;
                } else {
                    streakBadge.style.display = 'none';
                }
            }

            // Render Badges
            const badgesContainer = document.getElementById('badgesContainer');
            if (badgesContainer) {
                if (badges.length > 0) {
                    badgesContainer.innerHTML = badges.map(b => `<div class="gamification-badge-item">${b}</div>`).join('');
                } else {
                    badgesContainer.innerHTML = '<span style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-style: italic;">Complete tasks to earn badges!</span>';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load gamification stats:', error);
    }
}

// Auto-refresh due-date timers every minute
setInterval(() => {
    if (dueTodayTasks.length > 0) {
        renderDueDatePanel();
    }
}, 60000);

// Initial load
loadInvites();
loadProjects();
loadDueTodayTasks();
loadStats();


// ========================
// POMODORO TIMER LOGIC
// ========================

let pomodoroInterval;
let pomodoroTimeLeft = 25 * 60; // 25 minutes default
let pomodoroTotalTime = 25 * 60;
let pomodoroMode = 'work'; // 'work' or 'break'
let isPomodoroRunning = false;
let inFocusMode = false;

// DOM Elements
const pomodoroTimeDisplay = document.getElementById('pomodoroTimeDisplay');
const pomodoroProgress = document.getElementById('pomodoroProgress');
const pomodoroStartBtn = document.getElementById('pomodoroStartBtn');
const pomodoroBtnWork = document.getElementById('pomodoroBtnWork');
const pomodoroBtnBreak = document.getElementById('pomodoroBtnBreak');
const focusModeOverlay = document.getElementById('focusModeOverlay');
const focusTimeDisplay = document.getElementById('focusTimeDisplay');
const focusPauseBtn = document.getElementById('focusPauseBtn');

// Calculate stroke dashoffset for the SVG circle (circumference is ~339)
const CIRCUMFERENCE = 339.292;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updatePomodoroUI() {
    const formatted = formatTime(pomodoroTimeLeft);
    pomodoroTimeDisplay.textContent = formatted;
    if (inFocusMode) {
        focusTimeDisplay.textContent = formatted;
        document.title = `(${formatted}) Focus Mode - OmniPlan`;
    } else {
        document.title = isPomodoroRunning ? `(${formatted}) Pomodoro` : 'Dashboard - OmniPlan';
    }

    // Update Circle Progress
    const progress = pomodoroTimeLeft / pomodoroTotalTime;
    const dashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    pomodoroProgress.style.strokeDashoffset = dashoffset;
}

function setPomodoroMode(mode) {
    if (isPomodoroRunning) {
        if (!confirm('Timer is running. Are you sure you want to switch modes?')) return;
        togglePomodoro(); // Pause
    }
    
    pomodoroMode = mode;
    if (mode === 'work') {
        pomodoroTotalTime = 25 * 60;
        pomodoroBtnWork.classList.add('active');
        pomodoroBtnBreak.classList.remove('active');
        pomodoroProgress.style.stroke = '#ef4444'; // Red
    } else {
        pomodoroTotalTime = 5 * 60;
        pomodoroBtnBreak.classList.add('active');
        pomodoroBtnWork.classList.remove('active');
        pomodoroProgress.style.stroke = '#22c55e'; // Green
    }
    
    pomodoroTimeLeft = pomodoroTotalTime;
    updatePomodoroUI();
}

function togglePomodoro() {
    isPomodoroRunning = !isPomodoroRunning;
    
    if (isPomodoroRunning) {
        // Start
        pomodoroStartBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause';
        focusPauseBtn.textContent = 'Pause';
        
        // Enter focus mode automatically if working
        if (pomodoroMode === 'work' && !inFocusMode) {
            enterFocusMode();
        }
        
        pomodoroInterval = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroUI();
            
            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroInterval);
                isPomodoroRunning = false;
                playAlertSound();
                if (inFocusMode) exitFocusMode();
                
                alert(pomodoroMode === 'work' ? 'Focus time complete! Take a break.' : 'Break is over. Back to work!');
                setPomodoroMode(pomodoroMode === 'work' ? 'break' : 'work');
            }
        }, 1000);
    } else {
        // Pause
        clearInterval(pomodoroInterval);
        pomodoroStartBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Resume';
        focusPauseBtn.textContent = 'Resume';
    }
}

function resetPomodoro() {
    if (isPomodoroRunning) {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
    }
    pomodoroStartBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Focus';
    pomodoroTimeLeft = pomodoroTotalTime;
    updatePomodoroUI();
}

function enterFocusMode() {
    inFocusMode = true;
    focusModeOverlay.classList.add('active');
}

function exitFocusMode() {
    inFocusMode = false;
    focusModeOverlay.classList.remove('active');
    updatePomodoroUI(); // Reset document title
}

function playAlertSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
    } catch (e) {
        console.log('Audio not supported or blocked');
    }
}

// Init Pomodoro UI
updatePomodoroUI();
