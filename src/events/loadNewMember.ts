import { BotEvent } from '../types/botEvents';
import { GuildMember } from 'discord.js';
import { Guild as PrismaGuild } from '@prisma/client';
import { cacheService } from '../services/cache';

const event: BotEvent = {
  name: 'guildMemberAdd',
  once: false,
  execute: async (member: GuildMember) => {
    console.log(`New member joined: ${member.user.tag}`);

    try {
      const prismaGuild: PrismaGuild | null = await cacheService.getGuildByDiscordId(member.guild.id);

      if (!prismaGuild) throw new Error('Guild not found in the database');

      await cacheService.upsertMember(prismaGuild?.id!, member.id, member.displayName, member.displayAvatarURL());

      console.log(`New member ${member.user.tag} added to the database`);
    } catch (error) {
      console.error(`Failed to upsert member: ${member.user.tag}`, error);
    }
  },
};

export default event;
