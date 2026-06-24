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
            
            return `
            <div class="project-card" onclick="window.location.href='/board.html?id=${p._id}'">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: ${p.color}; opacity: 0.8; display: flex; align-items: center; justify-content: center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h3 style="margin: 0; font-size: 1.1rem;">${p.name}</h3>
                    </div>
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
                
                <div class="project-meta" style="position: relative; z-index: 1; margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.4);">
                    <span style="display: flex; align-items: center; gap: 0.4rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> ${p.members.length}</span>
                    <span style="display: flex; align-items: center; gap: 0.4rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ${total} tasks</span>
                </div>
            </div>
            `;
        }).join('');
    } else {
        grid.className = 'task-list-view';
        grid.innerHTML = projects.map(p => `
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
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 10px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        `).join('');
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

// Initial load
loadInvites();
loadProjects();
