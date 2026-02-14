"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modalMenu = modalMenu;
exports.createAndSendMessagePadrinoProfile = createAndSendMessagePadrinoProfile;
const discord_js_1 = require("discord.js");
const cache_1 = require("../../services/cache");
async function modalMenu(discordInteraction) {
    try {
        const modal = new discord_js_1.ModalBuilder().setCustomId('ser-padrino-modal').setTitle('Personalizá tu perfil');
        // Crete text input component
        const shortTextInput = new discord_js_1.TextInputBuilder()
            .setCustomId('ser-padrino-short-text-input')
            .setLabel('Resumen')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(150)
            .setPlaceholder('Contá en pocas palabras quién sos');
        const longTextInput = new discord_js_1.TextInputBuilder()
            .setCustomId('ser-padrino-long-text-input')
            .setLabel('Biografía')
            .setPlaceholder('Contá un poco sobre vos')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1024);
        // Create text input row
        const shortTextInputRow = new discord_js_1.ActionRowBuilder().addComponents(shortTextInput);
        const longTextInputRow = new discord_js_1.ActionRowBuilder().addComponents(longTextInput);
        modal.addComponents(shortTextInputRow, longTextInputRow);
        await discordInteraction.showModal(modal);
    }
    catch (error) {
        console.error('[serPadrinoHelpers.ts] Failed to create modal:', error);
        return;
    }
}
async function createAndSendMessagePadrinoProfile(_discordInteraction) {
    try {
        // Get inputs from modal
        const shortTextInput = _discordInteraction.fields.fields.get('ser-padrino-short-text-input').value;
        const longTextInput = _discordInteraction.fields.fields.get('ser-padrino-long-text-input').value;
        // Get user information
        const discordGuildId = _discordInteraction.guild.id;
        const discordMember = await _discordInteraction.guild.members.fetch(_discordInteraction.user.id);
        const discordMemberId = discordMember.id;
        const discordMemberName = discordMember.displayName;
        const discordMemberAvatar = discordMember.displayAvatarURL();
        // Create Padrino in db
        await createOrEditPadrinoProfile(discordGuildId, discordMemberId, shortTextInput, longTextInput);
        // Create an embed message
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x0099ff)
            .setThumbnail(discordMemberAvatar)
            .addFields({ name: 'Nombre', value: discordMemberName, inline: true }, { name: 'Resumen', value: shortTextInput, inline: false }, { name: 'Biografía', value: longTextInput, inline: false });
        // Create buttons
        const confirmButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`ser-padrino-confirm-button`)
            .setLabel('Confirmar perfil')
            .setStyle(discord_js_1.ButtonStyle.Primary);
        const editButton = new discord_js_1.ButtonBuilder()
            .setCustomId('ser-padrino-edit-button')
            .setLabel('Editar')
            .setStyle(discord_js_1.ButtonStyle.Secondary);
        const rowButtons = new discord_js_1.ActionRowBuilder().addComponents(confirmButton, editButton);
        // Send embed message
        await _discordInteraction.reply({
            content: '# Tu perfil de Padrino',
            embeds: [embed],
            components: [rowButtons],
            ephemeral: true,
        });
    }
    catch (error) {
        console.error('[serPadrinoHelpers.ts] Failed in createAndSendMessagePadrinoProfile:', error);
    }
}
async function createOrEditPadrinoProfile(_discordGuildId, _discordMemberId, _shortDescription, _longDescription) {
    try {
        // Get member from db
        const prismaMember = await cache_1.cacheService.getMemberByDiscordId(_discordGuildId, _discordMemberId);
        // Get padrino from db
        const prismaPadrino = await cache_1.cacheService.getPadrinoByMemberId(prismaMember.id);
        if (!prismaPadrino) {
            await cache_1.cacheService.createPadrino(prismaMember.id, _shortDescription, _longDescription);
        }
        else {
            await cache_1.cacheService.updatePadrino(prismaPadrino.id, _shortDescription, _longDescription);
        }
    }
    catch (error) {
        console.error('[serPadrinoHelpers.ts] Failed in createOrEditPadrinoProfile:', error);
    }
}
