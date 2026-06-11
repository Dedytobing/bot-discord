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

const {
  pushToApi,
  pushGuildSnapshot,
  formatGuild,
  formatMember,
  formatRole,
  formatVoiceState,
  getGuildVoiceSnapshot,
  pushVoiceSnapshot,
} = require("./services/pushApiService");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

client.commands.set(antiSpamCommand.data.name, antiSpamCommand);

client.once(Events.ClientReady, async () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    await pushGuildSnapshot(guild);

    // Kirim snapshot voice terpisah supaya endpoint voice langsung punya data lengkap
    // walaupun user sudah berada di voice sebelum bot online.
    await pushVoiceSnapshot(guild, "voice_snapshot");
  }

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

client.on(Events.GuildCreate, async (guild) => {
  try {
    console.log(`Bot masuk server baru: ${guild.name}`);

    await pushToApi("guild_joined", {
      guild: formatGuild(guild),
    });

    await pushGuildSnapshot(guild);
  } catch (error) {
    console.error("Gagal push guild_joined:", error);
  }
});

client.on(Events.GuildDelete, async (guild) => {
  try {
    console.log(`Bot keluar dari server: ${guild.name}`);

    await pushToApi("guild_left", {
      guild_id: guild.id,
      guild_name: guild.name,
    });
  } catch (error) {
    console.error("Gagal push guild_left:", error);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    console.log(`${member.user.tag} join server ${member.guild.name}`);

    await pushToApi("member_joined", {
      member: formatMember(member),
    });
  } catch (error) {
    console.error("Gagal push member_joined:", error);
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try {
    console.log(`${member.user.tag} keluar dari server ${member.guild.name}`);

    await pushToApi("member_left", {
      guild_id: member.guild.id,
      guild_name: member.guild.name,
      user_id: member.user.id,
      username: member.user.username,
      global_name: member.user.globalName,
      avatar_url: member.user.displayAvatarURL({ size: 256 }),
      is_bot: member.user.bot,
    });
  } catch (error) {
    console.error("Gagal push member_left:", error);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    await pushToApi("member_updated", {
      old_member: formatMember(oldMember),
      new_member: formatMember(newMember),
    });
  } catch (error) {
    console.error("Gagal push member_updated:", error);
  }
});

client.on(Events.RoleCreate, async (role) => {
  try {
    console.log(`Role dibuat: ${role.name} di ${role.guild.name}`);

    await pushToApi("role_created", {
      role: formatRole(role),
    });
  } catch (error) {
    console.error("Gagal push role_created:", error);
  }
});

client.on(Events.RoleUpdate, async (oldRole, newRole) => {
  try {
    await pushToApi("role_updated", {
      old_role: formatRole(oldRole),
      new_role: formatRole(newRole),
    });
  } catch (error) {
    console.error("Gagal push role_updated:", error);
  }
});

client.on(Events.RoleDelete, async (role) => {
  try {
    console.log(`Role dihapus: ${role.name} di ${role.guild.name}`);

    await pushToApi("role_deleted", {
      role: formatRole(role),
    });
  } catch (error) {
    console.error("Gagal push role_deleted:", error);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    let eventType = "voice_updated";

    if (!oldState.channelId && newState.channelId) {
      eventType = "voice_joined";
    }

    if (oldState.channelId && !newState.channelId) {
      eventType = "voice_left";
    }

    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      eventType = "voice_moved";
    }

    const guild = newState.guild || oldState.guild;
    const voiceSnapshot = await getGuildVoiceSnapshot(guild);

    await pushToApi(eventType, {
      guild_id: guild.id,
      guild_name: guild.name,
      user_id: newState.id || oldState.id,
      old_state: oldState.channelId ? formatVoiceState(oldState) : null,
      new_state: newState.channelId ? formatVoiceState(newState) : null,

      // Data lengkap kondisi voice saat ini.
      // Backend sebaiknya replace data voice guild berdasarkan field ini, bukan hanya merge 1 user.
      voice_states: voiceSnapshot.voice_states,
      voice_channels: voiceSnapshot.voice_channels,
    });

    // Event tambahan khusus snapshot agar endpoint /api/discord/voice selalu sinkron.
    await pushToApi("voice_snapshot", voiceSnapshot);

    const member = newState.member || oldState.member;
    const username = member?.user?.tag || newState.id || oldState.id;

    console.log(`[VOICE] ${eventType}: ${username}`);
  } catch (error) {
    console.error("Gagal push voice state:", error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);