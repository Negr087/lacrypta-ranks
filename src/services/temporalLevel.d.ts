import { GuildMember, Message, MessageReaction } from 'discord.js';
export interface LevelUpStatus {
    canLevelUp: boolean;
    level: number;
    xpRemaining: number;
}
declare function addXpMessage(_message: Message): Promise<LevelUpStatus | null | undefined>;
declare function addXpReaction(_reaction: MessageReaction, _reactionAuthor: GuildMember): Promise<{
    reactionAuthor: LevelUpStatus;
    messageAuthor: LevelUpStatus;
} | null | undefined>;
declare function sumXpLevel(n: number): number;
export { addXpMessage, addXpReaction, sumXpLevel };
//# sourceMappingURL=temporalLevel.d.ts.map