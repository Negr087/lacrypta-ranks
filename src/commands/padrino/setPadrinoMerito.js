"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prismaClient_1 = require("../../services/prismaClient");
const discord_js_1 = require("discord.js");
const setPadrinoMerito = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('set-padrino-merito')
        .setDescription('Establecer el rol minimo para poder ser padrino')
        .addRoleOption((option) => option.setName('role').setDescription('Rol que necesita un padrino').setRequired(true)),
    execute: async (_discordInteraction) => {
        // Only admins can use this command
        if (!_discordInteraction.member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            _discordInteraction.reply({
                content: 'No tenés permisos para usar este comando',
                ephemeral: true,
            });
            return;
        }
        const discordRoleId = _discordInteraction.options.getRole('role', true).id;
        const discordRole = _discordInteraction.guild?.roles.cache.get(discordRoleId);
        if (!discordRole) {
            _discordInteraction.reply({
                content: 'Rol no encontrado',
                ephemeral: true,
            });
            return;
        }
        await _discordInteraction.reply({
            content: `Rol <@&${discordRole.id}> establecido como minimo para ser padrino`,
            ephemeral: true,
        });
        // Save to database
        await prismaClient_1.prisma.guild.update({
            where: {
                discordGuildId: _discordInteraction.guildId,
            },
            data: {
                padrinoMeritoRoleId: discordRoleId,
            },
        });
    },
};
exports.default = setPadrinoMerito;
