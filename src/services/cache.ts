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
import {
  CacheServiceInterface,
  ChannelIndex,
  MessageIndex,
  RolesIndex,
  MemberIndex,
  PadrinoIndex,
  MessageReactionRoleIndex,
  ReactionButtonIndex,
} from '../types/cache';

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
    // If guild is not in the cache, create it in the database
    const prismaGuild: PrismaGuild | null = await prisma.guild.upsert({
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

  async getGuildByDiscordId(_discordGuildId: string): Promise<PrismaGuild | null> {
    if (_discordGuildId === null) return null;

    // Check if guild is already in the cache
    if (this.guild) return this.guild;

    // If guild is not in the cache, check the database
    const prismaGuild: PrismaGuild | null = await prisma.guild.findUnique({
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
  async createChannel(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null> {
    // Check if the channel is already in the cache
    const channelAux: PrismaChannel | null = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);

    if (channelAux) return channelAux;

    // Check if the guild exist
    const prismaGuild: PrismaGuild | null = await prisma.guild.findUnique({
      where: {
        discordGuildId: _discordGuildId,
      },
    });

    if (!prismaGuild) return null;

    // If the channel isn't in the cache, create it in the database
    const prismaChannel: PrismaChannel | null = await prisma.channel.create({
      data: {
        guildId: prismaGuild.id,
        discordChannelId: _discordChannelId,
      },
    });

    // If the channel is in the database, add it to the cache and return it. If not, return null
    return prismaChannel ? (this.channelsIndexByDiscordId[_discordChannelId] = prismaChannel) : prismaChannel;
  }

  async getChannelByDiscordId(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null> {
    if (_discordChannelId === null || _discordChannelId === null) return null;

    // Check if the channel is already in the cache
    if (this.channelsIndexByDiscordId[_discordChannelId]) return this.channelsIndexByDiscordId[_discordChannelId]!;

    // If the channel is not in the cache, check the database
    const prismaChannel: PrismaChannel | null = await prisma.channel.findUnique({
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
  async createMessage(
    _discordGuildId: string,
    _discordChannelId: string,
    _discordMessageId: string,
    _discordCommandName: string | undefined,
  ): Promise<PrismaMessage | null> {
    // Check if the message is already in the cache
    const messageAux: PrismaMessage | null = await this.getMessageByDiscordId(_discordChannelId, _discordMessageId);

    if (messageAux) return messageAux;

    // Check if the channel exist
    const prismaChannel: PrismaChannel | null = await this.getChannelByDiscordId(_discordGuildId, _discordChannelId);

    if (!prismaChannel) return null;

    // If the message isn't in the cache, create it in the database
    const prismaMessage: PrismaMessage | null = await prisma.message.create({
      data: {
        discordMessageId: _discordMessageId,
        discordCommandName: _discordCommandName ? _discordCommandName : null,
        channelId: this.channelsIndexByDiscordId[_discordChannelId]!.id,
      },
    });

    // If the message is in the database, add it to the cache and return it. If not, return null
    return prismaMessage ? (this.messagesIndexByDiscordId[_discordMessageId] = prismaMessage) : prismaMessage;
  }

  async getMessageByDiscordId(_discordChannelId: string, _discordMessageId: string): Promise<PrismaMessage | null> {
    if (_discordMessageId === null || _discordChannelId === null) return null;

    // Check if the message is already in the cache
    if (this.messagesIndexByDiscordId[_discordMessageId]) return this.messagesIndexByDiscordId[_discordMessageId]!;

    // If the message is not in the cache, check the database
    const prismaMessage: PrismaMessage | null = await prisma.message.findUnique({
      where: {
        discordMessageId: _discordMessageId,
      },
    });

    // If the message is in the database, add it to the cache and return it. If not, return null
    return prismaMessage ? (this.messagesIndexByDiscordId[_discordChannelId] = prismaMessage) : prismaMessage;
  }

  async getAllMessages(): Promise<MessageIndex | null> {
    if (this.messagesIndexByDiscordId.length === undefined) {
      const prismaMessages: PrismaMessage[] | null = await prisma.message.findMany();

      if (prismaMessages) {
        prismaMessages.forEach((prismaMessage: PrismaMessage) => {
          this.messagesIndexByDiscordId[prismaMessage.discordMessageId] = prismaMessage;
        });
      } else {
        return null;
      }
    }

    return this.messagesIndexByDiscordId;
  }

  ////////////////////////////////////////////
  //                Role                    //
  ////////////////////////////////////////////
  async upsertRole(
    _discordGuildId: string,
    _discordRoleId: string,
    _discordRoleName: string,
  ): Promise<PrismaRole | null> {
    // Get Prisma Guild
    const prismaGuild: PrismaGuild | null = await this.getGuildByDiscordId(_discordGuildId);

    if (!prismaGuild) return null;

    // Create it in the database
    const prismaRole: PrismaRole | null = await prisma.role.upsert({
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

  async getRoleByDiscordId(_discordGuildId: string, _discordRoleId: string): Promise<PrismaRole | null> {
    if (_discordRoleId === null || _discordGuildId === null) return null;

    // Check if the role is already in the cache
    if (this.rolesIndexByDiscordId[_discordRoleId]) return this.rolesIndexByDiscordId[_discordRoleId]!;

    // If the role is not in the cache, check the database
    const prismaRole: PrismaRole | null = await prisma.role.findUnique({
      where: {
        guildId: _discordGuildId,
        discordRoleId: _discordRoleId,
      },
    });

    // If the role is in the database, add it to the cache and return it. If not, return null
    return prismaRole ? (this.rolesIndexByDiscordId[_discordRoleId] = prismaRole) : prismaRole;
  }

  async getAllRoles(): Promise<RolesIndex | null> {
    if (this.rolesIndexByDiscordId.length === undefined) {
      const prismaRoles: PrismaRole[] | null = await prisma.role.findMany();

      if (prismaRoles) {
        prismaRoles.forEach((prismaRole: PrismaRole) => {
          this.rolesIndexByDiscordId[prismaRole.discordRoleId] = prismaRole;
        });
      } else {
        return null;
      }
    }

    return this.rolesIndexByDiscordId;
  }

  ////////////////////////////////////////////
  //         MessageReactionRole            //
  ////////////////////////////////////////////
  async createMessageReactionRole(
    _prismaMessageId: string,
    _prismaRoleId: string,
    _discordEmojiId: string | undefined,
  ): Promise<PrismaMessageReactionRole | null> {
    // If the role is not in the cache, create it in the database
    const prismaMessageReactionRole: PrismaMessageReactionRole | null = await prisma.messageReactionRole.create({
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

  async getMessageReactionRoleByPrismaMessageId(
    _prismaMessageId: string,
    _discordEmojiId: string,
  ): Promise<PrismaMessageReactionRole | null> {
    if (_prismaMessageId === null || _discordEmojiId === null) return null;

    // Check if the role is already in the cache
    if (this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId]!.discordEmojiId === _discordEmojiId)
      return this.messageReactionRolesIndexByPrismaMessageId[_prismaMessageId]!;

    // If the role is not in the cache, check the database
    const prismaMessageReactionRole: PrismaMessageReactionRole[] | null = await prisma.messageReactionRole.findMany({
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

  async updateMessageReactionRoleWithEmojiNullByPrismaMessageId(
    _prismaMessageId: string,
    _discordEmojiId: string,
  ): Promise<PrismaMessageReactionRole | null> {
    const prismaMessageReactionRoleAux: PrismaMessageReactionRole[] = await prisma.messageReactionRole.findMany({
      where: {
        messageId: _prismaMessageId,
        discordEmojiId: null,
      },
    });

    if (prismaMessageReactionRoleAux.length > 0) {
      await prisma.messageReactionRole.updateMany({
        where: {
          messageId: _prismaMessageId,
          discordEmojiId: null,
        },
        data: {
          discordEmojiId: _discordEmojiId,
        },
      });

      const prismaMessageReactionRole: PrismaMessageReactionRole[] | null = await prisma.messageReactionRole.findMany({
        where: {
          messageId: _prismaMessageId,
          roleId: prismaMessageReactionRoleAux[0]?.roleId!,
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

  async createReactionButton(_prismaRoleId: string, _discordButtonId: string): Promise<PrismaReactionButton | null> {
    // If the role isn't in the cache, create it in the database
    const prismaReactionButton: PrismaReactionButton | null = await prisma.reactionButton.create({
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
  async upsertMember(
    _discordGuildId: string,
    _discordMemberId: string,
    _discordMemberDisplayName: string,
    _discordMemberProfilePicture: string,
  ): Promise<PrismaMember | null> {
    try {
      const prismaGuild: PrismaGuild | null = await cacheService.getGuildByDiscordId(_discordGuildId);

      // Upsert member in the db
      const prismaMember: PrismaMember = await prisma.member.upsert({
        where: {
          discordMemeberId: _discordMemberId,
        },
        update: {
          discordDisplayName: _discordMemberDisplayName,
          discordProfilePicture: _discordMemberProfilePicture,
          guildId: prismaGuild!.id,
        },
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

      // Upsert member in the cache
      this.membersIndexById.byPrismaId[prismaMember.id] = prismaMember;
      this.membersIndexById.byDiscordId[prismaMember.discordMemeberId] = prismaMember.id;

      // console.log(`Member ${_discordMemberDisplayName} upserted`); // debug

      return prismaMember ? this.membersIndexById.byPrismaId[prismaMember.id]! : null;
    } catch (error) {
      console.error(`Failed to upsert member: ${_discordMemberDisplayName}`, error); // debug

      return null;
    }
  }

  async incrementMemberXp(
    _prismaMember: PrismaMember,
    _xp: number,
    _timestamp: string | undefined,
  ): Promise<PrismaMember | null> {
    // Check if the member is in the cache
    const prismaMemberId: PrismaMember | undefined = this.membersIndexById.byPrismaId[_prismaMember.id];
    if (!prismaMemberId) return null;

    // Only increment in cache
    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelXp += _xp;
    if (_timestamp) this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelCooldown = _timestamp;

    return this.membersIndexById.byPrismaId[_prismaMember.id]!;
  }

  async levelUpMember(
    _prismaMember: PrismaMember,
    _xp: number,
    _level: number,
    _timestamp: string,
  ): Promise<PrismaMember | null> {
    const prismaMemberId: PrismaMember | undefined = this.membersIndexById.byPrismaId[_prismaMember.id];
    if (!prismaMemberId) return null;

    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelXp = _xp;
    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevel = _level;
    this.membersIndexById.byPrismaId[_prismaMember.id]!.discordTemporalLevelCooldown = _timestamp;

    return this.membersIndexById.byPrismaId[_prismaMember.id]!;
  }

  async updateMembersLevelsToDatabase(): Promise<boolean> {
    try {
      await prisma.$transaction(
        Object.values(this.membersIndexById.byPrismaId).map((prismaMember: PrismaMember) => {
          return prisma.member.update({
            where: {
              id: prismaMember.id,
            },
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

      const cooldown: string = Date.now().toString();

      Object.values(this.membersIndexById.byPrismaId).forEach((prismaMember: PrismaMember) => {
        prismaMember.discordTemporalLevel = 0;
        prismaMember.discordTemporalLevelXp = 0;
        prismaMember.discordTemporalLevelCooldown = cooldown;
      });

      return true;
    } catch (error) {
      console.error(`Failed to reset levels`, error);

      return false;
    }
  }

  async updatePadrinoOfMember(_discordMemberId: string, _prismaPadrinoId: string): Promise<PrismaMember | null> {
    // Update Memeber in the database
    const prismaMember: PrismaMember | null = await prisma.member.update({
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
      this.membersIndexById.byPrismaId[prismaMember!.id] = prismaMember!;
      this.membersIndexById.byDiscordId[prismaMember!.discordMemeberId] = prismaMember!.id;
    }

    return prismaMember ? this.membersIndexById.byPrismaId[prismaMember!.id]! : null;
  }

  async getMemberByDiscordId(_discordGuildId: string, _discordMemberId: string): Promise<PrismaMember | null> {
    if (_discordMemberId === null || _discordMemberId === null) return null;

    // Check if the guild exist
    if (!this.guild) return null;

    // Check if the member is already in the cache
    if (this.membersIndexById.byDiscordId[_discordMemberId]) {
      const prismaMemberId: string = this.membersIndexById.byDiscordId[_discordMemberId]!;

      // console.log(`Member ${this.membersIndexById.byPrismaId[prismaMemberId]!.discordDisplayName} already in cache`); // debug

      return this.membersIndexById.byPrismaId[prismaMemberId]!;
    }

    // If the member is not in the cache, check the database
    const prismaMember: PrismaMember | null = await prisma.member.findUnique({
      where: {
        guildId: _discordGuildId,
        discordMemeberId: _discordMemberId,
      },
    });

    if (prismaMember) {
      // console.log(`Member ${prismaMember.discordDisplayName} added to cache`); // debug

      // Add the member to the cache
      this.membersIndexById.byPrismaId[prismaMember!.id] = prismaMember!;
      this.membersIndexById.byDiscordId[prismaMember!.discordMemeberId] = prismaMember!.id;
    }

    // If the member is in the database return it. If not, return null
    return prismaMember ? this.membersIndexById.byPrismaId[prismaMember!.id]! : prismaMember;
  }

  async getMemberByPrismaId(_prismaMemberId: string): Promise<PrismaMember | null> {
    console.log('[cacheService.ts] getMemberByPrismaId() _prismaMemberId:', _prismaMemberId); // debug
    console.log(); // debug
    if (_prismaMemberId === null) return null;

    // Check if the guild exist
    console.log('[cacheService.ts] getMemberByPrismaId() this.guild:', this.guild); // debug
    console.log(); // debug
    if (!this.guild) return null;

    // Check if the member is already in the cache
    console.log(
      '[cacheService.ts] getMemberByPrismaId() this.membersIndexById.byPrismaId[_prismaMemberId]:',
      this.membersIndexById.byPrismaId[_prismaMemberId],
    ); // debug
    console.log(); // debug
    if (this.membersIndexById.byPrismaId[_prismaMemberId]) {
      return this.membersIndexById.byPrismaId[_prismaMemberId]!;
    }

    // If the member is not in the cache, check the database
    const prismaMember: PrismaMember | null = await prisma.member.findUnique({
      where: {
        id: _prismaMemberId,
      },
    });
    console.log('[cacheService.ts] getMemberByPrismaId() prismaMember:', prismaMember); // debug
    console.log(); // debug

    if (prismaMember) {
      // console.log(`Member ${prismaMember.discordDisplayName} added to cache`); // debug

      // Add the member to the cache
      this.membersIndexById.byPrismaId[prismaMember!.id] = prismaMember!;
      this.membersIndexById.byDiscordId[prismaMember!.discordMemeberId] = prismaMember!.id;
    }

    return prismaMember ? this.membersIndexById.byPrismaId[prismaMember!.id]! : null;
  }

  async getMembersRankingTopTen(_discordGuildId: string): Promise<PrismaMember[] | null> {
    if (_discordGuildId === null) return null;

    const prismaGuild: PrismaGuild | null = await cacheService.getGuildByDiscordId(_discordGuildId);

    const prismaMembers: PrismaMember[] | null = await prisma.member.findMany({
      where: {
        guildId: prismaGuild!.id,
      },
      orderBy: [{ discordTemporalLevel: 'desc' }, { discordTemporalLevelXp: 'desc' }],
      take: 10,
    });

    return prismaMembers ? prismaMembers : null;
  }

  ////////////////////////////////////////////
  //               Padrino                  //
  ////////////////////////////////////////////
  async createPadrino(
    _memberId: string,
    _shortDescription: string,
    _longDescription: string,
  ): Promise<PrismaPadrino | null> {
    // Check if the padrino is already in the cache
    if (this.padrinosIndexByMemberId[_memberId]) return this.padrinosIndexByMemberId[_memberId];

    // If the padrino is not in the cache, create it in the database
    const prismaPadrino: PrismaPadrino | null = await prisma.padrino.create({
      data: {
        memberId: _memberId,
        shortDescription: _shortDescription,
        longDescription: _longDescription,
      },
    });

    // If the padrino is in the database, add it to the cache and return it. If not, return null
    return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
  }

  async updatePadrino(
    _padrinoId: string,
    _shortDescription: string | undefined,
    _longDescription: string | undefined,
  ): Promise<PrismaPadrino | null> {
    // Build the data object dynamically based on non-empty inputs
    const data: { shortDescription?: string; longDescription?: string } = {};

    if (_shortDescription !== undefined) {
      data.shortDescription = _shortDescription;
    }

    if (_longDescription !== undefined) {
      data.longDescription = _longDescription;
    }

    // Update only if there's something to update
    if (Object.keys(data).length === 0) {
      const existingPadrino: PrismaPadrino | null = await prisma.padrino.findUnique({
        where: { id: _padrinoId },
      });

      return existingPadrino;
    }

    // Update padrino in the database
    const prismaPadrino: PrismaPadrino | null = await prisma.padrino.update({
      where: {
        id: _padrinoId,
      },
      data: data,
    });

    // Update padrino in the cache
    return (this.padrinosIndexByMemberId[prismaPadrino.memberId] = prismaPadrino);
  }

  async getPadrinoByPrismaId(_prismaPadrinoId: string): Promise<PrismaPadrino | null> {
    if (_prismaPadrinoId === null) return null;

    // Check if the padrino is already in the cache
    if (this.padrinosIndexByMemberId[_prismaPadrinoId]) return this.padrinosIndexByMemberId[_prismaPadrinoId];

    // If the padrino is not in the cache, check the database
    const prismaPadrino: PrismaPadrino | null = await prisma.padrino.findUnique({
      where: {
        id: _prismaPadrinoId,
      },
    });

    // If the padrino is in the database, add it to the cache and return it. If not, return null
    return prismaPadrino ? (this.padrinosIndexByMemberId[_prismaPadrinoId] = prismaPadrino) : prismaPadrino;
  }

  async getPadrinoByMemberId(_memberId: string): Promise<PrismaPadrino | null> {
    if (_memberId === null) return null;

    // Check if the padrino is already in the cache
    if (this.padrinosIndexByMemberId[_memberId]) return this.padrinosIndexByMemberId[_memberId];

    // If the padrino is not in the cache, check the database
    const prismaPadrino: PrismaPadrino | null = await prisma.padrino.findUnique({
      where: {
        memberId: _memberId,
      },
    });

    // If the padrino is in the database, add it to the cache and return it. If not, return null
    return prismaPadrino ? (this.padrinosIndexByMemberId[_memberId] = prismaPadrino) : prismaPadrino;
  }

  async getAhijadosByMemberId(_memberId: string): Promise<PrismaMember[] | null> {
    if (_memberId === null) return null;

    const prismaAhijados: PrismaMember[] | null = await prisma.member.findMany({
      where: {
        myPadrinoId: _memberId,
      },
    });

    return prismaAhijados ? prismaAhijados : null;
  }

  async getAllPadrinos(): Promise<PadrinoIndex | null> {
    if (this.padrinosIndexByMemberId.length === undefined) {
      const prismaPadrinos: PrismaPadrino[] | null = await prisma.padrino.findMany();

      if (prismaPadrinos) {
        prismaPadrinos.forEach((prismaPadrino: PrismaPadrino) => {
          this.padrinosIndexByMemberId[prismaPadrino.memberId] = prismaPadrino;
        });
      } else {
        return null;
      }
    }

    return this.padrinosIndexByMemberId;
  }
}

export const cacheService: CacheServiceInterface = new CacheService();
