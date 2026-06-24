const { Client, GatewayIntentBits } = require('discord.js');
const Project = require('./models/Project');
const User = require('./models/User');
const Meeting = require('./models/Meeting');

// Store voice joining times
// Key: discordUserId, Value: joinTime (timestamp)
const voiceSessions = new Map();

function initDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("Discord Bot Token not provided, skipping discord bot initialization.");
    return;
  }

  // Cleanup stale voice sessions periodically (every 1 hour)
  setInterval(() => {
    const now = Date.now();
    const MAX_SESSION_TIME = 12 * 60 * 60 * 1000; // 12 hours
    for (const [userId, joinTime] of voiceSessions.entries()) {
      if (now - joinTime > MAX_SESSION_TIME) {
        voiceSessions.delete(userId);
        console.log(`Cleaned up stale voice session for user ${userId}`);
      }
    }
  }, 60 * 60 * 1000);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  client.once('clientReady', () => {
    console.log(`🤖 Discord Bot logged in as ${client.user.tag}`);
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const userId = member.id;
    const guildId = newState.guild.id;

    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
      voiceSessions.set(userId, Date.now());
      console.log(`Discord User ${member.user.tag} joined voice channel.`);
    }

    // User left a voice channel
    if (oldState.channelId && !newState.channelId) {
      const joinTime = voiceSessions.get(userId);
      if (joinTime) {
        const durationMs = Date.now() - joinTime;
        voiceSessions.delete(userId);
        
        console.log(`Discord User ${member.user.tag} left voice channel. Duration: ${durationMs}ms`);

        // 10 minutes in milliseconds
        const MIN_DURATION = 10 * 60 * 1000;

        if (durationMs >= MIN_DURATION) {
          try {
            // Find User by discordId
            const user = await User.findOne({ discordId: userId });
            if (!user) {
              console.log(`User not found in DB with discordId: ${userId}`);
              return;
            }

            // Find Project by discordServerId
            const project = await Project.findOne({ discordServerId: guildId });
            if (!project) {
              console.log(`Project not found in DB with discordServerId: ${guildId}`);
              return;
            }

            // Mark attendance
            const todayString = new Date().toISOString().split('T')[0];
            let meeting = await Meeting.findOne({ project: project._id, dateString: todayString });

            if (!meeting) {
              meeting = await Meeting.create({
                project: project._id,
                dateString: todayString,
                attendees: [user._id]
              });
              console.log(`Attendance marked automatically for ${user.name} via Discord Bot (New Meeting).`);
            } else {
              if (!meeting.attendees.includes(user._id)) {
                meeting.attendees.push(user._id);
                await meeting.save();
                console.log(`Attendance marked automatically for ${user.name} via Discord Bot.`);
              }
            }
          } catch (err) {
            console.error("Error marking attendance from Discord Bot:", err);
          }
        } else {
          console.log(`Discord User ${member.user.tag} didn't stay for 10 minutes. No attendance marked.`);
        }
      }
    }
  });

  client.login(token).catch(err => {
    console.error("Failed to login Discord Bot:", err);
  });
}

module.exports = { initDiscordBot };
