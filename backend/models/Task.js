const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['todo', 'inprogress', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    default: null
  },
  labels: [{
    type: String,
    trim: true
  }],
  githubIssueNumber: {
    type: Number,
    default: null
  },
  githubIssueUrl: {
    type: String,
    default: null
  },
  position: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });

module.exports = mongoose.model('Task', taskSchema);
