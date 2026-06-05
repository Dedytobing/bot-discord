const { PermissionFlagsBits } = require("discord.js");
const { getWarningEmbed } = require("../commands/antiSpamCommand");

const timeoutDuration = 10 * 60 * 1000;

async function handleAntiSpamMessage(message, db) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const guildId = message.guild.id;
  const channelId = message.channel.id;

  try {
    const config = db
      .prepare(`
        SELECT * FROM anti_spam_channels
        WHERE guild_id = ? AND channel_id = ? AND is_active = 1
      `)
      .get(guildId, channelId);

    if (!config) return;

    await message.delete().catch(() => null);

    const member = message.member;
    const botMember = message.guild.members.me;

    if (!member || !botMember) return;

    if (config.action === "ban") {
      if (
        botMember.permissions.has(PermissionFlagsBits.BanMembers) &&
        member.bannable
      ) {
        await member.ban({
          reason: "Mengirim pesan di channel anti spam/phishing",
        });
      }
    }

    if (config.action === "kick") {
      if (
        botMember.permissions.has(PermissionFlagsBits.KickMembers) &&
        member.kickable
      ) {
        await member.kick("Mengirim pesan di channel anti spam/phishing");
      }
    }

    if (config.action === "timeout") {
      if (
        botMember.permissions.has(PermissionFlagsBits.ModerateMembers) &&
        member.moderatable
      ) {
        await member.timeout(
          timeoutDuration,
          "Mengirim pesan di channel anti spam/phishing"
        );
      }
    }

    db.prepare(`
      UPDATE anti_spam_channels
      SET action_count = action_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE guild_id = ?
    `).run(guildId);

    await updateWarningMessage(message, db);
  } catch (error) {
    console.error("Anti spam detector error:", error);
  }
}

async function updateWarningMessage(message, db) {
  try {
    const config = db
      .prepare(`
        SELECT * FROM anti_spam_channels
        WHERE guild_id = ?
      `)
      .get(message.guild.id);

    if (!config) return;

    const channel = await message.guild.channels.fetch(config.channel_id);

    if (!channel) return;

    const warningMessage = await channel.messages.fetch(
      config.warning_message_id
    );

    if (!warningMessage) return;

    await warningMessage.edit({
      embeds: [getWarningEmbed(config.action_count, config.action)],
    });
  } catch (error) {
    console.error("Gagal update warning message:", error);
  }
}

module.exports = {
  handleAntiSpamMessage,
};