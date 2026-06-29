const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const { sendDiscordNotification } = require('./discord');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

const { uploadCloud } = require('../config/cloudinary');

// All routes require authentication
router.use(auth);

// @route   GET /api/tasks?project=projectId
// @desc    Get all tasks for a project
// @access  Private
router.get('/', async (req, res) => {
  try {

    const { project } = req.query;

    if (!project) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Verify user is a member of the project
    const query = req.user.role === 'admin' ? { _id: project } : { _id: project, members: req.user._id };
    const projectDoc = await Project.findOne(query);

    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    const tasks = await Task.find({ project })
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ position: 1, createdAt: -1 });

    const Comment = require('../models/Comment');
    const tasksWithComments = await Promise.all(
      tasks.map(async (task) => {
        const latestComment = await Comment.findOne({ task: task._id })
          .sort({ createdAt: -1 })
          .populate('author', 'name');
        
        return {
          ...task.toObject(),
          latestComment: latestComment || null
        };
      })
    );

    // Group tasks by status
    const grouped = {
      todo: tasksWithComments.filter(t => t.status === 'todo'),
      inprogress: tasksWithComments.filter(t => t.status === 'inprogress'),
      done: tasksWithComments.filter(t => t.status === 'done')
    };

    res.json({ tasks: grouped });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', uploadCloud.single('image'), async (req, res) => {
  try {
    const { title, description, status, priority, project, assignee, dueDate, labels } = req.body;
    let imageUrl = null;

    if (req.file) {
      imageUrl = req.file.path; // Cloudinary returns the full URL in req.file.path
    }

    if (!title || !project) {
      return res.status(400).json({ message: 'Title and project are required' });
    }

    // Verify user is a member
    const query = req.user.role === 'admin' ? { _id: project } : { _id: project, members: req.user._id };
    const projectDoc = await Project.findOne(query);

    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Get the position for new task (first in its column)
    const firstTask = await Task.findOne({ project, status: status || 'todo' })
      .sort({ position: 1 });
    const position = firstTask ? firstTask.position - 1 : 0;

    const parsedLabels = labels ? (typeof labels === 'string' ? JSON.parse(labels) : labels) : [];

    const task = await Task.create({
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      project,
      assignee: assignee || null,
      createdBy: req.user._id,
      dueDate: dueDate || null,
      labels: parsedLabels,
      position,
      imageUrl
    });

    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    const io = req.app.get('io');
    if (io) io.to(task.project.toString()).emit('taskCreated', task);

    if (task.assignee && task.assignee._id.toString() !== req.user._id.toString()) {
      try {
        const assigneeUser = await require('../models/User').findById(task.assignee._id);
        if (assigneeUser && assigneeUser.email) {
          const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
          await sendEmail({
            email: assigneeUser.email,
            subject: `New Task Assigned: ${task.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #4f46e5;">New Task Assigned</h2>
                <p>Hello <strong>${assigneeUser.name}</strong>,</p>
                <p><strong>${req.user.name}</strong> has assigned a new task to you in <strong>${projectDoc.name}</strong>.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1e293b;">${task.title}</h3>
                  <p style="color: #475569; font-size: 14px;">Priority: <span style="text-transform: uppercase; font-weight: bold;">${task.priority}</span></p>
                  <p style="color: #475569; font-size: 14px;">${task.description || 'No description provided.'}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${FRONTEND_URL}/board/${projectDoc._id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View Board
                  </a>
                </div>
              </div>
            `
          });
        }
      } catch (err) {
        console.error('Task assignee email error:', err);
      }
    }

    // Discord Notification
    sendDiscordNotification(project, {
      title: `✨ New Task: ${task.title}`,
      description: `**Priority:** ${task.priority}\n**Created by:** ${req.user.name}\n${task.description || ''}`,
      color: 3447003 // Blue
    });

    res.status(201).json({ message: 'Task created', task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', uploadCloud.single('image'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify user is a member of the project
    const query = req.user.role === 'admin' ? { _id: task.project } : { _id: task.project, members: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const originalAssignee = task.assignee ? task.assignee.toString() : null;

    const { title, description, status, priority, assignee, dueDate, labels, position } = req.body;
    
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee;
    if (dueDate !== undefined) task.dueDate = dueDate;
    
    if (labels !== undefined) {
      task.labels = typeof labels === 'string' ? JSON.parse(labels) : labels;
    }
    if (position !== undefined) task.position = position;

    if (req.file) {
      task.imageUrl = req.file.path; // Cloudinary URL
    }

    await task.save();
    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');

    const io = req.app.get('io');
    if (io) io.to(task.project.toString()).emit('taskUpdated', task);

    const newAssignee = assignee !== undefined ? (assignee ? assignee.toString() : null) : originalAssignee;
    if (newAssignee && newAssignee !== originalAssignee && newAssignee !== req.user._id.toString()) {
      try {
        const assigneeUser = await require('../models/User').findById(newAssignee);
        if (assigneeUser && assigneeUser.email) {
          const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
          await sendEmail({
            email: assigneeUser.email,
            subject: `Task Assigned to You: ${task.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Task Assigned</h2>
                <p>Hello <strong>${assigneeUser.name}</strong>,</p>
                <p><strong>${req.user.name}</strong> has assigned an existing task to you in <strong>${project.name}</strong>.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1e293b;">${task.title}</h3>
                  <p style="color: #475569; font-size: 14px;">Priority: <span style="text-transform: uppercase; font-weight: bold;">${task.priority}</span></p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${FRONTEND_URL}/board/${project._id}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View Board
                  </a>
                </div>
              </div>
            `
          });
        }
      } catch (err) {
        console.error('Task assignee email error:', err);
      }
    }

    // Discord Notification for Status Change
    if (status !== undefined) {
      const colors = { todo: 10197915, inprogress: 15844367, done: 3066993 };
      sendDiscordNotification(task.project, {
        title: `🔄 Task Updated: ${task.title}`,
        description: `Status changed to **${status}** by ${req.user.name}`,
        color: colors[status] || 3447003
      });
    }

    res.json({ message: 'Task updated', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify user is a member
    const query = req.user.role === 'admin' ? { _id: task.project } : { _id: task.project, members: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const Comment = require('../models/Comment');
    await Comment.deleteMany({ task: task._id });
    await Task.deleteOne({ _id: task._id });

    const io = req.app.get('io');
    if (io) io.to(task.project.toString()).emit('taskDeleted', { taskId: task._id });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
