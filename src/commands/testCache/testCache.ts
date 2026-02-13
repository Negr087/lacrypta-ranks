import { cacheService } from '../../services/cache';
import { PadrinoIndex } from '../../types/cache';
import { Padrino as PrismaPadrino } from '@prisma/client';
import { Command } from '../../types/command';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

const testCache: Command = {
  data: new SlashCommandBuilder().setName('test-cache').setDescription('Para testear el cache') as SlashCommandBuilder,
  execute: async (_discordInteraction: CommandInteraction) => {
    const padrinosIndex: PadrinoIndex | null = await cacheService.getAllPadrinos();

    if (!padrinosIndex) {
      _discordInteraction.reply({
        content: `# Padrinos Index\nvacio`,
      });
    }

    // make a string of padrinos
    let padrinosData: string = '';
    for (const [prismaMemberId, prismaPadrino] of Object.entries(padrinosIndex!)) {
      padrinosData += '`' + prismaPadrino.memberId + '` - ' + prismaPadrino.shortDescription + '\n';
    }

    _discordInteraction.reply({
      content: `# Padrinos Index\n**prismaPadrino.memberId** | **prismaPadrino.shortDescription**\n${padrinosData}`,
    });
  },
};

export default testCache;
