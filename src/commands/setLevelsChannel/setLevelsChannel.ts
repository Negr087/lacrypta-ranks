import { prisma } from '../../services/prismaClient';
import { Command } from '../../types/command';
import {
  SlashCommandBuilder,
  CommandInteraction,
  CommandInteractionOptionResolver,
  GuildBasedChannel,
  TextChannel,
  GuildMember,
  PermissionsBitField,
} from 'discord.js';

const setLevelsChannel: Command = {
  data: new SlashCommandBuilder()
    .setName('set-levels-channel')
    .setDescription('Establecer canal donde se enviarán los mensajes de nivel')
    .addChannelOption((option) =>
      option.setName('canal').setDescription('Canal donde se enviarán los mensajes de nivel').setRequired(true),
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

    const discordChannelId: string = (_discordInteraction.options as CommandInteractionOptionResolver).getChannel(
      'canal',
      true,
    ).id;

    const channel: GuildBasedChannel | undefined = _discordInteraction.guild?.channels.cache.get(discordChannelId);

    if (!channel) {
      _discordInteraction.reply({
        content: 'Canal no encontrado',
        ephemeral: true,
      });
      return;
    }

    if (channel.isTextBased()) {
      await (channel as TextChannel).send('En este canal se enviarán las actualizaciones de niveles');
    } else {
      _discordInteraction.reply({
        content: 'El canal seleccionado no es un canal de texto.',
        ephemeral: true,
      });

      return;
    }

    _discordInteraction.reply({
      content: `Canal de niveles establecido en <#${channel.id}>`,
      ephemeral: true,
    });

    // Save to database
    await prisma.guild.update({
      where: {
        discordGuildId: _discordInteraction.guildId!,
      },
      data: {
        levelsChannelId: discordChannelId,
      },
    });
  },
};

export default setLevelsChannel;
