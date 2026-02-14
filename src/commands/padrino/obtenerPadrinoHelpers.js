"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSelectPadrino = createSelectPadrino;
const discord_js_1 = require("discord.js");
const builders_1 = require("@discordjs/builders");
const cache_1 = require("../../services/cache");
async function createSelectPadrino(_discordInteraction, _selectedPadrinoMemberId) {
    try {
        const discordUserIdInvokedIt = _discordInteraction.user.id;
        const discordGuildId = _discordInteraction.guildId;
        const prismaPadrinosIndex = await cache_1.cacheService.getAllPadrinos();
        if (!prismaPadrinosIndex) {
            _discordInteraction.channel?.send('# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed in getAllPadrinos()'); // debug
            throw new Error('Failed in getAllPadrinos()');
        }
        // Crete select menu options
        const prismaMemberInvokedIt = await cache_1.cacheService.getMemberByDiscordId(discordGuildId, discordUserIdInvokedIt);
        if (!prismaMemberInvokedIt) {
            _discordInteraction.channel?.send('# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed in getMemberByDiscordId()'); // debug
            throw new Error('Failed in getMemberByDiscordId()');
        }
        const roleOptions = [];
        console.info('prismaPadrinosIndex: ', prismaPadrinosIndex); // debug
        console.log();
        for (const [prismaMemberId, prismaPadrino] of Object.entries(prismaPadrinosIndex)) {
            if (prismaMemberId === prismaMemberInvokedIt?.id) {
                continue;
            }
            const prismaMemberOfPadrino = await cache_1.cacheService.getMemberByPrismaId(prismaMemberId);
            if (!prismaMemberOfPadrino) {
                _discordInteraction.channel?.send('# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed in getMemberByPrismaId()\nMiembro:' +
                    prismaMemberId); // debug
                throw new Error('Failed in getMemberByPrismaId()');
            }
            roleOptions.push(new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(prismaMemberOfPadrino.discordDisplayName + ' - ' + prismaPadrino.shortDescription)
                .setValue(prismaMemberId));
        }
        if (roleOptions.length === 0) {
            // Send message
            await _discordInteraction.reply({
                content: 'No hay padrinos disponibles. :pensive:',
                components: [],
                ephemeral: true,
            });
            _discordInteraction.channel?.send('# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() No padrinos found'); // debug
            throw new Error('[No padrinos found');
        }
        // Create select menu component
        const menuComponent = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('obtener-padrino-select-menu')
            .setPlaceholder('Seleccioná tu padrino')
            .addOptions(roleOptions);
        // Create select menu
        const selectMenu = new discord_js_1.ActionRowBuilder().addComponents(menuComponent);
        // Check if _discordInteraction is after replied
        if (_discordInteraction.type === discord_js_1.InteractionType.ApplicationCommand) {
            // Send message
            await _discordInteraction.reply({
                content: '# Elegí tu padrino:',
                components: [selectMenu],
                ephemeral: true,
            });
        }
        else if (_discordInteraction.type === discord_js_1.InteractionType.MessageComponent) {
            // Create buttons
            const confirmButton = new discord_js_1.ButtonBuilder()
                .setCustomId(`obtener-padrino-confirm-button-id:${prismaPadrinosIndex[_selectedPadrinoMemberId].id}`)
                .setLabel('Confirmar padrino')
                .setStyle(discord_js_1.ButtonStyle.Primary);
            const rowButtons = new discord_js_1.ActionRowBuilder().addComponents(confirmButton);
            const embed = await createPadrinoEmbed(prismaPadrinosIndex[_selectedPadrinoMemberId]);
            if (!embed) {
                _discordInteraction.channel?.send('# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed embed null'); // debug
                throw new Error('Failed embed null');
            }
            await _discordInteraction.update({
                content: '# Confrimá tu padrino o seleccioná otro.',
                embeds: [embed],
                components: [selectMenu, rowButtons],
            });
        }
    }
    catch (error) {
        console.error('[obtenerPadrinoHelpers.ts] createSelectPadrino():', error);
    }
}
async function createPadrinoEmbed(_prismaPadrino) {
    try {
        const prismaMemberOfPadrino = await cache_1.cacheService.getMemberByPrismaId(_prismaPadrino.memberId);
        if (!prismaMemberOfPadrino) {
            throw new Error('Failed in getMemberByPrismaId()');
        }
        // Create an embed message
        const embed = new builders_1.EmbedBuilder()
            .setColor(0x0099ff)
            .setThumbnail(prismaMemberOfPadrino.discordProfilePicture)
            .addFields({ name: 'Nombre', value: prismaMemberOfPadrino.discordDisplayName, inline: true }, { name: 'Resumen', value: _prismaPadrino.shortDescription, inline: false }, { name: 'Biografía', value: _prismaPadrino.longDescription, inline: false });
        return embed;
    }
    catch (error) {
        console.error('[obtenerPadrinoHelpers.ts] createPadrinoEmbed():', error);
        return null;
    }
}
