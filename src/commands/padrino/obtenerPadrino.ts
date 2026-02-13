import { Command } from '../../types/command';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { createSelectPadrino } from './obtenerPadrinoHelpers';

const obtenerPadrino: Command = {
  data: new SlashCommandBuilder().setName('obtener-padrino').setDescription('Elegí tu padrino'),
  execute: async (interaction: CommandInteraction) => {
    await createSelectPadrino(interaction);
  },
};

export default obtenerPadrino;
