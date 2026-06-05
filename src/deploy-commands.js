require("dotenv").config();

const { REST, Routes } = require("discord.js");
const antiSpamCommand = require("./commands/antiSpamCommand");

const commands = [antiSpamCommand.data.toJSON()];

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_BOT_TOKEN
);

async function deployCommands() {
  try {
    console.log("Started refreshing application commands.");

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      {
        body: commands,
      }
    );

    console.log("Successfully reloaded application commands.");
  } catch (error) {
    console.error(error);
  }
}

deployCommands();