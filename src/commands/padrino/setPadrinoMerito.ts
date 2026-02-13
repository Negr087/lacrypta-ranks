import { prisma } from '../../services/prismaClient';
import { Command } from '../../types/command';
import {
  SlashCommandBuilder,
  CommandInteraction,
  CommandInteractionOptionResolver,
  Role,
  PermissionsBitField,
  GuildMember,
} from 'discord.js';

const setPadrinoMerito: Command = {
  data: new SlashCommandBuilder()
    .setName('set-padrino-merito')
    .setDescription('Establecer el rol minimo para poder ser padrino')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Rol que necesita un padrino').setRequired(true),
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

    const discordRoleId: string = (_discordInteraction.options as CommandInteractionOptionResolver).getRole(
      'role',
      true,
    ).id;

    const discordRole: Role | undefined = _discordInteraction.guild?.roles.cache.get(discordRoleId);

    if (!discordRole) {
      _discordInteraction.reply({
        content: 'Rol no encontrado',
        ephemeral: true,
      });

      return;
    }

    await _discordInteraction.reply({
      content: `Rol <@&${discordRole.id}> establecido como minimo para ser padrino`,
      ephemeral: true,
    });

    // Save to database
    await prisma.guild.update({
      where: {
        discordGuildId: _discordInteraction.guildId!,
      },
      data: {
        padrinoMeritoRoleId: discordRoleId,
      },
    });
  },
};

export default setPadrinoMerito;
