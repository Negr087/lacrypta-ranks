import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command';
import { cacheService } from '../../services/cache';
import { prisma } from '../../services/prismaClient';

const levelsXp: { [key: string]: number } = {
  '1': 100, '2': 1000, '3': 3000, '4': 4000, '5': 5000,
  '6': 6000, '7': 7000, '8': 8000, '9': 9000, '10': 10000,
  '11': 11000, '12': 12000, '13': 13000, '14': 14000, '15': 15000,
  '16': 16000, '17': 17000, '18': 18000, '19': 19000, '20': 20000,
  '21': 21000, '22': 100000,
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('milugar')
    .setDescription('Muestra tu posición en el ranking quincenal'),
  execute: async (interaction: CommandInteraction) => {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Este comando solo funciona en servidores.', ephemeral: true });
        return;
      }

      // Traer TODOS los miembros del guild ordenados
      const guild = await prisma.guild.findUnique({
        where: { discordGuildId: interaction.guild.id },
      });
      if (!guild) {
        await interaction.reply({ content: 'No se encontró el servidor en la base de datos.', ephemeral: true });
        return;
      }

      const todos = await prisma.member.findMany({
        where: { guildId: guild.id },
        orderBy: [
          { discordTemporalLevel: 'desc' },
          { discordTemporalLevelXp: 'desc' },
        ],
      });

      const posicion = todos.findIndex((m) => m.discordMemeberId === interaction.user.id);

      if (posicion === -1) {
        await interaction.reply({
          content: '📊 Todavía no estás en el ranking. ¡Empezá a participar para sumar XP!',
          ephemeral: true,
        });
        return;
      }

      const miMember = todos[posicion]!;
      const siguienteNivelXp = levelsXp[(miMember.discordTemporalLevel + 1).toString()] ?? null;
      const xpParaSiguienteNivel = siguienteNivelXp !== null
        ? siguienteNivelXp - miMember.discordTemporalLevelXp
        : null;

      // Diferencia con quien está arriba
      let mensajeArriba = '';
      if (posicion > 0) {
        const arriba = todos[posicion - 1]!;
        if (arriba.discordTemporalLevel === miMember.discordTemporalLevel) {
          const diff = arriba.discordTemporalLevelXp - miMember.discordTemporalLevelXp;
          mensajeArriba = `\n🎯 Te faltan **${diff} XP** para alcanzar a <@${arriba.discordMemeberId}>`;
        } else {
          mensajeArriba = `\n🎯 <@${arriba.discordMemeberId}> está arriba tuyo (Nivel ${arriba.discordTemporalLevel})`;
        }
      } else {
        mensajeArriba = `\n👑 ¡Estás en el **primer puesto**!`;
      }

      const totalParticipantes = todos.length;

      let mensaje = `📊 **Tu lugar en el ranking**\n\n`;
      mensaje += `🏅 Posición: **#${posicion + 1}** de ${totalParticipantes}\n`;
      mensaje += `⭐ Nivel actual: **${miMember.discordTemporalLevel}**\n`;
      mensaje += `✨ XP acumulado: **${miMember.discordTemporalLevelXp}**\n`;

      if (xpParaSiguienteNivel !== null) {
        mensaje += `📈 Te faltan **${xpParaSiguienteNivel} XP** para el nivel ${miMember.discordTemporalLevel + 1}\n`;
      } else {
        mensaje += `🌟 ¡Llegaste al nivel máximo!\n`;
      }

      mensaje += mensajeArriba;

      await interaction.reply({ content: mensaje, ephemeral: true });
    } catch (error) {
      console.error('Error en /milugar:', error);
      await interaction.reply({
        content: 'Hubo un error al ejecutar el comando.',
        ephemeral: true,
      });
    }
  },
};

export default command;
