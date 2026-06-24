const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    // Currently optional for backward compatibility, but in production, we should make this required.
    required: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  color: {
    type: String,
    default: '#6366f1'
  },
  wiki: {
    type: String,
    default: '# Project Wiki\n\nWelcome to your project collaborative workspace! Start editing this document in real-time with your team.'
  },
  image: {
    type: String,
    default: ''
  },
  // GitHub Integration — linked repository (e.g., "gauravmauryadev/TaskFlow")
  githubRepo: {
    type: String,
    default: null
  },
  // Discord Integration
  discordWebhookUrl: {
    type: String,
    default: null
  },
  discordServerId: {
    type: String,
    default: null
  },
  discordChannelId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ workspace: 1 });

// Owner is automatically a member
projectSchema.pre('save', function(next) {
  if (this.owner && !this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
