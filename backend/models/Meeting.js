const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  dateString: {
    type: String, // format: "YYYY-MM-DD"
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
}, { timestamps: true });

// Ensure unique meeting per project per day
meetingSchema.index({ project: 1, dateString: 1 }, { unique: true });

module.exports = mongoose.model('Meeting', meetingSchema);
