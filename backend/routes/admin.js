const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Message = require('../models/Message');
const Comment = require('../models/Comment');

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// GET /api/admin/stats - Dashboard overview
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProjects = await Project.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalComments = await Comment.countDocuments();

    const tasksByStatus = {
      todo: await Task.countDocuments({ status: 'todo' }),
      inprogress: await Task.countDocuments({ status: 'inprogress' }),
      done: await Task.countDocuments({ status: 'done' })
    };

    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    res.json({
      totalUsers,
      totalProjects,
      totalTasks,
      totalMessages,
      totalComments,
      tasksByStatus,
      recentUsers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users - All users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/users/:id/role - Change user role
router.put('/users/:id/role', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/projects - All projects
router.get('/projects', auth, isAdmin, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort('-createdAt');
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/projects/:id - Delete project
router.delete('/projects/:id', auth, isAdmin, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project and its tasks deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/tasks - All tasks
router.get('/tasks', auth, isAdmin, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignee', 'name email')
      .populate('project', 'name')
      .sort('-createdAt')
      .limit(100);
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/messages - All recent messages
router.get('/messages', auth, isAdmin, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'name email')
      .sort('-createdAt')
      .limit(50);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/make-admin - Make first admin (one-time setup)
router.post('/setup', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists. Use admin credentials to login.' });
    }
    // Make the provided email an admin
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found with this email.' });
    res.json({ message: 'Admin setup complete!', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
