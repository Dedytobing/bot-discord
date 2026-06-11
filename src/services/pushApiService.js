const axios = require("axios");

const PUSH_API_URL = process.env.PUSH_API_URL;
const PUSH_API_SECRET = process.env.PUSH_API_SECRET;

async function pushToApi(type, payload) {
  if (!PUSH_API_URL) {
    console.log("[PUSH API] PUSH_API_URL belum diatur, push dilewati.");
    return;
  }

  try {
    const response = await axios.post(
      PUSH_API_URL,
      {
        type,
        payload,
        pushed_at: new Date().toISOString(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-bot-secret": PUSH_API_SECRET || "",
        },
        timeout: 10000,
      }
    );

    console.log(`[PUSH API] ${type} berhasil dikirim. Status: ${response.status}`);
  } catch (error) {
    console.error(`[PUSH API] Gagal push ${type}`);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else if (error.request) {
      console.error("Request error: Tidak ada response dari API.");
      console.error("URL:", PUSH_API_URL);
      console.error("Message:", error.message);
      console.error("Code:", error.code);
    } else {
      console.error("Error:", error.message);
    }
  }
}

function formatGuild(guild) {
  return {
    guild_id: guild.id,
    guild_name: guild.name,
    icon_url: guild.iconURL({
      size: 256,
      extension: "png",
      forceStatic: false,
    }),
    member_count: guild.memberCount,
  };
}

function formatMember(member) {
  return {
    guild_id: member.guild.id,
    guild_name: member.guild.name,
    user_id: member.user.id,
    username: member.user.username,
    global_name: member.user.globalName,
    display_name: member.displayName,
    avatar_url: member.user.displayAvatarURL({
      size: 256,
      extension: "png",
      forceStatic: false,
    }),
    is_bot: member.user.bot,
    joined_at: member.joinedAt?.toISOString() || null,
    roles: member.roles.cache
      .filter((role) => role.id !== member.guild.id)
      .map((role) => ({
        role_id: role.id,
        role_name: role.name,
        color: role.hexColor,
        position: role.position,
      })),
  };
}

function formatRole(role) {
  return {
    guild_id: role.guild.id,
    guild_name: role.guild.name,
    role_id: role.id,
    role_name: role.name,
    color: role.hexColor,
    position: role.position,
    managed: role.managed,
    mentionable: role.mentionable,
  };
}

function formatVoiceState(voiceState) {
  const member = voiceState.member;

  return {
    guild_id: voiceState.guild.id,
    guild_name: voiceState.guild.name,
    user_id: member?.user?.id || voiceState.id,
    username: member?.user?.username || null,
    global_name: member?.user?.globalName || null,
    display_name: member?.displayName || null,
    avatar_url:
      member?.user?.displayAvatarURL({
        size: 256,
        extension: "png",
        forceStatic: false,
      }) || null,
    channel_id: voiceState.channelId,
    channel_name: voiceState.channel?.name || null,
    self_mute: voiceState.selfMute,
    self_deaf: voiceState.selfDeaf,
    server_mute: voiceState.serverMute,
    server_deaf: voiceState.serverDeaf,
    streaming: voiceState.streaming,
    camera: voiceState.selfVideo,
  };
}
async function pushGuildSnapshot(guild) {
  try {
    await guild.members.fetch().catch((error) => {
      console.error(
        `[PUSH API] Gagal fetch members guild ${guild.name}:`,
        error.message
      );
      return null;
    });

    const members = guild.members.cache.map(formatMember);

    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .map(formatRole);

    const voice_states = guild.voiceStates.cache.map(formatVoiceState);

    await pushToApi("guild_snapshot", {
      guild: formatGuild(guild),
      members,
      roles,
      voice_states,
    });
  } catch (error) {
    console.error(`[PUSH API] Gagal membuat guild_snapshot untuk ${guild.name}`);
    console.error("Message:", error.message);
  }
}

module.exports = {
  pushToApi,
  pushGuildSnapshot,
  formatGuild,
  formatMember,
  formatRole,
  formatVoiceState,
};