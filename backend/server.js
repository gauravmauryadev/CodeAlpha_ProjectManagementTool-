const dotenv = require('dotenv');

// Load env variables early
dotenv.config();

// Verify critical environment variables
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.warn("\x1b[33m%s\x1b[0m", "⚠️ Warning: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing from .env. GitHub features will fail.");
}
if (!process.env.DISCORD_BOT_TOKEN) {
  console.warn("\x1b[33m%s\x1b[0m", "⚠️ Warning: DISCORD_BOT_TOKEN is missing from .env. Discord auto-attendance will not work.");
}
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("\x1b[33m%s\x1b[0m", "⚠️ Warning: Cloudinary keys are missing from .env. Image uploads will fail.");
}
if (!process.env.JWT_SECRET) {
  console.error("\x1b[31m%s\x1b[0m", "❌ Error: JWT_SECRET is missing from .env. Authentication will fail!");
}

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// --- SENTRY ERROR TRACKING ---
Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  profilesSampleRate: 1.0,
});

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const morgan = require('morgan');
const compression = require('compression');

// The request handler must be the first middleware on the app
// Note: Sentry v8+ auto-instruments express, no need for manual RequestHandler unless specified.
Sentry.setupExpressErrorHandler(app);

// --- ENTERPRISE SECURITY & LOGGING MIDDLEWARE ---
// 0. HTTP Request Logging (Production Grade)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// --- ENTERPRISE SECURITY MIDDLEWARE ---

// 1. Set security HTTP headers (configured to allow cross-origin resource access)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Enable CORS early so that preflight requests and error responses have proper headers
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Allow all origins dynamically to prevent Vercel trailing slash or subdomain issues
    return callback(null, true);
  },
  credentials: true
}));

const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');

// Initialize Redis Client (Only throw warnings if not running locally, so app doesn't crash)
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // Limit retries to stop flooded error logging
      if (retries > 3) {
        return new Error('Redis connection failed permanently');
      }
      return 5000; // retry after 5s
    }
  }
});

let isRedisConnected = false;
let redisWarningLogged = false;
redisClient.on('error', (err) => {
  if (!redisWarningLogged) {
    console.log('Redis Warning: Not found (App will fallback to local memory)');
    redisWarningLogged = true;
  }
});
redisClient.connect().then(() => {
  isRedisConnected = true;
  console.log('Redis Connected successfully!');
}).catch(() => {});

// 2. Rate limiting to prevent brute-force and DDoS (disabled or high limit in development)
const isDevMode = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevMode ? 100000 : 5000, // relaxed limit for real-time collaboration
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis store only if connected, otherwise fallback to default memory store
  ...(isRedisConnected && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    })
  }),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// 3. Prevent NoSQL SQL Injection
app.use(mongoSanitize());

// 4. Prevent XSS attacks
app.use(xss());

// 5. Compress response bodies
app.use(compression());

// Middleware
app.use(express.json({ limit: '50mb' })); // Limit body payload to 50mb for image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const path = require('path');

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Stripe Webhook needs raw body
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./routes/billing'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/discord', require('./routes/discord').router);
app.use('/api/livekit', require('./routes/livekit'));
app.use('/api/github', require('./routes/github'));
app.use('/api/meetings', require('./routes/meetings'));

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    databaseState: mongoose.connection.readyState
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Sentry error handler is already setup above with setupExpressErrorHandler

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error', 
    errorId: res.sentry,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Message = require('./models/Message');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configure Redis Adapter for Socket.io scaling
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Redis Adapter attached to Socket.io");
}).catch(() => {
  console.log("Redis not connected, Socket.io using default in-memory adapter");
});

// Expose io to routes
app.set('io', io);

// Track active call rooms: { projectId: [{ socketId, userId, userName }] }
const callRooms = {};

// Track online users globally: { userId: socketId }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // User auth/presence
  socket.on('authenticate', ({ userId, userName }) => {
    socket.userId = userId;
    socket.userName = userName;
    onlineUsers.set(userId, socket.id);
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
    // Clean up call rooms
    for (const projectId in callRooms) {
      callRooms[projectId] = callRooms[projectId].filter(p => p.socketId !== socket.id);
      if (callRooms[projectId].length === 0) delete callRooms[projectId];
      socket.to(projectId).emit('userLeftCall', { socketId: socket.id });
    }
  });

  // Join a specific project room
  socket.on('joinProject', async (data) => {
    const channelId = data.projectId || data.channel;
    if (!channelId) return;
    socket.join(channelId);
    console.log(`User ${socket.id} joined project room: ${channelId}`);
    
    // Fetch old messages
    try {
      const messages = await Message.find({ channel: channelId }).populate('sender', 'name').sort('createdAt');
      socket.emit('messageHistory', messages);
    } catch (err) {
      console.error(err);
    }

    // Send active call status if a call is happening
    if (callRooms[channelId] && callRooms[channelId].length > 0) {
      socket.emit('callInProgress', { participants: callRooms[channelId] });
    }
  });

  socket.on('joinChannel', async (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.id} joined channel: ${channelId}`);
    try {
      const messages = await Message.find({ channel: channelId }).populate('sender', 'name').sort('createdAt');
      socket.emit('messageHistory', messages);
    } catch (err) {
      console.error(err);
    }
    if (callRooms[channelId] && callRooms[channelId].length > 0) {
      socket.emit('callInProgress', { participants: callRooms[channelId] });
    }
  });
  
  socket.on('leaveChannel', (channelId) => {
    socket.leave(channelId);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const channelId = data.projectId || data.channel;
    if (!channelId) return;
    socket.to(channelId).emit('userTyping', { userName: data.userName || socket.userName, isTyping: data.isTyping });
  });

  // Handle new message
  socket.on('sendMessage', async (data) => {
    const channelId = data.projectId || data.channel;
    const senderId = data.senderId || data.sender;
    if (!channelId || !senderId) return;

    try {
      const msg = new Message({ channel: channelId, sender: senderId, text: data.text });
      await msg.save();
      const populatedMsg = await Message.findById(msg._id).populate('sender', 'name');
      
      // Broadcast to everyone in the room
      io.to(channelId).emit('newMessage', populatedMsg);
    } catch (err) {
      console.error(err);
    }
  });

  // ---- VIDEO CALL / SCREEN SHARE SIGNALING ---- //

  // User joins a call
  socket.on('joinCall', async ({ projectId, userId, userName, serverId, channelName }) => {
    if (!callRooms[projectId]) callRooms[projectId] = [];
    
    // Avoid duplicates
    const exists = callRooms[projectId].find(p => p.socketId === socket.id);
    if (!exists) {
      callRooms[projectId].push({ socketId: socket.id, userId, userName });
    }

    // Tell existing participants about the new user
    socket.to(projectId).emit('userJoinedCall', {
      socketId: socket.id, userId, userName,
      participants: callRooms[projectId]
    });

    // Tell the new user about existing participants
    socket.emit('existingParticipants', {
      participants: callRooms[projectId].filter(p => p.socketId !== socket.id)
    });

    console.log(`📞 ${userName} joined call in project ${projectId}. Total: ${callRooms[projectId].length}`);

    // --- Meeting Notification Feature ---
    if (callRooms[projectId].length === 1 && serverId && channelName && userId) {
      try {
        const DiscordServer = require('./models/DiscordServer');
        const Message = require('./models/Message');
        const server = await DiscordServer.findById(serverId);
        if (server) {
          // Find general-chat or any text channel
          const textChannel = server.channels.find(c => c.type === 'text' && (c.name === 'general-chat' || c.name === 'general')) || server.channels.find(c => c.type === 'text');
          
          if (textChannel) {
            const text = `🎙️ **${userName}** has started a meeting in **${channelName}**. Join the voice channel to hop in!`;
            const msg = new Message({ channel: textChannel._id, sender: userId, text });
            await msg.save();
            const populatedMsg = await Message.findById(msg._id).populate('sender', 'name');
            io.to(textChannel._id.toString()).emit('newMessage', populatedMsg);
          }
        }
      } catch (err) {
        console.error("Error sending meeting notification:", err);
      }
    }
  });

  // WebRTC Offer
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  // WebRTC Answer
  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  // ICE Candidate
  socket.on('iceCandidate', ({ to, candidate }) => {
    io.to(to).emit('iceCandidate', { from: socket.id, candidate });
  });

  // Speaking state broadcast
  socket.on('speaking', ({ projectId, isSpeaking }) => {
    socket.to(projectId).emit('userSpeaking', { socketId: socket.id, isSpeaking });
  });

  // Screen share started
  socket.on('screenShareStarted', ({ projectId }) => {
    socket.to(projectId).emit('userScreenSharing', { socketId: socket.id });
  });

  // Screen share stopped
  socket.on('screenShareStopped', ({ projectId }) => {
    socket.to(projectId).emit('userStoppedScreenSharing', { socketId: socket.id });
  });

  // User leaves call
  socket.on('leaveCall', ({ projectId }) => {
    if (callRooms[projectId]) {
      callRooms[projectId] = callRooms[projectId].filter(p => p.socketId !== socket.id);
      if (callRooms[projectId].length === 0) delete callRooms[projectId];
    }
    socket.to(projectId).emit('userLeftCall', { socketId: socket.id });
    console.log(`📞 User left call in project ${projectId}`);
  });

  socket.on('disconnect', () => {
    // Clean up from all call rooms
    for (const pid in callRooms) {
      const before = callRooms[pid].length;
      callRooms[pid] = callRooms[pid].filter(p => p.socketId !== socket.id);
      if (callRooms[pid].length < before) {
        io.to(pid).emit('userLeftCall', { socketId: socket.id });
      }
      if (callRooms[pid].length === 0) delete callRooms[pid];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Discord Bot
const { initDiscordBot } = require('./discordBot');
initDiscordBot();

// Initialize Due Date Reminder Scheduler
const { startDueDateScheduler } = require('./utils/dueDateReminder');
startDueDateScheduler();

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
});
