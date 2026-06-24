const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const auth = require('../middleware/auth');

// @route   POST /api/workspaces
// @desc    Create a new workspace
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    const newWorkspace = new Workspace({
      name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'owner' }]
    });

    const workspace = await newWorkspace.save();
    res.status(201).json({ workspace });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/workspaces
// @desc    Get all workspaces for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user.id
    }).populate('owner', 'name email').populate('members.user', 'name email avatar');
    
    res.json({ workspaces });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/workspaces/:id
// @desc    Get workspace by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is a member or admin
    const isMember = workspace.members.some(m => m.user._id.toString() === req.user.id);
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ workspace });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
