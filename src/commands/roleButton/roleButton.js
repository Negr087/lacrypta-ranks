"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addButtonToMessage = addButtonToMessage;
const discord_js_1 = require("discord.js");
const cache_1 = require("../../services/cache");
let discordInteractionGlobal;
const roleButton = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('role-button')
        .setDescription('Configure role reactions')
        .addStringOption((option) => option.setName('button_name_1').setDescription('Button Name 1').setRequired(true))
        .addStringOption((option) => option.setName('role_id_1').setDescription('Role ID 1').setRequired(true))
        .addStringOption((option) => option.setName('button_name_2').setDescription('Button Name 2').setRequired(false))
        .addStringOption((option) => option.setName('role_id_2').setDescription('Role ID 2').setRequired(false))
        .addStringOption((option) => option.setName('button_name_3').setDescription('Button Name 3').setRequired(false))
        .addStringOption((option) => option.setName('role_id_3').setDescription('Role ID 3').setRequired(false)),
    execute: async (_discordInteraction) => {
        // Only admins can use this command
        if (!_discordInteraction.member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            _discordInteraction.reply({
                content: 'No tenés permisos para usar este comando',
                ephemeral: true,
            });
            return;
        }
        discordInteractionGlobal = _discordInteraction;
        await modalMenu();
    },
};
async function modalMenu() {
    /// Role list and Send message ///
    try {
        const modal = new discord_js_1.ModalBuilder().setCustomId('role-button-modal').setTitle('Personalice el texto');
        // Crete text input component
        const textInput = new discord_js_1.TextInputBuilder()
            .setCustomId('role-button-text-input-message')
            .setLabel('Mensaje')
            .setStyle(discord_js_1.TextInputStyle.Paragraph);
        // Create text input row
        const textInputRow = new discord_js_1.ActionRowBuilder().addComponents(textInput);
        modal.addComponents(textInputRow);
        await discordInteractionGlobal.showModal(modal);
    }
    catch (error) {
        console.error('Failed to create modal:', error);
        return;
    }
}
async function addButtonToMessage(_discordMessageId) {
    // Get the message from Discord
    const message = await discordInteractionGlobal.channel?.messages.fetch(_discordMessageId);
    // Create an array to hold the buttons
    const buttons = [];
    // Loop through the possible button names and role IDs
    for (let i = 1; i <= 3; i++) {
        const discordButtonName = discordInteractionGlobal.options.get(`button_name_${i}`, false)?.value;
        const discordRoleId = discordInteractionGlobal.options.get(`role_id_${i}`, false)?.value;
        const discordRoleName = discordInteractionGlobal.guild?.roles.cache.get(discordRoleId)?.name;
        // If both the button name and role ID exist, create a button
        if (discordButtonName && discordRoleId) {
            try {
                const prismaRole = await cache_1.cacheService.upsertRole(discordInteractionGlobal.guildId, discordRoleId, discordRoleName);
                if (!prismaRole) {
                    throw new Error('Failed to create role');
                }
                await cache_1.cacheService.createReactionButton(prismaRole.id, `role-button-button-${i}`);
            }
            catch (error) {
                console.error('Failed to create prismaRole:', error);
            }
            const button = new discord_js_1.ButtonBuilder()
                .setCustomId(`role-button-button-${i}`)
                .setLabel(discordButtonName)
                .setStyle(discord_js_1.ButtonStyle.Primary);
            // Add the button to the array
            buttons.push(button);
        }
    }
    // Create a row with the buttons
    const row = new discord_js_1.ActionRowBuilder().addComponents(buttons);
    if (message) {
        await message.edit({
            components: [row],
        });
    }
}
exports.default = roleButton;
