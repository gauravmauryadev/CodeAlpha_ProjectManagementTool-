const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const { cacheMiddleware, cache } = require('../middleware/cache');
const { uploadCloud } = require('../config/cloudinary');
const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/projects
// @desc    Get all projects for current user
// @access  Private
router.get('/', cacheMiddleware(60), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { members: req.user._id };
    const projects = await Project.find(query)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar')
    .sort({ updatedAt: -1 });

    // Get task counts and recent tasks for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskCounts = await Task.aggregate([
          { $match: { project: project._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const counts = { todo: 0, inprogress: 0, done: 0, total: 0 };
        taskCounts.forEach(tc => {
          counts[tc._id] = tc.count;
          counts.total += tc.count;
        });

        // Fetch recent tasks for the project
        const tasks = await Task.find({ project: project._id })
           .sort({ updatedAt: -1 })
           .limit(5)
           .select('title status');

        return { ...project.toObject(), taskCounts: counts, tasks };
      })
    );

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', uploadCloud.single('image'), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    let image = req.body.image || '';

    if (req.file) {
      image = req.file.path; // Cloudinary URL
    }

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description: description || '',
      color: color || '#6366f1',
      image,
      owner: req.user._id,
      members: [req.user._id]
    });

    await project.populate('owner', 'name email avatar');
    await project.populate('members', 'name email avatar');

    res.status(201).json({
      message: 'Project created successfully',
      project: { ...project.toObject(), taskCounts: { todo: 0, inprogress: 0, done: 0, total: 0 } }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a single project
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, members: req.user._id };
    const project = await Project.findOne(query)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private (owner only)
router.put('/:id', uploadCloud.single('image'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    
    if (req.file) {
      project.image = req.file.path; // Cloudinary URL
    } else if (req.body.image !== undefined) {
      project.image = req.body.image;
    }

    await project.save();
    await project.populate('owner', 'name email avatar');
    await project.populate('members', 'name email avatar');

    res.json({ message: 'Project updated', project });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project and all related data
// @access  Private (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    // Delete all related tasks and comments
    const tasks = await Task.find({ project: project._id });
    const taskIds = tasks.map(t => t._id);
    await Comment.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: project._id });
    await Project.deleteOne({ _id: project._id });

    res.json({ message: 'Project and all related data deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/members
// @desc    Add member to project
// @access  Private (owner only)
router.post('/:id/members', async (req, res) => {
  try {
    const { email } = req.body;
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    const User = require('../models/User');
    const Invite = require('../models/Invite');
    const sendEmail = require('../utils/sendEmail');
    
    const userToAdd = await User.findOne({ email });
    
    if (userToAdd && project.members.includes(userToAdd._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    const inviteQuery = userToAdd 
      ? { project: project._id, user: userToAdd._id, status: 'pending' }
      : { project: project._id, email: email, status: 'pending' };

    const existingInvite = await Invite.findOne(inviteQuery);
    
    if (existingInvite) {
      return res.status(400).json({ message: 'User has already been invited' });
    }

    await Invite.create({
      project: project._id,
      user: userToAdd ? userToAdd._id : undefined,
      email: email,
      invitedBy: req.user._id
    });

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = userToAdd ? `${FRONTEND_URL}/dashboard` : `${FRONTEND_URL}/register?email=${encodeURIComponent(email)}`;
    
    try {
      await sendEmail({
        email: email,
        subject: `You have been invited to join ${project.name} on OmniPlan`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Project Invitation</h2>
            <p>Hello!</p>
            <p><strong>${req.user.name}</strong> has invited you to collaborate on the project <strong>${project.name}</strong> on OmniPlan.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ${userToAdd ? 'View Invite in Dashboard' : 'Sign Up to Join'}
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">If you ignore this email, you will not be added to the project.</p>
          </div>
        `
      });
    } catch (err) {
      console.error('Error sending email:', err);
    }

    res.json({ message: 'Invite sent! An email has been dispatched to the user.' });
  } catch (error) {
    console.error('Invite Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id/members/:userId
// @desc    Remove member from project
// @access  Private (owner only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Owner cannot be removed' });
    }

    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    await project.populate('members', 'name email avatar');

    res.json({ message: 'Member removed', project });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/wiki
// @desc    Update project wiki documentation
// @access  Private (members only)
router.put('/:id/wiki', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, members: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    const { wiki } = req.body;
    project.wiki = wiki !== undefined ? wiki : '';
    await project.save();

    const io = req.app.get('io');
    if (io) {
      io.to(project._id.toString()).emit('wikiUpdated', { wiki: project.wiki, userId: req.user._id });
    }

    res.json({ message: 'Wiki updated', wiki: project.wiki });
  } catch (error) {
    console.error('Update wiki error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
