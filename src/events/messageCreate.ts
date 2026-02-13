import { GuildTextBasedChannel, Message } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import { LevelUpStatus, addXpMessage } from '../services/temporalLevel';
import { prisma } from '../services/prismaClient';

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

    const levelUpStatus = await addXpMessage(message);

    console.log('⚡ Resultado addXpMessage:', levelUpStatus);

    if (levelUpStatus) {
      console.log('📊 LevelUpStatus detectado');

      const levelsChannelId: string | null | undefined = await prisma.guild
        .findUnique({
          where: {
            discordGuildId: message.guild?.id,
          },
        })
        .then((guild) => guild?.levelsChannelId);

      console.log('📡 Canal configurado en DB:', levelsChannelId);

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
    } else {
      console.log('❌ addXpMessage devolvió undefined');
    }
  },
};

export default event;