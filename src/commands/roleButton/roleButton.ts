import {
  SlashCommandBuilder,
  CommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  GuildMember,
  PermissionsBitField,
} from 'discord.js';
import { Command } from '../../types/command';
import { Message as PrismaMessage, Role as PrismaRole } from '@prisma/client';
import { cacheService } from '../../services/cache';

let discordInteractionGlobal: CommandInteraction;

const roleButton: Command = {
  data: new SlashCommandBuilder()
    .setName('role-button')
    .setDescription('Configure role reactions')
    .addStringOption((option) => option.setName('button_name_1').setDescription('Button Name 1').setRequired(true))
    .addStringOption((option) => option.setName('role_id_1').setDescription('Role ID 1').setRequired(true))
    .addStringOption((option) => option.setName('button_name_2').setDescription('Button Name 2').setRequired(false))
    .addStringOption((option) => option.setName('role_id_2').setDescription('Role ID 2').setRequired(false))
    .addStringOption((option) => option.setName('button_name_3').setDescription('Button Name 3').setRequired(false))
    .addStringOption((option) =>
      option.setName('role_id_3').setDescription('Role ID 3').setRequired(false),
    ) as SlashCommandBuilder,
  execute: async (_discordInteraction: CommandInteraction) => {
    // Only admins can use this command
    if (!(_discordInteraction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator)) {
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
    const modal = new ModalBuilder().setCustomId('role-button-modal').setTitle('Personalice el texto');

    // Crete text input component
    const textInput = new TextInputBuilder()
      .setCustomId('role-button-text-input-message')
      .setLabel('Mensaje')
      .setStyle(TextInputStyle.Paragraph);

    // Create text input row
    const textInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);

    modal.addComponents(textInputRow);

    await discordInteractionGlobal.showModal(modal);
  } catch (error) {
    console.error('Failed to create modal:', error);

    return;
  }
}

export async function addButtonToMessage(_discordMessageId: string) {
  // Get the message from Discord
  const message = await discordInteractionGlobal.channel?.messages.fetch(_discordMessageId);

  // Create an array to hold the buttons
  const buttons = [];

  // Loop through the possible button names and role IDs
  for (let i = 1; i <= 3; i++) {
    const discordButtonName = discordInteractionGlobal.options.get(`button_name_${i}`, false)?.value as string;
    const discordRoleId = discordInteractionGlobal.options.get(`role_id_${i}`, false)?.value as string;
    const discordRoleName = discordInteractionGlobal.guild?.roles.cache.get(discordRoleId)?.name as string;

    // If both the button name and role ID exist, create a button
    if (discordButtonName && discordRoleId) {
      try {
        const prismaRole: PrismaRole | null = await cacheService.upsertRole(
          discordInteractionGlobal.guildId!,
          discordRoleId,
          discordRoleName,
        );

        if (!prismaRole) {
          throw new Error('Failed to create role');
        }

        await cacheService.createReactionButton(prismaRole.id, `role-button-button-${i}`);
      } catch (error) {
        console.error('Failed to create prismaRole:', error);
      }

      const button = new ButtonBuilder()
        .setCustomId(`role-button-button-${i}`)
        .setLabel(discordButtonName)
        .setStyle(ButtonStyle.Primary);

      // Add the button to the array
      buttons.push(button);
    }
  }

  // Create a row with the buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  if (message) {
    await message.edit({
      components: [row],
    });
  }
}

export default roleButton;
