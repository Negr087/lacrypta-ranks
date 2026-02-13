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

const event: BotEvent = {
  name: 'interactionCreate',
  once: false,
  execute: async (interaction: Interaction) => {
    const client = interaction.client as ExtendedClient;

    /////////////////////
    /// Slash Command ///
    /////////////////////
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName); // Get command from collection
      if (!command) return; // If command doesn't exist, return
      command.execute(interaction); // If command exist, execute it
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
      if (interaction.customId === 'obtener-padrino-select-menu') {
        // Get selected padrino
        const selectedPadrinoMemberId: string = interaction.values[0]!;

        await createSelectPadrino(interaction, selectedPadrinoMemberId);
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
          const channelId: string = interaction.channelId!;
          const channel: GuildBasedChannel | undefined = interaction.guild!.channels.cache.get(channelId);
          const textInputMessage: string = interaction.fields.fields.first()!.value!;

          // Send message
          if (channel?.type === ChannelType.GuildText) {
            try {
              await interaction.deferUpdate(); // Acknowledge the interaction
            } catch (error) {
              console.error('Failed defer modal message', error);
            }

            const discordMessageInstance: Message = await channel!.send(textInputMessage);

            await addButtonToMessage(discordMessageInstance.id);
          }
        }
      } /// End Of /role-button ///

      /// /ser-padrino ///
      if (interaction.customId === 'ser-padrino-modal') {
        await createAndSendMessagePadrinoProfile(interaction);
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

export default event;
