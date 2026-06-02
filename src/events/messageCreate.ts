import { GuildTextBasedChannel, Message } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import { LevelUpStatus, addXpMessage } from '../services/temporalLevel';
import { prisma } from '../services/prismaClient';
import { cacheService } from '../services/cache';

const event: BotEvent = {
  name: 'messageCreate',
  once: false,
  execute: async (message: Message) => {
    console.log('📩 messageCreate triggered');

    if (message.author.bot) {
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
      const top3Despues = topDespues?.slice(0, 3).map((m) => m.discordMemeberId) ?? [];

      const huboCambios = top3Despues.some((id, index) => id !== top3Antes[index]);

      if (huboCambios && top3Despues.length >= 1) {
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
