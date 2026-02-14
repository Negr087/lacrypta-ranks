"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const serPadrinoHelpers_1 = require("./serPadrinoHelpers");
const prismaClient_1 = require("../../services/prismaClient");
const serPadrino = {
    data: new discord_js_1.SlashCommandBuilder().setName('ser-padrino').setDescription('Quiero ser un padrino!'),
    execute: async (discordInteraction) => {
        const userId = discordInteraction.user.id;
        const member = await discordInteraction.guild?.members.fetch(userId);
        const memberRoles = member?.roles.cache.map((role) => role.name);
        // Only someone Merito can be padrino
        const roleMeritoId = await prismaClient_1.prisma.guild
            .findUnique({
            where: {
                discordGuildId: discordInteraction.guildId,
            },
        })
            .then((guild) => guild?.padrinoMeritoRoleId);
        if (!roleMeritoId) {
            await discordInteraction.reply({
                content: 'No se ha configurado el comando, **avisale a un administrador**.',
                ephemeral: true,
            });
            return;
        }
        const roleMerito = await discordInteraction.guild?.roles.fetch(roleMeritoId);
        if (!memberRoles?.includes(roleMerito.name)) {
            await discordInteraction.reply({ content: `Se necesita <@&${roleMeritoId}> para ser padrino`, ephemeral: true });
            return;
        }
        await (0, serPadrinoHelpers_1.modalMenu)(discordInteraction);
        return;
    },
};
exports.default = serPadrino;
