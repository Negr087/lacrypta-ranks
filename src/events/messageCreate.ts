import { GuildTextBasedChannel, Message } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import { LevelUpStatus, addXpMessage, addXpDirect } from '../services/temporalLevel';
import { prisma } from '../services/prismaClient';
import { cacheService } from '../services/cache';
import { getInicioCicloActual } from '../services/scheduler';

const event: BotEvent = {
  name: 'messageCreate',
  once: false,
  execute: async (message: Message) => {
    console.log('📩 messageCreate triggered');

    if (message.author.bot) {
      // Detectar mensajes de zap (formato: "@sender sent X satoshis to @receiver")
      const zapMatch = message.content.match(/<@!?(\d+)>\s+sent\s+(\d+)\s+satoshis?\s+to\s+<@!?(\d+)>/i);
      if (zapMatch && message.guild) {
        const senderId = zapMatch[1]!;
        const sats = parseInt(zapMatch[2]!, 10);
        const receiverId = zapMatch[3]!;

        // Contar zaps previos entre estos dos usuarios en el ciclo actual
        const inicioCiclo = new Date(getInicioCicloActual());
        const sender = await cacheService.getMemberByDiscordId(message.guild.id, senderId);
        const receiver = await cacheService.getMemberByDiscordId(message.guild.id, receiverId);

        if (sender && receiver) {
          const zapsExistentes = await prisma.xpLog.count({
            where: {
              OR: [
                { memberId: sender.id, zapPairUserId: receiverId },
                { memberId: receiver.id, zapPairUserId: senderId },
              ],
              timestamp: { gte: inicioCiclo },
            },
          });
          // Cada zap genera 2 logs (uno para sender, uno para receiver), por eso dividimos
          const zapsPrevios = Math.floor(zapsExistentes / 2);

          let multiplier = 1;
          let multiplierLabel = '100%';
          if (zapsPrevios === 1) { multiplier = 0.5; multiplierLabel = '50%'; }
          else if (zapsPrevios === 2) { multiplier = 0.25; multiplierLabel = '25%'; }
          else if (zapsPrevios >= 3) { multiplier = 0; multiplierLabel = '0%'; }

          const xpSender = Math.floor((sats / 2) * multiplier);
          const xpReceiver = Math.floor(sats * multiplier);

          console.log(
            `⚡ Zap: ${senderId} -> ${receiverId} (${sats} sats, ${zapsPrevios + 1}° zap entre ellos, ${multiplierLabel} XP: +${xpSender} / +${xpReceiver})`,
          );

          const levelsChannelId = await prisma.guild
            .findUnique({ where: { discordGuildId: message.guild.id } })
            .then((g) => g?.levelsChannelId);
          const canalNotif = message.guild.channels.cache.get(
            levelsChannelId || message.channel.id,
          ) as GuildTextBasedChannel | undefined;

          if (multiplier > 0) {
            const senderStatus = await addXpDirect(
              message.guild.id,
              senderId,
              xpSender,
              message.channel.id,
              message.createdTimestamp,
              receiverId,
            );
            const receiverStatus = await addXpDirect(
              message.guild.id,
              receiverId,
              xpReceiver,
              message.channel.id,
              message.createdTimestamp,
              senderId,
            );

            if (canalNotif) {
              // Si es el 2do o 3er zap, avisar que el XP fue reducido
              if (zapsPrevios > 0) {
                await canalNotif.send(
                  `⚡ Zap registrado entre <@${senderId}> y <@${receiverId}> — XP reducido al ${multiplierLabel} (${zapsPrevios + 1}° zap entre ellos en el ciclo).`,
                );
              }
              if (senderStatus?.canLevelUp) {
                await canalNotif.send(
                  `⚡ Felicitaciones <@${senderId}>! subiste al nivel ${senderStatus.level} por enviar un zap!`,
                );
              }
              if (receiverStatus?.canLevelUp) {
                await canalNotif.send(
                  `⚡ Felicitaciones <@${receiverId}>! subiste al nivel ${receiverStatus.level} por recibir un zap!`,
                );
              }
            }
          } else {
            // 4to zap o más → no suma XP
            if (canalNotif) {
              await canalNotif.send(
                `⚡ Zap entre <@${senderId}> y <@${receiverId}> registrado pero no suma XP (ya alcanzaron el límite de zaps entre ustedes en este ciclo).`,
              );
            }
          }
        }
      }
      console.log('🤖 Mensaje ignorado (es un bot)');
      return;
    }

    console.log(`👤 Mensaje recibido de: ${message.author.username}`);
    console.log(`📝 Contenido: ${message.content}`);

    // Top 3 antes de sumar XP
    const topAntes = await cacheService.getMembersRankingTopTen(message.guild!.id);
    const top3Antes = topAntes?.slice(0, 3).map((m) => m.discordMemeberId) ?? [];

    const levelUpStatus = await addXpMessage(message);

    console.log('⚡ Resultado addXpMessage:', levelUpStatus);

    if (levelUpStatus) {
      const levelsChannelId: string | null | undefined = await prisma.guild
        .findUnique({
          where: { discordGuildId: message.guild?.id },
        })
        .then((guild) => guild?.levelsChannelId);

      const discordChannel: GuildTextBasedChannel | undefined =
        message.guild?.channels.cache.get(
          levelsChannelId || message.channel.id,
        ) as GuildTextBasedChannel;

      if (levelUpStatus.canLevelUp) {
        console.log('🎉 Puede subir de nivel!');
        await discordChannel.send(
          `Felicitaciones <@${message.author.id}>! subiste al nivel ${levelUpStatus.level}!`,
        );
      } else {
        console.log('📈 XP sumado pero no sube de nivel todavía');
      }

      // Top 3 después
      const topDespues = await cacheService.getMembersRankingTopTen(message.guild!.id);
      const top3DespuesFull = topDespues?.slice(0, 3) ?? [];
      const top3Despues = top3DespuesFull.map((m) => m.discordMemeberId);

      const huboCambios = top3Despues.some((id, index) => id !== top3Antes[index]);

      // Solo notificar si el primero del top 3 ya esta en nivel 5 o mas
      const primeroEnNivel5 = top3DespuesFull[0] && top3DespuesFull[0].discordTemporalLevel >= 5;

      if (huboCambios && top3Despues.length >= 1 && primeroEnNivel5) {
        console.log('🏆 Cambio en el top 3!');
        const medals = ['🥇', '🥈', '🥉'];
        const lines = top3Despues.map((id, i) => `${medals[i]} <@${id}>`).join('\n');

        // Detectar a quien destruyo el autor del mensaje
        const autorId = message.author.id;
        const posDespues = top3Despues.indexOf(autorId);
        let destruidoId: string | null = null;

        if (posDespues !== -1 && posDespues < top3Antes.length) {
          const candidato = top3Antes[posDespues];
          if (candidato && candidato !== autorId) {
            destruidoId = candidato;
          }
        }

        let mensajeTop = `🏆 **¡Hubo cambios en el Top 3!**\n${lines}`;
        if (destruidoId) {
          mensajeTop += `\n\n💥 <@${destruidoId}> ¡fuiste destruido!`;
        }

        await discordChannel.send(mensajeTop);
      }
    } else {
      console.log('❌ addXpMessage devolvió undefined');
    }
  },
};

export default event;
