import { Command } from './../../types/command';
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

const ping: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Para checkear si el bot está vivo'),
  execute: async (interaction: CommandInteraction) => {
    await interaction.reply('Viva La Libertad CARAJO! <:milei_motosierra:1157810516467650611>');
  },
};

export default ping;
