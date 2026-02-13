import { Command } from '../../types/command';
import { CommandInteraction, CommandInteractionOptionResolver, GuildMember, User } from 'discord.js';
import { Member as PrismaMember, Padrino as PrismaPadrino } from '@prisma/client';
import { cacheService } from '../../services/cache';
import { SlashCommandBuilder, EmbedBuilder } from '@discordjs/builders';

const seeProfile: Command = {
  data: new SlashCommandBuilder()
    .setName('ver-perfil')
    .setDescription('Ver tu perfil del servidor.')
    .addUserOption((option) =>
      option.setName('miembro-a-ver').setDescription('Miembro que deseas ver el perfil').setRequired(false),
    ) as SlashCommandBuilder,
  execute: async (_discordInteraction: CommandInteraction) => {
    const memberToSee: User | null = (_discordInteraction.options as CommandInteractionOptionResolver).getUser(
      'miembro-a-ver',
      false,
    );

    let memberToSeeId: string;
    let prefix: string;
    if (memberToSee) {
      memberToSeeId = memberToSee.id;
      prefix = 'Su';
    } else {
      memberToSeeId = _discordInteraction.user.id;
      prefix = 'Tu';
    }

    const discordMember: GuildMember = await _discordInteraction.guild!.members.fetch(memberToSeeId);

    const prismaMember: PrismaMember | null = await cacheService.getMemberByDiscordId(
      _discordInteraction.guild?.id!,
      discordMember.id,
    );

    if (!prismaMember) {
      await _discordInteraction.reply({
        content: 'No se encontró el perfil en la base de datos.',
        ephemeral: true,
      });

      return;
    }

    // Get padrino information
    const yourPrismaPadrino: PrismaPadrino | null = await cacheService.getPadrinoByPrismaId(prismaMember.myPadrinoId!);
    let yourPrismaPadrinoMember: PrismaMember | null = null;
    if (yourPrismaPadrino) {
      yourPrismaPadrinoMember = await cacheService.getMemberByPrismaId(yourPrismaPadrino.memberId);
    }

    // Get ahijados information
    const yourPadrinoProfile: PrismaPadrino | null = await cacheService.getPadrinoByMemberId(prismaMember.id);
    let ahijadosList: string = 'Sin ahijados';
    if (yourPadrinoProfile) {
      const yourPrismaMemberAhijados: PrismaMember[] | null = await cacheService.getAhijadosByMemberId(
        yourPadrinoProfile?.id!,
      );

      ahijadosList =
        yourPrismaMemberAhijados && yourPrismaMemberAhijados.length > 0
          ? yourPrismaMemberAhijados.map((ahijado) => ahijado.discordDisplayName).join(', ')
          : 'Sin ahijados';
    }

    // Create an embed message
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setThumbnail(prismaMember.discordProfilePicture)
      .addFields(
        { name: 'Nombre', value: prismaMember.discordDisplayName, inline: false },
        { name: 'Nivel:', value: prismaMember.discordTemporalLevel.toString(), inline: true },
        { name: 'Experiencia:', value: prismaMember.discordTemporalLevelXp.toString(), inline: true },
        {
          name: prefix + ' padrino:',
          value: yourPrismaPadrinoMember ? yourPrismaPadrinoMember.discordDisplayName : 'Sin padrino',
          inline: false,
        },
        {
          name: prefix + 's ahijados:',
          value: ahijadosList,
          inline: false,
        },
      );

    // Send embed message
    try {
      await _discordInteraction.reply({
        content: '# ' + prefix + ' perfil',
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Failed to send embed message', error);
    }
  },
};

export default seeProfile;
