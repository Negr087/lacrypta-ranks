import { BotEvent } from '../types/botEvents';
import { deployCommands } from '../deployCommands';
import { cacheService } from '../services/cache';
import { Client } from 'discord.js';

const event: BotEvent = {
  name: 'ready',
  once: true,
  execute: async (_client: Client) => {
    console.log('🟢 Evento READY ejecutado');

    await deployCommands(_client);

    console.log('\n---> Loading guilds, roles, and members... <---');

    console.log('📦 Guilds detectadas en cache:', _client.guilds.cache.size);

    for (const [guildId, guild] of _client.guilds.cache) {
      try {
        console.log('\n====================================');
        console.log(`🏠 Procesando guild: ${guild.name} (${guildId})`);

        // --- GUILD ---
        await cacheService.upsertGuild(guildId);
        console.log(`✅ Guild upserted en DB: ${guild.name}`);

        // --- ROLES ---
        console.log(`🎭 Roles encontrados: ${guild.roles.cache.size}`);

        for (const role of guild.roles.cache.values()) {
          try {
            await cacheService.upsertRole(guildId, role.id, role.name);
            console.log(`   ➜ Role upserted: ${role.name}`);
          } catch (error) {
            console.error(`❌ Error al upsert role: ${role.name}`, error);
          }
        }

        // --- MEMBERS CACHE ---
        console.log(`👥 Miembros en cache antes de fetch: ${guild.members.cache.size}`);

        // --- FETCH COMPLETO ---
        const members = await guild.members.fetch();
        console.log(`👥 Miembros después de fetch: ${members.size}`);

        let insertedCount = 0;

        for (const member of members.values()) {
          if (!member.user.bot) {
            try {
              await cacheService.upsertMember(
                guildId,
                member.id,
                member.displayName,
                member.displayAvatarURL(),
              );

              console.log(`   ➜ Member upserted: ${member.displayName} (${member.id})`);
              insertedCount++;
            } catch (error) {
              console.error(`❌ Error al upsert member: ${member.displayName}`, error);
            }
          }
        }

        console.log(`🎯 Total miembros insertados: ${insertedCount}`);
        console.log(`🏁 Guild terminada: ${guild.name}`);
      } catch (error) {
        console.error(`🔥 Failed to process guild: ${guild.name} (${guildId})`, error);
      }
    }

    console.log('\n---> All guilds, roles, and members loaded <---');

    // Sync levels cada 1 minuto
    setInterval(async () => {
      try {
        const updateLevelStatus: boolean = await cacheService.updateMembersLevelsToDatabase();
        console.log('🔄 updateLevelStatus:', updateLevelStatus);
      } catch (error) {
        console.error('❌ Error updating members levels to DB', error);
      }
    }, 60 * 1000);

    console.log('🚀 Discord bot ready!');
  },
};

export default event;