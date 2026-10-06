import {
  CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteractionOptionResolver,
} from 'discord.js';
import { Command } from '../../types/command';
import { prisma } from '../../services/prismaClient';

const medallas = ['🥇', '🥈', '🥉'];
const fecha = (d: Date) =>
  d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit' });

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('historial-ranking')
    .setDescription('Historial de los rankings quincenales anteriores')
    .addIntegerOption((opt) =>
      opt.setName('ciclo').setDescription('Número de ciclo para ver su top 10 completo').setRequired(false),
    ) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    try {
      await interaction.deferReply();
      if (!interaction.guild) {
        await interaction.editReply({ content: 'Este comando solo funciona en servidores.' });
        return;
      }

      const nro = (interaction.options as CommandInteractionOptionResolver).getInteger('ciclo');

      // Detalle de un ciclo
      if (nro) {
        const ciclo = await prisma.rankingCycle.findUnique({
          where: { guildId_cycleNumber: { guildId: interaction.guild.id, cycleNumber: nro } },
          include: { entries: { orderBy: { position: 'asc' } } },
        });
        if (!ciclo) {
          await interaction.editReply({ content: `No hay registro del ciclo ${nro}.` });
          return;
        }
        const lineas = ciclo.entries
          .map((e) => {
            const pos = medallas[e.position - 1] ?? `#${e.position}`;
            const premio = e.prizeSats > 0 ? ` · **${e.prizeSats.toLocaleString('es-AR')} sats**` : '';
            return `${pos} <@${e.discordUserId}> — Nivel ${e.level} · ${e.xp.toLocaleString('es-AR')} XP${premio}`;
          })
          .join('\n');
        const embed = new EmbedBuilder()
          .setColor(0xff9416)
          .setTitle(`Ciclo ${ciclo.cycleNumber}`)
          .setDescription(`${fecha(ciclo.startedAt)} → ${fecha(ciclo.closedAt)}\n\n${lineas}`);
        await interaction.editReply({ embeds: [embed], allowedMentions: { users: [] } });
        return;
      }

      // Lista de los últimos 10 ciclos
      const ciclos = await prisma.rankingCycle.findMany({
        where: { guildId: interaction.guild.id },
        orderBy: { cycleNumber: 'desc' },
        take: 10,
        include: { entries: { where: { position: { lte: 3 } }, orderBy: { position: 'asc' } } },
      });

      if (ciclos.length === 0) {
        await interaction.editReply({
          content: 'Todavía no hay ciclos guardados. El primero se guarda en el próximo cierre.',
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xff9416)
        .setTitle('Historial de rankings quincenales')
        .setFooter({ text: 'Usá /historial-ranking ciclo:N para ver el top 10 de un ciclo' });

      for (const c of ciclos) {
        const podio = c.entries.map((e) => `${medallas[e.position - 1]} <@${e.discordUserId}> (Nv ${e.level})`).join('\n');
        embed.addFields({
          name: `Ciclo ${c.cycleNumber} · ${fecha(c.startedAt)} → ${fecha(c.closedAt)}`,
          value: podio || 'Sin participantes',
        });
      }

      await interaction.editReply({ embeds: [embed], allowedMentions: { users: [] } });
    } catch (error) {
      console.error('Error en /historial-ranking:', error);
      try {
        await interaction.editReply({ content: 'Hubo un error al cargar el historial.' });
      } catch (e) {
        // ignore
      }
    }
  },
};

export default command;
