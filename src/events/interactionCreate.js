"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const prismaClient_1 = require("../services/prismaClient");
const roleReaction_1 = require("../commands/roleReaction/roleReaction");
const roleButton_1 = require("../commands/roleButton/roleButton");
const serPadrinoHelpers_1 = require("../commands/padrino/serPadrinoHelpers");
const obtenerPadrinoHelpers_1 = require("../commands/padrino/obtenerPadrinoHelpers");
const cache_1 = require("../services/cache");
const event = {
    name: 'interactionCreate',
    once: false,
    execute: async (interaction) => {
        const client = interaction.client;
        /////////////////////
        /// Slash Command ///
        /////////////////////
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName); // Get command from collection
            if (!command)
                return; // If command doesn't exist, return
            command.execute(interaction); // If command exist, execute it
        }
        //////////////
        /// Button ///
        //////////////
        else if (interaction.isButton()) {
            /// /role-rection ///
            if (interaction.customId === 'role-reaction-finish-button') {
                (0, roleReaction_1.finalizeRoleReactionCommand)();
            } /// End Of /role-rection ///
            /// /role-button-commnad ///
            if (interaction.customId.startsWith('role-button-button-')) {
                const buttonId = interaction.customId;
                let prismaRole;
                try {
                    const prismaReactionButton = await prismaClient_1.prisma.reactionButton.findMany({
                        where: {
                            discordButtonId: buttonId,
                        },
                    });
                    prismaRole = await prismaClient_1.prisma.role.findMany({
                        where: {
                            id: prismaReactionButton[0].roleId,
                        },
                    });
                }
                catch (error) {
                    console.error('Failed to get role from database:', error);
                }
                if (prismaRole) {
                    const role = interaction.guild.roles.cache.get(prismaRole[0].discordRoleId);
                    if (role) {
                        const member = interaction.guild?.members.cache.get(interaction.user.id);
                        if (member) {
                            if (member.roles.cache.has(role.id)) {
                                await member.roles.remove(role);
                                await interaction.reply({
                                    content: `Te eliminaste el rol: ${role.name}`,
                                    ephemeral: true,
                                });
                            }
                            else {
                                await member.roles.add(role);
                                await interaction.reply({
                                    content: `Ahora tenés el rol: ${role.name}`,
                                    ephemeral: true,
                                });
                            }
                        }
                    }
                }
            } /// End Of /role-button ///
            /// /ser-padrino ///
            if (interaction.customId === 'ser-padrino-edit-button') {
                await (0, serPadrinoHelpers_1.modalMenu)(interaction);
            }
            if (interaction.customId === 'ser-padrino-confirm-button') {
                await interaction.update({
                    content: '# Tu perfil de Padrino está confirmado :white_check_mark:',
                    components: [],
                });
            } /// End Of /ser-padrino ///
            /// /obtener-padrino ///
            if (interaction.customId.startsWith('obtener-padrino-confirm-button-id:')) {
                const prismaPadrinoId = interaction.customId.split(':')[1];
                await cache_1.cacheService.updatePadrinoOfMember(interaction.user.id, prismaPadrinoId);
                await interaction.update({
                    content: '# Padrino confirmado! :white_check_mark:',
                    components: [],
                });
            } /// End Of /obtener-padrino ///
        }
        //////////////////////////
        /// String Select Menu ///
        //////////////////////////
        else if (interaction.isStringSelectMenu()) {
            /// /role-rection-commnad ///
            if (interaction.customId.startsWith('role-reaction-select-menu')) {
                (0, roleReaction_1.asignRoleToMessageReactionRole)(interaction);
            } /// End Of /role-rection-commnad ///
            /// /obtener-padrino ///
            if (interaction.customId === 'obtener-padrino-select-menu') {
                // Get selected padrino
                const selectedPadrinoMemberId = interaction.values[0];
                await (0, obtenerPadrinoHelpers_1.createSelectPadrino)(interaction, selectedPadrinoMemberId);
            } /// End Of /obtener-padrino ///
        }
        ////////////////////
        /// Modal Submit ///
        ////////////////////
        else if (interaction.isModalSubmit()) {
            /// /role-button-commnad ///
            if (interaction.customId === 'role-button-modal') {
                // Setup
                if (interaction.fields.fields.firstKey() === 'role-button-text-input-message') {
                    // Get channel
                    const channelId = interaction.channelId;
                    const channel = interaction.guild.channels.cache.get(channelId);
                    const textInputMessage = interaction.fields.fields.first().value;
                    // Send message
                    if (channel?.type === discord_js_1.ChannelType.GuildText) {
                        try {
                            await interaction.deferUpdate(); // Acknowledge the interaction
                        }
                        catch (error) {
                            console.error('Failed defer modal message', error);
                        }
                        const discordMessageInstance = await channel.send(textInputMessage);
                        await (0, roleButton_1.addButtonToMessage)(discordMessageInstance.id);
                    }
                }
            } /// End Of /role-button ///
            /// /ser-padrino ///
            if (interaction.customId === 'ser-padrino-modal') {
                await (0, serPadrinoHelpers_1.createAndSendMessagePadrinoProfile)(interaction);
            } /// End Of /ser-padrino ///
        }
        /////////////////////////////////////
        /// Interaction is not implemented //
        //////////////////////////////////////
        else {
            console.log('Interaction is not implemented.');
        }
    },
};
exports.default = event;
