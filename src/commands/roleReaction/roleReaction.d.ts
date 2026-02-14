import { StringSelectMenuInteraction, MessageReaction } from 'discord.js';
import { Command } from './../../types/command';
declare const roleReaction: Command;
export declare function selectMenu(): Promise<void>;
export declare function asignRoleToMessageReactionRole(_discordInteraction: StringSelectMenuInteraction): Promise<void>;
export declare function reactionToMessage(_discordMessageReaction: MessageReaction, _discordEmojiId: string): Promise<void>;
export declare function finalizeRoleReactionCommand(): Promise<void>;
export default roleReaction;
//# sourceMappingURL=roleReaction.d.ts.map