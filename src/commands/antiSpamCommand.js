const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
  } = require("discord.js");
  
  function getWarningEmbed(actionCount = 0, action = "ban") {
    return new EmbedBuilder()
      .setColor(0x2f3136)
      .setDescription(
        [
          "## JANGAN MENGIRIM PESAN DI CHANNEL INI",
          "## DO NOT SEND MESSAGES IN THIS CHANNEL",
          "",
          "**Channel ini khusus untuk mendeteksi spam & phishing, setiap pesan yang dikirim di sini akan mengakibatkan banned otomatis.**",
          "",
          "*This channel is strictly for spam & phishing detection, any messages sent here will result in an immediate ban*",
          "",
          "stay safe and read the rules",
          "",
          "🔨 **Action Count**",
          `\`${actionCount} Users\``,
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
  
        db.run(
          `
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
          `,
          [guildId, channel.id, warningMessage.id, action],
          (err) => {
            if (err) {
              console.error(err);
  
              return interaction.reply({
                content: "❌ Gagal menyimpan konfigurasi anti spam.",
                ephemeral: true,
              });
            }
  
            return interaction.reply({
              content: `✅ Anti spam/phishing berhasil diaktifkan di ${channel} dengan aksi **${action}**.`,
              ephemeral: true,
            });
          }
        );
      }
  
      if (subcommand === "off") {
        db.run(
          `
          UPDATE anti_spam_channels
          SET is_active = 0, updated_at = CURRENT_TIMESTAMP
          WHERE guild_id = ?
          `,
          [guildId],
          (err) => {
            if (err) {
              console.error(err);
  
              return interaction.reply({
                content: "❌ Gagal menonaktifkan anti spam.",
                ephemeral: true,
              });
            }
  
            return interaction.reply({
              content: "✅ Fitur anti spam/phishing sudah dinonaktifkan untuk server ini.",
              ephemeral: true,
            });
          }
        );
      }
  
      if (subcommand === "status") {
        db.get(
          `
          SELECT * FROM anti_spam_channels
          WHERE guild_id = ?
          `,
          [guildId],
          (err, config) => {
            if (err) {
              console.error(err);
  
              return interaction.reply({
                content: "❌ Gagal mengambil status anti spam.",
                ephemeral: true,
              });
            }
  
            if (!config || config.is_active === 0) {
              return interaction.reply({
                content: "ℹ️ Anti spam/phishing belum aktif di server ini.",
                ephemeral: true,
              });
            }
  
            return interaction.reply({
              content: [
                "✅ **Anti Spam/Phishing Aktif**",
                `Channel: <#${config.channel_id}>`,
                `Action: **${config.action}**`,
                `Action Count: **${config.action_count} Users**`,
              ].join("\n"),
              ephemeral: true,
            });
          }
        );
      }
    },
  
    getWarningEmbed,
  };