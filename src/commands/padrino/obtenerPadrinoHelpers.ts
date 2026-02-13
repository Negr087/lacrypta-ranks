import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  Embed,
  InteractionType,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Padrino as PrismaPadrino, Member as PrismaMember } from '@prisma/client';
import { EmbedBuilder } from '@discordjs/builders';
import { cacheService } from '../../services/cache';
import { PadrinoIndex } from '../../types/cache';

async function createSelectPadrino(
  _discordInteraction: CommandInteraction | StringSelectMenuInteraction,
  _selectedPadrinoMemberId?: string,
) {
  try {
    const discordUserIdInvokedIt: string = _discordInteraction.user.id;
    const discordGuildId: string = _discordInteraction.guildId!;

    const prismaPadrinosIndex: PadrinoIndex | null = await cacheService.getAllPadrinos();

    if (!prismaPadrinosIndex) {
      _discordInteraction.channel?.send(
        '# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed in getAllPadrinos()',
      ); // debug

      throw new Error('Failed in getAllPadrinos()');
    }

    // Crete select menu options
    const prismaMemberInvokedIt: PrismaMember | null = await cacheService.getMemberByDiscordId(
      discordGuildId,
      discordUserIdInvokedIt,
    );

    if (!prismaMemberInvokedIt) {
      _discordInteraction.channel?.send(
        '# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed in getMemberByDiscordId()',
      ); // debug

      throw new Error('Failed in getMemberByDiscordId()');
    }

    const roleOptions: StringSelectMenuOptionBuilder[] = [];

    console.info('prismaPadrinosIndex: ', prismaPadrinosIndex); // debug
    console.log();

    for (const [prismaMemberId, prismaPadrino] of Object.entries(prismaPadrinosIndex)) {
      if (prismaMemberId === prismaMemberInvokedIt?.id) {
        continue;
      }

      const prismaMemberOfPadrino = await cacheService.getMemberByPrismaId(prismaMemberId);

      if (!prismaMemberOfPadrino) {
        _discordInteraction.channel?.send(
          '# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed in getMemberByPrismaId()\nMiembro:' +
            prismaMemberId,
        ); // debug

        throw new Error('Failed in getMemberByPrismaId()');
      }

      roleOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(prismaMemberOfPadrino.discordDisplayName + ' - ' + prismaPadrino.shortDescription)
          .setValue(prismaMemberId),
      );
    }

    if (roleOptions.length === 0) {
      // Send message
      await _discordInteraction.reply({
        content: 'No hay padrinos disponibles. :pensive:',
        components: [],
        ephemeral: true,
      });

      _discordInteraction.channel?.send(
        '# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() No padrinos found',
      ); // debug

      throw new Error('[No padrinos found');
    }

    // Create select menu component
    const menuComponent: StringSelectMenuBuilder = new StringSelectMenuBuilder()
      .setCustomId('obtener-padrino-select-menu')
      .setPlaceholder('Seleccioná tu padrino')
      .addOptions(roleOptions);

    // Create select menu
    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuComponent);

    // Check if _discordInteraction is after replied
    if (_discordInteraction.type === InteractionType.ApplicationCommand) {
      // Send message
      await _discordInteraction.reply({
        content: '# Elegí tu padrino:',
        components: [selectMenu],
        ephemeral: true,
      });
    } else if (_discordInteraction.type === InteractionType.MessageComponent) {
      // Create buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId(`obtener-padrino-confirm-button-id:${prismaPadrinosIndex[_selectedPadrinoMemberId!].id}`)
        .setLabel('Confirmar padrino')
        .setStyle(ButtonStyle.Primary);
      const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

      const embed: EmbedBuilder | null = await createPadrinoEmbed(prismaPadrinosIndex[_selectedPadrinoMemberId!]);

      if (!embed) {
        _discordInteraction.channel?.send(
          '# :x: Error\n[obtenerPadrinoHelpers.ts] createSelectPadrino() Failed embed null',
        ); // debug

        throw new Error('Failed embed null');
      }

      await _discordInteraction.update({
        content: '# Confrimá tu padrino o seleccioná otro.',
        embeds: [embed],
        components: [selectMenu, rowButtons],
      });
    }
  } catch (error) {
    console.error('[obtenerPadrinoHelpers.ts] createSelectPadrino():', error);
  }
}

async function createPadrinoEmbed(_prismaPadrino: PrismaPadrino): Promise<EmbedBuilder | null> {
  try {
    const prismaMemberOfPadrino: PrismaMember | null = await cacheService.getMemberByPrismaId(_prismaPadrino.memberId);

    if (!prismaMemberOfPadrino) {
      throw new Error('Failed in getMemberByPrismaId()');
    }

    // Create an embed message
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setThumbnail(prismaMemberOfPadrino.discordProfilePicture)
      .addFields(
        { name: 'Nombre', value: prismaMemberOfPadrino.discordDisplayName, inline: true },
        { name: 'Resumen', value: _prismaPadrino.shortDescription, inline: false },
        { name: 'Biografía', value: _prismaPadrino.longDescription, inline: false },
      );

    return embed;
  } catch (error) {
    console.error('[obtenerPadrinoHelpers.ts] createPadrinoEmbed():', error);

    return null;
  }
}

export { createSelectPadrino };
