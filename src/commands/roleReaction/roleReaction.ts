import {
  SlashCommandBuilder,
  CommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Message,
  ButtonBuilder,
  ButtonStyle,
  CommandInteractionOptionResolver,
  StringSelectMenuInteraction,
  Role,
  MessageReaction,
  Guild,
  Collection,
  GuildMember,
  PermissionsBitField,
} from 'discord.js';
import { Command } from './../../types/command';
import { cacheService } from '../../services/cache';
import {
  MessageReactionRole as PrismaMessageReactionRole,
  Message as PrismaMessage,
  Role as PrismaRole,
} from '@prisma/client';
import { RolesIndex } from '../../types/cache';

// let discordMessageInstance: Message | undefined;
// let discordInteraction: CommandInteraction;
// let discordMessageId: string;

let discordInteractionGlobal: CommandInteraction;
let discordMessageIdGlobal: string;

const roleReaction: Command = {
  data: new SlashCommandBuilder()
    .setName('role-reaction')
    .setDescription('Configurar un nuevo rol por reacción')
    .addStringOption((option) =>
      option
        .setName('message_id')
        .setDescription('El ID del mensaje al que se le asignará un/os rol por reacción.')
        .setRequired(true),
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
    // Get message from Discord
    const discordMessageId: string = (discordMessageIdGlobal = (
      _discordInteraction.options as CommandInteractionOptionResolver
    ).getString('message_id', true));

    const discordMessageInstance: Message = await _discordInteraction.channel!.messages.fetch(discordMessageId);
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
      cacheService.createChannel(_discordInteraction.guildId!, _discordInteraction.channelId!);
      cacheService.createMessage(
        _discordInteraction.guildId!,
        _discordInteraction.channelId!,
        discordMessageId,
        _discordInteraction.commandName!,
      );
    } catch (error) {
      console.error('Failed to save data to database:', error);
    }
  },
};

export async function selectMenu() {
  // Get roles from discord
  const discordGuild: Guild = discordInteractionGlobal.guild!;
  const guildRoles: Collection<string, Role> = discordGuild.roles.cache;

  // Crete select menu options

  const rolesListOptions: StringSelectMenuOptionBuilder[] = guildRoles.map((role: Role) =>
    new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.id),
  );

  // Create select menu component
  const menuComponent: StringSelectMenuBuilder = new StringSelectMenuBuilder()
    .setCustomId(`role-reaction-select-menu-id:${discordMessageIdGlobal}`)
    .setPlaceholder('Select a role')
    .addOptions(rolesListOptions);

  // Create select menu
  const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menuComponent);

  // Check if discordInteraction is after replied
  if (!discordInteractionGlobal.replied) {
    // Send message with select menu
    await discordInteractionGlobal.reply({
      content: 'Seleccioná el rol para asignar a una reacción:',
      components: [selectMenu],
      ephemeral: true,
    });
  } else {
    // Create finish button
    const finishButton = new ButtonBuilder()
      .setCustomId('role-reaction-finish-button')
      .setLabel('Finalizar')
      .setStyle(ButtonStyle.Success);

    // Create button row
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(finishButton);

    await discordInteractionGlobal.editReply({
      content: 'Seleccioná el rol para asignar a una reacción:',
      components: [selectMenu, buttonRow], // TODO: sacar de la lista los roles que ya se eligieron
    });
  }
}

export async function asignRoleToMessageReactionRole(_discordInteraction: StringSelectMenuInteraction) {
  const discordGuildId: string = _discordInteraction.guildId!;
  const discordChannelId: string | undefined = _discordInteraction.channel?.id;
  const discordMessageId: string | undefined = _discordInteraction.customId.split('id:')[1];

  const prismaMessage: PrismaMessage | null = await cacheService.getMessageByDiscordId(
    discordChannelId!,
    discordMessageId!,
  );

  const discordSelectedRoleId: string = _discordInteraction.values[0]!;
  const discordSelecteRole: Role | undefined = _discordInteraction.guild!.roles.cache.get(discordSelectedRoleId);

  if (!discordSelecteRole) {
    _discordInteraction.update({
      content: 'Rol no encontrado en el servidor',
      components: [],
    });

    return;
  }

  const selectedPrismaRole: PrismaRole | null = await cacheService.getRoleByDiscordId(
    discordGuildId,
    discordSelectedRoleId,
  );

  if (!selectedPrismaRole) {
    await _discordInteraction.update({
      content: 'Rol no encontrado',
      components: [],
    });

    return;
  }

  cacheService.createMessageReactionRole(discordMessageId!, discordSelectedRoleId, undefined);

  await _discordInteraction.update({
    content: `Seleccionaste el rol: ${selectedPrismaRole.discordRoleName}.\n\nAñadí una reaccion al mensaje`,
    components: [],
  });
}

export async function reactionToMessage(_discordMessageReaction: MessageReaction, _discordEmojiId: string) {
  const discordMessageInstance: Message | undefined = await _discordMessageReaction.message.fetch();

  if (!discordMessageInstance) {
    console.error('[roleReaction.ts] Failed to react to message:');

    return;
  }

  await discordMessageInstance.react(_discordEmojiId);
}
export async function finalizeRoleReactionCommand() {
  await discordInteractionGlobal.editReply({
    content: 'Finalizado role reaction.\n\nPodés descartar este mensaje.',
    components: [],
  });
}

export default roleReaction;
