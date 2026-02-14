"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const prismaClient_1 = require("./prismaClient");
class CacheService {
    guild = null;
    channelsIndexByDiscordId = {};
    messagesIndexByDiscordId = {};
    rolesIndexByDiscordId = {};
    membersIndexById = {
        byPrismaId: {},
        byDiscordId: {},
    };
    messageReactionRolesIndexByPrismaMessageId = {};
    reactionButtonsIndexByPrismaRoleId = {};
    padrinosIndexByMemberId = {};
    ////////////////////////////////////////////
    //                Guild                   //
    ////////////////////////////////////////////
    async upsertGuild(_discordGuildId) {
        // If guild is not in the cache, create it in the database
        const prismaGuild = await prismaClient_1.prisma.guild.upsert({
            where: {
                discordGuildId: _discordGuildId,
            },
            update: {
                discordGuildId: _discordGuildId,
            },
            create: {
                discordGuildId: _discordGuildId,
            },
        });
        // If the guild is in the database, add it to the cache and return it. If not, return null
        return prismaGuild ? (this.guild = prismaGuild) : prismaGuild;
    }
    async getGuildByDiscordId(_discordGuildId) {
        if (_discordGuildId === null)
            return null;
        // Check if guild is already in the cache
        if (this.guild)
            return this.guild;
        // If guild is not in the cache, check the database
        const prismaGuild = await prismaClient_1.prisma.guild.findUnique({
            where: {
                discordGuildId: _discordGuildId,
            },
        });
        // If the guild is in the database, add it to the cache and return it. If not, return null
        return prismaGuild ? (this.guild = prismaGuild) : prismaGuild;
    }
    ////////////////////////////////////////////
    //               Channel                  //
    ////////////////////////////////////////////
    async createChannel(_discordGuildId, _discordChannelId) {
        // Check if the channel is already in the cache
        const channelAux = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);
        if (channelAux)
            return channelAux;
        // Check if the guild exist
        const prismaGuild = await prismaClient_1.prisma.guild.findUnique({
            where: {
                discordGuildId: _discordGuildId,
            },
        });
        if (!prismaGuild)
            return null;
        // If the channel isn't in the cache, create it in the database
        const prismaChannel = await prismaClient_1.prisma.channel.create({
            data: {
                guildId: prismaGuild.id,
                discordChannelId: _discordChannelId,
            },
        });
        // If the channel is in the database, add it to the cache and return it. If not, return null
        return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
    }
    async getChannelByDiscordId(_discordGuildId, _discordChannelId) {
        if (_discordChannelId === null || _discordChannelId === null)
            return null;
        // Check if the channel is already in the cache
        if (this.channelsIndexByDiscordId[_discordChannelId])
            return this.channelsIndexByDiscordId[_discordChannelId];
        // If the channel is not in the cache, check the database
        const prismaChannel = await prismaClient_1.prisma.channel.findUnique({
            where: {
                discordChannelId: _discordChannelId,
            },
        });
        // If the channel is in the database, add it to the cache and return it. If not, return null
        return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
    }
    ////////////////////////////////////////////
    //               Message                  //
    ////////////////////////////////////////////
    async createMessage(_discordGuildId, _discordChannelId, _discordMessageId, _discordCommandName) {
        // Check if the message is already in the cache
        const messageAux = await this.getMessageByDiscordId(_discordChannelId, _discordMessageId);
        if (messageAux)
            return messageAux;
        // Check if the channel exist
        const prismaChannel = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);
        if (!prismaChannel)
            return null;
        // If the message isn't in the cache, create it in the database
        const prismaMessage = await prismaClient_1.prisma.message.create({
            data: {
                discordMessageId: _discordMessageId,
                discordCommandName: _discordCommandName ? _discordCommandName : null,
                channelId: this.channelsIndexByDiscordId[_discordChannelId].id,
            },
        });
        // If the message is in the database, add it to the cache and return it. If not, return null
        return prismaMessage ? (this.messagesIndexByDiscordId[_discordMessageId] = prismaMessage) : prismaMessage;
    }
    async getMessageByDiscordId(_discordChannelId, _discordMessageId) {
        if (_discordMessageId === null || _discordChannelId === null)
            return null;
        // Check if the message is already in the cache
        if (this.messagesIndexByDiscordId[_discordMessageId])
            return this.messagesIndexByDiscordId[_discordMessageId];
        // If the message is not in the cache, check the database
        const prismaMessage = await prismaClient_1.prisma.message.findUnique({
            where: {
                discordMessageId: _discordMessageId,
            },
        });
        // If the message is in the database, add it to the cache and return it. If not, return null
        return prismaMessage ? (this.messagesIndexByDiscordId[_discordChannelId] = prismaMessage) : prismaMessage;
    }
    async getAllMessages() {
        if (this.messagesIndexByDiscordId.length === undefined) {
            const prismaMessages = await prismaClient_1.prisma.message.findMany();
            if (prismaMessages) {
                prismaMessages.forEach((prismaMessage) => {
                    this.messagesIndexByDiscordId[prismaMessage.discordMessageId] = prismaMessage;
                });
            }
            else {
                return null;
            }
        }
        return this.messagesIndexByDiscordId;
    }
    ////////////////////////////////////////////
    //                Role                    //
    ////////////////////////////////////////////
    async upsertRole(_discordGuildId, _discordRoleId, _discordRoleName) {
        // Get Prisma Guild
        const prismaGuild = await this.getGuildByDiscordId(_discordGuildId);
        if (!prismaGuild)
            return null;
        // Create it in the database
        const prismaRole = await prismaClient_1.prisma.role.upsert({
            where: {
                discordRoleId: _discordRoleId,
            },
            update: {
                discordRoleName: _discordRoleName,
            },
            create: {
                guildId: prismaGuild.id,
                discordRoleId: _discordRoleId,
                discordRoleName: _discordRoleName,
            },
        });
        // If the role is in the database, add it to the cache and return it. If not, return null
        return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
    }
    async getRoleByDiscordId(_discordGuildId, _discordRoleId) {
        if (_discordRoleId === null || _discordGuildId === null)
            return null;
        // Check if the role is already in the cache
        if (this.rolesIndexByDiscordId[_discordRoleId])
            return this.rolesIndexByDiscordId[_discordRoleId];
        // If the role is not in the cache, check the database
        const prismaRole = await prismaClient_1.prisma.role.findUnique({
            where: {
                guildId: _discordGuildId,
                discordRoleId: _discordRoleId,
            },
        });
        // If the role is in the database, add it to the cache and return it. If not, return null
        return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
    }
    async getAllRoles() {
        if (this.rolesIndexByDiscordId.length === undefined) {
            const prismaRoles = await prismaClient_1.prisma.role.findMany();
            if (prismaRoles) {
                prismaRoles.forEach((prismaRole) => {
                    this.rolesIndexByDiscordId[prismaRole.discordRoleId] = prismaRole;
                });
            }
            else {
                return null;
            }
        }
        return this.rolesIndexByDiscordId;
    }
    ////////////////////////////////////////////
    //         MessageReactionRole            //
    ////////////////////////////////////////////
    async createMessageReactionRole(_prismaMessageId, _prismaRoleId, _discordEmojiId) {
        // If the role is not in the cache, create it in the database
        const prismaMessageReactionRole = await prismaClient_1.prisma.messageReactionRole.create({
            data: {
                messageId: _prismaMessageId,
                roleId: _prismaRoleId,
                discordEmojiId: _discordEmojiId ? _discordEmojiId : null,
            },
        });
        // If the role is in the database, add it to the cache and return it. If not, return null
        return prismaMessageReactionRole
            ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = prismaMessageReactionRole)
            : prismaMessageReactionRole;
    }
    async getMessageReactionRoleByPrismaMessageId(_prismaMessageId, _discordEmojiId) {
        if (_prismaMessageId === null || _discordEmojiId === null)
            return null;
        // Check if the role is already in the cache
        if (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId].discordEmojiId === _discordEmojiId)
            return this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId];
        // If the role is not in the cache, check the database
        const prismaMessageReactionRole = await prismaClient_1.prisma.messageReactionRole.findMany({
            where: {
                messageId: _prismaMessageId,
                discordEmojiId: _discordEmojiId,
            },
        });
        // If the role is in the database, add it to the cache and return it. If not, return null
        return prismaMessageReactionRole[0]
            ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = prismaMessageReactionRole[0])
            : null;
    }
    async updateMessageReactionRoleWithEmojiNullByPrismaMessageId(_prismaMessageId, _discordEmojiId) {
        const prismaMessageReactionRoleAux = await prismaClient_1.prisma.messageReactionRole.findMany({
            where: {
                messageId: _prismaMessageId,
                discordEmojiId: null,
            },
        });
        if (prismaMessageReactionRoleAux.length > 0) {
            await prismaClient_1.prisma.messageReactionRole.updateMany({
                where: {
                    messageId: _prismaMessageId,
                    discordEmojiId: null,
                },
                data: {
                    discordEmojiId: _discordEmojiId,
                },
            });
            const prismaMessageReactionRole = await prismaClient_1.prisma.messageReactionRole.findMany({
                where: {
                    messageId: _prismaMessageId,
                    roleId: prismaMessageReactionRoleAux[0]?.roleId,
                },
            });
            return prismaMessageReactionRole[0]
                ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = prismaMessageReactionRole[0])
                : null;
        }
        return null;
    }
    ////////////////////////////////////////////
    //              ReactionButton            //
    ////////////////////////////////////////////
    async createReactionButton(_prismaRoleId, _discordButtonId) {
        // If the role isn't in the cache, create it in the database
        const prismaReactionButton = await prismaClient_1.prisma.reactionButton.create({
            data: {
                roleId: _prismaRoleId,
                discordButtonId: _discordButtonId,
            },
        });
        // If the role is in the database, add it to the cache and return it. If not, return null
        return prismaReactionButton
            ? (this.reactionButtonsIndexByPrismaRoleId[_prismaRoleId] = prismaReactionButton)
            : prismaReactionButton;
    }
    ////////////////////////////////////////////
    //                Member                  //
    ////////////////////////////////////////////
    async upsertMember(_discordGuildId, _discordMemberId, _discordMemberDisplayName, _discordMemberProfilePicture) {
        try {
            const prismaGuild = await exports.cacheService.getGuildByDiscordId(_discordGuildId);
            // Upsert member in the db
            const prismaMember = await prismaClient_1.prisma.member.upsert({
                where: {
                    discordMemeberId: _discordMemberId,
                },
                update: {
                    discordDisplayName: _discordMemberDisplayName,
                    discordProfilePicture: _discordMemberProfilePicture,
                    guildId: prismaGuild.id,
                },
                create: {
                    discordMemeberId: _discordMemberId,
                    discordDisplayName: _discordMemberDisplayName,
                    discordProfilePicture: _discordMemberProfilePicture,
                    guildId: prismaGuild.id,
                    discordTemporalLevelXp: 0,
                    discordTemporalLevel: 0,
                    discordTemporalLevelCooldown: Date.now().toString(),
                },
            });
            // Upsert member in the cache
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
            // console.log(`Member ${_discordMemberDisplayName} upserted`); // debug
            return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : null;
        }
        catch (error) {
            console.error(`Failed to upsert member: ${_discordMemberDisplayName}`, error); // debug
            return null;
        }
    }
    async incrementMemberXp(_prismaMember, _xp, _timestamp) {
        // Check if the member is in the cache
        const prismaMemberId = this.membersIndexById.byPrismaId[_prismaMember.id];
        if (!prismaMemberId)
            return null;
        // Only increment in cache
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelXp += _xp;
        if (_timestamp)
            this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelCooldown = _timestamp;
        return this.membersIndexById.byPrismaId[_prismaMember.id];
    }
    async levelUpMember(_prismaMember, _xp, _level, _timestamp) {
        const prismaMemberId = this.membersIndexById.byPrismaId[_prismaMember.id];
        if (!prismaMemberId)
            return null;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelXp = _xp;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevel = _level;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelCooldown = _timestamp;
        return this.membersIndexById.byPrismaId[_prismaMember.id];
    }
    async updateMembersLevelsToDatabase() {
        try {
            await prismaClient_1.prisma.$transaction(Object.values(this.membersIndexById.byPrismaId).map((prismaMember) => {
                return prismaClient_1.prisma.member.update({
                    where: {
                        id: prismaMember.id,
                    },
                    data: {
                        discordTemporalLevel: prismaMember.discordTemporalLevel,
                        discordTemporalLevelXp: prismaMember.discordTemporalLevelXp,
                        discordTemporalLevelCooldown: prismaMember.discordTemporalLevelCooldown,
                    },
                });
            }));
            return true;
        }
        catch (error) {
            console.error(`Failed to update members levels to the database`, error);
            return false;
        }
    }
    async resetLevels() {
        try {
            await prismaClient_1.prisma.member.updateMany({
                data: {
                    discordTemporalLevel: 0,
                    discordTemporalLevelXp: 0,
                    discordTemporalLevelCooldown: Date.now().toString(),
                },
            });
            const cooldown = Date.now().toString();
            Object.values(this.membersIndexById.byPrismaId).forEach((prismaMember) => {
                prismaMember.discordTemporalLevel = 0;
                prismaMember.discordTemporalLevelXp = 0;
                prismaMember.discordTemporalLevelCooldown = cooldown;
            });
            return true;
        }
        catch (error) {
            console.error(`Failed to reset levels`, error);
            return false;
        }
    }
    async updatePadrinoOfMember(_discordMemberId, _prismaPadrinoId) {
        // Update Memeber in the database
        const prismaMember = await prismaClient_1.prisma.member.update({
            where: {
                discordMemeberId: _discordMemberId,
            },
            data: {
                myPadrinoId: _prismaPadrinoId,
            },
        });
        if (prismaMember) {
            // console.log(`Member ${prismaMember.discordDisplayName} padrino updated`); // debug
            // Add the member to the cache
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
        }
        return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : null;
    }
    async getMemberByDiscordId(_discordGuildId, _discordMemberId) {
        if (_discordMemberId === null || _discordMemberId === null)
            return null;
        // Check if the guild exist
        if (!this.guild)
            return null;
        // Check if the member is already in the cache
        if (this.membersIndexById.byDiscordId[_discordMemberId]) {
            const prismaMemberId = this.membersIndexById.byDiscordId[_discordMemberId];
            // console.log(`Member ${this.membersIndexById.byPrismaId[prismaMemberId]!.discordDisplayName} already in cache`); // debug
            return this.membersIndexById.byPrismaId[prismaMemberId];
        }
        // If the member is not in the cache, check the database
        const prismaMember = await prismaClient_1.prisma.member.findUnique({
            where: {
                guildId: _discordGuildId,
                discordMemeberId: _discordMemberId,
            },
        });
        if (prismaMember) {
            // console.log(`Member ${prismaMember.discordDisplayName} added to cache`); // debug
            // Add the member to the cache
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
        }
        // If the member is in the database return it. If not, return null
        return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : prismaMember;
    }
    async getMemberByPrismaId(_prismaMemberId) {
        console.log('[cacheService.ts] getMemberByPrismaId() _prismaMemberId:', _prismaMemberId); // debug
        console.log(); // debug
        if (_prismaMemberId === null)
            return null;
        // Check if the guild exist
        console.log('[cacheService.ts] getMemberByPrismaId() this.guild:', this.guild); // debug
        console.log(); // debug
        if (!this.guild)
            return null;
        // Check if the member is already in the cache
        console.log('[cacheService.ts] getMemberByPrismaId() this.membersIndexById.byPrismaId[_prismaMemberId]:', this.membersIndexById.byPrismaId[_prismaMemberId]); // debug
        console.log(); // debug
        if (this.membersIndexById.byPrismaId[_prismaMemberId]) {
            return this.membersIndexById.byPrismaId[_prismaMemberId];
        }
        // If the member is not in the cache, check the database
        const prismaMember = await prismaClient_1.prisma.member.findUnique({
            where: {
                id: _prismaMemberId,
            },
        });
        console.log('[cacheService.ts] getMemberByPrismaId() prismaMember:', prismaMember); // debug
        console.log(); // debug
        if (prismaMember) {
            // console.log(`Member ${prismaMember.discordDisplayName} added to cache`); // debug
            // Add the member to the cache
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
        }
        return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : null;
    }
    async getMembersRankingTopTen(_discordGuildId) {
        if (_discordGuildId === null)
            return null;
        const prismaGuild = await exports.cacheService.getGuildByDiscordId(_discordGuildId);
        const prismaMembers = await prismaClient_1.prisma.member.findMany({
            where: {
                guildId: prismaGuild.id,
            },
            orderBy: [{ discordTemporalLevel: 'desc' }, { discordTemporalLevelXp: 'desc' }],
            take: 10,
        });
        return prismaMembers ? prismaMembers : null;
    }
    ////////////////////////////////////////////
    //               Padrino                  //
    ////////////////////////////////////////////
    async createPadrino(_memberId, _shortDescription, _longDescription) {
        // Check if the padrino is already in the cache
        if (this.padrinosIndexByMemberId[_memberId])
            return this.padrinosIndexByMemberId[_memberId];
        // If the padrino is not in the cache, create it in the database
        const prismaPadrino = await prismaClient_1.prisma.padrino.create({
            data: {
                memberId: _memberId,
                shortDescription: _shortDescription,
                longDescription: _longDescription,
            },
        });
        // If the padrino is in the database, add it to the cache and return it. If not, return null
        return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
    }
    async updatePadrino(_padrinoId, _shortDescription, _longDescription) {
        // Build the data object dynamically based on non-empty inputs
        const data = {};
        if (_shortDescription !== undefined) {
            data.shortDescription = _shortDescription;
        }
        if (_longDescription !== undefined) {
            data.longDescription = _longDescription;
        }
        // Update only if there's something to update
        if (Object.keys(data).length === 0) {
            const existingPadrino = await prismaClient_1.prisma.padrino.findUnique({
                where: { id: _padrinoId },
            });
            return existingPadrino;
        }
        // Update padrino in the database
        const prismaPadrino = await prismaClient_1.prisma.padrino.update({
            where: {
                id: _padrinoId,
            },
            data: data,
        });
        // Update padrino in the cache
        return (this.padrinosIndexByMemberId[prismaPadrino.memberId] = prismaPadrino);
    }
    async getPadrinoByPrismaId(_prismaPadrinoId) {
        if (_prismaPadrinoId === null)
            return null;
        // Check if the padrino is already in the cache
        if (this.padrinosIndexByMemberId[_prismaPadrinoId])
            return this.padrinosIndexByMemberId[_prismaPadrinoId];
        // If the padrino is not in the cache, check the database
        const prismaPadrino = await prismaClient_1.prisma.padrino.findUnique({
            where: {
                id: _prismaPadrinoId,
            },
        });
        // If the padrino is in the database, add it to the cache and return it. If not, return null
        return prismaPadrino ? (this.padrinosIndexByMemberId[_prismaPadrinoId] = prismaPadrino) : prismaPadrino;
    }
    async getPadrinoByMemberId(_memberId) {
        if (_memberId === null)
            return null;
        // Check if the padrino is already in the cache
        if (this.padrinosIndexByMemberId[_memberId])
            return this.padrinosIndexByMemberId[_memberId];
        // If the padrino is not in the cache, check the database
        const prismaPadrino = await prismaClient_1.prisma.padrino.findUnique({
            where: {
                memberId: _memberId,
            },
        });
        // If the padrino is in the database, add it to the cache and return it. If not, return null
        return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
    }
    async getAhijadosByMemberId(_memberId) {
        if (_memberId === null)
            return null;
        const prismaAhijados = await prismaClient_1.prisma.member.findMany({
            where: {
                myPadrinoId: _memberId,
            },
        });
        return prismaAhijados ? prismaAhijados : null;
    }
    async getAllPadrinos() {
        if (this.padrinosIndexByMemberId.length === undefined) {
            const prismaPadrinos = await prismaClient_1.prisma.padrino.findMany();
            if (prismaPadrinos) {
                prismaPadrinos.forEach((prismaPadrino) => {
                    this.padrinosIndexByMemberId[prismaPadrino.memberId] = prismaPadrino;
                });
            }
            else {
                return null;
            }
        }
        return this.padrinosIndexByMemberId;
    }
}
exports.cacheService = new CacheService();
