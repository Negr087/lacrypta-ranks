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
            name: '💬 XP por mensaje',
            value:
              `Base: **${xpConfig.XP_MESSAGE} XP**\n` +
              `Multiplicado por el tiempo desde tu ultimo mensaje (cooldown de **${cooldownSeg}s**).\n` +
              `Si esperas el cooldown completo entre mensajes sumas mas XP.\n` +
              `Mas un bonus aleatorio adicional (0 a 100 XP).\n` +
              `**Total posible por mensaje: 0 a 200 XP**`,
          },
         {
            name: '⚡ XP por enviar un zap',
            value:
              `Sumas **la mitad** de los sats enviados en XP.\n` +
              `Ejemplo: si envias 100 sats → sumas 50 XP.`,
          },
          {
            name: '⚡ XP por recibir un zap',
            value:
              `Sumas **la misma cantidad** de sats recibidos en XP.\n` +
              `Ejemplo: si te envian 100 sats → sumas 100 XP.`,
          },
          {
            name: '🛡️ Anti-abuso de zaps',
            value:
              `El XP por zaps entre el mismo par de usuarios se reduce con cada repeticion en el ciclo:\n` +
              `• 1er zap: **100%** del XP\n` +
              `• 2do zap: **50%**\n` +
              `• 3er zap: **25%**\n` +
              `• 4to en adelante: **0%** (no suma)`,
          },
          {
            name: '❤️ XP por recibir reaccion',
            value: `**${xpConfig.XP_REACTION_RECEIVE} XP** por cada reaccion recibida en tus mensajes`,
          },
          {
            name: '👍 XP por dar reaccion',
            value: `**${xpConfig.XP_REACTION_SEND} XP** por reaccionar a mensajes de otros (con cooldown)`,
          },
          {
            name: '📊 XP necesario por nivel',
            value:
              `Nivel 1: ${xpConfig.levels['1']} XP\n` +
              `Nivel 2: ${xpConfig.levels['2']} XP\n` +
              `Nivel 3: ${xpConfig.levels['3']} XP\n` +
              `Niveles 4-21: aumenta de a 1000\n` +
              `Nivel 22 (maximo): ${xpConfig.levels['22']} XP`,
          },
          {
            name: '🏆 Premios quincenales',
            value: '🥇 5000 sats\n🥈 3000 sats\n🥉 1500 sats',
          },
          {
            name: '⚖️ Sistema de jurado',
            value:
              `Cualquier usuario puede iniciar una votación con \`/jurado iniciar\`.\n` +
              `• Dura **24 horas** fijas (no se puede cerrar antes).\n` +
              `• Necesita mínimo **5 votos** para tener efecto.\n` +
              `• Si no llega a 5 votos: el acusado sale **INOCENTE**.\n` +
              `• Si gana 'a favor' con quórum: se aplica la penalización elegida.`,
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
