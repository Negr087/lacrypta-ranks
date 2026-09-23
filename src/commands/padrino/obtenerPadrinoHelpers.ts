import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  InteractionType,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from 'discord.js';
import { Padrino as PrismaPadrino, Member as PrismaMember } from '@prisma/client';
import { EmbedBuilder } from '@discordjs/builders';
import { cacheService } from '../../services/cache';
import { prisma } from '../../services/prismaClient';

// Detecta si asignar padrinoMemberId al miembro invocante generaría un ciclo
async function generariaCiclo(memberInvocanteId: string, padrinoMemberId: string): Promise<boolean> {
  // Regla básica: no puede ser su propio padrino
  if (memberInvocanteId === padrinoMemberId) return true;

  // Recorremos la cadena hacia arriba desde el potencial padrino
  // Si en la cadena aparece el miembro invocante, hay ciclo
  let actualId: string | null = padrinoMemberId;
  const visitados = new Set<string>();
  let saltos = 0;
  const MAX_SALTOS = 100; // safety net

  while (actualId && saltos < MAX_SALTOS) {
    if (visitados.has(actualId)) break; // ya hay un ciclo preexistente, cortamos
    visitados.add(actualId);

    // Buscar el padrino del actual
    const actualMember = await prisma.member.findUnique({
      where: { id: actualId },
    });
    if (!actualMember || !actualMember.myPadrinoId) break;

    // myPadrinoId apunta al ID del PADRINO (registro Padrino), no al member.
    // Necesitamos el memberId del padrino
    const padrinoRecord = await prisma.padrino.findUnique({
      where: { id: actualMember.myPadrinoId },
    });
    if (!padrinoRecord) break;

    if (padrinoRecord.memberId === memberInvocanteId) return true; // CICLO detectado

    actualId = padrinoRecord.memberId;
    saltos++;
  }

  return false;
}

async function createSelectPadrino(
  _discordInteraction: CommandInteraction | StringSelectMenuInteraction,
  _selectedPadrinoMemberId?: string,
) {
  try {
    const discordUserIdInvokedIt: string = _discordInteraction.user.id;
    const discordGuildId: string = _discordInteraction.guildId!;

    // Obtener member del invocante
    const prismaMemberInvokedIt: PrismaMember | null = await cacheService.getMemberByDiscordId(
      discordGuildId,
      discordUserIdInvokedIt,
    );

    if (!prismaMemberInvokedIt) {
      const reply = {
        content: 'No pude identificarte en la base de datos. Escribí un mensaje primero y volvé a intentar.',
        flags: MessageFlags.Ephemeral,
      };
      if (_discordInteraction.type === InteractionType.ApplicationCommand) {
        await _discordInteraction.reply(reply);
      }
      return;
    }

    // Verificar si ya tiene padrino (regla 2: un solo padrino)
    if (prismaMemberInvokedIt.myPadrinoId) {
      const padrinoActual = await prisma.padrino.findUnique({
        where: { id: prismaMemberInvokedIt.myPadrinoId },
      });
      if (padrinoActual) {
        const memberPadrino = await cacheService.getMemberByPrismaId(padrinoActual.memberId);
        const nombre = memberPadrino?.discordDisplayName ?? 'un padrino';
        const reply = {
          content: `Ya tenés un padrino asignado: **${nombre}**.\nNo se puede cambiar libremente (regla 11 del reglamento).`,
          flags: MessageFlags.Ephemeral,
        };
        if (_discordInteraction.type === InteractionType.ApplicationCommand) {
          await _discordInteraction.reply(reply);
        }
        return;
      }
    }

    // Traer todos los padrinos
    const prismaPadrinosIndex = await cacheService.getAllPadrinos();

    if (!prismaPadrinosIndex) {
      const reply = { content: 'No pude cargar los padrinos disponibles.', flags: MessageFlags.Ephemeral };
      if (_discordInteraction.type === InteractionType.ApplicationCommand) {
        await _discordInteraction.reply(reply);
      }
      return;
    }

    // Filtrar padrinos disponibles según el reglamento
    const roleOptions: StringSelectMenuOptionBuilder[] = [];
    const padrinosValidosIndex: { [key: string]: PrismaPadrino } = {};

    for (const [prismaMemberId, prismaPadrino] of Object.entries(prismaPadrinosIndex)) {
      if (!prismaPadrino) continue;

      // Regla: no podés ser tu propio padrino
      if (prismaMemberId === prismaMemberInvokedIt.id) continue;

      // Regla 3: un solo ahijado por padrino → si ya tiene ahijado, no aparece
      const ahijados = await prisma.member.count({
        where: { myPadrinoId: prismaPadrino.id },
      });
      if (ahijados >= 1) continue;

      // Regla 5, 6, 7: no debe generar ciclo
      const hayCiclo = await generariaCiclo(prismaMemberInvokedIt.id, prismaMemberId);
      if (hayCiclo) continue;

      // Obtener info del padrino
      const prismaMemberOfPadrino = await cacheService.getMemberByPrismaId(prismaMemberId);
      if (!prismaMemberOfPadrino) continue;

      const label = `${prismaMemberOfPadrino.discordDisplayName} - ${prismaPadrino.shortDescription}`.slice(0, 100);
      roleOptions.push(
        new StringSelectMenuOptionBuilder().setLabel(label).setValue(prismaMemberId),
      );
      padrinosValidosIndex[prismaMemberId] = prismaPadrino;
    }

    if (roleOptions.length === 0) {
      const reply = {
        content: 'No hay padrinos disponibles en este momento.\nEsto puede pasar porque todos ya tienen un ahijado, o porque no se puede armar una cadena válida sin generar ciclos.',
        flags: MessageFlags.Ephemeral,
      };
      if (_discordInteraction.type === InteractionType.ApplicationCommand) {
        await _discordInteraction.reply(reply);
      }
      return;
    }

    // Create select menu component
    const menuComponent = new StringSelectMenuBuilder()
      .setCustomId('obtener-padrino-select-menu')
      .setPlaceholder('Seleccioná tu padrino')
      .addOptions(roleOptions);

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuComponent);

    if (_discordInteraction.type === InteractionType.ApplicationCommand) {
      await _discordInteraction.reply({
        content: '# Elegí tu padrino:',
        components: [selectMenu],
        flags: MessageFlags.Ephemeral,
      });
    } else if (_discordInteraction.type === InteractionType.MessageComponent) {
      const padrinoSeleccionado = padrinosValidosIndex[_selectedPadrinoMemberId!];
      if (!padrinoSeleccionado) {
        await _discordInteraction.update({
          content: 'El padrino seleccionado ya no está disponible. Refrescá el menú.',
          components: [],
          embeds: [],
        });
        return;
      }

      const confirmButton = new ButtonBuilder()
        .setCustomId(`obtener-padrino-confirm-button-id:${padrinoSeleccionado.id}`)
        .setLabel('Confirmar padrino')
        .setStyle(ButtonStyle.Primary);
      const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

      const embed = await createPadrinoEmbed(padrinoSeleccionado);
      if (!embed) {
        await _discordInteraction.update({
          content: 'No pude generar la vista del padrino. Probá de nuevo.',
          components: [],
        });
        return;
      }

      await _discordInteraction.update({
        content: '# Confirmá tu padrino o seleccioná otro.',
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
