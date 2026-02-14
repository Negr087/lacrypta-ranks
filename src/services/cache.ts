import { prisma } from './prismaClient';
import {
  Guild as PrismaGuild,
  Channel as PrismaChannel,
  Message as PrismaMessage,
  Role as PrismaRole,
  MessageReactionRole as PrismaMessageReactionRole,
  ReactionButton as PrismaReactionButton,
  Member as PrismaMember,
  Padrino as PrismaPadrino,
} from '@prisma/client';

// ============================================
// Type definitions (moved here from types/cache)
// ============================================
export interface ChannelIndex {
  [discordChannelId: string]: PrismaChannel | undefined;
}
export interface MessageIndex {
  [discordMessageId: string]: PrismaMessage | undefined;
  length?: undefined;
}
export interface RolesIndex {
  [discordRoleId: string]: PrismaRole | undefined;
  length?: undefined;
}
export interface MemberIndex {
  byPrismaId: { [prismaId: string]: PrismaMember | undefined };
  byDiscordId: { [discordId: string]: string | undefined };
}
export interface MessageReactionRoleIndex {
  [prismaMessageId: string]: PrismaMessageReactionRole | undefined;
}
export interface ReactionButtonIndex {
  [prismaRoleId: string]: PrismaReactionButton | undefined;
}
export interface PadrinoIndex {
  [memberId: string]: PrismaPadrino | undefined;
  length?: undefined;
}

// ============================================
// CacheService Interface
// ============================================
export interface CacheServiceInterface {
  upsertGuild(_discordGuildId: string): Promise<PrismaGuild | null>;
  getGuildByDiscordId(_discordGuildId: string): Promise<PrismaGuild | null>;
  createChannel(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null>;
  getChannelByDiscordId(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null>;
  createMessage(_discordGuildId: string, _discordChannelId: string, _discordMessageId: string, _discordCommandName: string | undefined): Promise<PrismaMessage | null>;
  getMessageByDiscordId(_discordChannelId: string, _discordMessageId: string): Promise<PrismaMessage | null>;
  getAllMessages(): Promise<MessageIndex | null>;
  upsertRole(_discordGuildId: string, _discordRoleId: string, _discordRoleName: string): Promise<PrismaRole | null>;
  getRoleByDiscordId(_discordGuildId: string, _discordRoleId: string): Promise<PrismaRole | null>;
  getAllRoles(): Promise<RolesIndex | null>;
  createMessageReactionRole(_prismaMessageId: string, _prismaRoleId: string, _discordEmojiId: string | undefined): Promise<PrismaMessageReactionRole | null>;
  getMessageReactionRoleByPrismaMessageId(_prismaMessageId: string, _discordEmojiId: string): Promise<PrismaMessageReactionRole | null>;
  updateMessageReactionRoleWithEmojiNullByPrismaMessageId(_prismaMessageId: string, _discordEmojiId: string): Promise<PrismaMessageReactionRole | null>;
  createReactionButton(_prismaRoleId: string, _discordButtonId: string): Promise<PrismaReactionButton | null>;
  upsertMember(_discordGuildId: string, _discordMemberId: string, _discordMemberDisplayName: string, _discordMemberProfilePicture: string): Promise<PrismaMember | null>;
  updatePadrinoOfMember(_discordMemberId: string, _prismaPadrinoId: string): Promise<PrismaMember | null>;
  incrementMemberXp(_prismaMember: PrismaMember, _xp: number, _timestamp: string | undefined): Promise<PrismaMember | null>;
  levelUpMember(_prismaMember: PrismaMember, _xp: number, _level: number, _timestamp: string): Promise<PrismaMember | null>;
  updateMembersLevelsToDatabase(): Promise<boolean>;
  resetLevels(): Promise<boolean>;
  getMemberByDiscordId(_discordGuildId: string, _discordMemberId: string): Promise<PrismaMember | null>;
  getMemberByPrismaId(_prismaMemberId: string): Promise<PrismaMember | null>;
  getMembersRankingTopTen(_discordGuildId: string): Promise<PrismaMember[] | null>;
  createPadrino(_memberId: string, _shortDescription: string, _longDescription: string): Promise<PrismaPadrino | null>;
  updatePadrino(_padrinoId: string, _shortDescription: string | undefined, _longDescription: string | undefined): Promise<PrismaPadrino | null>;
  getPadrinoByPrismaId(_prismaPadrinoId: string): Promise<PrismaPadrino | null>;
  getPadrinoByMemberId(_memberId: string): Promise<PrismaPadrino | null>;
  getAhijadosByMemberId(_memberId: string): Promise<PrismaMember[] | null>;
  getAllPadrinos(): Promise<PadrinoIndex | null>;
}

// ============================================
// CacheService Implementation
// ============================================
class CacheService implements CacheServiceInterface {
  private guild: PrismaGuild | null = null;
  private channelsIndexByDiscordId: ChannelIndex = {};
  private messagesIndexByDiscordId: MessageIndex = {};
  private rolesIndexByDiscordId: RolesIndex = {};
  private membersIndexById: MemberIndex = {
    byPrismaId: {},
    byDiscordId: {},
  };
  private messageReactionRolesIndexByPrismaMessageId: MessageReactionRoleIndex = {};
  private reactionButtonsIndexByPrismaRoleId: ReactionButtonIndex = {};
  private padrinosIndexByMemberId: PadrinoIndex = {};

  ////////////////////////////////////////////
  //                Guild                   //
  ////////////////////////////////////////////
  async upsertGuild(_discordGuildId: string): Promise<PrismaGuild | null> {
    const prismaGuild: PrismaGuild | null = await prisma.guild.upsert({
      where: { discordGuildId: _discordGuildId },
      update: { discordGuildId: _discordGuildId },
      create: { discordGuildId: _discordGuildId },
    });
    return prismaGuild ? (this.guild = prismaGuild) : prismaGuild;
  }

  async getGuildByDiscordId(_discordGuildId: string): Promise<PrismaGuild | null> {
    if (_discordGuildId === null) return null;
    if (this.guild) return this.guild;
    const prismaGuild: PrismaGuild | null = await prisma.guild.findUnique({
      where: { discordGuildId: _discordGuildId },
    });
    return prismaGuild ? (this.guild = prismaGuild) : prismaGuild;
  }

  ////////////////////////////////////////////
  //               Channel                  //
  ////////////////////////////////////////////
  async createChannel(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null> {
    const channelAux = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);
    if (channelAux) return channelAux;
    const prismaGuild = await prisma.guild.findUnique({ where: { discordGuildId: _discordGuildId } });
    if (!prismaGuild) return null;
    const prismaChannel = await prisma.channel.create({
      data: { guildId: prismaGuild.id, discordChannelId: _discordChannelId },
    });
    return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
  }

  async getChannelByDiscordId(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null> {
    if (_discordChannelId === null) return null;
    if (this.channelsIndexByDiscordId[_discordChannelId]) return this.channelsIndexByDiscordId[_discordChannelId]!;
    const prismaChannel = await prisma.channel.findUnique({ where: { discordChannelId: _discordChannelId } });
    return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
  }

  ////////////////////////////////////////////
  //               Message                  //
  ////////////////////////////////////////////
  async createMessage(_discordGuildId: string, _discordChannelId: string, _discordMessageId: string, _discordCommandName: string | undefined): Promise<PrismaMessage | null> {
    const messageAux = await this.getMessageByDiscordId(_discordChannelId, _discordMessageId);
    if (messageAux) return messageAux;
    const prismaChannel = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);
    if (!prismaChannel) return null;
    const prismaMessage = await prisma.message.create({
      data: {
        discordMessageId: _discordMessageId,
        discordCommandName: _discordCommandName ? _discordCommandName : null,
        channelId: this.channelsIndexByDiscordId[_discordChannelId]!.id,
      },
    });
    return prismaMessage ? (this.messagesIndexByDiscordId[_discordMessageId] = prismaMessage) : prismaMessage;
  }

  async getMessageByDiscordId(_discordChannelId: string, _discordMessageId: string): Promise<PrismaMessage | null> {
    if (_discordMessageId === null || _discordChannelId === null) return null;
    if (this.messagesIndexByDiscordId[_discordMessageId]) return this.messagesIndexByDiscordId[_discordMessageId]!;
    const prismaMessage = await prisma.message.findUnique({ where: { discordMessageId: _discordMessageId } });
    return prismaMessage ? (this.messagesIndexByDiscordId[_discordChannelId] = prismaMessage) : prismaMessage;
  }

  async getAllMessages(): Promise<MessageIndex | null> {
    if (this.messagesIndexByDiscordId.length === undefined) {
      const prismaMessages = await prisma.message.findMany();
      if (prismaMessages) {
        prismaMessages.forEach((m) => { this.messagesIndexByDiscordId[m.discordMessageId] = m; });
      } else return null;
    }
    return this.messagesIndexByDiscordId;
  }

  ////////////////////////////////////////////
  //                Role                    //
  ////////////////////////////////////////////
  async upsertRole(_discordGuildId: string, _discordRoleId: string, _discordRoleName: string): Promise<PrismaRole | null> {
    const prismaGuild = await this.getGuildByDiscordId(_discordGuildId);
    if (!prismaGuild) return null;
    const prismaRole = await prisma.role.upsert({
      where: { discordRoleId: _discordRoleId },
      update: { discordRoleName: _discordRoleName },
      create: { guildId: prismaGuild.id, discordRoleId: _discordRoleId, discordRoleName: _discordRoleName },
    });
    return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
  }

  async getRoleByDiscordId(_discordGuildId: string, _discordRoleId: string): Promise<PrismaRole | null> {
    if (_discordRoleId === null || _discordGuildId === null) return null;
    if (this.rolesIndexByDiscordId[_discordRoleId]) return this.rolesIndexByDiscordId[_discordRoleId]!;
    const prismaRole = await prisma.role.findUnique({ where: { guildId: _discordGuildId, discordRoleId: _discordRoleId } });
    return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
  }

  async getAllRoles(): Promise<RolesIndex | null> {
    if (this.rolesIndexByDiscordId.length === undefined) {
      const prismaRoles = await prisma.role.findMany();
      if (prismaRoles) {
        prismaRoles.forEach((r) => { this.rolesIndexByDiscordId[r.discordRoleId] = r; });
      } else return null;
    }
    return this.rolesIndexByDiscordId;
  }

  ////////////////////////////////////////////
  //         MessageReactionRole            //
  ////////////////////////////////////////////
  async createMessageReactionRole(_prismaMessageId: string, _prismaRoleId: string, _discordEmojiId: string | undefined): Promise<PrismaMessageReactionRole | null> {
    const prismaMessageReactionRole = await prisma.messageReactionRole.create({
      data: { messageId: _prismaMessageId, roleId: _prismaRoleId, discordEmojiId: _discordEmojiId ? _discordEmojiId : null },
    });
    return prismaMessageReactionRole
      ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = prismaMessageReactionRole)
      : prismaMessageReactionRole;
  }

  async getMessageReactionRoleByPrismaMessageId(_prismaMessageId: string, _discordEmojiId: string): Promise<PrismaMessageReactionRole | null> {
    if (_prismaMessageId === null || _discordEmojiId === null) return null;
    if (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId]?.discordEmojiId === _discordEmojiId)
      return this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId]!;
    const results = await prisma.messageReactionRole.findMany({ where: { messageId: _prismaMessageId, discordEmojiId: _discordEmojiId } });
    return results[0] ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = results[0]) : null;
  }

  async updateMessageReactionRoleWithEmojiNullByPrismaMessageId(_prismaMessageId: string, _discordEmojiId: string): Promise<PrismaMessageReactionRole | null> {
    const aux = await prisma.messageReactionRole.findMany({ where: { messageId: _prismaMessageId, discordEmojiId: null } });
    if (aux.length > 0) {
      await prisma.messageReactionRole.updateMany({ where: { messageId: _prismaMessageId, discordEmojiId: null }, data: { discordEmojiId: _discordEmojiId } });
      const results = await prisma.messageReactionRole.findMany({ where: { messageId: _prismaMessageId, roleId: aux[0]?.roleId! } });
      return results[0] ? (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId] = results[0]) : null;
    }
    return null;
  }

  ////////////////////////////////////////////
  //              ReactionButton            //
  ////////////////////////////////////////////
  async createReactionButton(_prismaRoleId: string, _discordButtonId: string): Promise<PrismaReactionButton | null> {
    const prismaReactionButton = await prisma.reactionButton.create({
      data: { roleId: _prismaRoleId, discordButtonId: _discordButtonId },
    });
    return prismaReactionButton
      ? (this.reactionButtonsIndexByPrismaRoleId[_prismaRoleId] = prismaReactionButton)
      : prismaReactionButton;
  }

  ////////////////////////////////////////////
  //                Member                  //
  ////////////////////////////////////////////
  async upsertMember(_discordGuildId: string, _discordMemberId: string, _discordMemberDisplayName: string, _discordMemberProfilePicture: string): Promise<PrismaMember | null> {
    try {
      const prismaGuild = await cacheService.getGuildByDiscordId(_discordGuildId);
      const prismaMember = await prisma.member.upsert({
        where: { discordMemeberId: _discordMemberId },
        update: { discordDisplayName: _discordMemberDisplayName, discordProfilePicture: _discordMemberProfilePicture, guildId: prismaGuild!.id },
        create: {
          discordMemeberId: _discordMemberId,
          discordDisplayName: _discordMemberDisplayName,
          discordProfilePicture: _discordMemberProfilePicture,
          guildId: prismaGuild!.id,
          discordTemporalLevelXp: 0,
          discordTemporalLevel: 0,
          discordTemporalLevelCooldown: Date.now().toString(),
        },
      });
      this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
      this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
      return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id]! : null;
    } catch (error) {
      console.error(`Failed to upsert member: ${_discordMemberDisplayName}`, error);
      return null;
    }
  }

  async incrementMemberXp(_prismaMember: PrismaMember, _xp: number, _timestamp: string | undefined): Promise<PrismaMember | null> {
    const prismaMemberId = this.membersIndexById.byPrismaId[_prismaMember.id];
    if (!prismaMemberId) return null;

    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelXp += _xp;
    if (_timestamp) this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelCooldown = _timestamp;

    // 🔥 Guardar inmediatamente en DB
    await prisma.member.update({
      where: { id: _prismaMember.id },
      data: {
        discordTemporalLevelXp: this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelXp,
        discordTemporalLevelCooldown: this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelCooldown,
      },
    });

    return this.membersIndexById.byPrismaId[_prismaMember.id]!;
  }

  async levelUpMember(_prismaMember: PrismaMember, _xp: number, _level: number, _timestamp: string): Promise<PrismaMember | null> {
    const prismaMemberId = this.membersIndexById.byPrismaId[_prismaMember.id];
    if (!prismaMemberId) return null;

    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelXp = _xp;
    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevel = _level;
    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelCooldown = _timestamp;

    // 🔥 Guardar inmediatamente en DB
    await prisma.member.update({
      where: { id: _prismaMember.id },
      data: {
        discordTemporalLevel: _level,
        discordTemporalLevelXp: _xp,
        discordTemporalLevelCooldown: _timestamp,
      },
    });

    return this.membersIndexById.byPrismaId[_prismaMember.id]!;
  }

  async updateMembersLevelsToDatabase(): Promise<boolean> {
    try {
      await prisma.$transaction(
        (Object.values(this.membersIndexById.byPrismaId) as PrismaMember[]).map((prismaMember: PrismaMember) => {
          return prisma.member.update({
            where: { id: prismaMember.id },
            data: {
              discordTemporalLevel: prismaMember.discordTemporalLevel,
              discordTemporalLevelXp: prismaMember.discordTemporalLevelXp,
              discordTemporalLevelCooldown: prismaMember.discordTemporalLevelCooldown,
            },
          });
        }),
      );
      return true;
    } catch (error) {
      console.error(`Failed to update members levels to the database`, error);
      return false;
    }
  }

  async resetLevels(): Promise<boolean> {
    try {
      await prisma.member.updateMany({
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
    } catch (error) {
      console.error(`Failed to reset levels`, error);
      return false;
    }
  }

  async updatePadrinoOfMember(_discordMemberId: string, _prismaPadrinoId: string): Promise<PrismaMember | null> {
    const prismaMember = await prisma.member.update({
      where: { discordMemeberId: _discordMemberId },
      data: { myPadrinoId: _prismaPadrinoId },
    });
    if (prismaMember) {
      this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
      this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
    }
    return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id]! : null;
  }

  async getMemberByDiscordId(_discordGuildId: string, _discordMemberId: string): Promise<PrismaMember | null> {
    if (_discordMemberId === null) return null;
    if (!this.guild) return null;
    if (this.membersIndexById.byDiscordId[_discordMemberId]) {
      const prismaId = this.membersIndexById.byDiscordId[_discordMemberId]!;
      return this.membersIndexById.byPrismaId[prismaId]!;
    }
    const prismaMember = await prisma.member.findUnique({
      where: { guildId: _discordGuildId, discordMemeberId: _discordMemberId },
    });
    if (prismaMember) {
      this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
      this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
    }
    return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id]! : prismaMember;
  }

  async getMemberByPrismaId(_prismaMemberId: string): Promise<PrismaMember | null> {
    if (_prismaMemberId === null) return null;
    if (!this.guild) return null;
    if (this.membersIndexById.byPrismaId[_prismaMemberId]) {
      return this.membersIndexById.byPrismaId[_prismaMemberId]!;
    }
    const prismaMember = await prisma.member.findUnique({ where: { id: _prismaMemberId } });
    if (prismaMember) {
      this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
      this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;
    }
    return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id]! : null;
  }

  async getMembersRankingTopTen(_discordGuildId: string): Promise<PrismaMember[] | null> {
    if (_discordGuildId === null) return null;
    const prismaGuild = await cacheService.getGuildByDiscordId(_discordGuildId);
    const prismaMembers = await prisma.member.findMany({
      where: { guildId: prismaGuild!.id },
      orderBy: [{ discordTemporalLevel: 'desc' }, { discordTemporalLevelXp: 'desc' }],
      take: 10,
    });
    return prismaMembers ? prismaMembers : null;
  }

  ////////////////////////////////////////////
  //               Padrino                  //
  ////////////////////////////////////////////
  async createPadrino(_memberId: string, _shortDescription: string, _longDescription: string): Promise<PrismaPadrino | null> {
    if (this.padrinosIndexByMemberId[_memberId]) return this.padrinosIndexByMemberId[_memberId]!;
    const prismaPadrino = await prisma.padrino.create({
      data: { memberId: _memberId, shortDescription: _shortDescription, longDescription: _longDescription },
    });
    return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
  }

  async updatePadrino(_padrinoId: string, _shortDescription: string | undefined, _longDescription: string | undefined): Promise<PrismaPadrino | null> {
    const data: { shortDescription?: string; longDescription?: string } = {};
    if (_shortDescription !== undefined) data.shortDescription = _shortDescription;
    if (_longDescription !== undefined) data.longDescription = _longDescription;
    if (Object.keys(data).length === 0) {
      return await prisma.padrino.findUnique({ where: { id: _padrinoId } });
    }
    const prismaPadrino = await prisma.padrino.update({ where: { id: _padrinoId }, data });
    return (this.padrinosIndexByMemberId[prismaPadrino.memberId] = prismaPadrino);
  }

  async getPadrinoByPrismaId(_prismaPadrinoId: string): Promise<PrismaPadrino | null> {
    if (_prismaPadrinoId === null) return null;
    if (this.padrinosIndexByMemberId[_prismaPadrinoId]) return this.padrinosIndexByMemberId[_prismaPadrinoId]!;
    const prismaPadrino = await prisma.padrino.findUnique({ where: { id: _prismaPadrinoId } });
    return prismaPadrino ? (this.padrinosIndexByMemberId[_prismaPadrinoId] = prismaPadrino) : prismaPadrino;
  }

  async getPadrinoByMemberId(_memberId: string): Promise<PrismaPadrino | null> {
    if (_memberId === null) return null;
    if (this.padrinosIndexByMemberId[_memberId]) return this.padrinosIndexByMemberId[_memberId]!;
    const prismaPadrino = await prisma.padrino.findUnique({ where: { memberId: _memberId } });
    return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
  }

  async getAhijadosByMemberId(_memberId: string): Promise<PrismaMember[] | null> {
    if (_memberId === null) return null;
    const prismaAhijados = await prisma.member.findMany({ where: { myPadrinoId: _memberId } });
    return prismaAhijados ? prismaAhijados : null;
  }

  async getAllPadrinos(): Promise<PadrinoIndex | null> {
    if (this.padrinosIndexByMemberId.length === undefined) {
      const prismaPadrinos = await prisma.padrino.findMany();
      if (prismaPadrinos) {
        prismaPadrinos.forEach((p) => { this.padrinosIndexByMemberId[p.memberId] = p; });
      } else return null;
    }
    return this.padrinosIndexByMemberId;
  }
}

export const cacheService: CacheServiceInterface = new CacheService();