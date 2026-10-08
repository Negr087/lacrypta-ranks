import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
} from 'discord.js';
import { Jury } from '@prisma/client';
import { prisma } from './prismaClient';
import { cacheService } from './cache';
import { xpConfig } from './temporalLevel';
import {
  esFacturaLn,
  esLightningAddress,
  facturaPagada,
  montoFacturaMsats,
  NwcWalletError,
  pagarALightningAddress,
  pagarFactura,
} from './nwcService';

const DURACION_VOTACION_MS = 24 * 60 * 60 * 1000; // 24 horas
const MIN_VOTOS_REQUERIDOS = 5;

export const STAKE_SATS = 2100; // fianza que paga el acusador
export const PAGO_TIMEOUT_MS = 10 * 60 * 1000; // 10 min para pagar la fianza
export const PAGO_TIMEOUT_SEG = PAGO_TIMEOUT_MS / 1000;
const RECLAMO_MS = 7 * 24 * 60 * 60 * 1000; // 7 días para reclamar

export function botonesVoto(juryId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`jury_vote_for_${juryId}`).setLabel('👍 A favor').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`jury_vote_against_${juryId}`).setLabel('👎 En contra').setStyle(ButtonStyle.Danger),
  );
}

function botonReclamar(juryId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`jury_claim_${juryId}`).setLabel(`⚡ Reclamar ${STAKE_SATS} sats`).setStyle(ButtonStyle.Primary),
  );
}

type JuryRow = Jury;

async function obtenerMensaje(client: Client, jury: JuryRow) {
  if (!jury.discordChannelId || !jury.discordMessageId) return null;
  const guild = client.guilds.cache.get(jury.guildId);
  const canal = guild?.channels.cache.get(jury.discordChannelId) as GuildTextBasedChannel | undefined;
  if (!canal) return null;
  return canal.messages.fetch(jury.discordMessageId).catch(() => null);
}

/** Si la fianza se pagó, arranca la votación de 24h. Idempotente. */
export async function activarSiPagado(client: Client, juryId: string): Promise<void> {
  const jury = await prisma.jury.findUnique({ where: { id: juryId } });
  if (!jury || jury.status !== 'pending_payment' || !jury.stakeHash) return;

  let pagado = false;
  try {
    pagado = await facturaPagada(jury.stakeHash);
  } catch (error) {
    console.error('Error consultando pago de fianza:', error);
  }

  if (pagado) {
    const upd = await prisma.jury.updateMany({
      where: { id: juryId, status: 'pending_payment' },
      data: { status: 'active', stakePaidAt: new Date(), expiresAt: new Date(Date.now() + DURACION_VOTACION_MS) },
    });
    if (upd.count === 0) return;
    try {
      const msg = await obtenerMensaje(client, jury);
      const embed = await generarEmbedJurado(juryId);
      if (msg && embed) await msg.edit({ embeds: [embed], components: [botonesVoto(juryId)] });
    } catch (error) {
      console.error('Error activando votación tras pago:', error);
    }
    return;
  }

  // No pagó a tiempo: se cancela
  if (jury.expiresAt.getTime() <= Date.now()) {
    const upd = await prisma.jury.updateMany({
      where: { id: juryId, status: 'pending_payment' },
      data: { status: 'unpaid', closedAt: new Date() },
    });
    if (upd.count === 0) return;
    try {
      const msg = await obtenerMensaje(client, jury);
      const embed = await generarEmbedJurado(juryId);
      if (msg && embed) await msg.edit({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Error cancelando jurado sin pago:', error);
    }
  }
}

async function procesarPendientes(client: Client): Promise<void> {
  const pendientes = await prisma.jury.findMany({ where: { status: 'pending_payment' } });
  for (const j of pendientes) await activarSiPagado(client, j.id);

  await prisma.jury.updateMany({
    where: { payoutStatus: 'claimable', payoutClaimUntil: { lte: new Date() } },
    data: { payoutStatus: 'expired' },
  });
}

/** Reclamo del pago (el acusado si salió inocente, el acusador si se le devuelve la fianza). */
export async function reclamarPago(juryId: string, userId: string, destinoRaw: string): Promise<string> {
  const jury = await prisma.jury.findUnique({ where: { id: juryId } });
  if (!jury || jury.stakeSats <= 0 || !jury.payoutTo) return 'No hay nada para reclamar acá.';

  const destinatario = jury.payoutTo === 'accused' ? jury.accusedId : jury.initiatorId;
  if (userId !== destinatario) return 'Este pago no es para vos.';
  if (jury.payoutStatus === 'claimed') return '✅ Ya reclamaste estos sats.';
  if (jury.payoutStatus === 'paying') return '⏳ Tu pago está en proceso. Si en unos minutos no llegó, avisá a un admin.';
  if (
    jury.payoutStatus === 'expired' ||
    (jury.payoutClaimUntil && jury.payoutClaimUntil.getTime() <= Date.now())
  ) {
    return '⌛ Venció el plazo de 7 días para reclamar. Hablá con un admin.';
  }
  if (jury.payoutStatus !== 'claimable') return 'No hay nada para reclamar acá.';

  const destino = destinoRaw.trim().replace(/^lightning:/i, '');
  const esAddress = esLightningAddress(destino);
  const esFactura = esFacturaLn(destino);
  if (!esAddress && !esFactura) {
    return `❌ Pegá una Lightning address (tu@dominio.com) o una factura de exactamente ${STAKE_SATS} sats.`;
  }
  if (esFactura && montoFacturaMsats(destino) !== STAKE_SATS * 1000) {
    return `❌ La factura tiene que ser de exactamente ${STAKE_SATS} sats (y tener monto).`;
  }

  // Candado para no pagar dos veces
  const lock = await prisma.jury.updateMany({
    where: { id: juryId, payoutStatus: 'claimable' },
    data: { payoutStatus: 'paying' },
  });
  if (lock.count === 0) return '⏳ Ya hay un reclamo en proceso.';

  try {
    if (esFactura) await pagarFactura(destino);
    else await pagarALightningAddress(destino, STAKE_SATS);
  } catch (error) {
    console.error('Error pagando reclamo de jurado:', juryId, error);
    if (error instanceof NwcWalletError || (error instanceof Error && /LNURL|Lightning address|factura/i.test(error.message))) {
      // Falló seguro (no salió plata): se puede reintentar
      await prisma.jury.update({ where: { id: juryId }, data: { payoutStatus: 'claimable' } });
      return `❌ No se pudo pagar: ${error instanceof Error ? error.message : 'error de la wallet'}. Probá de nuevo o con otro destino.`;
    }
    // Error incierto (ej. timeout): puede haberse pagado. Se deja bloqueado hasta revisar a mano.
    return '⚠️ No pude confirmar si el pago salió. Revisá tu wallet y, si no llegó, avisá a un admin (no reintentes).';
  }

  await prisma.jury.update({ where: { id: juryId }, data: { payoutStatus: 'claimed', payoutPaidAt: new Date() } });
  return `✅ ¡Listo! Te mandé ${STAKE_SATS} sats.`;
}

function payoutDe(jury: JuryRow, result: string) {
  if (jury.stakeSats <= 0 || !jury.stakePaidAt) return {};
  return {
    payoutTo: result === 'rejected' ? 'accused' : 'accuser',
    payoutStatus: 'claimable',
    payoutClaimUntil: new Date(Date.now() + RECLAMO_MS),
  };
}

function textoPayout(jury: JuryRow, result: string): string {
  if (jury.stakeSats <= 0 || !jury.stakePaidAt) return '';
  return result === 'rejected'
    ? `\n⚡ <@${jury.accusedId}> se lleva los **${jury.stakeSats} sats** de la fianza de <@${jury.initiatorId}>. Reclamalos con el botón (tenés 7 días).`
    : `\n⚡ <@${jury.initiatorId}> recupera su fianza de **${jury.stakeSats} sats**. Reclamala con el botón (tenés 7 días).`;
}

export function calcularNivelYxp(xpTotal: number): { nivel: number; xpEnNivel: number } {
  let nivel = 0;
  let xpAcumulado = 0;
  for (let i = 1; i <= 22; i++) {
    const xpDelNivel = xpConfig.levels[i.toString()];
    if (!xpDelNivel) break;
    if (xpAcumulado + xpDelNivel > xpTotal) break;
    xpAcumulado += xpDelNivel;
    nivel = i;
  }
  return { nivel, xpEnNivel: xpTotal - xpAcumulado };
}

function sumXpHasta(nivel: number): number {
  let total = 0;
  for (let i = 1; i <= nivel; i++) {
    total += xpConfig.levels[i.toString()] ?? 0;
  }
  return total;
}

export async function aplicarPenalizacion(
  guildDiscordId: string,
  accusedDiscordId: string,
  penaltyPercent: number,
): Promise<{ xpAntes: number; xpDespues: number; nivelAntes: number; nivelDespues: number } | null> {
  const member = await cacheService.getMemberByDiscordId(guildDiscordId, accusedDiscordId);
  if (!member) return null;

  const xpTotalActual = sumXpHasta(member.discordTemporalLevel) + member.discordTemporalLevelXp;
  const xpNuevoTotal = Math.max(0, Math.floor(xpTotalActual * (1 - penaltyPercent / 100)));
  const { nivel: nuevoNivel, xpEnNivel: nuevoXpEnNivel } = calcularNivelYxp(xpNuevoTotal);

  await prisma.member.update({
    where: { id: member.id },
    data: {
      discordTemporalLevel: nuevoNivel,
      discordTemporalLevelXp: nuevoXpEnNivel,
    },
  });

  // Actualizar el cache también
  member.discordTemporalLevel = nuevoNivel;
  member.discordTemporalLevelXp = nuevoXpEnNivel;

  return {
    xpAntes: xpTotalActual,
    xpDespues: xpNuevoTotal,
    nivelAntes: member.discordTemporalLevel === nuevoNivel ? nuevoNivel : member.discordTemporalLevel,
    nivelDespues: nuevoNivel,
  };
}

export function getDuracionVotacionMs(): number {
  return DURACION_VOTACION_MS;
}

export async function generarEmbedJurado(juryId: string): Promise<EmbedBuilder | null> {
  const jury = await prisma.jury.findUnique({
    where: { id: juryId },
    include: { votes: true },
  });
  if (!jury) return null;

  const votosFavor = jury.votes.filter((v) => v.vote === 'for').length;
  const votosContra = jury.votes.filter((v) => v.vote === 'against').length;

  const tiempoRestante = jury.expiresAt.getTime() - Date.now();
  const horas = Math.max(0, Math.floor(tiempoRestante / (1000 * 60 * 60)));
  const minutos = Math.max(0, Math.floor((tiempoRestante % (1000 * 60 * 60)) / (1000 * 60)));
  const tiempoStr =
    jury.status === 'active'
      ? `${horas}h ${minutos}m restantes`
      : jury.status === 'pending_payment'
        ? '⏳ Esperando el pago de la fianza'
        : jury.status === 'unpaid'
          ? 'CANCELADA'
          : 'CERRADA';
  const totalVotos = jury.votes.length;
  const votosFaltantes = Math.max(0, MIN_VOTOS_REQUERIDOS - totalVotos);

  let color = 0x3498db;
  if (jury.status === 'pending_payment') color = 0xf1c40f;
  else if (jury.status !== 'active') {
    color = jury.result === 'approved' ? 0xe74c3c : 0x95a5a6;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('⚖️ Votación de Jurado')
    .setDescription(
      `**Acusado:** <@${jury.accusedId}>\n` +
        `**Iniciado por:** <@${jury.initiatorId}>\n` +
        `**Penalización propuesta:** ${jury.penaltyPercent === 0 ? 'Sin penalización' : `Restar **${jury.penaltyPercent}%** del XP total`}\n` +
        (jury.reason ? `**Motivo:** ${jury.reason}\n` : '') +
        (jury.stakeSats > 0 ? `**Fianza:** ⚡ ${jury.stakeSats} sats (la paga el acusador)\n` : '') +
        `\n📊 **Votación:**\n👍 A favor: **${votosFavor}**\n👎 En contra: **${votosContra}**\n` +
        `🗳️ Quorum: **${totalVotos}/${MIN_VOTOS_REQUERIDOS}** votos${votosFaltantes > 0 && jury.status === 'active' ? ` (faltan ${votosFaltantes})` : ''}\n` +
        `\n⏰ ${tiempoStr}`,
    );

  if (jury.status === 'unpaid') {
    embed.addFields({ name: 'Resultado', value: '🚫 Cancelada: no se pagó la fianza a tiempo' });
  } else if (jury.status === 'closed') {
    let resultadoStr = '';
    if (jury.result === 'approved') resultadoStr = '✅ **CONDENADO** — Penalización aplicada';
    else if (jury.result === 'rejected') resultadoStr = '❌ Rechazada — No hubo mayoría a favor';
    else if (jury.result === 'no_quorum') resultadoStr = '⚪ **INOCENTE** — No se alcanzaron los 5 votos necesarios';
    else resultadoStr = '⚪ Sin resolución';
    embed.addFields({ name: 'Resultado', value: resultadoStr });
  }

  return embed;
}

export async function cerrarVotacion(client: Client, juryId: string): Promise<void> {
  const jury = await prisma.jury.findUnique({
    where: { id: juryId },
    include: { votes: true },
  });
  if (!jury || jury.status !== 'active') return;

  const votosFavor = jury.votes.filter((v) => v.vote === 'for').length;
  const votosContra = jury.votes.filter((v) => v.vote === 'against').length;
  const totalVotos = jury.votes.length;

  // Si no llegó al mínimo de votos: descartar sin penalizar
  if (totalVotos < MIN_VOTOS_REQUERIDOS) {
    const cierre = await prisma.jury.updateMany({
      where: { id: juryId, status: 'active' },
      data: {
        status: 'closed',
        closedAt: new Date(),
        result: 'no_quorum',
        ...payoutDe(jury, 'no_quorum'),
      },
    });
    if (cierre.count === 0) return;
    const hayPago = jury.stakeSats > 0 && !!jury.stakePaidAt;

    if (jury.discordChannelId && jury.discordMessageId) {
      try {
        const guild = client.guilds.cache.get(jury.guildId);
        const canal = guild?.channels.cache.get(jury.discordChannelId) as GuildTextBasedChannel | undefined;
        if (canal) {
          const msg = await canal.messages.fetch(jury.discordMessageId).catch(() => null);
          if (msg) {
            const embed = await generarEmbedJurado(juryId);
            if (embed) {
              await msg.edit({ embeds: [embed], components: [] });
            }
          }
          await canal.send({
            content:
              `⚖️ **Veredicto:** <@${jury.accusedId}> sale **INOCENTE**.\nLa votación no alcanzó el mínimo de ${MIN_VOTOS_REQUERIDOS} votos (solo hubo ${totalVotos}).` +
              (hayPago ? `\n⚡ Sin veredicto: <@${jury.initiatorId}> recupera su fianza de **${jury.stakeSats} sats**. Reclamala con el botón (tenés 7 días).` : ''),
            components: hayPago ? [botonReclamar(juryId)] : [],
          });
        }
      } catch (error) {
        console.error('Error actualizando mensaje del jurado (sin quorum):', error);
      }
    }
    return;
  }

  // Hay quorum: mayoría simple
  const aprobado = votosFavor > votosContra;
  const result = aprobado ? 'approved' : 'rejected';

  const cierre2 = await prisma.jury.updateMany({
    where: { id: juryId, status: 'active' },
    data: {
      status: 'closed',
      closedAt: new Date(),
      result,
      ...payoutDe(jury, result),
    },
  });
  if (cierre2.count === 0) return;
  const hayPago2 = jury.stakeSats > 0 && !!jury.stakePaidAt;
  const filaReclamo = hayPago2 ? [botonReclamar(juryId)] : [];
  const textoPago = textoPayout(jury, result);

  // 🏆 Top 3 ANTES de aplicar penalización
  const topAntes = await cacheService.getMembersRankingTopTen(jury.guildId);
  const top3Antes = topAntes?.slice(0, 3).map((m) => m.discordMemeberId) ?? [];

  // Aplicar penalización si fue aprobada
  let penalizacionInfo: Awaited<ReturnType<typeof aplicarPenalizacion>> = null;
  if (aprobado && jury.penaltyPercent > 0) {
    penalizacionInfo = await aplicarPenalizacion(jury.guildId, jury.accusedId, jury.penaltyPercent);
  }

  // Actualizar mensaje original con el resultado
  if (jury.discordChannelId && jury.discordMessageId) {
    try {
      const guild = client.guilds.cache.get(jury.guildId);
      const canal = guild?.channels.cache.get(jury.discordChannelId) as GuildTextBasedChannel | undefined;
      if (canal) {
        const msg = await canal.messages.fetch(jury.discordMessageId).catch(() => null);
        if (msg) {
          const embed = await generarEmbedJurado(juryId);
          if (embed) {
            await msg.edit({ embeds: [embed], components: [] });
          }
        }

        if (aprobado && penalizacionInfo) {
          await canal.send({
            content:
              `⚖️ **Veredicto:** <@${jury.accusedId}> fue **CONDENADO** por la votación.\n` +
              `Penalización: -${jury.penaltyPercent}% del XP total.\n` +
              `XP antes: ${penalizacionInfo.xpAntes} → XP después: ${penalizacionInfo.xpDespues}\n` +
              `Nivel: ${penalizacionInfo.nivelAntes} → ${penalizacionInfo.nivelDespues}` +
              textoPago,
            components: filaReclamo,
          });
        } else if (aprobado) {
          await canal.send({
            content:
              `⚖️ **Veredicto:** la votación contra <@${jury.accusedId}> fue aprobada pero la penalización es 0% (sin efecto).` +
              textoPago,
            components: filaReclamo,
          });
        } else {
          await canal.send({
            content:
              `⚖️ **Veredicto:** la votación contra <@${jury.accusedId}> fue **rechazada**. <@${jury.accusedId}> es **INOCENTE**.` +
              textoPago,
            components: filaReclamo,
          });
        }
      }
    } catch (error) {
      console.error('Error actualizando mensaje del jurado:', error);
    }
  }

  // 🏆 Si se aplicó penalización, chequear cambios en el top 3
  if (aprobado && penalizacionInfo) {
    try {
      const topDespues = await cacheService.getMembersRankingTopTen(jury.guildId);
      const top3DespuesFull = topDespues?.slice(0, 3) ?? [];
      const top3Despues = top3DespuesFull.map((m) => m.discordMemeberId);

      const huboCambios = top3Despues.some((id, index) => id !== top3Antes[index]);
      const primeroEnNivel5 = top3DespuesFull[0] && top3DespuesFull[0].discordTemporalLevel >= 5;

      if (huboCambios && top3Despues.length >= 1 && primeroEnNivel5) {
        const guildDB = await prisma.guild.findUnique({
          where: { discordGuildId: jury.guildId },
        });
        const guild = client.guilds.cache.get(jury.guildId);
        const canalNotif = guild?.channels.cache.get(
          guildDB?.levelsChannelId || jury.discordChannelId || '',
        ) as GuildTextBasedChannel | undefined;

        if (canalNotif) {
          const medals = ['🥇', '🥈', '🥉'];
          const lines = top3Despues.map((id, i) => `${medals[i]} <@${id}>`).join('\n');
          await canalNotif.send(
            `🏆 **¡Cambios en el Top 3 tras el veredicto del jurado!**\n${lines}\n\n⚖️ <@${jury.accusedId}> perdió posiciones por la penalización.`,
          );
        }
      }
    } catch (error) {
      console.error('Error chequeando cambios en top 3 post-jurado:', error);
    }
  }
}

export async function checkJuradosExpirados(client: Client): Promise<void> {
  try {
    const expirados = await prisma.jury.findMany({
      where: {
        status: 'active',
        expiresAt: { lte: new Date() },
      },
    });
    for (const jury of expirados) {
      console.log(`⚖️ Cerrando jurado expirado: ${jury.id}`);
      await cerrarVotacion(client, jury.id);
    }
    await procesarPendientes(client);
  } catch (error) {
    console.error('Error chequeando jurados expirados:', error);
  }
}
