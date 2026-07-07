const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const { sendDiscordNotification } = require('./discord');
const sendEmail = require('../utils/sendEmail');
const { getTasksDueTodayForUser, sendDueDateReminders } = require('../utils/dueDateReminder');
const { generateSubTasks } = require('../utils/aiBreakdown');
const router = express.Router();

const { uploadCloud } = require('../config/cloudinary');

// All routes require authentication
router.use(auth);

// @route   GET /api/tasks/due-today
// @desc    Get all tasks due today for the logged-in user
// @access  Private
router.get('/due-today', async (req, res) => {
  try {
    const tasks = await getTasksDueTodayForUser(req.user._id);
    res.json({ tasks, count: tasks.length });
  } catch (error) {
    console.error('Get due-today tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tasks/send-reminders
// @desc    Manually trigger due date reminder emails
// @access  Private (admin only)
router.post('/send-reminders', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const result = await sendDueDateReminders();
    res.json({ message: 'Reminders processed', ...result });
  } catch (error) {
    console.error('Send reminders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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
    const { title, description, status, priority, project, assignee, startDate, dueDate, dependencies, labels } = req.body;
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
      startDate: startDate || null,
      dueDate: dueDate || null,
      dependencies: dependencies || '',
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

    const { title, description, status, priority, assignee, startDate, dueDate, dependencies, labels, position } = req.body;
    
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee;
    if (startDate !== undefined) task.startDate = startDate;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (dependencies !== undefined) task.dependencies = dependencies;
    
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

    // Gamification Logic: Reward user for completing a task
    if (status === 'done') {
      const User = require('../models/User');
      const userToReward = await User.findById(req.user._id);
      
      if (userToReward) {
        // Increase score
        userToReward.productivityScore = (userToReward.productivityScore || 0) + 10;
        
        // Handle Streak
        const today = new Date().toISOString().split('T')[0];
        
        if (userToReward.lastCompletedDate !== today) {
          if (userToReward.lastCompletedDate) {
            const lastDate = new Date(userToReward.lastCompletedDate);
            const currentDate = new Date(today);
            const diffTime = Math.abs(currentDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
              // Consecutive day
              userToReward.streakDays = (userToReward.streakDays || 0) + 1;
            } else if (diffDays > 1) {
              // Streak broken
              userToReward.streakDays = 1;
            }
          } else {
            // First time completing a task
            userToReward.streakDays = 1;
          }
          userToReward.lastCompletedDate = today;
          
          // Badge Logic
          if (userToReward.streakDays >= 3 && !userToReward.badges.includes('Productivity Master 🔥')) {
            userToReward.badges.push('Productivity Master 🔥');
          }
        }
        
        await userToReward.save();
      }
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

// @route   POST /api/tasks/:id/ai-breakdown
// @desc    Use AI (Gemini) to break a task into 5 sub-tasks
// @access  Private
router.post('/:id/ai-breakdown', async (req, res) => {
  try {
    const parentTask = await Task.findById(req.params.id)
      .populate('project', 'name members');

    if (!parentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify user is a member of the project
    const query = req.user.role === 'admin'
      ? { _id: parentTask.project._id }
      : { _id: parentTask.project._id, members: req.user._id };
    const projectDoc = await Project.findOne(query);

    if (!projectDoc) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate sub-tasks using Gemini AI
    const aiSubTasks = await generateSubTasks(
      parentTask.title,
      parentTask.description,
      projectDoc.name
    );

    // Create sub-tasks in database
    const createdTasks = [];
    for (let i = 0; i < aiSubTasks.length; i++) {
      const st = aiSubTasks[i];

      // Get position (add to top of todo column)
      const firstTask = await Task.findOne({ project: parentTask.project._id, status: 'todo' })
        .sort({ position: 1 });
      const position = firstTask ? firstTask.position - 1 - i : -i;

      const task = await Task.create({
        title: st.title,
        description: st.description,
        status: 'todo',
        priority: st.priority,
        project: parentTask.project._id,
        assignee: parentTask.assignee || null,
        createdBy: req.user._id,
        dueDate: parentTask.dueDate || null,
        labels: parentTask.labels || [],
        position
      });

      await task.populate('assignee', 'name email avatar');
      await task.populate('createdBy', 'name email avatar');
      createdTasks.push(task);
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      createdTasks.forEach(task => {
        io.to(parentTask.project._id.toString()).emit('taskCreated', task);
      });
    }

    // Discord Notification
    sendDiscordNotification(parentTask.project._id, {
      title: `🤖 AI Task Breakdown: ${parentTask.title}`,
      description: `**${req.user.name}** used AI to break down a task into ${createdTasks.length} sub-tasks:\n${createdTasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}`,
      color: 10181046 // Purple
    });

    console.log(`🤖 AI breakdown created ${createdTasks.length} sub-tasks for: "${parentTask.title}"`);

    res.status(201).json({
      message: `AI generated ${createdTasks.length} sub-tasks successfully!`,
      subTasks: createdTasks,
      parentTask: parentTask.title
    });
  } catch (error) {
    console.error('AI Breakdown error:', error);
    res.status(error.message.includes('API') || error.message.includes('configured') ? 400 : 500)
      .json({ message: error.message || 'Failed to generate AI breakdown' });
  }
});

module.exports = router;
