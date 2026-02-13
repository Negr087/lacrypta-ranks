import { Command } from '../../types/command';
import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder, EmbedBuilder } from '@discordjs/builders';
import { Member as PrismaMember } from '@prisma/client';
import { cacheService } from '../../services/cache';
import { sumXpLevel } from '../../services/temporalLevel';

const rankingLevels: Command = {
  data: new SlashCommandBuilder()
    .setName('ranking-niveles')
    .setDescription('Ver el ranking de niveles.') as SlashCommandBuilder,
  execute: async (_discordInteraction: CommandInteraction) => {
    const updateLevelSatus: boolean = await cacheService.updateMembersLevelsToDatabase();

    const topTen: PrismaMember[] | null = await cacheService.getMembersRankingTopTen(_discordInteraction.guild?.id!);

    if (!topTen) return;

    const rankingEmbed = new EmbedBuilder().setColor(0x0099ff);

    // let data: string = '';
    topTen.forEach((member: PrismaMember, index: number) => {
      if (member.discordTemporalLevelXp === 0) {
        if (index === 0) rankingEmbed.setDescription('Nadie ganó experiencia.');

        return;
      }

      // Data in rankingEmbed
      switch (index) {
        case 0:
          rankingEmbed.addFields({
            name: `:trophy: Primero`,
            value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${sumXpLevel(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
            inline: false,
          });
          break;
        case 1:
          rankingEmbed.addFields({
            name: `:second_place: Segundo`,
            value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${sumXpLevel(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
            inline: false,
          });
          break;
        case 2:
          rankingEmbed.addFields({
            name: `:third_place: Tercero`,
            value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${sumXpLevel(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
            inline: false,
          });
          break;
        default:
          rankingEmbed.addFields({
            name: `#${index + 1}`,
            value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${sumXpLevel(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
            inline: false,
          });
          break;
      }

      // Data in string
      // switch (index) {
      //   case 0:
      //     data += `# :trophy: **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
      //     break;
      //   case 1:
      //     data += `## :second_place: **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
      //     break;
      //   case 2:
      //     data += `### :third_place: **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
      //     break;
      //   default:
      //     data += `#${index + 1} **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
      //     break;
      // }
    });

    // Send rankingEmbed message
    try {
      await _discordInteraction.reply({
        content: '# Ranking de niveles\n',
        embeds: [rankingEmbed],
      });
    } catch (error) {
      console.error('Failed to send rankingEmbed message', error);
    }
  },
};

export default rankingLevels;
