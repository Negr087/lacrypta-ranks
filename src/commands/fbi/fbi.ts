import {
  CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteractionOptionResolver,
} from 'discord.js';
import { Command } from '../../types/command';
import { prisma } from '../../services/prismaClient';
import { getInicioCicloActual } from '../../services/scheduler';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('fbi')
    .setDescription('Reporte detallado de actividad de un usuario en el ciclo actual')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('Usuario a investigar').setRequired(true),
    ) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const targetUser = (interaction.options as CommandInteractionOptionResolver).getUser('usuario', true);

      if (!interaction.guild) {
        await interaction.editReply({ content: 'Este comando solo funciona en servidores.' });
        return;
      }

      const guild = await prisma.guild.findUnique({
        where: { discordGuildId: interaction.guild.id },
      });
      if (!guild) {
        await interaction.editReply({ content: 'Servidor no encontrado en la DB.' });
        return;
      }

      const member = await prisma.member.findFirst({
        where: { discordMemeberId: targetUser.id, guildId: guild.id },
      });

      if (!member) {
        await interaction.editReply({ content: `${targetUser.username} no tiene actividad registrada.` });
        return;
      }

      const inicioCiclo = new Date(getInicioCicloActual());

      const logs = await prisma.xpLog.findMany({
        where: { memberId: member.id, timestamp: { gte: inicioCiclo } },
      });

      if (logs.length === 0) {
        await interaction.editReply({
          content: `🔍 No hay actividad registrada de ${targetUser.username} en este ciclo.\n\nNota: el historial empezo a registrarse desde la activacion del comando /fbi.`,
        });
        return;
      }

      const totalMensajes = logs.length;
      const totalXp = logs.reduce((sum, log) => sum + log.xpGained, 0);

      // Canal mas usado
      const canalCount: { [key: string]: number } = {};
      logs.forEach((log) => {
        canalCount[log.discordChannelId] = (canalCount[log.discordChannelId] ?? 0) + 1;
      });
      const canalMasUsadoEntry = Object.entries(canalCount).sort((a, b) => b[1] - a[1])[0]!;
      const canalMasUsadoId = canalMasUsadoEntry[0];
      const canalMasUsadoMensajes = canalMasUsadoEntry[1];
      const canalDiscord = interaction.guild.channels.cache.get(canalMasUsadoId);
      const canalNombre = canalDiscord?.name ?? canalMasUsadoId;

      // Hora pico en zona Argentina (UTC-3)
      const horaCount: { [key: number]: number } = {};
      logs.forEach((log) => {
        const horaUTC = new Date(log.timestamp).getUTCHours();
        const horaArg = (horaUTC - 3 + 24) % 24;
        horaCount[horaArg] = (horaCount[horaArg] ?? 0) + 1;
      });
      const horaPicoEntry = Object.entries(horaCount).sort((a, b) => b[1] - a[1])[0]!;
      const horaPicoNum = parseInt(horaPicoEntry[0]);
      const horaPicoStr = `${horaPicoNum.toString().padStart(2, '0')}:00 - ${((horaPicoNum + 1) % 24).toString().padStart(2, '0')}:00`;

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle(`🕵️ FBI Report: ${targetUser.username}`)
        .setDescription(
          `Actividad en el ciclo quincenal actual\nDesde: ${inicioCiclo.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`,
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '💬 Total mensajes', value: `**${totalMensajes}**`, inline: true },
          { name: '✨ XP sumado', value: `**${totalXp}**`, inline: true },
          { name: '⭐ Nivel actual', value: `**${member.discordTemporalLevel}**`, inline: true },
          {
            name: '📍 Canal mas usado',
            value: `#${canalNombre}\n(${canalMasUsadoMensajes} mensajes)`,
            inline: true,
          },
          {
            name: '🕐 Hora pico (AR)',
            value: `**${horaPicoStr}**\n(${horaPicoEntry[1]} mensajes)`,
            inline: true,
          },
        )
        .setFooter({ text: 'Historial registrado desde la activacion del comando' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en /fbi:', error);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'Hubo un error al generar el reporte.' });
      } else {
        await interaction.reply({ content: 'Hubo un error al generar el reporte.', ephemeral: true });
      }
    }
  },
};

export default command;
