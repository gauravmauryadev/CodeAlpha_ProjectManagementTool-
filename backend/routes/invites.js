const express = require('express');
const Invite = require('../models/Invite');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// Get pending invites for the current user
router.get('/', async (req, res) => {
  try {
    const invites = await Invite.find({
      $or: [{ user: req.user._id }, { email: req.user.email }]
    })
      .populate('project', 'name description')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ invites });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept an invite
router.post('/:id/accept', async (req, res) => {
  try {
    const invite = await Invite.findOne({ 
      _id: req.params.id, 
      $or: [{ user: req.user._id }, { email: req.user.email }],
      status: 'pending' 
    });
    if (!invite) return res.status(404).json({ message: 'Invite not found or already processed' });

    const project = await Project.findById(invite.project);
    if (!project) return res.status(404).json({ message: 'Project no longer exists' });

    if (!project.members.includes(req.user._id)) {
      project.members.push(req.user._id);
      await project.save();
    }

    invite.status = 'accepted';
    await invite.save();

    res.json({ message: 'Invite accepted! You are now a member of the project.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject an invite
router.post('/:id/reject', async (req, res) => {
  try {
    const invite = await Invite.findOne({ 
      _id: req.params.id, 
      $or: [{ user: req.user._id }, { email: req.user.email }],
      status: 'pending' 
    });
    if (!invite) return res.status(404).json({ message: 'Invite not found or already processed' });

    invite.status = 'rejected';
    await invite.save();

    res.json({ message: 'Invite rejected.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
