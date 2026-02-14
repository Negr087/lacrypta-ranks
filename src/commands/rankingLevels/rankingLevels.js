"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builders_1 = require("@discordjs/builders");
const cache_1 = require("../../services/cache");
const temporalLevel_1 = require("../../services/temporalLevel");
const rankingLevels = {
    data: new builders_1.SlashCommandBuilder()
        .setName('ranking-niveles')
        .setDescription('Ver el ranking de niveles.'),
    execute: async (_discordInteraction) => {
        const updateLevelSatus = await cache_1.cacheService.updateMembersLevelsToDatabase();
        const topTen = await cache_1.cacheService.getMembersRankingTopTen(_discordInteraction.guild?.id);
        if (!topTen)
            return;
        const rankingEmbed = new builders_1.EmbedBuilder().setColor(0x0099ff);
        // let data: string = '';
        topTen.forEach((member, index) => {
            if (member.discordTemporalLevelXp === 0) {
                if (index === 0)
                    rankingEmbed.setDescription('Nadie ganó experiencia.');
                return;
            }
            // Data in rankingEmbed
            switch (index) {
                case 0:
                    rankingEmbed.addFields({
                        name: `:trophy: Primero`,
                        value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${(0, temporalLevel_1.sumXpLevel)(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
                        inline: false,
                    });
                    break;
                case 1:
                    rankingEmbed.addFields({
                        name: `:second_place: Segundo`,
                        value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${(0, temporalLevel_1.sumXpLevel)(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
                        inline: false,
                    });
                    break;
                case 2:
                    rankingEmbed.addFields({
                        name: `:third_place: Tercero`,
                        value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${(0, temporalLevel_1.sumXpLevel)(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
                        inline: false,
                    });
                    break;
                default:
                    rankingEmbed.addFields({
                        name: `#${index + 1}`,
                        value: `**<@${member.discordMemeberId}>**\n*Nivel:* ${member.discordTemporalLevel} - *XP:* ${(0, temporalLevel_1.sumXpLevel)(member.discordTemporalLevel) + member.discordTemporalLevelXp}`,
                        inline: false,
                    });
                    break;
            }
            // Data in string
            // switch (index) {
            //   case 0:
            //     data += `# :trophy: **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
            //     break;
            //   case 1:
            //     data += `## :second_place: **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
            //     break;
            //   case 2:
            //     data += `### :third_place: **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
            //     break;
            //   default:
            //     data += `#${index + 1} **<@${member.discordMemeberId}>**\n> *Nivel:* ${member.discordTemporalLevel} - *XP:* ${member.discordTemporalLevelXp}\n`;
            //     break;
            // }
        });
        // Send rankingEmbed message
        try {
            await _discordInteraction.reply({
                content: '# Ranking de niveles\n',
                embeds: [rankingEmbed],
            });
        }
        catch (error) {
            console.error('Failed to send rankingEmbed message', error);
        }
    },
};
exports.default = rankingLevels;
