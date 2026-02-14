"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../services/cache");
const discord_js_1 = require("discord.js");
const testCache = {
    data: new discord_js_1.SlashCommandBuilder().setName('test-cache').setDescription('Para testear el cache'),
    execute: async (_discordInteraction) => {
        const padrinosIndex = await cache_1.cacheService.getAllPadrinos();
        if (!padrinosIndex) {
            _discordInteraction.reply({
                content: `# Padrinos Index\nvacio`,
            });
        }
        // make a string of padrinos
        let padrinosData = '';
        for (const [prismaMemberId, prismaPadrino] of Object.entries(padrinosIndex)) {
            padrinosData += '`' + prismaPadrino.memberId + '` - ' + prismaPadrino.shortDescription + '\n';
        }
        _discordInteraction.reply({
            content: `# Padrinos Index\n**prismaPadrino.memberId** | **prismaPadrino.shortDescription**\n${padrinosData}`,
        });
    },
};
exports.default = testCache;
