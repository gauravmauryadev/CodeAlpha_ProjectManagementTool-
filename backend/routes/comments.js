const express = require('express');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/comments?task=taskId
// @desc    Get all comments for a task
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { task } = req.query;

    if (!task) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const comments = await Comment.find({ task })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ comments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments
// @desc    Add a comment to a task
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { text, task } = req.body;

    if (!text || !task) {
      return res.status(400).json({ message: 'Text and task ID are required' });
    }

    // Verify the task exists and user has access
    const taskDoc = await Task.findById(task);
    if (!taskDoc) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const query = req.user.role === 'admin' ? { _id: taskDoc.project } : { _id: taskDoc.project, members: req.user._id };
    const project = await Project.findOne(query);

    if (!project) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const isOwner = project.owner.toString() === req.user._id.toString();
    const isAssignee = taskDoc.assignee && taskDoc.assignee.toString() === req.user._id.toString();

    if (!isOwner && !isAssignee && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the project leader or the task assignee can comment on this task' });
    }

    const comment = await Comment.create({
      text,
      task,
      author: req.user._id
    });

    await comment.populate('author', 'name email avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(taskDoc.project.toString()).emit('taskUpdated', taskDoc);
      io.to(taskDoc.project.toString()).emit('commentAdded', comment);
    }

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private (author only)
router.delete('/:id', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, author: req.user._id };
    const comment = await Comment.findOne(query);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found or unauthorized' });
    }

    await Comment.deleteOne({ _id: comment._id });

    // Fetch the task to get the project ID
    const taskDoc = await Task.findById(comment.task);
    if (taskDoc) {
      const io = req.app.get('io');
      if (io) {
        io.to(taskDoc.project.toString()).emit('taskUpdated', taskDoc);
        io.to(taskDoc.project.toString()).emit('commentDeleted', { commentId: req.params.id, taskId: taskDoc._id });
      }
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
