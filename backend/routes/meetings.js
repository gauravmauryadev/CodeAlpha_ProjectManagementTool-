const express = require('express');
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to get YYYY-MM-DD
const getTodayString = () => new Date().toISOString().split('T')[0];

// @route   POST /api/meetings/:projectId/attend
// @desc    Mark current user as attended for today
router.post('/:projectId/attend', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Check if user is member
    if (project.owner.toString() !== userId.toString() && !project.members.includes(userId)) {
      return res.status(403).json({ message: 'Not authorized for this project' });
    }

    const todayString = getTodayString();

    let meeting = await Meeting.findOne({ project: projectId, dateString: todayString });

    if (!meeting) {
      meeting = await Meeting.create({
        project: projectId,
        dateString: todayString,
        attendees: [userId]
      });
    } else {
      if (!meeting.attendees.includes(userId)) {
        meeting.attendees.push(userId);
        await meeting.save();
      }
    }

    await meeting.populate('attendees', 'name email avatar');

    res.json({ message: 'Attendance marked', meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/meetings/:projectId
// @desc    Get attendance record for a project
router.get('/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate('owner', 'name email avatar').populate('members', 'name email avatar');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const meetings = await Meeting.find({ project: projectId }).populate('attendees', 'name email avatar').sort({ dateString: -1 }).limit(7);

    const allMembers = [project.owner, ...project.members];
    const uniqueMembers = Array.from(new Map(allMembers.map(m => [m._id.toString(), m])).values());

    res.json({ meetings, projectMembers: uniqueMembers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
