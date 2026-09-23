import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/command';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('infopadrino')
    .setDescription('Explica cómo funciona el sistema de padrinos y garantías'),
  execute: async (interaction: CommandInteraction) => {
    try {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🤝 Sistema de Padrinos — Cómo funciona')
        .setDescription(
          'Este es un sistema de garantías tipo cadena de confianza. Cada miembro tiene un único padrino y cada padrino tiene un único ahijado.',
        )
        .addFields(
          {
            name: '📌 Principio central',
            value:
              'Cada miembro es incorporado por **un único padrino** y cada padrino puede apadrinar a **una única persona**.\nLas cadenas no pueden formar ciclos.',
          },
          {
            name: '1️⃣ Cómo ser padrino',
            value:
              'Usá `/ser-padrino` para crear tu perfil de padrino (necesitás el rol configurado por los admins).\nVas a completar un resumen y una biografía que verán quienes te elijan.',
          },
          {
            name: '2️⃣ Cómo elegir tu padrino',
            value:
              'Usá `/obtener-padrino` y te aparece la lista de padrinos disponibles.\nSolo aparecen los que **NO tienen ahijado** y con los que **NO se forma un ciclo**.',
          },
          {
            name: '3️⃣ Ver tu ahijado',
            value: 'Usá `/mi-ahijado` para ver a quién apadrinaste.',
          },
          {
            name: '📏 Reglas',
            value:
              '• **1 padrino por persona** — no podés tener dos padrinos.\n' +
              '• **1 ahijado por padrino** — no podés apadrinar a más de uno.\n' +
              '• **Sin garantías recíprocas** — si A es padrino de B, B no puede ser padrino de A.\n' +
              '• **Sin ciclos** — ni directos (A→B→A) ni indirectos (A→B→C→A).\n' +
              '• **La elección no se puede cambiar libremente** — una vez elegido, tu padrino queda fijo (regla 11 del reglamento).',
          },
          {
            name: '🔗 Estructura',
            value:
              'Las relaciones forman cadenas de confianza:\n`A → B → C → D → E`\nCada flecha significa "es padrino de".',
          },
          {
            name: '⚠️ Salidas de la comunidad',
            value:
              '• Si tu **ahijado** se va, quedás liberado y podés apadrinar a alguien más.\n' +
              '• Si tu **padrino** se va, quedás sin padrino y podés elegir uno nuevo.',
          },
          {
            name: '💬 Responsabilidad',
            value:
              'El padrino responde por la incorporación de su ahijado a la comunidad.\nLos incumplimientos pueden ser comunicados al padrino.',
          },
        )
        .setFooter({
          text: 'Regla de oro: cada miembro responde por una única incorporación, es incorporado por un único padrino, y ninguna cadena vuelve sobre sí misma.',
        });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en /infopadrino:', error);
      await interaction.reply({
        content: 'Hubo un error al mostrar la información.',
        ephemeral: true,
      });
    }
  },
};

export default command;
