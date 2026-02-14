"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const path_1 = require("path");
const deployCommands_1 = require("./deployCommands");
require('dotenv').config();
console.info('Hello World');
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
    ],
});
const eventsPath = (0, path_1.join)(__dirname, 'events');
const eventFiles = (0, fs_1.readdirSync)(eventsPath);
for (const file of eventFiles) {
    const filePath = (0, path_1.join)(eventsPath, file);
    const event = require(filePath).default;
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
        console.info(`Event ${event.name} loaded.`);
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
        console.info(`Event ${event.name} loaded.`);
    }
}
client.login(process.env.DISCORD_BOT_TOKEN);
/// Commands ///
// Load commands in client instance
client.commands = new discord_js_1.Collection();
deployCommands_1.commandsList.forEach((command) => {
    client.commands.set(command.data.name, command);
});
