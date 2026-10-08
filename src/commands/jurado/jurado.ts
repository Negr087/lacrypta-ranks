import QRCode from 'qrcode';
import {
  AttachmentBuilder,
  CommandInteraction,
  SlashCommandBuilder,
  CommandInteractionOptionResolver,
  MessageFlags,
} from 'discord.js';
import { Command } from '../../types/command';
import { prisma } from '../../services/prismaClient';
import {
  activarSiPagado,
  generarEmbedJurado,
  PAGO_TIMEOUT_MS,
  PAGO_TIMEOUT_SEG,
  STAKE_SATS,
} from '../../services/juryService';
import { crearFactura, nwcConfigurado } from '../../services/nwcService';

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
          where: {
            accusedId: acusado.id,
            status: { in: ['active', 'pending_payment'] },
            guildId: interaction.guild.id,
          },
        });
        if (activa) {
          await interaction.editReply({
            content: `Ya hay una votación activa contra <@${acusado.id}>. Esperá a que se cierre.`,
          });
          return;
        }

        if (!nwcConfigurado()) {
          await interaction.editReply({ content: 'La fianza en sats no está configurada. Avisá a un admin.' });
          return;
        }

        // Crear el jurado (queda esperando el pago de la fianza)
        const jury = await prisma.jury.create({
          data: {
            guildId: interaction.guild.id,
            initiatorId: interaction.user.id,
            accusedId: acusado.id,
            penaltyPercent: penalizacion,
            reason: motivo,
            status: 'pending_payment',
            stakeSats: STAKE_SATS,
            expiresAt: new Date(Date.now() + PAGO_TIMEOUT_MS), // límite para pagar; al pagar se reinicia a 24h
            discordChannelId: interaction.channelId,
          },
        });

        let invoice: string;
        try {
          const f = await crearFactura(STAKE_SATS, `Fianza jurado La Crypta ${jury.id.slice(0, 8)}`, PAGO_TIMEOUT_SEG);
          invoice = f.invoice;
          await prisma.jury.update({ where: { id: jury.id }, data: { stakeInvoice: f.invoice, stakeHash: f.paymentHash } });
        } catch (error) {
          console.error('Error creando factura de fianza:', error);
          await prisma.jury.delete({ where: { id: jury.id } });
          await interaction.editReply({ content: 'No pude generar la factura de la fianza. Probá de nuevo en un rato.' });
          return;
        }

        const embed = await generarEmbedJurado(jury.id);
        if (!embed) {
          await interaction.editReply({ content: 'Error creando la votación.' });
          return;
        }

        const reply = await interaction.editReply({ embeds: [embed], components: [] });
        await prisma.jury.update({ where: { id: jury.id }, data: { discordMessageId: reply.id } });

        // La factura (y el QR) la ve solo quien acusa
        const qr = await QRCode.toBuffer(`lightning:${invoice}`.toUpperCase(), { width: 480, margin: 2 });
        await interaction.followUp({
          content:
            `⚡ Para iniciar el juicio pagá la fianza de **${STAKE_SATS} sats** escaneando el QR o copiando la factura ` +
            `(tenés ${PAGO_TIMEOUT_SEG / 60} minutos). Si el acusado es culpable o no hay veredicto, podés reclamarla de vuelta.\n` +
            `\`\`\`${invoice}\`\`\`\n` +
            `💡 También podés pagar esta factura usando el bot **LN ZAP BOT** con el comando \`/pay\`.`,
          files: [new AttachmentBuilder(qr, { name: 'fianza.png' })],
          flags: MessageFlags.Ephemeral,
        });

        // Chequeo rápido del pago (si el bot se reinicia, lo retoma el scheduler)
        const hasta = Date.now() + PAGO_TIMEOUT_MS;
        const timer = setInterval(async () => {
          try {
            await activarSiPagado(interaction.client, jury.id);
            const j = await prisma.jury.findUnique({ where: { id: jury.id }, select: { status: true } });
            if (!j || j.status !== 'pending_payment' || Date.now() > hasta + 60_000) clearInterval(timer);
          } catch (e) {
            console.error('Error en chequeo de pago:', e);
          }
        }, 5000);
      }
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
