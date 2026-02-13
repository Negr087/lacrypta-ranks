import { GuildMember, GuildTextBasedChannel, MessageReaction, Role } from 'discord.js';
import { BotEvent } from '../types/botEvents';
import {
  Message as PrismaMessage,
  MessageReactionRole as PrismaMessageReactionRole,
  Role as PrismaRole,
} from '@prisma/client';
import { reactionToMessage, selectMenu } from '../commands/roleReaction/roleReaction';
import { addXpReaction } from '../services/temporalLevel';
import { cacheService } from '../services/cache';
import { MessageIndex } from '../types/cache';
import { prisma } from '../services/prismaClient';

const event: BotEvent = {
  name: 'messageReactionAdd',
  once: false,
  execute: async (reaction: MessageReaction, discordMember: GuildMember) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);

        return;
      }
    }
    console.log(
      `[messageReactionAdd.ts] <@${discordMember.id}> reacted with ${reaction.emoji.name} to message ${reaction.message.id}`,
    );

    ////////////////////////////////////////////
    //            Temporal Level              //
    ////////////////////////////////////////////
    const levelUpStatus = await addXpReaction(reaction, discordMember);

    if (!levelUpStatus) {
      console.error('[messageReactionAdd.ts] Failed to add xp to member');
    } else {
      // Find levels channel
      const levelsChannelId: string | null | undefined = await prisma.guild
        .findUnique({
          where: {
            discordGuildId: reaction.message.guild?.id,
          },
        })
        .then((guild) => guild?.levelsChannelId);
      const discordChannel: GuildTextBasedChannel | undefined = reaction.message.guild?.channels.cache.get(
        levelsChannelId || reaction.message.channel.id,
      ) as GuildTextBasedChannel;

      if (levelUpStatus['reactionAuthor']) {
        if (levelUpStatus['reactionAuthor'].canLevelUp) {
          await discordChannel.send(
            `Felicitaciones <@${discordMember.id}>! subiste al nivel ${levelUpStatus['reactionAuthor'].level}!`,
          );
        }
        // else {
        //   await discordChannel.send(
        //     `<@${discordMember.id}>! subiste ${levelUpStatus['reactionAuthor'].xpRemaining} puntos de experiencia **por reaccionar**!`,
        //   );
        // }
      }
      if (levelUpStatus['messageAuthor']) {
        if (levelUpStatus['messageAuthor'].canLevelUp) {
          await discordChannel.send(
            `Felicitaciones <@${reaction.message.author?.id}>! subiste al nivel ${levelUpStatus['messageAuthor'].level}!`,
          );
        }
        // else {
        //   await discordChannel.send(
        //     `<@${reaction.message.author?.id}>! subiste ${levelUpStatus['messageAuthor'].xpRemaining} puntos de experiencia **por recibir una reaccion**!`,
        //   );
        // }
      }
    }
    //          End Temporal Level            //

    ////////////////////////////////////////////
    //            Role Reaction               //
    ////////////////////////////////////////////
    const discordEmojiId: string = reaction.emoji.id! || reaction.emoji.name!;
    const discordMessageId: string = reaction.message.id;

    // Get messages from database
    const prismaMessages: MessageIndex | null = await cacheService.getAllMessages();

    if (!prismaMessages) {
      console.error('[messageReactionAdd.ts] Failed to get message from database:');

      return;
    }

    /// /role-reaction ///
    if (prismaMessages[discordMessageId] && prismaMessages[discordMessageId]!.discordCommandName === 'role-reaction') {
      const prismaMessageReactionRoleEmpty: PrismaMessageReactionRole | null =
        await cacheService.updateMessageReactionRoleWithEmojiNullByPrismaMessageId(
          prismaMessages[discordMessageId]?.id!,
          discordEmojiId,
        );

      // Setup if not exists
      if (!prismaMessageReactionRoleEmpty) {
        await reactionToMessage(reaction, discordEmojiId);
        await selectMenu();

        return;
      }
      // Give role to user
      else {
        if (discordMember.user.bot) return;

        // Get messageReactionRole from cache
        const prismaMessageReactionRole: PrismaMessageReactionRole | null =
          await cacheService.getMessageReactionRoleByPrismaMessageId(
            prismaMessages[discordMessageId]!.id!,
            discordEmojiId,
          );

        if (!prismaMessageReactionRole) {
          console.error('Failed to get messageReactionRole from cache');

          return;
        }

        // Get role from guild
        const discordRoleToAsign: Role | undefined = reaction.message.guild!.roles.cache.get(
          prismaMessageReactionRole.roleId,
        );

        try {
          if (discordRoleToAsign) {
            if (discordMember.roles.cache.has(discordRoleToAsign.id)) {
              await discordMember.roles.remove(discordRoleToAsign);
            } else {
              await discordMember.roles.add(discordRoleToAsign);
            }

            if (discordMember.roles.cache.has(discordRoleToAsign.id)) {
              await discordMember.roles.remove(discordRoleToAsign);

              // TODO: send message to user
            } else {
              await discordMember.roles.add(discordRoleToAsign);

              // TODO: send message to user
            }
          }

          console.log(`[messageReactionAdd.ts] Gave role ${discordRoleToAsign?.name} to <@${discordMember.id}>`);

          return;
        } catch (error) {
          console.error('Failed to give role to user:', error);
        }
      }
    }
    //            Role Reaction               //
  },
};

export default event;
