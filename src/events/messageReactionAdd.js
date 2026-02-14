"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roleReaction_1 = require("../commands/roleReaction/roleReaction");
const temporalLevel_1 = require("../services/temporalLevel");
const cache_1 = require("../services/cache");
const prismaClient_1 = require("../services/prismaClient");
const event = {
    name: 'messageReactionAdd',
    once: false,
    execute: async (reaction, discordMember) => {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            }
            catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }
        console.log(`[messageReactionAdd.ts] <@${discordMember.id}> reacted with ${reaction.emoji.name} to message ${reaction.message.id}`);
        ////////////////////////////////////////////
        //            Temporal Level              //
        ////////////////////////////////////////////
        const levelUpStatus = await (0, temporalLevel_1.addXpReaction)(reaction, discordMember);
        if (!levelUpStatus) {
            console.error('[messageReactionAdd.ts] Failed to add xp to member');
        }
        else {
            // Find levels channel
            const levelsChannelId = await prismaClient_1.prisma.guild
                .findUnique({
                where: {
                    discordGuildId: reaction.message.guild?.id,
                },
            })
                .then((guild) => guild?.levelsChannelId);
            const discordChannel = reaction.message.guild?.channels.cache.get(levelsChannelId || reaction.message.channel.id);
            if (levelUpStatus['reactionAuthor']) {
                if (levelUpStatus['reactionAuthor'].canLevelUp) {
                    await discordChannel.send(`Felicitaciones <@${discordMember.id}>! subiste al nivel ${levelUpStatus['reactionAuthor'].level}!`);
                }
                // else {
                //   await discordChannel.send(
                //     `<@${discordMember.id}>! subiste ${levelUpStatus['reactionAuthor'].xpRemaining} puntos de experiencia **por reaccionar**!`,
                //   );
                // }
            }
            if (levelUpStatus['messageAuthor']) {
                if (levelUpStatus['messageAuthor'].canLevelUp) {
                    await discordChannel.send(`Felicitaciones <@${reaction.message.author?.id}>! subiste al nivel ${levelUpStatus['messageAuthor'].level}!`);
                }
                // else {
                //   await discordChannel.send(
                //     `<@${reaction.message.author?.id}>! subiste ${levelUpStatus['messageAuthor'].xpRemaining} puntos de experiencia **por recibir una reaccion**!`,
                //   );
                // }
            }
        }
        //          End Temporal Level            //
        ////////////////////////////////////////////
        //            Role Reaction               //
        ////////////////////////////////////////////
        const discordEmojiId = reaction.emoji.id || reaction.emoji.name;
        const discordMessageId = reaction.message.id;
        // Get messages from database
        const prismaMessages = await cache_1.cacheService.getAllMessages();
        if (!prismaMessages) {
            console.error('[messageReactionAdd.ts] Failed to get message from database:');
            return;
        }
        /// /role-reaction ///
        if (prismaMessages[discordMessageId] && prismaMessages[discordMessageId].discordCommandName === 'role-reaction') {
            const prismaMessageReactionRoleEmpty = await cache_1.cacheService.updateMessageReactionRoleWithEmojiNullByPrismaMessageId(prismaMessages[discordMessageId]?.id, discordEmojiId);
            // Setup if not exists
            if (!prismaMessageReactionRoleEmpty) {
                await (0, roleReaction_1.reactionToMessage)(reaction, discordEmojiId);
                await (0, roleReaction_1.selectMenu)();
                return;
            }
            // Give role to user
            else {
                if (discordMember.user.bot)
                    return;
                // Get messageReactionRole from cache
                const prismaMessageReactionRole = await cache_1.cacheService.getMessageReactionRoleByPrismaMessageId(prismaMessages[discordMessageId].id, discordEmojiId);
                if (!prismaMessageReactionRole) {
                    console.error('Failed to get messageReactionRole from cache');
                    return;
                }
                // Get role from guild
                const discordRoleToAsign = reaction.message.guild.roles.cache.get(prismaMessageReactionRole.roleId);
                try {
                    if (discordRoleToAsign) {
                        if (discordMember.roles.cache.has(discordRoleToAsign.id)) {
                            await discordMember.roles.remove(discordRoleToAsign);
                        }
                        else {
                            await discordMember.roles.add(discordRoleToAsign);
                        }
                        if (discordMember.roles.cache.has(discordRoleToAsign.id)) {
                            await discordMember.roles.remove(discordRoleToAsign);
                            // TODO: send message to user
                        }
                        else {
                            await discordMember.roles.add(discordRoleToAsign);
                            // TODO: send message to user
                        }
                    }
                    console.log(`[messageReactionAdd.ts] Gave role ${discordRoleToAsign?.name} to <@${discordMember.id}>`);
                    return;
                }
                catch (error) {
                    console.error('Failed to give role to user:', error);
                }
            }
        }
        //            Role Reaction               //
    },
};
exports.default = event;
