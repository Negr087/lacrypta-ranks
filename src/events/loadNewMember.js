"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../services/cache");
const event = {
    name: 'guildMemberAdd',
    once: false,
    execute: async (member) => {
        console.log(`New member joined: ${member.user.tag}`);
        try {
            const prismaGuild = await cache_1.cacheService.getGuildByDiscordId(member.guild.id);
            if (!prismaGuild)
                throw new Error('Guild not found in the database');
            await cache_1.cacheService.upsertMember(prismaGuild?.id, member.id, member.displayName, member.displayAvatarURL());
            console.log(`New member ${member.user.tag} added to the database`);
        }
        catch (error) {
            console.error(`Failed to upsert member: ${member.user.tag}`, error);
        }
    },
};
exports.default = event;
