import { Client, EmbedBuilder, GuildTextBasedChannel } from 'discord.js';
import { prisma } from './prismaClient';
import { cacheService } from './cache';
import { xpConfig } from './temporalLevel';

const DURACION_VOTACION_MS = 12 * 60 * 60 * 1000; // 12 horas

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
  const tiempoStr = jury.status === 'active' ? `${horas}h ${minutos}m restantes` : 'CERRADA';

  let color = 0x3498db;
  if (jury.status !== 'active') {
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
        `\n📊 **Votación:**\n👍 A favor: **${votosFavor}**\n👎 En contra: **${votosContra}**\n\n⏰ ${tiempoStr}`,
    );

  if (jury.status !== 'active') {
    let resultadoStr = '';
    if (jury.result === 'approved') resultadoStr = '✅ **CONDENADO** — Penalización aplicada';
    else if (jury.result === 'rejected') resultadoStr = '❌ Rechazada — No hubo mayoría a favor';
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

  // Mayoría simple: más a favor que en contra
  const aprobado = votosFavor > votosContra;
  const result = aprobado ? 'approved' : 'rejected';

  await prisma.jury.update({
    where: { id: juryId },
    data: {
      status: 'closed',
      closedAt: new Date(),
      result,
    },
  });

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

        // Anuncio del resultado
        if (aprobado && penalizacionInfo) {
          await canal.send(
            `⚖️ **Veredicto:** <@${jury.accusedId}> fue **CONDENADO** por la votación.\n` +
              `Penalización: -${jury.penaltyPercent}% del XP total.\n` +
              `XP antes: ${penalizacionInfo.xpAntes} → XP después: ${penalizacionInfo.xpDespues}\n` +
              `Nivel: ${penalizacionInfo.nivelAntes} → ${penalizacionInfo.nivelDespues}`,
          );
        } else if (aprobado) {
          await canal.send(
            `⚖️ **Veredicto:** la votación contra <@${jury.accusedId}> fue aprobada pero la penalización es 0% (sin efecto).`,
          );
        } else {
          await canal.send(
            `⚖️ **Veredicto:** la votación contra <@${jury.accusedId}> fue **rechazada**. No hubo mayoría a favor.`,
          );
        }
      }
    } catch (error) {
      console.error('Error actualizando mensaje del jurado:', error);
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
  } catch (error) {
    console.error('Error chequeando jurados expirados:', error);
  }
}
