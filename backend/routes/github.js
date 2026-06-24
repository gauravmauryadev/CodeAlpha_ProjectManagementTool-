const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Comment = require('../models/Comment');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ==================== OAUTH FLOW ====================

// GET /api/github/login — Redirect user to GitHub for authorization
// Frontend calls this with ?token=JWT so we can identify the user after callback
router.get('/login', (req, res) => {
  const userToken = req.query.token;
  // Pass the user's JWT in the state parameter so we can link their account after callback
  const redirectUri = `${req.protocol}://${req.get('host')}/api/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user,user:email&state=${userToken}`;
  res.redirect(githubAuthUrl);
});

// GET /api/github/callback — GitHub redirects here after user authorizes
router.get('/callback', async (req, res) => {
  const { code, state: userToken } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/profile?github=error&reason=no_code`);
  }

  try {
    // 1. Exchange the code for an access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.redirect(`${FRONTEND_URL}/profile?github=error&reason=no_token`);
    }

    // 2. Get the user's GitHub profile
    const githubUserResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = githubUserResponse.data;

    // 3. Link GitHub to the logged-in user using the JWT state
    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, {
          githubId: String(githubUser.id),
          githubUsername: githubUser.login,
          githubAccessToken: accessToken,
        });
        return res.redirect(`${FRONTEND_URL}/profile?github=connected&username=${githubUser.login}`);
      } catch (jwtError) {
        return res.redirect(`${FRONTEND_URL}/profile?github=error&reason=invalid_token`);
      }
    }

    return res.redirect(`${FRONTEND_URL}/profile?github=error&reason=no_state`);
  } catch (error) {
    console.error('GitHub OAuth Error:', error.message);
    return res.redirect(`${FRONTEND_URL}/profile?github=error&reason=server_error`);
  }
});

// ==================== GITHUB STATUS & DISCONNECT ====================

// GET /api/github/status — Check if current user has GitHub connected
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+githubAccessToken');
    res.json({
      connected: !!user.githubUsername,
      username: user.githubUsername || null,
      githubId: user.githubId || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check GitHub status' });
  }
});

// POST /api/github/disconnect — Remove GitHub link from user
router.post('/disconnect', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      githubId: null,
      githubUsername: null,
      githubAccessToken: null,
    });
    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to disconnect GitHub' });
  }
});

// ==================== REPOSITORIES ====================

// GET /api/github/repos — List repos of connected GitHub user
router.get('/repos', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub not connected. Please connect your GitHub account first.' });
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
      params: { sort: 'updated', per_page: 100 },
    });

    const repos = response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      language: repo.language,
      stars: repo.stargazers_count,
      updatedAt: repo.updated_at,
    }));

    res.json({ repos });
  } catch (error) {
    console.error('GitHub Repos Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

// ==================== LINK REPO TO PROJECT ====================

// POST /api/github/link — Link a GitHub repo to a project
router.post('/link', auth, async (req, res) => {
  try {
    const { projectId, repoFullName } = req.body;
    if (!projectId || !repoFullName) {
      return res.status(400).json({ message: 'projectId and repoFullName are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Check ownership/membership
    if (!project.members.includes(req.user._id) && String(project.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }

    project.githubRepo = repoFullName;
    await project.save();

    // Auto-create GitHub Webhook on the repo
    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (user.githubAccessToken) {
      try {
        const webhookUrl = `${req.protocol}://${req.get('host')}/api/github/webhook`;
        await axios.post(
          `https://api.github.com/repos/${repoFullName}/hooks`,
          {
            name: 'web',
            active: true,
            events: ['push', 'pull_request'],
            config: {
              url: webhookUrl,
              content_type: 'json',
              insecure_ssl: '0',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${user.githubAccessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        console.log(`✅ GitHub Webhook auto-created for ${repoFullName}`);
      } catch (webhookErr) {
        // Webhook creation may fail on localhost (GitHub can't reach it), that's okay
        console.log(`⚠️ Webhook auto-creation skipped (likely localhost): ${webhookErr.response?.data?.message || webhookErr.message}`);
      }
    }

    res.json({ message: `Repository "${repoFullName}" linked to project "${project.name}"`, project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to link repository' });
  }
});

// POST /api/github/unlink — Unlink GitHub repo from project
router.post('/unlink', auth, async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.githubRepo = null;
    await project.save();

    res.json({ message: 'Repository unlinked', project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unlink repository' });
  }
});

// ==================== PUSH TASK TO GITHUB ISSUE ====================

// POST /api/github/issues/:taskId — Create a GitHub Issue for a Task
router.post('/issues/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = task.project;
    if (!project.githubRepo) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub not connected. Please connect your GitHub account first.' });
    }

    if (task.githubIssueNumber) {
      return res.status(400).json({ message: 'Task is already linked to a GitHub Issue' });
    }

    // Create Issue via GitHub API
    const response = await axios.post(
      `https://api.github.com/repos/${project.githubRepo}/issues`,
      {
        title: `[Task] ${task.title}`,
        body: `**Description:**\n${task.description || 'No description provided.'}\n\n---\n*Created via CodeAlpha Kanban Board by ${req.user.name}*\n*Task Priority:* ${task.priority.toUpperCase()}`,
        labels: ['kanban-task', `priority-${task.priority}`]
      },
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    // Save issue details to task
    task.githubIssueNumber = response.data.number;
    task.githubIssueUrl = response.data.html_url;
    await task.save();

    res.json({ message: 'GitHub Issue created successfully', issue: response.data, task });
  } catch (error) {
    console.error('Create GitHub Issue Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to create GitHub issue' });
  }
});

// ==================== WEBHOOK HANDLER ====================

// POST /api/github/webhook — GitHub sends events here
router.post('/webhook', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`📦 GitHub Webhook: ${event} received`);

  try {
    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) return res.status(200).json({ message: 'No repo info' });

    // Find the project linked to this repo
    const project = await Project.findOne({ githubRepo: repoFullName });
    if (!project) return res.status(200).json({ message: 'No project linked to this repo' });

    // Handle PUSH events — auto-comment on tasks mentioned in commits
    if (event === 'push' && payload.commits) {
      for (const commit of payload.commits) {
        // Look for task IDs like #TASK-abc123 in the commit message
        const taskMatches = commit.message.match(/#TASK-([a-zA-Z0-9]+)/gi);
        if (taskMatches) {
          for (const match of taskMatches) {
            const taskId = match.replace('#TASK-', '');
            const task = await Task.findById(taskId);
            if (task && String(task.project) === String(project._id)) {
              // Add an auto-comment on this task
              await Comment.create({
                text: `🔗 **GitHub Commit** by **${commit.author?.name || 'Unknown'}**:\n\`${commit.id.substring(0, 7)}\` — ${commit.message}\n[View Commit](${commit.url})`,
                task: task._id,
                user: project.owner, // Attribute to project owner
              });
            }
          }
        }
      }
    }

    // Handle PULL REQUEST events — auto-move tasks
    if (event === 'pull_request') {
      const pr = payload.pull_request;
      const action = payload.action; // opened, closed, merged

      // Look for task IDs in PR title or body
      const prText = `${pr.title} ${pr.body || ''}`;
      const taskMatches = prText.match(/#TASK-([a-zA-Z0-9]+)/gi);

      if (taskMatches) {
        for (const match of taskMatches) {
          const taskId = match.replace('#TASK-', '');
          const task = await Task.findById(taskId);
          if (task && String(task.project) === String(project._id)) {
            let newStatus = task.status;
            let commentText = '';

            if (action === 'opened' || action === 'reopened') {
              newStatus = 'review';
              commentText = `🔀 **Pull Request Opened** by **${pr.user.login}**: [${pr.title}](${pr.html_url})`;
            } else if (action === 'closed' && pr.merged) {
              newStatus = 'done';
              commentText = `✅ **Pull Request Merged** by **${pr.merged_by?.login || pr.user.login}**: [${pr.title}](${pr.html_url})`;
            } else if (action === 'closed' && !pr.merged) {
              commentText = `❌ **Pull Request Closed** (not merged): [${pr.title}](${pr.html_url})`;
            }

            if (newStatus !== task.status) {
              task.status = newStatus;
              await task.save();
            }

            if (commentText) {
              await Comment.create({
                text: commentText,
                task: task._id,
                user: project.owner,
              });
            }
          }
        }
      }
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// ==================== GET RECENT COMMITS FOR A PROJECT ====================

// GET /api/github/commits/:projectId — Get recent commits for linked repo
router.get('/commits/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !project.githubRepo) {
      return res.status(400).json({ message: 'No GitHub repo linked to this project' });
    }

    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const response = await axios.get(`https://api.github.com/repos/${project.githubRepo}/commits`, {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
      params: { per_page: 20 },
    });

    const commits = response.data.map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
      avatar: c.author?.avatar_url,
    }));

    res.json({ commits, repo: project.githubRepo });
  } catch (error) {
    console.error('GitHub Commits Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch commits' });
  }
});

// ==================== PULL REQUESTS FOR A PROJECT ====================

// GET /api/github/pulls/:projectId — Get open PRs for linked repo
router.get('/pulls/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !project.githubRepo) {
      return res.status(400).json({ message: 'No GitHub repo linked to this project' });
    }

    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (!user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub not connected' });
    }

    const response = await axios.get(`https://api.github.com/repos/${project.githubRepo}/pulls`, {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
      params: { state: 'all', per_page: 30 },
    });

    const pulls = response.data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged_at !== null,
      author: pr.user.login,
      authorAvatar: pr.user.avatar_url,
      url: pr.html_url,
      createdAt: pr.created_at,
      // Extract task IDs from PR title/body
      linkedTaskIds: (`${pr.title} ${pr.body || ''}`).match(/#TASK-([a-zA-Z0-9]+)/gi)?.map(m => m.replace('#TASK-', '')) || [],
    }));

    res.json({ pulls, repo: project.githubRepo });
  } catch (error) {
    console.error('GitHub Pulls Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch pull requests' });
  }
});

// ==================== GITHUB ACTIVITY FEED ====================

// GET /api/github/activity/:projectId — Combined commits + PRs feed for dashboard
router.get('/activity/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !project.githubRepo) {
      return res.json({ activity: [], repo: null });
    }

    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (!user.githubAccessToken) {
      return res.json({ activity: [], repo: project.githubRepo });
    }

    // Fetch commits and PRs in parallel
    const [commitsRes, pullsRes] = await Promise.allSettled([
      axios.get(`https://api.github.com/repos/${project.githubRepo}/commits`, {
        headers: { Authorization: `Bearer ${user.githubAccessToken}` },
        params: { per_page: 10 },
      }),
      axios.get(`https://api.github.com/repos/${project.githubRepo}/pulls`, {
        headers: { Authorization: `Bearer ${user.githubAccessToken}` },
        params: { state: 'all', per_page: 10 },
      }),
    ]);

    const activity = [];

    if (commitsRes.status === 'fulfilled') {
      for (const c of commitsRes.value.data) {
        activity.push({
          type: 'commit',
          sha: c.sha.substring(0, 7),
          message: c.commit.message.split('\n')[0], // First line only
          author: c.commit.author.name,
          avatar: c.author?.avatar_url,
          date: c.commit.author.date,
          url: c.html_url,
        });
      }
    }

    if (pullsRes.status === 'fulfilled') {
      for (const pr of pullsRes.value.data) {
        activity.push({
          type: 'pr',
          number: pr.number,
          title: pr.title,
          state: pr.merged_at ? 'merged' : pr.state,
          author: pr.user.login,
          avatar: pr.user.avatar_url,
          date: pr.created_at,
          url: pr.html_url,
        });
      }
    }

    // Sort by date, newest first
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ activity: activity.slice(0, 15), repo: project.githubRepo });
  } catch (error) {
    console.error('GitHub Activity Error:', error.response?.data || error.message);
    res.json({ activity: [], repo: project?.githubRepo });
  }
});

module.exports = router;
