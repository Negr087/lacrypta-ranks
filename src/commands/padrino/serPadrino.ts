import { Command } from '../../types/command';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { modalMenu } from './serPadrinoHelpers';

const serPadrino: Command = {
  data: new SlashCommandBuilder().setName('ser-padrino').setDescription('Quiero ser un padrino!'),
  execute: async (discordInteraction: CommandInteraction) => {
    await modalMenu(discordInteraction);
  },
};

export default serPadrino;
