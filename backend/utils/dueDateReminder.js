const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const sendEmail = require('./sendEmail');

/**
 * Due Date Reminder System
 * Checks every hour for tasks whose due date is today.
 * Sends email alerts to assigned users and project owners.
 * Tracks already-notified tasks to avoid duplicate emails within the same day.
 */

// Track which tasks have been notified today (reset daily)
const notifiedTasks = new Set();
let lastResetDate = new Date().toDateString();

function resetNotifiedIfNewDay() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    notifiedTasks.clear();
    lastResetDate = today;
  }
}

/**
 * Get all tasks that are due today and not yet completed
 */
async function getTasksDueToday() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  // Include tomorrow as well (next 24+ hours)
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

  const tasks = await Task.find({
    dueDate: { $gte: startOfDay, $lte: endOfTomorrow },
    status: { $ne: 'done' }
  })
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name color owner members');

  return tasks;
}

/**
 * Get tasks due today & tomorrow for a specific user (within next 24-48 hours)
 */
async function getTasksDueTodayForUser(userId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  // Include tomorrow as well (minimum 1 day ahead)
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

  // Find all projects the user is a member of
  const projects = await Project.find({ members: userId }).select('_id');
  const projectIds = projects.map(p => p._id);

  const tasks = await Task.find({
    dueDate: { $gte: startOfDay, $lte: endOfTomorrow },
    status: { $ne: 'done' },
    project: { $in: projectIds }
  })
    .populate('assignee', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name color');

  return tasks;
}

/**
 * Generate beautiful HTML email for due date reminder
 */
function generateReminderEmailHTML(userName, tasks) {
  const taskRows = tasks.map(task => {
    const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    const priorityColor = priorityColors[task.priority] || '#6b7280';
    const dueTime = task.dueDate ? new Date(task.dueDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'End of day';
    const projectName = task.project ? task.project.name : 'Unknown';

    return `
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9;">
          <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 4px;">${task.title}</div>
          <div style="font-size: 12px; color: #64748b;">📁 ${projectName}</div>
        </td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: white; background: ${priorityColor};">${task.priority}</span>
        </td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; text-align: center;">
          <span style="font-size: 13px; color: #ef4444; font-weight: 600;">⏰ ${dueTime}</span>
        </td>
      </tr>`;
  }).join('');

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); padding: 40px 32px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">⏰</div>
        <h1 style="color: white; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;">Due Date Reminder</h1>
        <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">You have <strong>${tasks.length} task${tasks.length > 1 ? 's' : ''}</strong> due today!</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="color: #475569; font-size: 15px; margin: 0 0 24px 0;">
          Hello <strong style="color: #1e293b;">${userName}</strong>,<br><br>
          The following tasks are due <strong style="color: #ef4444;">today</strong>. Please make sure to complete them before the deadline! 🚀
        </p>

        <!-- Tasks Table -->
        <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Task</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Priority</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Due</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>

        <!-- CTA -->
        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard.html" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(79,70,229,0.4);">
          Open Dashboard →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          🔔 This is an automated reminder from <strong>OmniPlan</strong>.<br>
          Keep your projects on track!
        </p>
      </div>
    </div>
  `;
}

/**
 * Send due date reminder emails for all tasks due today
 */
async function sendDueDateReminders() {
  resetNotifiedIfNewDay();

  try {
    const tasks = await getTasksDueToday();

    if (tasks.length === 0) {
      console.log('📅 No tasks due today.');
      return { sent: 0, tasks: 0 };
    }

    // Group tasks by user email
    const userTaskMap = new Map();

    for (const task of tasks) {
      // Skip if already notified today
      if (notifiedTasks.has(task._id.toString())) continue;

      // Notify assignee
      if (task.assignee && task.assignee.email) {
        const email = task.assignee.email;
        if (!userTaskMap.has(email)) {
          userTaskMap.set(email, { name: task.assignee.name, tasks: [] });
        }
        userTaskMap.get(email).tasks.push(task);
      }

      // Notify creator (if different from assignee)
      if (task.createdBy && task.createdBy.email) {
        const creatorEmail = task.createdBy.email;
        if (!task.assignee || creatorEmail !== task.assignee.email) {
          if (!userTaskMap.has(creatorEmail)) {
            userTaskMap.set(creatorEmail, { name: task.createdBy.name, tasks: [] });
          }
          // Avoid duplicate task in same user's list
          const existingTaskIds = userTaskMap.get(creatorEmail).tasks.map(t => t._id.toString());
          if (!existingTaskIds.includes(task._id.toString())) {
            userTaskMap.get(creatorEmail).tasks.push(task);
          }
        }
      }

      notifiedTasks.add(task._id.toString());
    }

    // Send emails
    let sentCount = 0;
    for (const [email, data] of userTaskMap) {
      try {
        const html = generateReminderEmailHTML(data.name, data.tasks);
        await sendEmail({
          email,
          subject: `⏰ ${data.tasks.length} Task${data.tasks.length > 1 ? 's' : ''} Due Today - OmniPlan Reminder`,
          html
        });
        sentCount++;
        console.log(`📧 Due date reminder sent to: ${email} (${data.tasks.length} tasks)`);
      } catch (err) {
        console.error(`❌ Failed to send reminder to ${email}:`, err.message);
      }
    }

    console.log(`📅 Due date check complete: ${tasks.length} tasks due, ${sentCount} emails sent.`);
    return { sent: sentCount, tasks: tasks.length };
  } catch (error) {
    console.error('❌ Due date reminder error:', error);
    return { sent: 0, tasks: 0, error: error.message };
  }
}

/**
 * Start the scheduled reminder checker
 * Runs every hour to check for tasks due today
 */
function startDueDateScheduler() {
  console.log('📅 Due Date Reminder scheduler started (checks every hour)');

  // Run immediately on startup (after 30 second delay to let DB connect)
  setTimeout(() => {
    sendDueDateReminders();
  }, 30000);

  // Then run every hour
  setInterval(() => {
    sendDueDateReminders();
  }, 60 * 60 * 1000); // Every 1 hour
}

module.exports = {
  getTasksDueToday,
  getTasksDueTodayForUser,
  sendDueDateReminders,
  startDueDateScheduler
};
