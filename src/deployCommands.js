"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandsList = void 0;
exports.deployCommands = deployCommands;
const discord_js_1 = require("discord.js");
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
exports.commandsList = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = require(filePath);
        const command = commandModule.default;
        if (command && 'data' in command && 'execute' in command) {
            exports.commandsList.push(command);
        }
        else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}
const rest = new discord_js_1.REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
async function deployCommands(client) {
    try {
        console.log('Started refreshing application (/) commands.');
        const commandData = exports.commandsList.map((command) => command.data.toJSON());
        const guilds = await client.guilds.fetch();
        for (const [guildId, guild] of guilds) {
            try {
                await rest.put(discord_js_1.Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, guildId), {
                    body: commandData,
                });
                console.log(`Successfully reloaded ${exports.commandsList.length} application (/) commands for guild: ${guild.name} (${guild.id})`);
            }
            catch (error) {
                console.error(`Failed to deploy commands for guild: ${guild.name} (${guild.id})`, error);
            }
        }
    }
    catch (error) {
        console.error(error);
    }
    console.log(`All commands deployed.`);
}
