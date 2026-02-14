"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const temporalLevel_1 = require("../services/temporalLevel");
const prismaClient_1 = require("../services/prismaClient");
const event = {
    name: 'messageCreate',
    once: false,
    execute: async (message) => {
        console.log('📩 messageCreate triggered');
        if (message.author.bot) {
            console.log('🤖 Mensaje ignorado (es un bot)');
            return;
        }
        console.log(`👤 Mensaje recibido de: ${message.author.username}`);
        console.log(`📝 Contenido: ${message.content}`);
        const levelUpStatus = await (0, temporalLevel_1.addXpMessage)(message);
        console.log('⚡ Resultado addXpMessage:', levelUpStatus);
        if (levelUpStatus) {
            console.log('📊 LevelUpStatus detectado');
            const levelsChannelId = await prismaClient_1.prisma.guild
                .findUnique({
                where: {
                    discordGuildId: message.guild?.id,
                },
            })
                .then((guild) => guild?.levelsChannelId);
            console.log('📡 Canal configurado en DB:', levelsChannelId);
            const discordChannel = message.guild?.channels.cache.get(levelsChannelId || message.channel.id);
            if (levelUpStatus.canLevelUp) {
                console.log('🎉 Puede subir de nivel!');
                await discordChannel.send(`Felicitaciones <@${message.author.id}>! subiste al nivel ${levelUpStatus.level}!`);
            }
            else {
                console.log('📈 XP sumado pero no sube de nivel todavía');
            }
        }
        else {
            console.log('❌ addXpMessage devolvió undefined');
        }
    },
};
exports.default = event;
