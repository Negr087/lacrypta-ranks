import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { ExtendedClient } from './types/discordClient';
import { readdirSync } from 'fs';
import { join } from 'path';

import { BotEvent } from './types/botEvents';
import { commandsList } from './deployCommands';
import { Command } from './types/command';

require('dotenv').config();

console.info('Hello World');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
}) as ExtendedClient;

const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath);

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const event: BotEvent = require(filePath).default;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
    console.info(`Event ${event.name} loaded.`);
  } else {
    client.on(event.name, (...args) => event.execute(...args));
    console.info(`Event ${event.name} loaded.`);
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);

/// Commands ///
// Load commands in client instance
client.commands = new Collection();
commandsList.forEach((command: Command) => {
  client.commands.set(command.data.name, command);
});
