"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const prismaClient_1 = require("./prismaClient");
// ============================================
// CacheService Implementation
// ============================================
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
        const prismaGuild = await prismaClient_1.prisma.guild.upsert({
            where: { discordGuildId: _discordGuildId },
            update: { discordGuildId: _discordGuildId },
            create: { discordGuildId: _discordGuildId },
        });
        return prismaGuild ? (this.guild = prismaGuild) : prismaGuild;
    }
    async getGuildByDiscordId(_discordGuildId) {
        if (_discordGuildId === null)
            return null;
        if (this.guild)
            return this.guild;
        const prismaGuild = await prismaClient_1.prisma.guild.findUnique({
            where: { discordGuildId: _discordGuildId },
        });
        return prismaGuild ? (this.guild = prismaGuild) : prismaGuild;
    }
    ////////////////////////////////////////////
    //               Channel                  //
    ////////////////////////////////////////////
    async createChannel(_discordGuildId, _discordChannelId) {
        const channelAux = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);
        if (channelAux)
            return channelAux;
        const prismaGuild = await prismaClient_1.prisma.guild.findUnique({ where: { discordGuildId: _discordGuildId } });
        if (!prismaGuild)
            return null;
        const prismaChannel = await prismaClient_1.prisma.channel.create({
            data: { guildId: prismaGuild.id, discordChannelId: _discordChannelId },
        });
        return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
    }
    async getChannelByDiscordId(_discordGuildId, _discordChannelId) {
        if (_discordChannelId === null)
            return null;
        if (this.channelsIndexByDiscordId[_discordChannelId])
            return this.channelsIndexByDiscordId[_discordChannelId];
        const prismaChannel = await prismaClient_1.prisma.channel.findUnique({ where: { discordChannelId: _discordChannelId } });
        return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
    }
    ////////////////////////////////////////////
    //               Message                  //
    ////////////////////////////////////////////
    async createMessage(_discordGuildId, _discordChannelId, _discordMessageId, _discordCommandName) {
        const messageAux = await this.getMessageByDiscordId(_discordChannelId, _discordMessageId);
        if (messageAux)
            return messageAux;
        const prismaChannel = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);
        if (!prismaChannel)
            return null;
        const prismaMessage = await prismaClient_1.prisma.message.create({
            data: {
                discordMessageId: _discordMessageId,
                discordCommandName: _discordCommandName ? _discordCommandName : null,
                channelId: this.channelsIndexByDiscordId[_discordChannelId].id,
            },
        });
        return prismaMessage ? (this.messagesIndexByDiscordId[_discordMessageId] = prismaMessage) : prismaMessage;
    }
    async getMessageByDiscordId(_discordChannelId, _discordMessageId) {
        if (_discordMessageId === null || _discordChannelId === null)
            return null;
        if (this.messagesIndexByDiscordId[_discordMessageId])
            return this.messagesIndexByDiscordId[_discordMessageId];
        const prismaMessage = await prismaClient_1.prisma.message.findUnique({ where: { discordMessageId: _discordMessageId } });
        return prismaMessage ? (this.messagesIndexByDiscordId[_discordChannelId] = prismaMessage) : prismaMessage;
    }
    async getAllMessages() {
        if (this.messagesIndexByDiscordId.length === undefined) {
            const prismaMessages = await prismaClient_1.prisma.message.findMany();
            if (prismaMessages) {
                prismaMessages.forEach((m) => { this.messagesIndexByDiscordId[m.discordMessageId] = m; });
            }
            else
                return null;
        }
        return this.messagesIndexByDiscordId;
    }
    ////////////////////////////////////////////
    //                Role                    //
    ////////////////////////////////////////////
    async upsertRole(_discordGuildId, _discordRoleId, _discordRoleName) {
        const prismaGuild = await this.getGuildByDiscordId(_discordGuildId);
        if (!prismaGuild)
            return null;
        const prismaRole = await prismaClient_1.prisma.role.upsert({
            where: { discordRoleId: _discordRoleId },
            update: { discordRoleName: _discordRoleName },
            create: { guildId: prismaGuild.id, discordRoleId: _discordRoleId, discordRoleName: _discordRoleName },
        });
        return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
    }
    async getRoleByDiscordId(_discordGuildId, _discordRoleId) {
        if (_discordRoleId === null || _discordGuildId === null)
            return null;
        if (this.rolesIndexByDiscordId[_discordRoleId])
            return this.rolesIndexByDiscordId[_discordRoleId];
        const prismaRole = await prismaClient_1.prisma.role.findUnique({ where: { guildId: _discordGuildId, discordRoleId: _discordRoleId } });
        return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
    }
    async getAllRoles() {
        if (this.rolesIndexByDiscordId.length === undefined) {
            const prismaRoles = await prismaClient_1.prisma.role.findMany();
            if (prismaRoles) {
                prismaRoles.forEach((r) => { this.rolesIndexByDiscordId[r.discordRoleId] = r; });
            }
            else
                return null;
        }
        return this.rolesIndexByDiscordId;
    }
    ////////////////////////////////////////////
    //         MessageReactionRole            //
    ////////////////////////////////////////////
    async createMessageReactionRole(_prismaMessageId, _prismaRoleId, _discordEmojiId) {
        const prismaMessageReactionRole = await prismaClient_1.prisma.messageReactionRole.create({
            data: { messageId: _prismaMessageId, roleId: _prismaRoleId, discordEmojiId: _discordEmojiId ? _discordEmojiId : null },
        });
        return prismaMessageReactionRole
            ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = prismaMessageReactionRole)
            : prismaMessageReactionRole;
    }
    async getMessageReactionRoleByPrismaMessageId(_prismaMessageId, _discordEmojiId) {
        if (_prismaMessageId === null || _discordEmojiId === null)
            return null;
        if (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId]?.discordEmojiId === _discordEmojiId)
            return this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId];
        const results = await prismaClient_1.prisma.messageReactionRole.findMany({ where: { messageId: _prismaMessageId, discordEmojiId: _discordEmojiId } });
        return results[0] ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = results[0]) : null;
    }
    async updateMessageReactionRoleWithEmojiNullByPrismaMessageId(_prismaMessageId, _discordEmojiId) {
        const aux = await prismaClient_1.prisma.messageReactionRole.findMany({ where: { messageId: _prismaMessageId, discordEmojiId: null } });
        if (aux.length > 0) {
            await prismaClient_1.prisma.messageReactionRole.updateMany({ where: { messageId: _prismaMessageId, discordEmojiId: null }, data: { discordEmojiId: _discordEmojiId } });
            const results = await prismaClient_1.prisma.messageReactionRole.findMany({ where: { messageId: _prismaMessageId, roleId: aux[0]?.roleId } });
            return results[0] ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = results[0]) : null;
        }
        return null;
    }
    ////////////////////////////////////////////
    //              ReactionButton            //
    ////////////////////////////////////////////
    async createReactionButton(_prismaRoleId, _discordButtonId) {
        const prismaReactionButton = await prismaClient_1.prisma.reactionButton.create({
            data: { roleId: _prismaRoleId, discordButtonId: _discordButtonId },
        });
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
            const prismaMember = await prismaClient_1.prisma.member.upsert({
                where: { discordMemeberId: _discordMemberId },
                update: { discordDisplayName: _discordMemberDisplayName, discordProfilePicture: _discordMemberProfilePicture, guildId: prismaGuild.id },
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
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
            return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : null;
        }
        catch (error) {
            console.error(`Failed to upsert member: ${_discordMemberDisplayName}`, error);
            return null;
        }
    }
    async incrementMemberXp(_prismaMember, _xp, _timestamp) {
        const prismaMemberId = this.membersIndexById.byPrismaId[_prismaMember.id];
        if (!prismaMemberId)
            return null;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelXp += _xp;
        if (_timestamp)
            this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelCooldown = _timestamp;
        // 🔥 Guardar inmediatamente en DB
        await prismaClient_1.prisma.member.update({
            where: { id: _prismaMember.id },
            data: {
                discordTemporalLevelXp: this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelXp,
                discordTemporalLevelCooldown: this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelCooldown,
            },
        });
        return this.membersIndexById.byPrismaId[_prismaMember.id];
    }
    async levelUpMember(_prismaMember, _xp, _level, _timestamp) {
        const prismaMemberId = this.membersIndexById.byPrismaId[_prismaMember.id];
        if (!prismaMemberId)
            return null;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelXp = _xp;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevel = _level;
        this.membersIndexById.byPrismaId[_prismaMember.id].discordTemporalLevelCooldown = _timestamp;
        // 🔥 Guardar inmediatamente en DB
        await prismaClient_1.prisma.member.update({
            where: { id: _prismaMember.id },
            data: {
                discordTemporalLevel: _level,
                discordTemporalLevelXp: _xp,
                discordTemporalLevelCooldown: _timestamp,
            },
        });
        return this.membersIndexById.byPrismaId[_prismaMember.id];
    }
    async updateMembersLevelsToDatabase() {
        try {
            await prismaClient_1.prisma.$transaction(Object.values(this.membersIndexById.byPrismaId).map((prismaMember) => {
                return prismaClient_1.prisma.member.update({
                    where: { id: prismaMember.id },
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
                if (prismaMember) {
                    prismaMember.discordTemporalLevel = 0;
                    prismaMember.discordTemporalLevelXp = 0;
                    prismaMember.discordTemporalLevelCooldown = cooldown;
                }
            });
            return true;
        }
        catch (error) {
            console.error(`Failed to reset levels`, error);
            return false;
        }
    }
    async updatePadrinoOfMember(_discordMemberId, _prismaPadrinoId) {
        const prismaMember = await prismaClient_1.prisma.member.update({
            where: { discordMemeberId: _discordMemberId },
            data: { myPadrinoId: _prismaPadrinoId },
        });
        if (prismaMember) {
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
        }
        return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : null;
    }
    async getMemberByDiscordId(_discordGuildId, _discordMemberId) {
        if (_discordMemberId === null)
            return null;
        if (!this.guild)
            return null;
        if (this.membersIndexById.byDiscordId[_discordMemberId]) {
            const prismaId = this.membersIndexById.byDiscordId[_discordMemberId];
            return this.membersIndexById.byPrismaId[prismaId];
        }
        const prismaMember = await prismaClient_1.prisma.member.findUnique({
            where: { guildId: _discordGuildId, discordMemeberId: _discordMemberId },
        });
        if (prismaMember) {
            this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
            this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
        }
        return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id] : prismaMember;
    }
    async getMemberByPrismaId(_prismaMemberId) {
        if (_prismaMemberId === null)
            return null;
        if (!this.guild)
            return null;
        if (this.membersIndexById.byPrismaId[_prismaMemberId]) {
            return this.membersIndexById.byPrismaId[_prismaMemberId];
        }
        const prismaMember = await prismaClient_1.prisma.member.findUnique({ where: { id: _prismaMemberId } });
        if (prismaMember) {
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
            where: { guildId: prismaGuild.id },
            orderBy: [{ discordTemporalLevel: 'desc' }, { discordTemporalLevelXp: 'desc' }],
            take: 10,
        });
        return prismaMembers ? prismaMembers : null;
    }
    ////////////////////////////////////////////
    //               Padrino                  //
    ////////////////////////////////////////////
    async createPadrino(_memberId, _shortDescription, _longDescription) {
        if (this.padrinosIndexByMemberId[_memberId])
            return this.padrinosIndexByMemberId[_memberId];
        const prismaPadrino = await prismaClient_1.prisma.padrino.create({
            data: { memberId: _memberId, shortDescription: _shortDescription, longDescription: _longDescription },
        });
        return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
    }
    async updatePadrino(_padrinoId, _shortDescription, _longDescription) {
        const data = {};
        if (_shortDescription !== undefined)
            data.shortDescription = _shortDescription;
        if (_longDescription !== undefined)
            data.longDescription = _longDescription;
        if (Object.keys(data).length === 0) {
            return await prismaClient_1.prisma.padrino.findUnique({ where: { id: _padrinoId } });
        }
        const prismaPadrino = await prismaClient_1.prisma.padrino.update({ where: { id: _padrinoId }, data });
        return (this.padrinosIndexByMemberId[prismaPadrino.memberId] = prismaPadrino);
    }
    async getPadrinoByPrismaId(_prismaPadrinoId) {
        if (_prismaPadrinoId === null)
            return null;
        if (this.padrinosIndexByMemberId[_prismaPadrinoId])
            return this.padrinosIndexByMemberId[_prismaPadrinoId];
        const prismaPadrino = await prismaClient_1.prisma.padrino.findUnique({ where: { id: _prismaPadrinoId } });
        return prismaPadrino ? (this.padrinosIndexByMemberId[_prismaPadrinoId] = prismaPadrino) : prismaPadrino;
    }
    async getPadrinoByMemberId(_memberId) {
        if (_memberId === null)
            return null;
        if (this.padrinosIndexByMemberId[_memberId])
            return this.padrinosIndexByMemberId[_memberId];
        const prismaPadrino = await prismaClient_1.prisma.padrino.findUnique({ where: { memberId: _memberId } });
        return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
    }
    async getAhijadosByMemberId(_memberId) {
        if (_memberId === null)
            return null;
        const prismaAhijados = await prismaClient_1.prisma.member.findMany({ where: { myPadrinoId: _memberId } });
        return prismaAhijados ? prismaAhijados : null;
    }
    async getAllPadrinos() {
        if (this.padrinosIndexByMemberId.length === undefined) {
            const prismaPadrinos = await prismaClient_1.prisma.padrino.findMany();
            if (prismaPadrinos) {
                prismaPadrinos.forEach((p) => { this.padrinosIndexByMemberId[p.memberId] = p; });
            }
            else
                return null;
        }
        return this.padrinosIndexByMemberId;
    }
}
exports.cacheService = new CacheService();
