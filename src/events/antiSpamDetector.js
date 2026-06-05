const { PermissionFlagsBits } = require("discord.js");
const { getWarningEmbed } = require("../commands/antiSpamCommand");

const timeoutDuration = 10 * 60 * 1000;

async function handleAntiSpamMessage(message, db) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const guildId = message.guild.id;
  const channelId = message.channel.id;

  db.get(
    `
    SELECT * FROM anti_spam_channels
    WHERE guild_id = ? AND channel_id = ? AND is_active = 1
    `,
    [guildId, channelId],
    async (err, config) => {
      if (err) {
        console.error(err);
        return;
      }

      if (!config) return;

      try {
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

        db.run(
          `
          UPDATE anti_spam_channels
          SET action_count = action_count + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE guild_id = ?
          `,
          [guildId],
          (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              return;
            }

            updateWarningMessage(message, db);
          }
        );
      } catch (error) {
        console.error("Anti spam detector error:", error);
      }
    }
  );
}

function updateWarningMessage(message, db) {
  db.get(
    `
    SELECT * FROM anti_spam_channels
    WHERE guild_id = ?
    `,
    [message.guild.id],
    async (err, config) => {
      if (err || !config) return;

      try {
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
  );
}

module.exports = {
  handleAntiSpamMessage,
};