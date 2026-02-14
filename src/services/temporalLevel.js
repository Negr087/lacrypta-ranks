"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addXpMessage = addXpMessage;
exports.addXpReaction = addXpReaction;
exports.sumXpLevel = sumXpLevel;
const cache_1 = require("./cache");
const COLDOWN_MS = 90 * 1000;
const levels = {
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
var XpTypes;
(function (XpTypes) {
    XpTypes[XpTypes["MESSAGE"] = 100] = "MESSAGE";
    XpTypes[XpTypes["REACTION_RECEIVE"] = 2] = "REACTION_RECEIVE";
    XpTypes[XpTypes["REACTION_SEND"] = 5] = "REACTION_SEND";
})(XpTypes || (XpTypes = {}));
// Set to avoid processing the same reaction twice
const processedReactions = new Set();
function generateReactionKey(reaction, userId) {
    return `${reaction.message.id}-${reaction.emoji.name}-${userId}`;
}
function canLevelUp(member, xpToAdd) {
    const nextLevelXp = levels[(member.discordTemporalLevel + 1).toString()];
    // canLevelUp === true, return the remaining xp after level up. (you must asign LevelUpStatus.xpRemaining to member.discordTemporalLevelXp)
    // canLevelUp === false, return the xp to add. (you must add LevelUpStatus.xpRemaining to member.discordTemporalLevelXp)
    const newXp = member.discordTemporalLevelXp + xpToAdd;
    return {
        canLevelUp: newXp >= nextLevelXp,
        level: newXp >= nextLevelXp ? member.discordTemporalLevel + 1 : member.discordTemporalLevel,
        xpRemaining: newXp >= nextLevelXp ? newXp - nextLevelXp : xpToAdd,
    };
}
function amountXpToAddMessage(_message, _prismaMember) {
    const messageLength = _message.content.length;
    const newTimestamp = _message.createdTimestamp;
    const lastTimestamp = _prismaMember.discordTemporalLevelCooldown;
    const xpType = XpTypes.MESSAGE;
    const deltaTime = newTimestamp - parseInt(lastTimestamp);
    const lengthMultiplier = (Math.random() * messageLength) % 1; // TODO
    const amountXpToAdd = Math.floor(xpType * Math.min(1, deltaTime / COLDOWN_MS) + xpType * lengthMultiplier);
    const levelUpStatus = canLevelUp(_prismaMember, amountXpToAdd);
    return levelUpStatus;
}
async function amountXpToAddReaction(_reactionTimestamp, _reactionAuthor, _messageAuthor) {
    try {
        if (_reactionAuthor === _messageAuthor) {
            return;
        }
        if (!_messageAuthor) {
            throw new Error('Message author not found');
        }
        const levelUpStatusMessageAuthor = canLevelUp(_messageAuthor, XpTypes.REACTION_RECEIVE);
        /// Reaction Author
        if (!_reactionAuthor) {
            throw new Error('Reaction author not found');
        }
        const newTimestamp = _reactionTimestamp;
        const lastTimestamp = _reactionAuthor.discordTemporalLevelCooldown;
        const xpType = XpTypes.REACTION_SEND;
        const deltaTime = newTimestamp - parseInt(lastTimestamp);
        const amountXpToAdd = Math.floor(xpType * Math.min(1, deltaTime / COLDOWN_MS)); // TODO
        const levelUpStatusReactionAuthor = canLevelUp(_reactionAuthor, amountXpToAdd);
        return { reactionAuthor: levelUpStatusReactionAuthor, messageAuthor: levelUpStatusMessageAuthor };
    }
    catch (error) {
        console.error(`Failed to add xp to member: `, error);
    }
}
/// Functions
async function addXpMessage(_message) {
    try {
        if (!_message.guild)
            return;
        let member = await cache_1.cacheService.getMemberByDiscordId(_message.guild.id, _message.author.id);
        // 🔥 Si no existe, lo creamos correctamente
        if (!member) {
            console.log('👤 Miembro no encontrado en DB, creando automáticamente...');
            member = await cache_1.cacheService.upsertMember(_message.guild.id, _message.author.id, _message.member?.displayName || _message.author.username, _message.author.displayAvatarURL());
        }
        if (!member) {
            console.log('❌ No se pudo crear el miembro');
            return null;
        }
        // 🔥 Ahora member NUNCA es null
        const levelUpStatus = amountXpToAddMessage(_message, member);
        if (levelUpStatus.canLevelUp) {
            await cache_1.cacheService.levelUpMember(member, levelUpStatus.xpRemaining, levelUpStatus.level, _message.createdTimestamp.toString());
        }
        else {
            await cache_1.cacheService.incrementMemberXp(member, levelUpStatus.xpRemaining, _message.createdTimestamp.toString());
        }
        return levelUpStatus;
    }
    catch (error) {
        console.error(`Failed to add xp to member: ${_message.author.username}`, error);
        return null;
    }
}
async function addXpReaction(_reaction, _reactionAuthor) {
    try {
        if (_reactionAuthor?.user?.bot) {
            throw new Error('Bot cannot receive xp');
        }
        const messageAuthorId = _reaction.message.author.id;
        const discordGuildId = _reaction.message.guild.id;
        if (!messageAuthorId || !_reactionAuthor) {
            throw new Error('Message author or reaction author not found');
        }
        const prismaMessageAuthor = await cache_1.cacheService.getMemberByDiscordId(discordGuildId, messageAuthorId);
        const prismaReactionAuthor = await cache_1.cacheService.getMemberByDiscordId(discordGuildId, _reactionAuthor.id);
        if (!prismaMessageAuthor || !prismaReactionAuthor) {
            throw new Error('Member not found');
        }
        const reactionKey = generateReactionKey(_reaction, _reactionAuthor.id);
        if (processedReactions.has(reactionKey)) {
            console.log(`Reaction already processed: ${reactionKey}`);
            return;
        }
        const cooldown = Date.now();
        const levelUpStatus = await amountXpToAddReaction(cooldown, prismaReactionAuthor, prismaMessageAuthor);
        if (!levelUpStatus)
            throw new Error('Level up status not found');
        if (levelUpStatus['reactionAuthor'].canLevelUp) {
            await cache_1.cacheService.levelUpMember(prismaReactionAuthor, levelUpStatus['reactionAuthor'].xpRemaining, levelUpStatus['reactionAuthor'].level, cooldown.toString());
        }
        else {
            await cache_1.cacheService.incrementMemberXp(prismaReactionAuthor, levelUpStatus['reactionAuthor'].xpRemaining, cooldown.toString());
        }
        if (levelUpStatus['messageAuthor'].canLevelUp) {
            await cache_1.cacheService.levelUpMember(prismaMessageAuthor, levelUpStatus['messageAuthor'].xpRemaining, levelUpStatus['messageAuthor'].level, cooldown.toString());
        }
        else {
            await cache_1.cacheService.incrementMemberXp(prismaMessageAuthor, levelUpStatus['messageAuthor'].xpRemaining, cooldown.toString());
        }
        processedReactions.add(reactionKey);
        return levelUpStatus;
    }
    catch (error) {
        console.error(`Failed to add xp to member`, error);
        return null;
    }
}
// recursive function to sum xp of level form n to 1
function sumXpLevel(n) {
    if (n === 0)
        return 0;
    if (n === 1)
        return levels[n.toString()];
    return levels[n.toString()] + sumXpLevel(n - 1);
}
