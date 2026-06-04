import { ChannelType, GuildBasedChannel, Interaction, Message, Role } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import { ExtendedClient } from '../types/discordClient';
import { prisma } from '../services/prismaClient';
import { Role as PrismaRole, ReactionButton } from '@prisma/client';
import { asignRoleToMessageReactionRole, finalizeRoleReactionCommand } from '../commands/roleReaction/roleReaction';
import { addButtonToMessage } from '../commands/roleButton/roleButton';
import { createAndSendMessagePadrinoProfile, modalMenu } from '../commands/padrino/serPadrinoHelpers';
import { createSelectPadrino } from '../commands/padrino/obtenerPadrinoHelpers';
import { cacheService } from '../services/cache';
import { cerrarVotacion, generarEmbedJurado } from '../services/juryService';

const event: BotEvent = {
  name: 'interactionCreate',
  once: false,
  execute: async (interaction: Interaction) => {
    const client = interaction.client as ExtendedClient;

    /////////////////////
    /// Slash Command ///
    /////////////////////
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      command.execute(interaction);
    }

    //////////////
    /// Button ///
    //////////////
    else if (interaction.isButton()) {
      /// /role-rection ///
      if (interaction.customId === 'role-reaction-finish-button') {
        finalizeRoleReactionCommand();
      } /// End Of /role-rection ///

      /// /role-button-commnad ///
      if (interaction.customId.startsWith('role-button-button-')) {
        const buttonId: string = interaction.customId;
        let prismaRole: PrismaRole[] | undefined;

        try {
          const prismaReactionButton: ReactionButton[] | undefined = await prisma.reactionButton.findMany({
            where: {
              discordButtonId: buttonId,
            },
          });
          prismaRole = await prisma.role.findMany({
            where: {
              id: prismaReactionButton[0]!.roleId,
            },
          });
        } catch (error) {
          console.error('Failed to get role from database:', error);
        }

        if (prismaRole) {
          const role: Role | undefined = interaction.guild!.roles.cache.get(prismaRole[0]!.discordRoleId);

          if (role) {
            const member = interaction.guild?.members.cache.get(interaction.user.id);
            if (member) {
              if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);

                await interaction.reply({
                  content: `Te eliminaste el rol: ${role.name}`,
                  ephemeral: true,
                });
              } else {
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

      /// /jurado - voto a favor ///
      if (interaction.customId.startsWith('jury_vote_for_')) {
        const juryId = interaction.customId.replace('jury_vote_for_', '');
        await procesarVoto(interaction, juryId, 'for');
      }

      /// /jurado - voto en contra ///
      if (interaction.customId.startsWith('jury_vote_against_')) {
        const juryId = interaction.customId.replace('jury_vote_against_', '');
        await procesarVoto(interaction, juryId, 'against');
      }

      /// /jurado - cerrar ///
      if (interaction.customId.startsWith('jury_close_')) {
        const juryId = interaction.customId.replace('jury_close_', '');
        const jury = await prisma.jury.findUnique({ where: { id: juryId } });
        if (!jury) {
          await interaction.reply({ content: 'Votación no encontrada.', ephemeral: true });
          return;
        }
        if (jury.initiatorId !== interaction.user.id) {
          await interaction.reply({
            content: 'Solo quien inició la votación puede cerrarla.',
            ephemeral: true,
          });
          return;
        }
        if (jury.status !== 'active') {
          await interaction.reply({ content: 'La votación ya está cerrada.', ephemeral: true });
          return;
        }
        await interaction.deferUpdate();
        await cerrarVotacion(interaction.client, juryId);
      }

      /// /ser-padrino ///
      if (interaction.customId === 'ser-padrino-edit-button') {
        await modalMenu(interaction);
      }

      if (interaction.customId === 'ser-padrino-confirm-button') {
        await interaction.update({
          content: '# Tu perfil de Padrino está confirmado :white_check_mark:',
          components: [],
        });
      } /// End Of /ser-padrino ///

      /// /obtener-padrino ///
      if (interaction.customId.startsWith('obtener-padrino-confirm-button-id:')) {
        const prismaPadrinoId: string = interaction.customId.split(':')[1]!;

        await cacheService.updatePadrinoOfMember(interaction.user.id, prismaPadrinoId);

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
        asignRoleToMessageReactionRole(interaction);
      } /// End Of /role-rection-commnad ///

      /// /obtener-padrino ///
      if (interaction.customId === 'obt
