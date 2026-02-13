import { Member as PrismaMember } from '@prisma/client';
import { Guild, GuildMember, Message, MessageReaction, User } from 'discord.js';
import { cacheService } from './cache';

const COLDOWN_MS = 90 * 1000;

/// Levels
interface Level {
  [key: string]: number;
}

const levels: Level = {
  '1': 100,
  '2': 1000,
  '3': 3000,
  '4': 4000,
  '5': 5000,
  '6': 6000,
  '7': 7000,
  '8': 8000,
  '9': 9000,
  '10': 10000,
  '11': 11000,
  '12': 12000,
  '13': 13000,
  '14': 14000,
  '15': 15000,
  '16': 16000,
  '17': 17000,
  '18': 18000,
  '19': 19000,
  '20': 20000,
  '21': 21000,
  '22': 100000,
};

enum XpTypes {
  MESSAGE = 100,
  REACTION_RECEIVE = 2,
  REACTION_SEND = 5,
}

/// Level Up
export interface LevelUpStatus {
  canLevelUp: boolean;
  level: number;
  xpRemaining: number;
}

// Set to avoid processing the same reaction twice
const processedReactions = new Set<string>();

function generateReactionKey(reaction: MessageReaction, userId: string): string {
  return `${reaction.message.id}-${reaction.emoji.name}-${userId}`;
}

function canLevelUp(member: PrismaMember, xpToAdd: number) {
  const nextLevelXp: number = levels[(member.discordTemporalLevel + 1).toString()]!;

  // canLevelUp === true, return the remaining xp after level up. (you must asign LevelUpStatus.xpRemaining to member.discordTemporalLevelXp)
  // canLevelUp === false, return the xp to add. (you must add LevelUpStatus.xpRemaining to member.discordTemporalLevelXp)
  const newXp: number = member.discordTemporalLevelXp + xpToAdd;
  return {
    canLevelUp: newXp >= nextLevelXp,
    level: newXp >= nextLevelXp ? member.discordTemporalLevel + 1 : member.discordTemporalLevel,
    xpRemaining: newXp >= nextLevelXp ? newXp - nextLevelXp : xpToAdd,
  } as LevelUpStatus;
}

function amountXpToAddMessage(_message: Message, _prismaMember: PrismaMember) {
  const messageLength: number = _message.content.length;
  const newTimestamp: number = _message.createdTimestamp;
  const lastTimestamp: string = _prismaMember.discordTemporalLevelCooldown;

  const xpType: number = XpTypes.MESSAGE;
  const deltaTime: number = newTimestamp - parseInt(lastTimestamp);
  const lengthMultiplier: number = (Math.random() * messageLength) % 1; // TODO

  const amountXpToAdd = Math.floor(xpType * Math.min(1, deltaTime / COLDOWN_MS) + xpType * lengthMultiplier);

  const levelUpStatus: LevelUpStatus = canLevelUp(_prismaMember, amountXpToAdd);

  return levelUpStatus;
}

async function amountXpToAddReaction(
  _reactionTimestamp: number,
  _reactionAuthor: PrismaMember,
  _messageAuthor: PrismaMember,
) {
  try {
    if (_reactionAuthor === _messageAuthor) {
      return;
    }

    if (!_messageAuthor) {
      throw new Error('Message author not found');
    }

    const levelUpStatusMessageAuthor: LevelUpStatus = canLevelUp(_messageAuthor, XpTypes.REACTION_RECEIVE);

    /// Reaction Author
    if (!_reactionAuthor) {
      throw new Error('Reaction author not found');
    }

    const newTimestamp: number = _reactionTimestamp;
    const lastTimestamp: string = _reactionAuthor.discordTemporalLevelCooldown;

    const xpType: number = XpTypes.REACTION_SEND;
    const deltaTime: number = newTimestamp - parseInt(lastTimestamp);

    const amountXpToAdd = Math.floor(xpType * Math.min(1, deltaTime / COLDOWN_MS)); // TODO

    const levelUpStatusReactionAuthor: LevelUpStatus = canLevelUp(_reactionAuthor, amountXpToAdd);

    return { reactionAuthor: levelUpStatusReactionAuthor, messageAuthor: levelUpStatusMessageAuthor };
  } catch (error) {
    console.error(`Failed to add xp to member: `, error);
  }
}

/// Functions
async function addXpMessage(_message: Message) {
  try {
    if (!_message.guild) return;

    let member: PrismaMember | null = await cacheService.getMemberByDiscordId(
      _message.guild.id,
      _message.author.id,
    );

    // 🔥 Si no existe, lo creamos correctamente
    if (!member) {
  console.log('👤 Miembro no encontrado en DB, creando automáticamente...');

  member = await cacheService.upsertMember(
    _message.guild!.id,
    _message.author.id,
    _message.member?.displayName || _message.author.username,
    _message.author.displayAvatarURL(),
  );
}

if (!member) {
  console.log('❌ No se pudo crear el miembro');
  return null;
}

    // 🔥 Ahora member NUNCA es null
    const levelUpStatus: LevelUpStatus = amountXpToAddMessage(_message, member);

    if (levelUpStatus.canLevelUp) {
      await cacheService.levelUpMember(
        member,
        levelUpStatus.xpRemaining,
        levelUpStatus.level,
        _message.createdTimestamp.toString(),
      );
    } else {
      await cacheService.incrementMemberXp(
        member,
        levelUpStatus.xpRemaining,
        _message.createdTimestamp.toString(),
      );
    }

    return levelUpStatus;
  } catch (error) {
    console.error(`Failed to add xp to member: ${_message.author.username}`, error);
    return null;
  }
}

async function addXpReaction(_reaction: MessageReaction, _reactionAuthor: GuildMember) {
  try {
    if (_reactionAuthor?.user?.bot) {
      throw new Error('Bot cannot receive xp');
    }

    const messageAuthorId: string = _reaction.message.author!.id;
    const discordGuildId: string = _reaction.message.guild!.id;

    if (!messageAuthorId || !_reactionAuthor) {
      throw new Error('Message author or reaction author not found');
    }

    const prismaMessageAuthor: PrismaMember | null = await cacheService.getMemberByDiscordId(
      discordGuildId,
      messageAuthorId,
    );

    const prismaReactionAuthor: PrismaMember | null = await cacheService.getMemberByDiscordId(
      discordGuildId,
      _reactionAuthor.id,
    );

    if (!prismaMessageAuthor || !prismaReactionAuthor) {
      throw new Error('Member not found');
    }

    const reactionKey = generateReactionKey(_reaction, _reactionAuthor.id);

    if (processedReactions.has(reactionKey)) {
      console.log(`Reaction already processed: ${reactionKey}`);
      return;
    }

    const cooldown: number = Date.now();
    const levelUpStatus = await amountXpToAddReaction(cooldown, prismaReactionAuthor, prismaMessageAuthor);

    if (!levelUpStatus) throw new Error('Level up status not found');

    if (levelUpStatus['reactionAuthor'].canLevelUp) {
      await cacheService.levelUpMember(
        prismaReactionAuthor,
        levelUpStatus['reactionAuthor'].xpRemaining,
        levelUpStatus['reactionAuthor'].level,
        cooldown.toString(),
      );
    } else {
      await cacheService.incrementMemberXp(
        prismaReactionAuthor,
        levelUpStatus['reactionAuthor'].xpRemaining,
        cooldown.toString(),
      );
    }

    if (levelUpStatus['messageAuthor'].canLevelUp) {
      await cacheService.levelUpMember(
        prismaMessageAuthor,
        levelUpStatus['messageAuthor'].xpRemaining,
        levelUpStatus['messageAuthor'].level,
        cooldown.toString(),
      );
    } else {
      await cacheService.incrementMemberXp(
        prismaMessageAuthor,
        levelUpStatus['messageAuthor'].xpRemaining,
        cooldown.toString(),
      );
    }

    processedReactions.add(reactionKey);

    return levelUpStatus;
  } catch (error) {
    console.error(`Failed to add xp to member`, error);

    return null;
  }
}

// recursive function to sum xp of level form n to 1
function sumXpLevel(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return levels[n.toString()]!;

  return levels[n.toString()]! + sumXpLevel(n - 1);
}

export { addXpMessage, addXpReaction, sumXpLevel };
