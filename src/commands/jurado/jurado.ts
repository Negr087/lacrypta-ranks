import {
  CommandInteraction,
  SlashCommandBuilder,
  CommandInteractionOptionResolver,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildTextBasedChannel,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../types/command';
import { prisma } from '../../services/prismaClient';
import {
  generarEmbedJurado,
  getDuracionVotacionMs,
} from '../../services/juryService';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('jurado')
    .setDescription('Sistema de votación contra usuarios que abusan del sistema')
    .addSubcommand((sub) =>
      sub
        .setName('iniciar')
        .setDescription('Iniciar una votación contra un usuario')
        .addUserOption((opt) =>
          opt.setName('usuario').setDescription('Usuario acusado').setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('penalizacion')
            .setDescription('Porcentaje de XP a restar si gana la condena')
            .setRequired(true)
            .addChoices(
              { name: '0% (advertencia)', value: 0 },
              { name: '25%', value: 25 },
              { name: '50%', value: 50 },
              { name: '75%', value: 75 },
              { name: '100% (a 0 XP)', value: 100 },
            ),
        )
        .addStringOption((opt) =>
          opt.setName('motivo').setDescription('Motivo de la acusacion').setRequired(false),
        ),
    ) as SlashCommandBuilder,

  execute: async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand()) return;
    const options = interaction.options as CommandInteractionOptionResolver;
    const sub = options.getSubcommand();

    try {
      if (sub === 'iniciar') {
        await interaction.deferReply();

        const acusado = options.getUser('usuario', true);
        const penalizacion = options.getInteger('penalizacion', true);
        const motivo = options.getString('motivo') ?? null;

        if (!interaction.guild) {
          await interaction.editReply({ content: 'Este comando solo funciona en servidores.' });
          return;
        }

        if (acusado.id === interaction.user.id) {
          await interaction.editReply({ content: 'No podés iniciar una votación contra vos mismo.' });
          return;
        }

        if (acusado.bot) {
          await interaction.editReply({ content: 'No podés iniciar una votación contra un bot.' });
          return;
        }

        // Verificar que no haya otra votación activa contra el mismo usuario
        const activa = await prisma.jury.findFirst({
          where: { accusedId: acusado.id, status: 'active', guildId: interaction.guild.id },
        });
        if (activa) {
          await interaction.editReply({
            content: `Ya hay una votación activa contra <@${acusado.id}>. Esperá a que se cierre.`,
          });
          return;
        }

        // Crear el jurado
        const expiresAt = new Date(Date.now() + getDuracionVotacionMs());
        const jury = await prisma.jury.create({
          data: {
            guildId: interaction.guild.id,
            initiatorId: interaction.user.id,
            accusedId: acusado.id,
            penaltyPercent: penalizacion,
            reason: motivo,
            expiresAt,
            discordChannelId: interaction.channelId,
          },
        });

        // Crear botones
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`jury_vote_for_${jury.id}`)
            .setLabel('👍 A favor')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`jury_vote_against_${jury.id}`)
            .setLabel('👎 En contra')
            .setStyle(ButtonStyle.Danger),
        );

        const embed = await generarEmbedJurado(jury.id);
        if (!embed) {
          await interaction.editReply({ content: 'Error creando la votación.' });
          return;
        }

        const reply = await interaction.editReply({ embeds: [embed], components: [row] });

        // Guardar el ID del mensaje
        await prisma.jury.update({
          where: { id: jury.id },
          data: { discordMessageId: reply.id },
        });
      
    } catch (error) {
      console.error('Error en /jurado:', error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'Hubo un error.' });
        } else {
          await interaction.reply({ content: 'Hubo un error.', flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        console.error('Error en catch:', e);
      }
    }
  },
};

export default command;
