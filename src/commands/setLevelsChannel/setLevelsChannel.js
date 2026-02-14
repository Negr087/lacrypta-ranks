"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prismaClient_1 = require("../../services/prismaClient");
const discord_js_1 = require("discord.js");
const setLevelsChannel = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('set-levels-channel')
        .setDescription('Establecer canal donde se enviarán los mensajes de nivel')
        .addChannelOption((option) => option.setName('canal').setDescription('Canal donde se enviarán los mensajes de nivel').setRequired(true)),
    execute: async (_discordInteraction) => {
        // Only admins can use this command
        if (!_discordInteraction.member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            _discordInteraction.reply({
                content: 'No tenés permisos para usar este comando',
                ephemeral: true,
            });
            return;
        }
        const discordChannelId = _discordInteraction.options.getChannel('canal', true).id;
        const channel = _discordInteraction.guild?.channels.cache.get(discordChannelId);
        if (!channel) {
            _discordInteraction.reply({
                content: 'Canal no encontrado',
                ephemeral: true,
            });
            return;
        }
        if (channel.isTextBased()) {
            await channel.send('En este canal se enviarán las actualizaciones de niveles');
        }
        else {
            _discordInteraction.reply({
                content: 'El canal seleccionado no es un canal de texto.',
                ephemeral: true,
            });
            return;
        }
        _discordInteraction.reply({
            content: `Canal de niveles establecido en <#${channel.id}>`,
            ephemeral: true,
        });
        // Save to database
        await prismaClient_1.prisma.guild.update({
            where: {
                discordGuildId: _discordInteraction.guildId,
            },
            data: {
                levelsChannelId: discordChannelId,
            },
        });
    },
};
exports.default = setLevelsChannel;
