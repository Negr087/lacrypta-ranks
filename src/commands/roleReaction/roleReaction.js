"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMenu = selectMenu;
exports.asignRoleToMessageReactionRole = asignRoleToMessageReactionRole;
exports.reactionToMessage = reactionToMessage;
exports.finalizeRoleReactionCommand = finalizeRoleReactionCommand;
const discord_js_1 = require("discord.js");
const cache_1 = require("../../services/cache");
// let discordMessageInstance: Message | undefined;
// let discordInteraction: CommandInteraction;
// let discordMessageId: string;
let discordInteractionGlobal;
let discordMessageIdGlobal;
const roleReaction = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('role-reaction')
        .setDescription('Configurar un nuevo rol por reacción')
        .addStringOption((option) => option
        .setName('message_id')
        .setDescription('El ID del mensaje al que se le asignará un/os rol por reacción.')
        .setRequired(true)),
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
        // Get message from Discord
        const discordMessageId = (discordMessageIdGlobal = _discordInteraction.options.getString('message_id', true));
        const discordMessageInstance = await _discordInteraction.channel.messages.fetch(discordMessageId);
        if (!discordMessageInstance) {
            await _discordInteraction.reply({
                content: 'Mensage no encontrado',
                ephemeral: true,
            });
            return;
        }
        await selectMenu();
        /// Save data to database ///
        try {
            cache_1.cacheService.createChannel(_discordInteraction.guildId, _discordInteraction.channelId);
            cache_1.cacheService.createMessage(_discordInteraction.guildId, _discordInteraction.channelId, discordMessageId, _discordInteraction.commandName);
        }
        catch (error) {
            console.error('Failed to save data to database:', error);
        }
    },
};
async function selectMenu() {
    // Get roles from discord
    const discordGuild = discordInteractionGlobal.guild;
    const guildRoles = discordGuild.roles.cache;
    // Crete select menu options
    const rolesListOptions = guildRoles.map((role) => new discord_js_1.StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id));
    // Create select menu component
    const menuComponent = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`role-reaction-select-menu-id:${discordMessageIdGlobal}`)
        .setPlaceholder('Select a role')
        .addOptions(rolesListOptions);
    // Create select menu
    const selectMenu = new discord_js_1.ActionRowBuilder().addComponents(menuComponent);
    // Check if discordInteraction is after replied
    if (!discordInteractionGlobal.replied) {
        // Send message with select menu
        await discordInteractionGlobal.reply({
            content: 'Seleccioná el rol para asignar a una reacción:',
            components: [selectMenu],
            ephemeral: true,
        });
    }
    else {
        // Create finish button
        const finishButton = new discord_js_1.ButtonBuilder()
            .setCustomId('role-reaction-finish-button')
            .setLabel('Finalizar')
            .setStyle(discord_js_1.ButtonStyle.Success);
        // Create button row
        const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(finishButton);
        await discordInteractionGlobal.editReply({
            content: 'Seleccioná el rol para asignar a una reacción:',
            components: [selectMenu, buttonRow], // TODO: sacar de la lista los roles que ya se eligieron
        });
    }
}
async function asignRoleToMessageReactionRole(_discordInteraction) {
    const discordGuildId = _discordInteraction.guildId;
    const discordChannelId = _discordInteraction.channel?.id;
    const discordMessageId = _discordInteraction.customId.split('id:')[1];
    const prismaMessage = await cache_1.cacheService.getMessageByDiscordId(discordChannelId, discordMessageId);
    const discordSelectedRoleId = _discordInteraction.values[0];
    const discordSelecteRole = _discordInteraction.guild.roles.cache.get(discordSelectedRoleId);
    if (!discordSelecteRole) {
        _discordInteraction.update({
            content: 'Rol no encontrado en el servidor',
            components: [],
        });
        return;
    }
    const selectedPrismaRole = await cache_1.cacheService.getRoleByDiscordId(discordGuildId, discordSelectedRoleId);
    if (!selectedPrismaRole) {
        await _discordInteraction.update({
            content: 'Rol no encontrado',
            components: [],
        });
        return;
    }
    cache_1.cacheService.createMessageReactionRole(discordMessageId, discordSelectedRoleId, undefined);
    await _discordInteraction.update({
        content: `Seleccionaste el rol: ${selectedPrismaRole.discordRoleName}.\n\nAñadí una reaccion al mensaje`,
        components: [],
    });
}
async function reactionToMessage(_discordMessageReaction, _discordEmojiId) {
    const discordMessageInstance = await _discordMessageReaction.message.fetch();
    if (!discordMessageInstance) {
        console.error('[roleReaction.ts] Failed to react to message:');
        return;
    }
    await discordMessageInstance.react(_discordEmojiId);
}
async function finalizeRoleReactionCommand() {
    await discordInteractionGlobal.editReply({
        content: 'Finalizado role reaction.\n\nPodés descartar este mensaje.',
        components: [],
    });
}
exports.default = roleReaction;
