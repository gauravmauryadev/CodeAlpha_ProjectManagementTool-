// ==================== DISCORD-STYLE COMMUNICATION HUB ====================
let dcSocket = null;
let dcOpen = false;
let dcActiveChannel = null; // { id, name, type:'text'|'voice' }
let dcProjects = [];
let dcMembersVisible = false;
let dcMicMuted = false;
let dcDeafened = false;

// Video Call State
let dcLocalStream = null;
let dcScreenStream = null;
let dcPeerConnections = {};
let dcInCall = false;
let dcCallTimer = null;
let dcCallStart = null;
let dcMicOn = true;
let dcCamOn = true;
let dcScreenOn = false;

const DC_ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
]};

// ---- INIT ----
function initDiscord() {
    const user = api.getUser();
    if (!user) return;

    // Set user info
    if (document.getElementById('discordUserAvatar')) {
        document.getElementById('discordUserAvatar').childNodes[0].textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('discordUserName').textContent = user.name;
    }

    // Connect socket
    dcSocket = io(window.location.origin);
    
    // Authenticate
    dcSocket.emit('authenticate', { userId: user.id, userName: user.name });

    // Handle online users
    dcSocket.on('onlineUsers', (userIds) => {
        window.dcOnlineUserIds = userIds;
        buildMembers(); // Refresh members list status
    });

    // Handle typing indicator
    let typingTimeout;
    const chatInput = document.getElementById('discordChatInput');
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            if (!dcActiveChannel) return;
            dcSocket.emit('typing', { projectId: dcActiveChannel.id, userName: user.name, isTyping: true });
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                dcSocket.emit('typing', { projectId: dcActiveChannel.id, userName: user.name, isTyping: false });
            }, 2000);
        });
    }

    dcSocket.on('userTyping', ({ userName, isTyping }) => {
        const indicator = document.getElementById('discordTypingIndicator');
        if (indicator) {
            if (isTyping) {
                indicator.textContent = `${userName} is typing...`;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    });

    // Build channels from projects
    buildChannels();

    // Listen for messages
    dcSocket.on('messageHistory', (messages) => {
        renderDiscordMessages(messages);
    });

    dcSocket.on('newMessage', (msg) => {
        appendDiscordMessage(msg);
    });

    // Chat form
    const chatForm = document.getElementById('discordChatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text || !dcActiveChannel) return;

            dcSocket.emit('sendMessage', {
                projectId: dcActiveChannel.id,
                senderId: user.id,
                text
            });
            chatInput.value = '';
            dcSocket.emit('typing', { projectId: dcActiveChannel.id, userName: user.name, isTyping: false });
        });
    }
}

// Auto-init on load if panel exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('discordPanel')) {
        initDiscord();
    }
});

// ---- BUILD CHANNELS ----
async function buildChannels() {
    try {
        const data = await api.getProjects();
        dcProjects = data.projects || [];

        const textContainer = document.getElementById('discordTextChannels');
        const voiceContainer = document.getElementById('discordVoiceChannels');
        textContainer.innerHTML = '';
        voiceContainer.innerHTML = '';

        // Add a general channel
        textContainer.innerHTML += `
            <div class="dc-channel active" onclick="switchChannel('general', 'General Chat', 'text', this)" data-id="general">
                <span style="color: #949ba4; font-size: 1.1rem;">#</span>
                <span>general</span>
            </div>
        `;

        // Add a channel for each project
        dcProjects.forEach(p => {
            const safeName = p.name.toLowerCase().replace(/\s+/g, '-').substring(0, 20);
            textContainer.innerHTML += `
                <div class="dc-channel" onclick="switchChannel('${p._id}', '${p.name}', 'text', this)" data-id="${p._id}">
                    <span style="color: #949ba4; font-size: 1.1rem;">#</span>
                    <span>${safeName}</span>
                </div>
            `;

            voiceContainer.innerHTML += `
                <div class="dc-channel" onclick="joinVoiceRoom('${p._id}', '${p.name}')" data-voice-id="${p._id}" style="cursor: pointer;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#949ba4" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
                    <span>${safeName}</span>
                </div>
                <div id="voiceUsers-${p._id}" style="display: none;"></div>
            `;
        });

        // Auto-select general
        switchChannel('general', 'General Chat', 'text', textContainer.querySelector('.dc-channel'));

        // Build members list
        buildMembers();
    } catch (err) {
        console.error('Discord init error:', err);
    }
}

// ---- SWITCH TEXT CHANNEL ----
window.switchChannel = function(id, name, type, el) {
    // Update active state
    document.querySelectorAll('#discordTextChannels .dc-channel').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');

    dcActiveChannel = { id, name, type };

    // Update header
    const safeName = name.toLowerCase().replace(/\s+/g, '-').substring(0, 20);
    document.getElementById('discordActiveChannel').textContent = safeName;
    document.getElementById('discordChannelDesc').textContent = name === 'General Chat' ? 'General team discussion' : 'Project: ' + name;
    document.getElementById('discordChatInput').placeholder = `Message #${safeName}`;

    // Clear messages and join room
    document.getElementById('discordMessages').innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="width: 68px; height: 68px; border-radius: 50%; background: #5865F2; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 2rem; color: white;">#</span>
            </div>
            <h3 style="color: #f2f3f5; font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Welcome to #${safeName}</h3>
            <p style="color: #949ba4; font-size: 0.85rem;">This is the start of the conversation.</p>
        </div>
    `;

    // Join room via socket
    dcSocket.emit('joinProject', { projectId: id });
}

// ---- RENDER MESSAGES ----
function renderDiscordMessages(messages) {
    const container = document.getElementById('discordMessages');
    if (messages.length === 0) return; // Keep welcome message

    container.innerHTML = '';
    messages.forEach(msg => appendDiscordMessage(msg));
}

function appendDiscordMessage(msg) {
    const container = document.getElementById('discordMessages');

    // Remove welcome message if present
    const welcome = container.querySelector('[style*="text-align: center"]');
    if (welcome) welcome.remove();

    const user = api.getUser();
    const isMe = user && msg.sender._id === user.id;
    const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#F47B67'];
    const color = colors[msg.sender.name.charCodeAt(0) % colors.length];
    const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = 'dc-msg';
    div.innerHTML = `
        <div class="dc-msg-avatar" style="background: ${color};">${msg.sender.name.charAt(0).toUpperCase()}</div>
        <div class="dc-msg-body">
            <div>
                <span class="dc-msg-name" style="color: ${color};">${msg.sender.name}</span>
                <span class="dc-msg-time">${time}</span>
            </div>
            <div class="dc-msg-text">${escapeHtml(msg.text)}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---- MEMBERS SIDEBAR ----
function buildMembers() {
    const list = document.getElementById('discordMembersList');
    list.innerHTML = '';

    // Collect unique members from all projects
    const members = new Map();
    const user = api.getUser();
    
    // Check real online status
    const isUserOnline = (id) => window.dcOnlineUserIds ? window.dcOnlineUserIds.includes(id) : false;

    if (user) members.set(user.id, { name: user.name, online: isUserOnline(user.id) || true }); // Self is always online

    dcProjects.forEach(p => {
        if (p.members) {
            p.members.forEach(m => {
                if (!members.has(m._id)) {
                    members.set(m._id, { name: m.name, online: isUserOnline(m._id) });
                }
            });
        }
        if (p.owner) {
            const oid = p.owner._id || p.owner;
            if (!members.has(oid) && p.owner.name) {
                members.set(oid, { name: p.owner.name, online: isUserOnline(oid) });
            }
        }
    });

    let onlineCount = 0;
    const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#F47B67'];

    members.forEach((m, id) => {
        const color = colors[m.name.charCodeAt(0) % colors.length];
        const isOnline = m.online;
        if (isOnline) onlineCount++;

        list.innerHTML += `
            <div class="dc-member">
                <div class="dc-member-avatar" style="background: ${color};">
                    ${m.name.charAt(0).toUpperCase()}
                    <div class="dc-member-status" style="background: ${isOnline ? '#23a55a' : '#80848e'};"></div>
                </div>
                <span class="dc-member-name" style="color: ${isOnline ? '#f2f3f5' : '#949ba4'};">${m.name}</span>
            </div>
        `;
    });

    if (document.getElementById('discordOnlineCount')) {
        document.getElementById('discordOnlineCount').textContent = onlineCount;
    }
    if (document.getElementById('discordOnlineCountTop')) {
        document.getElementById('discordOnlineCountTop').textContent = onlineCount;
    }
}

window.toggleDiscordMembers = function() {
    dcMembersVisible = !dcMembersVisible;
    const sidebar = document.getElementById('discordMembersSidebar');
    if (sidebar) sidebar.style.display = dcMembersVisible ? 'block' : 'none';
}

// ---- TOGGLE PANEL ----
window.toggleDiscordPanel = function() {
    // Legacy function, panel is now embedded but kept for compatibility if needed elsewhere
    console.log('Discord panel is now embedded in the dashboard.');
}

// ---- MIC / DEAFEN TOGGLES ----
window.toggleDiscordMic = function() {
    dcMicMuted = !dcMicMuted;
    document.getElementById('discordMicBtn').classList.toggle('dc-btn-muted', dcMicMuted);
}

window.toggleDiscordDeafen = function() {
    dcDeafened = !dcDeafened;
    document.getElementById('discordDeafenBtn').classList.toggle('dc-btn-muted', dcDeafened);
}

// ---- EMOJI INSERT ----
window.insertEmoji = function() {
    const emojis = ['😀', '😂', '🔥', '❤️', '👍', '🎉', '💯', '✨', '🚀', '😎', '🤔', '👋', '💪', '🙏', '😊'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const input = document.getElementById('discordChatInput');
    input.value += emoji;
    input.focus();
}

// ---- VOICE ROOMS ----
window.joinVoiceRoom = function(projectId, projectName) {
    // Start a video call for this project
    startDiscordVideoCallForProject(projectId, projectName);
}

// ---- VIDEO CALL (from Dashboard) ----
window.startDiscordVideoCall = function() {
    if (!dcActiveChannel) return alert('Select a channel first!');
    startDiscordVideoCallForProject(dcActiveChannel.id, dcActiveChannel.name);
}

async function startDiscordVideoCallForProject(projectId, projectName) {
    if (dcInCall) return;

    try {
        dcLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('dashLocalVideo').srcObject = dcLocalStream;

        const user = api.getUser();
        document.getElementById('dashLocalLabel').textContent = user.name + ' (You)';

        document.getElementById('dashVideoCallModal').style.display = 'block';
        dcInCall = true;

        dcCallStart = Date.now();
        dcCallTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - dcCallStart) / 1000);
            document.getElementById('dashCallTimer').textContent =
                String(Math.floor(elapsed / 60)).padStart(2, '0') + ':' + String(elapsed % 60).padStart(2, '0');
        }, 1000);

        if (!dcSocket) {
            dcSocket = io(window.location.origin);
        }
        dcSocket.emit('joinProject', { projectId });
        dcSocket.emit('joinCall', { projectId, userId: user.id, userName: user.name });

        // Show user in voice channel
        const voiceUsersDiv = document.getElementById('voiceUsers-' + projectId);
        if (voiceUsersDiv) {
            voiceUsersDiv.style.display = 'block';
            voiceUsersDiv.innerHTML = `
                <div class="dc-voice-user">
                    <div class="dc-avatar" style="background: #5865F2;">${user.name.charAt(0).toUpperCase()}</div>
                    <span>${user.name}</span>
                </div>
            `;
        }

        // WebRTC listeners
        dcSocket.on('existingParticipants', ({ participants }) => {
            participants.forEach(p => dcCreatePeer(p.socketId, p.userName, true, projectId));
            document.getElementById('dashParticipantCount').textContent = (participants.length + 1) + ' participants';
        });

        dcSocket.on('userJoinedCall', ({ socketId, userName, participants }) => {
            if (!dcPeerConnections[socketId]) {
                dcCreatePeer(socketId, userName, false, projectId);
            }
            document.getElementById('dashParticipantCount').textContent = participants.length + ' participants';
        });

        dcSocket.on('offer', async ({ from, offer }) => {
            const pc = dcPeerConnections[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                dcSocket.emit('answer', { to: from, answer });
            }
        });

        dcSocket.on('answer', async ({ from, answer }) => {
            const pc = dcPeerConnections[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        dcSocket.on('iceCandidate', ({ from, candidate }) => {
            const pc = dcPeerConnections[from];
            if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        });

        dcSocket.on('userLeftCall', ({ socketId }) => {
            if (dcPeerConnections[socketId]) {
                dcPeerConnections[socketId].close();
                delete dcPeerConnections[socketId];
            }
            const el = document.getElementById('dash-remote-' + socketId);
            if (el) el.remove();
            dcUpdateGrid();
        });

    } catch (err) {
        alert('Camera/Microphone access denied.');
        console.error(err);
    }
}

async function dcCreatePeer(remoteId, remoteName, isInitiator, projectId) {
    const pc = new RTCPeerConnection(DC_ICE);
    dcPeerConnections[remoteId] = pc;

    dcLocalStream.getTracks().forEach(t => pc.addTrack(t, dcLocalStream));

    pc.ontrack = (event) => {
        let wrapper = document.getElementById('dash-remote-' + remoteId);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'dash-remote-' + remoteId;
            wrapper.className = 'dash-remote-video';
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            wrapper.appendChild(video);
            const label = document.createElement('div');
            label.style.cssText = 'position:absolute;bottom:0.75rem;left:0.75rem;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);padding:0.3rem 0.75rem;border-radius:8px;color:white;font-size:0.8rem;font-weight:600;';
            label.textContent = remoteName || 'Participant';
            wrapper.appendChild(label);
            document.getElementById('dashVideoGrid').appendChild(wrapper);
            dcUpdateGrid();
        }
        wrapper.querySelector('video').srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) dcSocket.emit('iceCandidate', { to: remoteId, candidate: event.candidate });
    };

    if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        dcSocket.emit('offer', { to: remoteId, offer });
    }
}

function dcUpdateGrid() {
    const grid = document.getElementById('dashVideoGrid');
    const count = grid.children.length;
    grid.style.gridTemplateColumns = count >= 2 ? '1fr 1fr' : '1fr';
}

// ---- CALL CONTROLS ----
window.dashToggleMic = function() {
    if (!dcLocalStream) return;
    dcMicOn = !dcMicOn;
    dcLocalStream.getAudioTracks().forEach(t => t.enabled = dcMicOn);
    document.getElementById('dashBtnMic').style.background = dcMicOn ? 'rgba(255,255,255,0.15)' : '#ef4444';
}

window.dashToggleCam = function() {
    if (!dcLocalStream) return;
    dcCamOn = !dcCamOn;
    dcLocalStream.getVideoTracks().forEach(t => t.enabled = dcCamOn);
    document.getElementById('dashBtnCam').style.background = dcCamOn ? 'rgba(255,255,255,0.15)' : '#ef4444';
}

window.dashToggleScreen = async function() {
    if (!dcInCall) return;
    if (!dcScreenOn) {
        try {
            dcScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = dcScreenStream.getVideoTracks()[0];
            for (const id in dcPeerConnections) {
                const sender = dcPeerConnections[id].getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            }
            document.getElementById('dashLocalVideo').srcObject = dcScreenStream;
            dcScreenOn = true;
            document.getElementById('dashBtnScreen').style.background = '#5865F2';
            screenTrack.onended = () => dashStopScreen();
        } catch (e) { console.log('Screen share cancelled'); }
    } else {
        dashStopScreen();
    }
}

function dashStopScreen() {
    const videoTrack = dcLocalStream.getVideoTracks()[0];
    for (const id in dcPeerConnections) {
        const sender = dcPeerConnections[id].getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
    }
    document.getElementById('dashLocalVideo').srcObject = dcLocalStream;
    if (dcScreenStream) { dcScreenStream.getTracks().forEach(t => t.stop()); dcScreenStream = null; }
    dcScreenOn = false;
    document.getElementById('dashBtnScreen').style.background = 'rgba(255,255,255,0.15)';
}

window.dashEndCall = function() {
    for (const id in dcPeerConnections) {
        dcPeerConnections[id].close();
        const el = document.getElementById('dash-remote-' + id);
        if (el) el.remove();
    }
    dcPeerConnections = {};
    if (dcLocalStream) { dcLocalStream.getTracks().forEach(t => t.stop()); dcLocalStream = null; }
    if (dcScreenStream) { dcScreenStream.getTracks().forEach(t => t.stop()); dcScreenStream = null; }

    document.getElementById('dashVideoCallModal').style.display = 'none';
    document.getElementById('dashLocalVideo').srcObject = null;
    dcInCall = false;
    dcMicOn = true; dcCamOn = true; dcScreenOn = false;
    if (dcCallTimer) clearInterval(dcCallTimer);
    dcCallTimer = null; dcCallStart = null;
    if (dcSocket) dcSocket.emit('leaveCall', { projectId: dcActiveChannel ? dcActiveChannel.id : '' });

    // Hide voice users
    document.querySelectorAll('[id^="voiceUsers-"]').forEach(d => { d.style.display = 'none'; d.innerHTML = ''; });

    document.getElementById('dashBtnMic').style.background = 'rgba(255,255,255,0.15)';
    document.getElementById('dashBtnCam').style.background = 'rgba(255,255,255,0.15)';
    document.getElementById('dashBtnScreen').style.background = 'rgba(255,255,255,0.15)';
}
