import { REST, Routes, Client } from 'discord.js';
import { Command } from './types/command';
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

export const commandsList: Command[] = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.ts'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    const command: Command = commandModule.default;

    if (command && 'data' in command && 'execute' in command) {
      commandsList.push(command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

export async function deployCommands(client: Client) {
  try {
    console.log('Started refreshing application (/) commands.');
    const commandData = commandsList.map((command) => command.data.toJSON());

    const guilds = await client.guilds.fetch();
    for (const [guildId, guild] of guilds) {
      try {
        await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId), {
          body: commandData,
        });
        console.log(
          `Successfully reloaded ${commandsList.length} application (/) commands for guild: ${guild.name} (${guild.id})`,
        );
      } catch (error) {
        console.error(`Failed to deploy commands for guild: ${guild.name} (${guild.id})`, error);
      }
    }
  } catch (error) {
    console.error(error);
  }

  console.log(`All commands deployed.`);
}
