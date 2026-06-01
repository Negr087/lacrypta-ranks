import { CommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../types/command';
import { prisma } from '../../services/prismaClient';
import { sumXpLevel } from '../../services/temporalLevel';

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
    .setDescription('Muestra tu posicion en el ranking quincenal'),
  execute: async (interaction: CommandInteraction) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!interaction.guild) {
        await interaction.editReply({ content: 'Este comando solo funciona en servidores.' });
        return;
      }

      const guild = await prisma.guild.findUnique({
        where: { discordGuildId: interaction.guild.id },
      });
      if (!guild) {
        await interaction.editReply({ content: 'No se encontro el servidor en la base de datos.' });
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
        await interaction.editReply({
          content: 'Todavia no estas en el ranking. Empeza a participar para sumar XP!',
        });
        return;
      }

      const miMember = todos[posicion]!;
      const siguienteNivelXp = levelsXp[(miMember.discordTemporalLevel + 1).toString()] ?? null;
      const xpParaSiguienteNivel = siguienteNivelXp !== null
        ? siguienteNivelXp - miMember.discordTemporalLevelXp
        : null;

      let mensajeArriba = '';
      if (posicion > 0) {
        const arriba = todos[posicion - 1]!;
        const miXpTotal = sumXpLevel(miMember.discordTemporalLevel) + miMember.discordTemporalLevelXp;
        const xpTotalArriba = sumXpLevel(arriba.discordTemporalLevel) + arriba.discordTemporalLevelXp;
        const diff = xpTotalArriba - miXpTotal;

        if (arriba.discordTemporalLevel === miMember.discordTemporalLevel) {
          mensajeArriba = `\n🎯 Te faltan **${diff} XP** para alcanzar a <@${arriba.discordMemeberId}>`;
        } else {
          mensajeArriba = `\n🎯 Te faltan **${diff} XP** para alcanzar a <@${arriba.discordMemeberId}> (Nivel ${arriba.discordTemporalLevel})`;
        }
      } else {
        mensajeArriba = `\n👑 Estas en el **primer puesto**!`;
      }

      const totalParticipantes = todos.length;

      let mensaje = `📊 **Tu lugar en el ranking**\n\n`;
      mensaje += `🏅 Posicion: **#${posicion + 1}** de ${totalParticipantes}\n`;
      mensaje += `⭐ Nivel actual: **${miMember.discordTemporalLevel}**\n`;
      mensaje += `✨ XP acumulado: **${miMember.discordTemporalLevelXp}**\n`;

      if (xpParaSiguienteNivel !== null) {
        mensaje += `📈 Te faltan **${xpParaSiguienteNivel} XP** para el nivel ${miMember.discordTemporalLevel + 1}\n`;
      } else {
        mensaje += `🌟 Llegaste al nivel maximo!\n`;
      }

      mensaje += mensajeArriba;

      await interaction.editReply({ content: mensaje });
    } catch (error) {
      console.error('Error en /milugar:', error);
      // Atrapamos también el error del reply para evitar que mate el proceso
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'Hubo un error al ejecutar el comando.' });
        } else {
          await interaction.reply({ content: 'Hubo un error al ejecutar el comando.', flags: MessageFlags.Ephemeral });
        }
      } catch (replyError) {
        console.error('Error al responder con el error:', replyError);
      }
    }
  },
};

export default command;
