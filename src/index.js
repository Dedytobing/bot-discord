require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ActivityType,
} = require("discord.js");

const db = require("./database/db");
const antiSpamCommand = require("./commands/antiSpamCommand");
const { handleAntiSpamMessage } = require("./events/antiSpamDetector");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

client.commands.set(antiSpamCommand.data.name, antiSpamCommand);

client.once(Events.ClientReady, () => {
    console.log(`Bot aktif sebagai ${client.user.tag}`);
  
    const activities = [
      {
        name: "Spam & Phishing Detection",
        type: ActivityType.Watching,
      },
      {
        name: "Lebah Security",
        type: ActivityType.Watching,
      },
      {
        name: `${client.guilds.cache.size} Servers Active`,
        type: ActivityType.Watching,
      },
      {
        name: "Protecting Discord Servers",
        type: ActivityType.Playing,
      },
      {
        name: "Pawpaw on TOP",
        type: ActivityType.Playing,
      },
      {
        name: "Baby Yuri",
        type: ActivityType.Playing,
      },
    ];
  
    let index = 0;
  
    client.user.setPresence({
      status: "dnd",
      activities: [activities[index]],
    });
  
    setInterval(() => {
      index = (index + 1) % activities.length;
  
      client.user.setPresence({
        status: "dnd",
        activities: [activities[index]],
      });
    }, 15000);
  });

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, db);
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ Terjadi kesalahan saat menjalankan command.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "❌ Terjadi kesalahan saat menjalankan command.",
        ephemeral: true,
      });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  await handleAntiSpamMessage(message, db);
});

client.login(process.env.DISCORD_BOT_TOKEN);