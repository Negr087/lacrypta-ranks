import { Client, GuildTextBasedChannel } from 'discord.js';
import { prisma } from './prismaClient';
import { cacheService } from './cache';

// 🎯 CONFIGURACIÓN DEL CICLO
// Primera fecha de cierre: Lunes 1 de Junio 2026 a las 17:00 hora Argentina (UTC-3)
// = 20:00 UTC
const PRIMER_CIERRE_UTC = new Date('2026-06-01T20:00:00Z').getTime();
const DOS_SEMANAS_MS = 14 * 24 * 60 * 60 * 1000;

// Flags para evitar avisos duplicados en el mismo ciclo
let avisoVeinticuatroEnviado = false;
let avisoUnaHoraEnviado = false;
let cierreEjecutado = false;
let cicloActual = 0;

function getProximoCierre(): number {
  const ahora = Date.now();
  let cierre = PRIMER_CIERRE_UTC;
  while (cierre <= ahora) {
    cierre += DOS_SEMANAS_MS;
  }
  return cierre;
}

export function getInicioCicloActual(): number {
  const ahora = Date.now();
  if (ahora < PRIMER_CIERRE_UTC) {
    return PRIMER_CIERRE_UTC - DOS_SEMANAS_MS;
  }
  let cierre = PRIMER_CIERRE_UTC;
  while (cierre + DOS_SEMANAS_MS <= ahora) {
    cierre += DOS_SEMANAS_MS;
  }
  return cierre;
}

function getCicloActual(): number {
  const ahora = Date.now();
  if (ahora < PRIMER_CIERRE_UTC) return 0;
  return Math.floor((ahora - PRIMER_CIERRE_UTC) / DOS_SEMANAS_MS) + 1;
}

export function getProximoCierreFormateado(): string {
  const cierre = new Date(getProximoCierre());
  return cierre.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTiempoRestante(): { dias: number; horas: number; minutos: number } {
  const restante = getProximoCierre() - Date.now();
  const dias = Math.floor(restante / (1000 * 60 * 60 * 24));
  const horas = Math.floor((restante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
  return { dias, horas, minutos };
}

async function obtenerCanalAnuncios(client: Client, discordGuildId: string): Promise<GuildTextBasedChannel | null> {
  try {
    const guild = await prisma.guild.findUnique({
      where: { discordGuildId },
    });
    if (!guild?.levelsChannelId) return null;

    const discordGuild = client.guilds.cache.get(discordGuildId);
    if (!discordGuild) return null;

    return discordGuild.channels.cache.get(guild.levelsChannelId) as GuildTextBasedChannel;
  } catch (error) {
    console.error('Error obteniendo canal de anuncios:', error);
    return null;
  }
}

async function anunciar24Horas(client: Client) {
  const guilds = await prisma.guild.findMany();
  for (const guild of guilds) {
    const canal = await obtenerCanalAnuncios(client, guild.discordGuildId);
    if (!canal) continue;
    await canal.send(
      `⏰ **¡Atención!** Quedan **24 horas** para el cierre del ranking quincenal.\n\n` +
      `💰 Premios:\n🥇 5000 sats\n🥈 3000 sats\n🥉 1500 sats\n\n` +
      `¡Sigan participando para escalar posiciones! 🚀`,
    );
  }
}

async function anunciar1Hora(client: Client) {
  const guilds = await prisma.guild.findMany();
  for (const guild of guilds) {
    const canal = await obtenerCanalAnuncios(client, guild.discordGuildId);
    if (!canal) continue;
    await canal.send(
      `🚨 **¡ÚLTIMA HORA!** Queda **1 hora** para el cierre del ranking.\n\n` +
      `🔥 Es la última oportunidad para sumar XP y entrar al podio.`,
    );
  }
}

async function ejecutarCierreYReset(client: Client) {
  const guilds = await prisma.guild.findMany();
  for (const guild of guilds) {
    const canal = await obtenerCanalAnuncios(client, guild.discordGuildId);
    if (!canal) continue;

    // Obtener top 3 ANTES del reset
    const top = await cacheService.getMembersRankingTopTen(guild.discordGuildId);
    const top3 = top?.slice(0, 3) ?? [];

    if (top3.length === 0) {
      await canal.send(`📊 El ranking quincenal cerró pero no hubo participantes esta vez.`);
      continue;
    }

    const premios = [5000, 3000, 1500];
    const medallas = ['🥇', '🥈', '🥉'];

    let mensaje = `🏆 **¡CIERRE DEL RANKING QUINCENAL!** 🏆\n\n`;
    mensaje += `Estos son los ganadores:\n\n`;
    top3.forEach((miembro, i) => {
      mensaje += `${medallas[i]} <@${miembro.discordMemeberId}> — Nivel ${miembro.discordTemporalLevel} → **${premios[i]} sats**\n`;
    });
    mensaje += `\n🎉 ¡Felicitaciones a todos! El ranking se reinicia ahora.\nNueva ronda → ¡a participar!`;

    await canal.send(mensaje);

    // Resetear niveles
    await cacheService.resetLevels();
  }
}

export function iniciarScheduler(client: Client) {
  console.log('⏰ Scheduler iniciado');
  console.log(`📅 Próximo cierre: ${getProximoCierreFormateado()}`);

  setInterval(async () => {
    try {
      const ahora = Date.now();
      const proximoCierre = getProximoCierre();
      const ciclo = getCicloActual();

      // Si cambió el ciclo, reseteamos las flags
      if (ciclo !== cicloActual) {
        avisoVeinticuatroEnviado = false;
        avisoUnaHoraEnviado = false;
        cierreEjecutado = false;
        cicloActual = ciclo;
      }

      const restante = proximoCierre - ahora;

      // Aviso 24 horas antes (entre 23h59m y 24h00m antes)
      if (!avisoVeinticuatroEnviado && restante <= 24 * 60 * 60 * 1000 && restante > 23 * 60 * 60 * 1000) {
        console.log('📢 Enviando aviso de 24hs');
        await anunciar24Horas(client);
        avisoVeinticuatroEnviado = true;
      }

      // Aviso 1 hora antes (entre 59m y 60m antes)
      if (!avisoUnaHoraEnviado && restante <= 60 * 60 * 1000 && restante > 59 * 60 * 1000) {
        console.log('📢 Enviando aviso de 1h');
        await anunciar1Hora(client);
        avisoUnaHoraEnviado = true;
      }

      // Cierre (cuando llegó la hora)
      if (!cierreEjecutado && restante <= 0 && restante > -60 * 1000) {
        console.log('🏆 Ejecutando cierre del ranking');
        await ejecutarCierreYReset(client);
        cierreEjecutado = true;
      }
    } catch (error) {
      console.error('Error en scheduler:', error);
    }
  }, 30 * 1000); // Chequea cada 30 segundos
}
