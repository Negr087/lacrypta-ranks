"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../services/cache");
const discord_js_1 = require("discord.js");
const resetLevels = {
    data: new discord_js_1.SlashCommandBuilder().setName('reset-levels').setDescription('Resetear el ranking de niveles'),
    execute: async (_discordInteraction) => {
        // Only admins can use this command
        if (!_discordInteraction.member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            _discordInteraction.reply({
                content: 'No tenés permisos para usar este comando',
                ephemeral: true,
            });
            return;
        }
        const resetLevelsStatus = await cache_1.cacheService.resetLevels();
        if (resetLevelsStatus) {
            _discordInteraction.reply({
                content: 'Se resetearon los niveles correctamente',
            });
        }
        else {
            _discordInteraction.reply({
                content: 'Ocurrió un error al resetear los niveles',
            });
        }
    },
};
exports.default = resetLevels;
