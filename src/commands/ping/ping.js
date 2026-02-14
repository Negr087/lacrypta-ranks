"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ping = {
    data: new discord_js_1.SlashCommandBuilder().setName('ping').setDescription('Para checkear si el bot está vivo'),
    execute: async (interaction) => {
        await interaction.reply('Viva La Libertad CARAJO! <:milei_motosierra:1157810516467650611>');
    },
};
exports.default = ping;
