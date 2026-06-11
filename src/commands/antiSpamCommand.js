const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

function getActionLabel(action = "ban") {
  const labels = {
    ban: "Ban",
    kick: "Kick",
    timeout: "Timeout",
    delete: "Delete Only",
  };

  return labels[action] || "Unknown";
}

function getActionWarningText(action = "ban") {
  const warnings = {
    ban: {
      id: "setiap pesan yang dikirim di sini akan mengakibatkan **ban otomatis**.",
      en: "any message sent here will result in an **automatic ban**.",
    },
    kick: {
      id: "setiap pesan yang dikirim di sini akan mengakibatkan **kick otomatis**.",
      en: "any message sent here will result in an **automatic kick**.",
    },
    timeout: {
      id: "setiap pesan yang dikirim di sini akan mengakibatkan **timeout otomatis**.",
      en: "any message sent here will result in an **automatic timeout**.",
    },
    delete: {
      id: "setiap pesan yang dikirim di sini akan **dihapus otomatis**.",
      en: "any message sent here will be **deleted automatically**.",
    },
  };

  return warnings[action] || warnings.ban;
}

function getCounterTitle(action = "ban") {
  if (action === "delete") return "🧹 **Deleted Message Count**";
  return "🔨 **Action Count**";
}

function getCounterText(actionCount = 0, action = "ban") {
  if (action === "delete") return `\`${actionCount} Messages\``;
  return `\`${actionCount} Users\``;
}

function getWarningEmbed(actionCount = 0, action = "ban") {
  const warningText = getActionWarningText(action);
  const actionLabel = getActionLabel(action);

  return new EmbedBuilder()
    .setColor(0x2f3136)
    .setDescription(
      [
        "## JANGAN MENGIRIM PESAN DI CHANNEL INI",
        "## DO NOT SEND MESSAGES IN THIS CHANNEL",
        "",
        `**Channel ini khusus untuk mendeteksi spam & phishing, ${warningText.id}**`,
        "",
        `*This channel is strictly for spam & phishing detection, ${warningText.en}*`,
        "",
        `Action Mode: **${actionLabel}**`,
        "",
        "stay safe and read the rules",
        "",
        getCounterTitle(action),
        getCounterText(actionCount, action),
      ].join("\n")
    )
    .setFooter({
      text: "Lebah Security",
    });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anti-spam")
    .setDescription("Mengatur channel deteksi spam dan phishing")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Mengaktifkan anti spam/phishing di channel tertentu")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel khusus anti spam/phishing")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Aksi untuk user yang mengirim pesan di channel ini")
            .setRequired(true)
            .addChoices(
              { name: "Ban", value: "ban" },
              { name: "Kick", value: "kick" },
              { name: "Timeout", value: "timeout" },
              { name: "Delete Only", value: "delete" }
            )
        )
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("off")
        .setDescription("Menonaktifkan anti spam/phishing di server ini")
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Melihat status anti spam/phishing server ini")
    ),

  async execute(interaction, db) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel");
      const action = interaction.options.getString("action");

      const warningMessage = await channel.send({
        embeds: [getWarningEmbed(0, action)],
      });

      try {
        db.prepare(`
          INSERT INTO anti_spam_channels 
          (guild_id, channel_id, warning_message_id, action, action_count, is_active, updated_at)
          VALUES (?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(guild_id) DO UPDATE SET
            channel_id = excluded.channel_id,
            warning_message_id = excluded.warning_message_id,
            action = excluded.action,
            action_count = 0,
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        `).run(guildId, channel.id, warningMessage.id, action);

        return interaction.reply({
          content: `✅ Anti spam/phishing berhasil diaktifkan di ${channel} dengan aksi **${getActionLabel(action)}**.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(error);

        return interaction.reply({
          content: "❌ Gagal menyimpan konfigurasi anti spam.",
          ephemeral: true,
        });
      }
    }

    if (subcommand === "off") {
      try {
        db.prepare(`
          UPDATE anti_spam_channels
          SET is_active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE guild_id = ?
        `).run(guildId);

        return interaction.reply({
          content: "✅ Fitur anti spam/phishing sudah dinonaktifkan untuk server ini.",
          ephemeral: true,
        });
      } catch (error) {
        console.error(error);

        return interaction.reply({
          content: "❌ Gagal menonaktifkan anti spam.",
          ephemeral: true,
        });
      }
    }

    if (subcommand === "status") {
      try {
        const config = db
          .prepare(`
            SELECT * FROM anti_spam_channels
            WHERE guild_id = ?
          `)
          .get(guildId);

        if (!config || config.is_active === 0) {
          return interaction.reply({
            content: "ℹ️ Anti spam/phishing belum aktif di server ini.",
            ephemeral: true,
          });
        }

        const counterLabel =
          config.action === "delete" ? "Deleted Message Count" : "Action Count";

        const counterValue =
          config.action === "delete"
            ? `${config.action_count} Messages`
            : `${config.action_count} Users`;

        return interaction.reply({
          content: [
            "✅ **Anti Spam/Phishing Aktif**",
            `Channel: <#${config.channel_id}>`,
            `Action: **${getActionLabel(config.action)}**`,
            `${counterLabel}: **${counterValue}**`,
          ].join("\n"),
          ephemeral: true,
        });
      } catch (error) {
        console.error(error);

        return interaction.reply({
          content: "❌ Gagal mengambil status anti spam.",
          ephemeral: true,
        });
      }
    }
  },

  getWarningEmbed,
  getActionLabel,
};