import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/command';
import { xpConfig } from '../../services/temporalLevel';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('xpinfo')
    .setDescription('Muestra como esta configurado el sistema de XP'),
  execute: async (interaction: CommandInteraction) => {
    try {
      const cooldownSeg = xpConfig.COLDOWN_MS / 1000;

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('Configuracion del sistema de XP')
        .setDescription('Asi funciona el calculo de experiencia:')
        .addFields(
          {
            name: 'XP por mensaje',
            value:
              `Base: **${xpConfig.XP_MESSAGE} XP**\n` +
              `Multiplicado por el tiempo desde tu ultimo mensaje (cooldown de **${cooldownSeg}s**)\n` +
              `Mas un bonus aleatorio segun la longitud del mensaje`,
          },
          {
            name: 'XP por recibir reaccion',
            value: `**${xpConfig.XP_REACTION_RECEIVE} XP** por cada reaccion recibida en tus mensajes`,
          },
          {
            name: 'XP por dar reaccion',
            value: `**${xpConfig.XP_REACTION_SEND} XP** por reaccionar a mensajes de otros (con cooldown)`,
          },
          {
            name: 'XP necesario por nivel',
            value:
              `Nivel 1: ${xpConfig.levels['1']} XP\n` +
              `Nivel 2: ${xpConfig.levels['2']} XP\n` +
              `Nivel 3: ${xpConfig.levels['3']} XP\n` +
              `Niveles 4-21: aumenta de a 1000\n` +
              `Nivel 22 (maximo): ${xpConfig.levels['22']} XP`,
          },
          {
            name: 'Premios quincenales',
            value: '1ro: 5000 sats\n2do: 3000 sats\n3ro: 1500 sats',
          },
        )
        .setFooter({ text: 'Cada 2 semanas se reinicia el ranking y se reparten premios' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en /xpinfo:', error);
      await interaction.reply({
        content: 'Hubo un error al mostrar la configuracion.',
        ephemeral: true,
      });
    }
  },
};

export default command;
