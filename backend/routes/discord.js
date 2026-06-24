const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const axios = require('axios');

// Configure Discord Settings for a Project
router.post('/settings/:projectId', auth, async (req, res) => {
  try {
    const { discordWebhookUrl, discordServerId, discordChannelId } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // Check permission
    if (project.owner.toString() !== req.user._id.toString() && !project.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    project.discordWebhookUrl = discordWebhookUrl || project.discordWebhookUrl;
    project.discordServerId = discordServerId || project.discordServerId;
    project.discordChannelId = discordChannelId || project.discordChannelId;
    
    // If empty string provided, clear it
    if (discordWebhookUrl === "") project.discordWebhookUrl = null;
    if (discordServerId === "") project.discordServerId = null;
    if (discordChannelId === "") project.discordChannelId = null;

    await project.save();
    res.json({ message: 'Discord settings updated successfully', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper to send a webhook notification
const sendDiscordNotification = async (projectId, embed) => {
  try {
    const project = await Project.findById(projectId);
    if (!project || !project.discordWebhookUrl) return;

    await axios.post(project.discordWebhookUrl, {
      embeds: [embed]
    });
  } catch (err) {
    console.error("Failed to send discord webhook:", err.message);
  }
};

// Webhook endpoint for the Custom Discord Bot to hit when creating tasks
// This doesn't use standard `protect` middleware because it's called by a Bot, not a user.
// We secure it by checking a secret bot token (in a real app, verify the token).
router.post('/bot/create-task', async (req, res) => {
  try {
    const { botSecret, title, description, priority, projectId, discordUserId } = req.body;
    
    // Simple validation (In production, use standard env variables for secrets)
    if (botSecret !== process.env.DISCORD_BOT_SECRET && process.env.DISCORD_BOT_SECRET) {
      return res.status(401).json({ message: "Invalid bot secret" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const newTask = await Task.create({
      title,
      description: description || `Created via Discord by <@${discordUserId}>`,
      status: 'todo',
      priority: priority || 'medium',
      project: projectId,
      // Default to project owner if not mapped
      assignee: project.owner 
    });

    res.status(201).json({ message: "Task created successfully", task: newTask });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = { router, sendDiscordNotification };
