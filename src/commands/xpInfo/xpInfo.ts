import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/command';
import { xpConfig } from '../../services/temporalLevel';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('xpinfo')
    .setDescription('Muestra cómo está configurado el sistema de XP'),
  execute: async (interaction: CommandInteraction) => {
    try {
      const cooldownSeg = xpConfig.COLDOWN_MS / 1000;

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('⚙️ Configuración del sistema de XP')
        .setDescription('Así funciona el cálculo de experiencia en el servidor:')
        .addFields(
          {
            name: '💬 XP por mensaje',
            value:
              `Base: **${xpConfig.XP_MESSAGE} XP**\n` +
              `Se multiplica por el tiempo desde tu último mensaje (cooldown de **${cooldownSeg}s**)\n` +
              `Más un bonus aleatorio según la longitud del mensaje\n` +
              `*Ejemplo: si pasaron ${cooldownSeg}s y el mensaje es largo, sumás cerca de ${xpConfig.XP_MESSAGE * 2} XP*`,
          },
          {
            name: '❤️ XP por recibir reacción',
            value: `**${xpConfig.XP_REACTION_RECEIVE} XP** por cada reacción que recibas en tus mensajes`,
          },
          {
            name: '👍 XP por dar reacción',
            value: `**${xpConfig.XP_REACTION_SEND} XP** por reaccionar a mensajes de otros (también con cooldown)`,
          },
          {
            name: '🚫 Penalización por spam',
            value:
              `**-${xpConfig.SPAM_PENALTY_XP} XP** si el mensaje es detectado como spam\n` +
              `(texto sin vocales, ej: "asdfgh", "qwerty")`,
          },
          {
            name: '📊 XP necesario por nivel',
            value:
              `Nivel 1: ${xpConfig.levels['1']} XP\n` +
              `Nivel 2: ${xpConfig.levels['2']} XP\n` +
              `Nivel 3: ${xpConfig.levels['3']} XP\n` +
              `Niveles 4-21: aumenta de a 1000\n` +
              `Nivel 22 (máximo): ${xpConfig.levels['22']} XP`,
          },
          {
            name: '🏆 Premios quincenales',
            value: '🥇 5000 sats\n🥈 3000 sats\n🥉 1500 sats',
          },
        )
        .setFooter({ text: 'Cada 2 semanas se reinicia el ranking y se reparten premios' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en /xpinfo:', error);
      await interaction.reply({
        content: 'Hubo un error al mostrar la configuración.',
        ephemeral: true,
      });
    }
  },
};

export default command;
