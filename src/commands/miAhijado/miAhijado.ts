import { CommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../types/command';
import { prisma } from '../../services/prismaClient';
import { cacheService } from '../../services/cache';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mi-ahijado')
    .setDescription('Muestra a quien apadrinaste (si tenés uno)'),
  execute: async (interaction: CommandInteraction) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!interaction.guild) {
        await interaction.editReply({ content: 'Este comando solo funciona en servidores.' });
        return;
      }

      // Obtener member del invocante
      const invocante = await cacheService.getMemberByDiscordId(interaction.guild.id, interaction.user.id);
      if (!invocante) {
        await interaction.editReply({ content: 'No estás registrado en el sistema.' });
        return;
      }

      // Buscar mi perfil de padrino
      const miPadrinoProfile = await prisma.padrino.findUnique({
        where: { memberId: invocante.id },
      });

      if (!miPadrinoProfile) {
        await interaction.editReply({
          content: 'Todavía no tenés perfil de padrino. Usá `/ser-padrino` para crearlo.',
        });
        return;
      }

      // Buscar quien me eligió como padrino
      const ahijado = await prisma.member.findFirst({
        where: { myPadrinoId: miPadrinoProfile.id },
      });

      if (!ahijado) {
        await interaction.editReply({
          content: 'Tenés perfil de padrino pero todavía no apadrinaste a nadie.\nPodés apadrinar a **1** persona (regla 3 del reglamento).',
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🤝 Tu ahijado')
        .setThumbnail(ahijado.discordProfilePicture)
        .addFields(
          { name: 'Nombre', value: ahijado.discordDisplayName, inline: true },
          { name: 'Discord', value: `<@${ahijado.discordMemeberId}>`, inline: true },
          { name: 'Nivel actual', value: `${ahijado.discordTemporalLevel}`, inline: true },
        )
        .setFooter({ text: 'Recordá que sos responsable de su incorporación a la comunidad.' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en /mi-ahijado:', error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'Hubo un error.' });
        } else {
          await interaction.reply({ content: 'Hubo un error.', flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        // ignore
      }
    }
  },
};

export default command;
