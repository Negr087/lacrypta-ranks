import { Command } from '../../types/command';
import { SlashCommandBuilder, CommandInteraction, GuildMember } from 'discord.js';
import { modalMenu } from './serPadrinoHelpers';
import { prisma } from '../../services/prismaClient';

const serPadrino: Command = {
  data: new SlashCommandBuilder().setName('ser-padrino').setDescription('Quiero ser un padrino!'),
  execute: async (discordInteraction: CommandInteraction) => {
    const userId: string = discordInteraction.user.id;
    const member: GuildMember | undefined = await discordInteraction.guild?.members.fetch(userId);

    const memberRoles = member?.roles.cache.map((role) => role.name);

    // Only someone Merito can be padrino
    const roleMeritoId: string | null | undefined = await prisma.guild
      .findUnique({
        where: {
          discordGuildId: discordInteraction.guildId!,
        },
      })
      .then((guild) => guild?.padrinoMeritoRoleId);
    if (!roleMeritoId) {
      await discordInteraction.reply({
        content: 'No se ha configurado el comando, **avisale a un administrador**.',
        ephemeral: true,
      });

      return;
    }
    const roleMerito = await discordInteraction.guild?.roles.fetch(roleMeritoId!);

    if (!memberRoles?.includes(roleMerito!.name)) {
      await discordInteraction.reply({ content: `Se necesita <@&${roleMeritoId}> para ser padrino`, ephemeral: true });

      return;
    }

    await modalMenu(discordInteraction);

    return;
  },
};

export default serPadrino;
