require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');

// ============================================
// EDU-SPHERE DISCORD BOT (OPTION 3)
// ============================================
// How to run:
// 1. Get a Bot Token from Discord Developer Portal
// 2. Add it to .env: DISCORD_BOT_TOKEN=your_token
// 3. Add to .env: DISCORD_CLIENT_ID=your_client_id
// 4. Run `npm install discord.js`
// 5. Run `node bot.js`
// ============================================

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) {
  console.log("No DISCORD_BOT_TOKEN found. Skipping bot startup.");
  process.exit(0);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const commands = [
  {
    name: 'newtask',
    description: 'Creates a new task in EduSphere Project Management',
    options: [
      {
        name: 'title',
        description: 'The title of the task',
        type: 3, // STRING
        required: true
      },
      {
        name: 'priority',
        description: 'low, medium, or high',
        type: 3,
        required: false,
        choices: [
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' }
        ]
      },
      {
        name: 'project_id',
        description: 'The ID of the project to add the task to',
        type: 3,
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(token);

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'newtask') {
    const title = interaction.options.getString('title');
    const priority = interaction.options.getString('priority') || 'medium';
    const projectId = interaction.options.getString('project_id');
    const discordUserId = interaction.user.id;

    await interaction.reply({ content: `⏳ Creating task "${title}"...`, ephemeral: true });

    try {
      // Call our EduSphere Backend
      const response = await axios.post('http://localhost:5000/api/discord/bot/create-task', {
        botSecret: process.env.DISCORD_BOT_SECRET, // Add this to your backend .env
        title,
        priority,
        projectId,
        discordUserId
      });

      await interaction.editReply({ 
        content: `✅ Task created successfully in EduSphere!\nTask: **${title}**\nPriority: **${priority}**` 
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ 
        content: `❌ Failed to create task. Make sure the Project ID is correct and backend is running.` 
      });
    }
  }
});

client.login(token);
