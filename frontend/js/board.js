// Setup
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

if (!projectId || !api.getUser()) {
    window.location.href = '/dashboard.html';
}

// REAL-TIME UPDATES VIA SOCKET.IO
const socket = typeof io !== 'undefined' ? io() : null;
if (socket) {
    socket.on('connect', () => {
        socket.emit('joinProject', { projectId });
        console.log('Joined project room for real-time updates');
    });
    
    // Listen for task changes
    socket.on('taskCreated', () => { console.log('Task created elsewhere'); loadTasks(); });
    socket.on('taskUpdated', () => { console.log('Task updated elsewhere'); loadTasks(); });
    socket.on('taskDeleted', () => { console.log('Task deleted elsewhere'); loadTasks(); });
}

let currentTasks = {}; // Store task data by ID
let currentProjectMembers = []; // Store team members
let currentProjectOwnerId = null; // Store project owner ID

// Load Project & Tasks
async function initBoard() {
    try {
        const projectRes = await api.getProject(projectId);
        document.getElementById('projectNameDisplay').textContent = projectRes.project.name;
        
        // Show "Add Member" only if current user is the owner
        const currentUser = api.getUser();
        const ownerId = projectRes.project.owner._id || projectRes.project.owner;
        currentProjectOwnerId = ownerId;
        if (currentUser && ownerId === currentUser.id) {
            document.getElementById('addMemberBtn').style.display = 'block';
        }
        
        currentProjectMembers = projectRes.project.members || [];
        const assigneeSelect = document.getElementById('tAssignee');
        currentProjectMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member._id;
            option.textContent = member.name;
            assigneeSelect.appendChild(option);
        });

        await loadTasks();
    } catch (error) {
        alert('Error loading project: ' + error.message);
        window.location.href = '/dashboard.html';
    }
}

async function loadTasks() {
    try {
        const data = await api.getTasks(projectId);
        currentTasks = {}; // reset
        
        ['todo', 'inprogress', 'done'].forEach(status => {
            const list = document.getElementById(`list-${status}`);
            const count = document.getElementById(`count-${status}`);
            const tasks = data.tasks[status] || [];
            
            count.textContent = tasks.length;
            list.innerHTML = '';
            
            tasks.forEach(task => {
                currentTasks[task._id] = task; // save for modal
                
                // Format Due Date
                let dueDateHtml = '';
                if (task.dueDate) {
                    const date = new Date(task.dueDate);
                    const isOverdue = date < new Date() && task.status !== 'done';
                    dueDateHtml = `<span style="font-size: 0.7rem; background: ${isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-color)'}; color: ${isOverdue ? '#ef4444' : 'var(--text-main)'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'};" title="Due Date">📅 ${api.timeAgo(date)}</span>`;
                }

                // Format Label
                let labelHtml = '';
                if (task.labels && task.labels.length > 0 && task.labels[0]) {
                    const labelColors = { 'Bug': '#ef4444', 'Feature': '#10b981', 'Enhancement': '#3b82f6', 'Design': '#ec4899', 'Urgent': '#f59e0b' };
                    const color = labelColors[task.labels[0]] || '#6366f1';
                    labelHtml = `<span style="font-size: 0.7rem; background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 12px; border: 1px solid ${color}50; font-weight: 500;">${task.labels[0]}</span>`;
                }

                const searchData = `${task.title} ${task.assignee ? task.assignee.name : ''} ${task.labels ? task.labels.join(' ') : ''}`.toLowerCase();
                
                let startTaskHtml = '';
                const currentUser = api.getUser();
                if (task.status === 'todo' && task.assignee && (task.assignee._id === currentUser?.id || task.assignee === currentUser?.id)) {
                    startTaskHtml = `<span onclick="startTask('${task._id}')" style="cursor: pointer; background: var(--primary); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;" title="Start Working">▶️ Start</span>`;
                } else if (task.status === 'inprogress' && task.assignee && (task.assignee._id === currentUser?.id || task.assignee === currentUser?.id)) {
                    startTaskHtml = `<span onclick="completeTask('${task._id}')" style="cursor: pointer; background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;" title="Mark as Done">✅ Done</span>`;
                }

                list.innerHTML += `
                    <div class="task-card" draggable="true" ondragstart="drag(event)" id="${task._id}" data-search="${searchData}">
                        ${task.imageUrl ? `<img src="http://localhost:5000${task.imageUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 8px;">` : ''}
                        ${labelHtml ? `<div style="margin-bottom: 8px;">${labelHtml}</div>` : ''}
                        <div class="task-title" onclick="openTaskModal(null, '${task._id}', 'edit')">${task.title}</div>
                        ${task.latestComment ? `
                        <div class="latest-comment" style="margin-top: 8px; padding: 8px; background: var(--bg-color); border-radius: 4px; font-size: 0.75rem; border-left: 2px solid var(--primary-color);">
                            <span style="font-weight: 600; color: var(--primary-color);">${task.latestComment.author.name}:</span>
                            <span style="color: var(--text-main); margin-left: 4px;">${task.latestComment.text}</span>
                        </div>
                        ` : ''}
                        <div class="task-meta" style="margin-top: 10px; align-items: center; display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                            <span style="flex: 1;"></span>
                            ${task.assignee ? `<span style="font-size: 0.75rem; background: var(--bg-color); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);" title="Assigned to ${task.assignee.name}">👤 ${task.assignee.name}</span>` : ''}
                            ${dueDateHtml}
                            ${startTaskHtml}
                            <span onclick="aiBreakdownTask(event, '${task._id}')" style="cursor: pointer; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 2px 7px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; transition: all 0.2s;" title="AI Smart Breakdown" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🤖 AI</span>
                            <span onclick="openTaskModal(null, '${task._id}', 'edit')" style="cursor: pointer;" title="Edit Task">✏️</span>
                            <span onclick="openTaskModal(null, '${task._id}', 'comment')" style="cursor: pointer;" title="View Comments">💬</span>
                        </div>
                    </div>
                `;
            });
        });
    } catch (error) {
        console.error(error);
    }
}

// Drag & Drop
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("taskId", ev.target.id);
}

async function drop(ev) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("taskId");
    // Find closest task-list container
    let targetList = ev.target;
    while(targetList && !targetList.classList.contains('task-list')) {
        targetList = targetList.parentElement;
    }
    
    if(!targetList) return;
    
    targetList.appendChild(document.getElementById(taskId));
    
    // Determine new status
    const newStatus = targetList.id.split('-')[1];
    
    try {
        await api.updateTask(taskId, { status: newStatus });
        loadTasks(); // refresh counts and data
    } catch (error) {
        alert('Failed to move task');
        loadTasks(); // revert visually
    }
}

async function startTask(taskId) {
    try {
        await api.updateTask(taskId, { status: 'inprogress' });
        loadTasks();
    } catch (error) {
        alert('Failed to start task: ' + error.message);
    }
}

async function completeTask(taskId) {
    try {
        await api.updateTask(taskId, { status: 'done' });
        loadTasks();
    } catch (error) {
        alert('Failed to complete task: ' + error.message);
    }
}

// Modal Logic
const modal = document.getElementById('taskModal');

function openTaskModal(status = 'todo', taskId = null, mode = 'edit') {
    document.getElementById('tStatus').value = status;
    document.getElementById('tId').value = taskId || '';
    
    const isEdit = !!taskId;
    
    if (mode === 'comment') {
        document.getElementById('taskModalTitle').textContent = 'Task Comments';
        document.getElementById('taskForm').style.display = 'none';
        document.getElementById('commentsSection').style.display = 'block';
        
        const currentUser = api.getUser();
        const task = currentTasks[taskId];
        const isOwner = currentProjectOwnerId === currentUser.id;
        const isAssignee = task.assignee && (task.assignee._id === currentUser.id || task.assignee === currentUser.id);
        
        if (isOwner || isAssignee) {
            document.getElementById('commentInputArea').style.display = 'flex';
            document.getElementById('commentRestrictedMsg').style.display = 'none';
        } else {
            document.getElementById('commentInputArea').style.display = 'none';
            document.getElementById('commentRestrictedMsg').style.display = 'block';
        }
        
        loadComments(taskId);
    } else {
        document.getElementById('taskModalTitle').textContent = isEdit ? 'Edit Task' : 'Create Task';
        document.getElementById('taskForm').style.display = 'block';
        document.getElementById('taskSubmitBtn').textContent = isEdit ? 'Update Task' : 'Create Task';
        document.getElementById('taskDeleteBtn').style.display = isEdit ? 'block' : 'none';
        document.getElementById('commentsSection').style.display = 'none';
        
        if (isEdit) {
            const task = currentTasks[taskId];
            document.getElementById('tStatus').value = task.status;
            document.getElementById('tTitle').value = task.title;
            document.getElementById('tDesc').value = task.description;
            document.getElementById('tPriority').value = task.priority;
            document.getElementById('tAssignee').value = task.assignee ? task.assignee._id : '';
            document.getElementById('tStartDate').value = task.startDate ? task.startDate.split('T')[0] : '';
            document.getElementById('tDueDate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
            document.getElementById('tDependencies').value = task.dependencies || '';
            document.getElementById('tLabel').value = task.labels && task.labels.length > 0 ? task.labels[0] : '';
            
            if (task.imageUrl) {
                document.getElementById('currentImagePreview').style.display = 'block';
                document.getElementById('tImagePreview').src = `http://localhost:5000${task.imageUrl}`;
            } else {
                document.getElementById('currentImagePreview').style.display = 'none';
            }
        } else {
            document.getElementById('taskForm').reset();
            document.getElementById('tAssignee').value = '';
            document.getElementById('tStartDate').value = '';
            document.getElementById('tDueDate').value = '';
            document.getElementById('tDependencies').value = '';
            document.getElementById('tLabel').value = '';
            document.getElementById('currentImagePreview').style.display = 'none';
        }
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    modal.classList.remove('active');
}

// Form Submit (Create / Update)
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('tId').value;
    const isEdit = !!id;
    
    const formData = new FormData();
    formData.append('title', document.getElementById('tTitle').value);
    formData.append('description', document.getElementById('tDesc').value);
    formData.append('priority', document.getElementById('tPriority').value);
    formData.append('status', document.getElementById('tStatus').value);
    formData.append('project', projectId);
    
    const assignee = document.getElementById('tAssignee').value;
    if (assignee) formData.append('assignee', assignee);
    
    const startDate = document.getElementById('tStartDate').value;
    if (startDate) formData.append('startDate', startDate);
    
    const dueDate = document.getElementById('tDueDate').value;
    if (dueDate) formData.append('dueDate', dueDate);

    const dependencies = document.getElementById('tDependencies').value;
    formData.append('dependencies', dependencies || '');
    
    const label = document.getElementById('tLabel').value;
    if (label) formData.append('labels', JSON.stringify([label]));
    
    const imageFile = document.getElementById('tImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        if (isEdit) {
            await api.updateTask(id, formData);
        } else {
            await api.createTask(formData);
        }
        closeTaskModal();
        loadTasks();
    } catch (error) {
        alert(error.message);
    }
});

// Delete Task
async function deleteTask() {
    const id = document.getElementById('tId').value;
    if(!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await api.deleteTask(id);
        closeTaskModal();
        loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

// Comments
async function loadComments(taskId) {
    try {
        const data = await api.getComments(taskId);
        const list = document.getElementById('commentsList');
        if(data.comments.length === 0) {
            list.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">No comments yet.</p>';
        } else {
            list.innerHTML = data.comments.map(c => `
                <div class="comment-item">
                    <div class="comment-author">${c.author.name}</div>
                    <div class="comment-text">${c.text}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error(error);
    }
}

async function addComment() {
    const text = document.getElementById('newComment').value;
    const taskId = document.getElementById('tId').value;
    
    console.log('Adding comment:', text, 'to task:', taskId);
    
    if(!text.trim() || !taskId) {
        console.log('Validation failed: empty text or no task ID');
        return;
    }
    
    try {
        await api.addComment(text, taskId);
        console.log('Comment added successfully');
        document.getElementById('newComment').value = '';
        loadComments(taskId);
        loadTasks(); // refresh the board to show the latest comment on the card
    } catch (error) {
        console.error('Error adding comment:', error);
        alert(error.message);
    }
}

// Add enter key listener for comment input
document.getElementById('newComment').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addComment();
    }
});

// Add Member Logic
const addMemberModal = document.getElementById('addMemberModal');

function openAddMemberModal() {
    addMemberModal.classList.add('active');
}

function closeAddMemberModal() {
    addMemberModal.classList.remove('active');
    document.getElementById('addMemberForm').reset();
}

document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('mEmail').value;
    const btn = document.getElementById('addMemberBtn');
    
    try {
        btn.disabled = true;
        btn.textContent = 'Inviting...';
        await api.addMember(projectId, email);
        alert('Member added successfully!');
        closeAddMemberModal();
        initBoard(); // reload to get new members in dropdown
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Invite Member';
    }
});

// Filter Tasks
window.filterTasks = function(query) {
    query = query.toLowerCase();
    const cards = document.querySelectorAll('.task-card');
    cards.forEach(card => {
        const searchData = card.getAttribute('data-search') || '';
        if (searchData.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

// ========================
// AI TASK BREAKDOWN (Gemini)
// ========================

let aiBreakdownRunning = false;

async function aiBreakdownTask(event, taskId) {
    event.stopPropagation();
    
    if (aiBreakdownRunning) {
        alert('AI is already processing a task. Please wait...');
        return;
    }

    const task = currentTasks[taskId];
    if (!task) return;

    if (!confirm(`🤖 AI Smart Breakdown\n\nKya aap "${task.title}" ko 5 chhote sub-tasks mein todna chahte hain?\n\nAI automatically 5 actionable sub-tasks generate karega aur "To Do" mein add kar dega.`)) {
        return;
    }

    aiBreakdownRunning = true;

    // Show AI loading modal
    showAiLoadingModal(task.title);

    try {
        const result = await api.aiBreakdown(taskId);
        
        // Show success result
        showAiResultModal(task.title, result.subTasks || []);
        
        // Refresh the board
        loadTasks();
        
    } catch (error) {
        hideAiModal();
        alert('❌ AI Error: ' + error.message);
    } finally {
        aiBreakdownRunning = false;
    }
}

function showAiLoadingModal(taskTitle) {
    // Remove existing modal if any
    const existing = document.getElementById('aiBreakdownModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'aiBreakdownModal';
    modal.innerHTML = `
        <div class="ai-modal-overlay" onclick="hideAiModal()">
            <div class="ai-modal-content" onclick="event.stopPropagation()">
                <div class="ai-loading-state">
                    <div class="ai-brain-animation">
                        <div class="ai-brain-circle"></div>
                        <div class="ai-brain-pulse"></div>
                        <span class="ai-brain-emoji">🤖</span>
                    </div>
                    <h3 class="ai-modal-title">AI is thinking...</h3>
                    <p class="ai-modal-subtitle">Breaking down "<strong>${taskTitle}</strong>" into smart sub-tasks</p>
                    <div class="ai-progress-bar">
                        <div class="ai-progress-fill"></div>
                    </div>
                    <p class="ai-tip">⚡ Powered by Google Gemini AI</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showAiResultModal(parentTitle, subTasks) {
    const modal = document.getElementById('aiBreakdownModal');
    if (!modal) return;

    const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    const priorityIcons = { high: '🔴', medium: '🟡', low: '🟢' };

    const content = modal.querySelector('.ai-modal-content');
    content.innerHTML = `
        <div class="ai-result-state">
            <div class="ai-success-icon">✅</div>
            <h3 class="ai-modal-title">AI Breakdown Complete!</h3>
            <p class="ai-modal-subtitle">"<strong>${parentTitle}</strong>" → ${subTasks.length} sub-tasks created</p>
            
            <div class="ai-subtasks-list">
                ${subTasks.map((st, i) => `
                    <div class="ai-subtask-item" style="animation-delay: ${i * 0.1}s">
                        <div class="ai-subtask-number">${i + 1}</div>
                        <div class="ai-subtask-info">
                            <div class="ai-subtask-title">${st.title}</div>
                            <div class="ai-subtask-desc">${st.description || ''}</div>
                        </div>
                        <span class="ai-subtask-priority" style="background: ${priorityColors[st.priority]}20; color: ${priorityColors[st.priority]}; border: 1px solid ${priorityColors[st.priority]}40;">
                            ${priorityIcons[st.priority]} ${st.priority}
                        </span>
                    </div>
                `).join('')}
            </div>

            <button class="ai-done-btn" onclick="hideAiModal()">
                🎉 Awesome, Done!
            </button>
            <p class="ai-tip" style="margin-top: 0.75rem;">All sub-tasks have been added to your "To Do" column</p>
        </div>
    `;
}

function hideAiModal() {
    const modal = document.getElementById('aiBreakdownModal');
    if (modal) {
        modal.querySelector('.ai-modal-overlay').style.animation = 'aiFadeOut 0.2s ease-out forwards';
        setTimeout(() => modal.remove(), 200);
    }
}

// Start
initBoard();


// ---------- DISCORD-STYLE REAL-TIME CHAT ---------- //
let chatOpen = false;
let socket = null;

window.toggleChat = function() {
    const panel = document.getElementById('projectChatPanel');
    chatOpen = !chatOpen;
    panel.style.right = chatOpen ? '0' : '-400px';
    
    // Initialize socket connection on first open
    if (chatOpen && !socket) {
        initChat();
    }
}

function initChat() {
    // Determine the socket URL (handles both local and production environments)
    const socketUrl = window.location.origin;
    socket = io(socketUrl);
    
    socket.emit('joinProject', { projectId });
    
    socket.on('messageHistory', (messages) => {
        const chatContainer = document.getElementById('chatMessages');
        chatContainer.innerHTML = '';
        if (messages.length === 0) {
            chatContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-top: 2rem;">Welcome to the start of the #project-chat!</p>';
        } else {
            messages.forEach(renderMessage);
        }
        scrollToBottom();
    });
    
    socket.on('newMessage', (msg) => {
        // If it was empty message placeholder, remove it
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer.innerHTML.includes('Welcome to the start')) {
            chatContainer.innerHTML = '';
        }
        renderMessage(msg);
        scrollToBottom();
    });
    
    document.getElementById('chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;
        
        const currentUser = api.getUser();
        if (!currentUser) return alert("Please log in again.");
        
        socket.emit('sendMessage', { projectId, senderId: currentUser.id, text });
        input.value = '';
    });
}

function renderMessage(msg) {
    const chatContainer = document.getElementById('chatMessages');
    const currentUser = api.getUser();
    const isMe = currentUser && msg.sender._id === currentUser.id;
    
    const timeString = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '0.75rem';
    div.style.alignItems = 'flex-start';
    div.style.flexDirection = isMe ? 'row-reverse' : 'row';
    
    const avatar = `<div style="width: 32px; height: 32px; border-radius: 50%; background: ${isMe ? 'var(--primary)' : 'var(--secondary)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;">${msg.sender.name.charAt(0).toUpperCase()}</div>`;
    
    const bubble = `
        <div style="max-width: 75%;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; flex-direction: ${isMe ? 'row-reverse' : 'row'};">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-main);">${isMe ? 'You' : msg.sender.name}</span>
                <span style="font-size: 0.65rem; color: var(--text-muted);">${timeString}</span>
            </div>
            <div style="background: ${isMe ? 'var(--primary)' : 'var(--bg-card)'}; color: ${isMe ? 'white' : 'var(--text-main)'}; padding: 0.75rem; border-radius: ${isMe ? '12px 0 12px 12px' : '0 12px 12px 12px'}; font-size: 0.85rem; box-shadow: var(--shadow-sm); border: 1px solid ${isMe ? 'var(--primary)' : 'var(--border-light)'};">
                ${msg.text}
            </div>
        </div>
    `;
    
    div.innerHTML = avatar + bubble;
    chatContainer.appendChild(div);
}

function scrollToBottom() {
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ---------- GROUP VIDEO CALL + SCREEN SHARE (WebRTC) ---------- //
let localStream = null;
let screenStream = null;
let peerConnections = {}; // { socketId: RTCPeerConnection }
let isInCall = false;
let isMicOn = true;
let isCamOn = true;
let isScreenSharing = false;
let callTimerInterval = null;
let callStartTime = null;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Ensure socket is initialized before call
function ensureSocket() {
    if (!socket) {
        const socketUrl = window.location.origin;
        socket = io(socketUrl);
        socket.emit('joinProject', { projectId });
    }
}

window.startGroupCall = async function() {
    if (isInCall) return;
    
    ensureSocket();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        
        const user = api.getUser();
        document.getElementById('localVideoLabel').textContent = user.name + ' (You)';
        
        document.getElementById('videoCallModal').style.display = 'block';
        isInCall = true;
        
        // Start timer
        callStartTime = Date.now();
        callTimerInterval = setInterval(updateCallTimer, 1000);
        
        // Join the call room
        socket.emit('joinCall', { projectId, userId: user.id, userName: user.name });
        
        // Listen for WebRTC events
        setupCallListeners();
        
    } catch (err) {
        alert('Camera/Microphone access denied. Please allow permissions to join the call.');
        console.error(err);
    }
}

function setupCallListeners() {
    // When existing participants are reported
    socket.on('existingParticipants', ({ participants }) => {
        participants.forEach(p => {
            createPeerConnection(p.socketId, p.userName, true);
        });
        updateParticipantCount(participants.length + 1);
    });

    // When a new user joins
    socket.on('userJoinedCall', ({ socketId, userName, participants }) => {
        if (!peerConnections[socketId]) {
            createPeerConnection(socketId, userName, false);
        }
        updateParticipantCount(participants.length);
    });

    // Receive offer
    socket.on('offer', async ({ from, offer }) => {
        const pc = peerConnections[from];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { to: from, answer });
        }
    });

    // Receive answer
    socket.on('answer', async ({ from, answer }) => {
        const pc = peerConnections[from];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });

    // Receive ICE candidate
    socket.on('iceCandidate', ({ from, candidate }) => {
        const pc = peerConnections[from];
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
    });

    // User left call
    socket.on('userLeftCall', ({ socketId }) => {
        if (peerConnections[socketId]) {
            peerConnections[socketId].close();
            delete peerConnections[socketId];
        }
        const wrapper = document.getElementById('remote-' + socketId);
        if (wrapper) wrapper.remove();
        updateGridLayout();
        
        const count = Object.keys(peerConnections).length + 1;
        updateParticipantCount(count);
    });
}

async function createPeerConnection(remoteSocketId, remoteName, isInitiator) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections[remoteSocketId] = pc;

    // Add local tracks
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
        let wrapper = document.getElementById('remote-' + remoteSocketId);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'remote-' + remoteSocketId;
            wrapper.className = 'remote-video-wrapper';
            
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            wrapper.appendChild(video);
            
            const label = document.createElement('div');
            label.className = 'remote-video-label';
            label.textContent = remoteName || 'Participant';
            wrapper.appendChild(label);
            
            document.getElementById('videoGrid').appendChild(wrapper);
            updateGridLayout();
        }
        wrapper.querySelector('video').srcObject = event.streams[0];
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('iceCandidate', { to: remoteSocketId, candidate: event.candidate });
        }
    };

    // If we are initiator, create and send offer
    if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: remoteSocketId, offer });
    }
}

function updateGridLayout() {
    const grid = document.getElementById('videoGrid');
    const count = grid.children.length;
    grid.className = '';
    if (count >= 4) grid.classList.add('grid-4');
    else if (count >= 3) grid.classList.add('grid-3');
    else if (count >= 2) grid.classList.add('grid-2');
}

function updateParticipantCount(count) {
    const el = document.getElementById('participantCount');
    if (el) el.textContent = count + (count === 1 ? ' participant' : ' participants');
}

function updateCallTimer() {
    if (!callStartTime) return;
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    document.getElementById('callTimer').textContent = `${mins}:${secs}`;
}

// Toggle Mic
window.toggleMic = function() {
    if (!localStream) return;
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach(t => t.enabled = isMicOn);
    document.getElementById('btnToggleMic').classList.toggle('btn-muted', !isMicOn);
}

// Toggle Camera
window.toggleCam = function() {
    if (!localStream) return;
    isCamOn = !isCamOn;
    localStream.getVideoTracks().forEach(t => t.enabled = isCamOn);
    document.getElementById('btnToggleCam').classList.toggle('btn-muted', !isCamOn);
}

// Screen Share
window.toggleScreenShare = async function() {
    if (!isInCall) return;

    if (!isScreenSharing) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            
            // Replace video track in all peer connections
            for (const socketId in peerConnections) {
                const sender = peerConnections[socketId].getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            }
            
            // Show screen share on local video
            document.getElementById('localVideo').srcObject = screenStream;
            
            isScreenSharing = true;
            document.getElementById('btnScreenShare').classList.add('btn-active');
            socket.emit('screenShareStarted', { projectId });
            
            // When user stops from browser UI
            screenTrack.onended = () => {
                stopScreenShare();
            };
        } catch (err) {
            console.log('Screen share cancelled');
        }
    } else {
        stopScreenShare();
    }
}

function stopScreenShare() {
    if (!isScreenSharing) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    
    // Replace back to camera in all peer connections
    for (const socketId in peerConnections) {
        const sender = peerConnections[socketId].getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
    }
    
    document.getElementById('localVideo').srcObject = localStream;
    
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }
    
    isScreenSharing = false;
    document.getElementById('btnScreenShare').classList.remove('btn-active');
    socket.emit('screenShareStopped', { projectId });
}

// End Call
window.endCall = function() {
    // Close all peer connections
    for (const socketId in peerConnections) {
        peerConnections[socketId].close();
        const wrapper = document.getElementById('remote-' + socketId);
        if (wrapper) wrapper.remove();
    }
    peerConnections = {};

    // Stop local streams
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }

    // Reset UI
    document.getElementById('videoCallModal').style.display = 'none';
    document.getElementById('localVideo').srcObject = null;
    
    isInCall = false;
    isMicOn = true;
    isCamOn = true;
    isScreenSharing = false;
    
    if (callTimerInterval) clearInterval(callTimerInterval);
    callTimerInterval = null;
    callStartTime = null;

    // Notify server
    if (socket) {
        socket.emit('leaveCall', { projectId });
    }
    
    // Reset button states
    document.getElementById('btnToggleMic').classList.remove('btn-muted');
    document.getElementById('btnToggleCam').classList.remove('btn-muted');
    document.getElementById('btnScreenShare').classList.remove('btn-active');
    
    updateGridLayout();
}

// ==========================================
// GANTT CHART (TIMELINE) VIEW LOGIC
// ==========================================
let ganttChartInstance = null;

function switchBoardView(view) {
    const btnBoard = document.getElementById('btnViewBoard');
    const btnGantt = document.getElementById('btnViewGantt');
    const kanbanView = document.getElementById('kanbanView');
    const ganttView = document.getElementById('ganttView');

    if (view === 'gantt') {
        btnGantt.classList.add('active');
        btnGantt.style.background = 'var(--primary)';
        btnGantt.style.color = 'white';
        
        btnBoard.classList.remove('active');
        btnBoard.style.background = 'transparent';
        btnBoard.style.color = 'var(--text-secondary)';
        
        kanbanView.style.display = 'none';
        ganttView.style.display = 'block';
        
        renderGanttChart();
    } else {
        btnBoard.classList.add('active');
        btnBoard.style.background = 'var(--primary)';
        btnBoard.style.color = 'white';
        
        btnGantt.classList.remove('active');
        btnGantt.style.background = 'transparent';
        btnGantt.style.color = 'var(--text-secondary)';
        
        ganttView.style.display = 'none';
        kanbanView.style.display = 'flex';
    }
}

function renderGanttChart() {
    const ganttChartContainer = document.getElementById('ganttChart');
    const ganttEmptyState = document.getElementById('ganttEmptyState');
    
    // Filter tasks that have at least start and end dates (or fallback)
    let ganttTasks = Object.values(currentTasks).map(t => {
        // Fallback for tasks missing dates so they show up for a day
        let sDate = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
        let eDate = t.dueDate ? new Date(t.dueDate) : new Date(sDate.getTime() + (24 * 60 * 60 * 1000));
        
        if (eDate < sDate) {
            eDate = new Date(sDate.getTime() + (24 * 60 * 60 * 1000));
        }

        return {
            id: t._id,
            name: t.title,
            start: sDate.toISOString().split('T')[0],
            end: eDate.toISOString().split('T')[0],
            progress: t.status === 'done' ? 100 : (t.status === 'inprogress' ? 50 : 0),
            dependencies: t.dependencies || '',
            custom_class: `gantt-bar-${t.priority || 'medium'}`
        };
    });

    if (ganttTasks.length === 0) {
        ganttChartContainer.innerHTML = '';
        ganttChartContainer.style.display = 'none';
        ganttEmptyState.style.display = 'block';
        return;
    }

    ganttEmptyState.style.display = 'none';
    ganttChartContainer.style.display = 'block';
    ganttChartContainer.innerHTML = '';

    // Initialize Frappe Gantt
    ganttChartInstance = new Gantt("#ganttChart", ganttTasks, {
        header_height: 50,
        column_width: 30,
        step: 24,
        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
        bar_height: 25,
        bar_corner_radius: 4,
        arrow_curve: 5,
        padding: 18,
        view_mode: 'Day',
        date_format: 'YYYY-MM-DD',
        on_click: function (task) {
            openTaskModal(currentTasks[task.id].status, task.id, 'edit');
        },
        on_date_change: async function(task, start, end) {
            // Send updated dates to backend
            const sDate = start.toISOString().split('T')[0];
            const eDate = end.toISOString().split('T')[0];
            
            try {
                // we use a FormData object or just simple update (API supports FormData for tasks)
                const formData = new FormData();
                formData.append('startDate', sDate);
                formData.append('dueDate', eDate);
                
                await api.updateTask(task.id, formData);
                console.log(`Task ${task.name} updated: ${sDate} to ${eDate}`);
                // Background update, no need to fully reload unless requested
            } catch (err) {
                console.error("Failed to update task dates", err);
                alert("Failed to update task timeline. Refresh to sync.");
                loadTasks();
            }
        }
    });
}
