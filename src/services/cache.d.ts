import { Guild as PrismaGuild, Channel as PrismaChannel, Message as PrismaMessage, Role as PrismaRole, MessageReactionRole as PrismaMessageReactionRole, ReactionButton as PrismaReactionButton, Member as PrismaMember, Padrino as PrismaPadrino } from '@prisma/client';
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
    byPrismaId: {
        [prismaId: string]: PrismaMember | undefined;
    };
    byDiscordId: {
        [discordId: string]: string | undefined;
    };
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
export declare const cacheService: CacheServiceInterface;
//# sourceMappingURL=cache.d.ts.map