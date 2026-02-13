import {
  CommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
} from 'discord.js';
import { Member as PrismaMember, Padrino as PrismaPadrino } from '@prisma/client';
import { cacheService } from '../../services/cache';

async function modalMenu(discordInteraction: CommandInteraction | ButtonInteraction) {
  try {
    const modal = new ModalBuilder().setCustomId('ser-padrino-modal').setTitle('Personalizá tu perfil');

    // Crete text input component
    const shortTextInput = new TextInputBuilder()
      .setCustomId('ser-padrino-short-text-input')
      .setLabel('Resumen')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(150)
      .setPlaceholder('Contá en pocas palabras quién sos');
    const longTextInput = new TextInputBuilder()
      .setCustomId('ser-padrino-long-text-input')
      .setLabel('Biografía')
      .setPlaceholder('Contá un poco sobre vos')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1024);

    // Create text input row
    const shortTextInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(shortTextInput);
    const longTextInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(longTextInput);

    modal.addComponents(shortTextInputRow, longTextInputRow);

    await discordInteraction.showModal(modal);
  } catch (error) {
    console.error('[serPadrinoHelpers.ts] Failed to create modal:', error);

    return;
  }
}

async function createAndSendMessagePadrinoProfile(_discordInteraction: ModalSubmitInteraction) {
  try {
    // Get inputs from modal
    const shortTextInput: string = _discordInteraction.fields.fields.get('ser-padrino-short-text-input')!.value!;
    const longTextInput: string = _discordInteraction.fields.fields.get('ser-padrino-long-text-input')!.value!;

    // Get user information
    const discordGuildId: string = _discordInteraction.guild!.id;
    const discordMember: GuildMember = await _discordInteraction.guild!.members.fetch(_discordInteraction.user.id);
    const discordMemberId: string = discordMember.id;
    const discordMemberName: string = discordMember.displayName;
    const discordMemberAvatar: string = discordMember.displayAvatarURL();

    // Create Padrino in db
    await createOrEditPadrinoProfile(discordGuildId, discordMemberId, shortTextInput, longTextInput);

    // Create an embed message
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setThumbnail(discordMemberAvatar!)
      .addFields(
        { name: 'Nombre', value: discordMemberName, inline: true },
        { name: 'Resumen', value: shortTextInput, inline: false },
        { name: 'Biografía', value: longTextInput, inline: false },
      );

    // Create buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId(`ser-padrino-confirm-button`)
      .setLabel('Confirmar perfil')
      .setStyle(ButtonStyle.Primary);
    const editButton = new ButtonBuilder()
      .setCustomId('ser-padrino-edit-button')
      .setLabel('Editar')
      .setStyle(ButtonStyle.Secondary);
    const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, editButton);

    // Send embed message
    await _discordInteraction.reply({
      content: '# Tu perfil de Padrino',
      embeds: [embed],
      components: [rowButtons],
      ephemeral: true,
    });
  } catch (error) {
    console.error('[serPadrinoHelpers.ts] Failed in createAndSendMessagePadrinoProfile:', error);
  }
}

async function createOrEditPadrinoProfile(
  _discordGuildId: string,
  _discordMemberId: string,
  _shortDescription: string,
  _longDescription: string,
) {
  try {
    // Get member from db
    const prismaMember: PrismaMember | null = await cacheService.getMemberByDiscordId(
      _discordGuildId,
      _discordMemberId,
    );

    // Get padrino from db
    const prismaPadrino: PrismaPadrino | null = await cacheService.getPadrinoByMemberId(prismaMember!.id);

    if (!prismaPadrino) {
      await cacheService.createPadrino(prismaMember!.id, _shortDescription, _longDescription);
    } else {
      await cacheService.updatePadrino(prismaPadrino.id, _shortDescription, _longDescription);
    }
  } catch (error) {
    console.error('[serPadrinoHelpers.ts] Failed in createOrEditPadrinoProfile:', error);
  }
}

export { modalMenu, createAndSendMessagePadrinoProfile };
