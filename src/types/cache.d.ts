import {
  Guild as PrismaGuild,
  Channel as PrismaChannel,
  Member as PrismaMember,
  Message as PrismaMessage,
  Role as PrismaRole,
  MessageReactionRole as PrismaMessageReactionRole,
  ReactionButton as PrismaReactionButton,
  Padrino as PrismaPadrino
} from '@prisma/client';

export interface CacheServiceInterface {
  // Guild
  upsertGuild(_discordGuildId: string): Promise<PrismaGuild | null>;
  getGuildByDiscordId(_discordGuildId: string): Promise<PrismaGuild | null>;

  // Channel
  createChannel(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null>;
  getChannelByDiscordId(_discordGuildId: string, _discordChannelId: string): Promise<PrismaChannel | null>;

  // Message
  createMessage(
    _discordGuildId: string,
    _discordChannelId: string,
    _discordMessageId: string,
    _discordCommandName: string | undefined,
  ): Promise<PrismaMessage | null>;

  getMessageByDiscordId(
    _discordChannelId: string,
    _discordMessageId: string
  ): Promise<PrismaMessage | null>;

  getAllMessages(): Promise<MessageIndex | null>;

  // Role
  upsertRole(
    _discordGuildId: string,
    _discordRoleId: string,
    _discordRoleName: string
  ): Promise<PrismaRole | null>;

  getRoleByDiscordId(
    _discordGuildId: string,
    _discordRoleId: string
  ): Promise<PrismaRole | null>;

  getAllRoles(): Promise<RolesIndex | null>;

  // MessageReactionRole
  createMessageReactionRole(
    _prismaMessageId: string,
    _prismaRoleId: string,
    _discordEmojiId: string | undefined
  ): Promise<PrismaMessageReactionRole | null>;

  getMessageReactionRoleByPrismaMessageId(
    _prismaMessageId: string,
    _discordEmojiId: string
  ): Promise<PrismaMessageReactionRole | null>;

  updateMessageReactionRoleWithEmojiNullByPrismaMessageId(
    _prismaMessageId: string,
    _discordEmojiId: string
  ): Promise<PrismaMessageReactionRole | null>;

  // ReactionButton
  createReactionButton(
    _prismaRoleId: string,
    _discordButtonId: string
  ): Promise<PrismaReactionButton | null>;

  // Member
  upsertMember(
    _discordGuildId: string,
    _discordMemberId: string,
    _discordMemberDisplayName: string,
    _discordMemberProfilePicture: string
  ): Promise<PrismaMember | null>;

  // 🔥 ESTE ERA EL QUE FALTABA
  createMember(
    _discordGuildId: string,
    _discordMemberId: string,
    _discordMemberDisplayName: string,
    _discordMemberProfilePicture: string
  ): Promise<PrismaMember | null>;

  updatePadrinoOfMember(
    _discordMemberId: string,
    _prismaPadrinoId: string
  ): Promise<PrismaMember | null>;

  incrementMemberXp(
    _prismaMember: PrismaMember,
    _xp: number,
    _timestamp: string | undefined,
  ): Promise<PrismaMember | null>;

  levelUpMember(
    _prismaMember: PrismaMember,
    _xp: number,
    _level: number,
    _timestamp: string,
  ): Promise<PrismaMember | null>;

  updateMembersLevelsToDatabase(): Promise<boolean>;
  resetLevels(): Promise<boolean>;

  getMemberByDiscordId(
    _discordGuildId: string,
    _discordMemberId: string
  ): Promise<PrismaMember | null>;

  getMemberByPrismaId(
    _prismaMemberId: string
  ): Promise<PrismaMember | null>;

  getMembersRankingTopTen(
    _discordGuildId: string
  ): Promise<PrismaMember[] | null>;

  // Padrino
  createPadrino(
    _memberId: string,
    _shortDescription: string,
    _longDescription: string
  ): Promise<PrismaPadrino | null>;

  updatePadrino(
    _padrinoId: string,
    _shortDescription: string,
    _longDescription: string
  ): Promise<PrismaPadrino | null>;

  getPadrinoByPrismaId(
    _prismaPadrinoId: string
  ): Promise<PrismaPadrino | null>;

  getPadrinoByMemberId(
    _memberId: string
  ): Promise<PrismaPadrino | null>;

  getAhijadosByMemberId(
    _memberId: string
  ): Promise<PrismaMember[] | null>;

  getAllPadrinos(): Promise<PadrinoIndex | null>;
}