"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../services/cache");
const builders_1 = require("@discordjs/builders");
const seeProfile = {
    data: new builders_1.SlashCommandBuilder()
        .setName('ver-perfil')
        .setDescription('Ver tu perfil del servidor.')
        .addUserOption((option) => option.setName('miembro-a-ver').setDescription('Miembro que deseas ver el perfil').setRequired(false)),
    execute: async (_discordInteraction) => {
        const memberToSee = _discordInteraction.options.getUser('miembro-a-ver', false);
        let memberToSeeId;
        let prefix;
        if (memberToSee) {
            memberToSeeId = memberToSee.id;
            prefix = 'Su';
        }
        else {
            memberToSeeId = _discordInteraction.user.id;
            prefix = 'Tu';
        }
        const discordMember = await _discordInteraction.guild.members.fetch(memberToSeeId);
        const prismaMember = await cache_1.cacheService.getMemberByDiscordId(_discordInteraction.guild?.id, discordMember.id);
        if (!prismaMember) {
            await _discordInteraction.reply({
                content: 'No se encontró el perfil en la base de datos.',
                ephemeral: true,
            });
            return;
        }
        // Get padrino information
        const yourPrismaPadrino = await cache_1.cacheService.getPadrinoByPrismaId(prismaMember.myPadrinoId);
        let yourPrismaPadrinoMember = null;
        if (yourPrismaPadrino) {
            yourPrismaPadrinoMember = await cache_1.cacheService.getMemberByPrismaId(yourPrismaPadrino.memberId);
        }
        // Get ahijados information
        const yourPadrinoProfile = await cache_1.cacheService.getPadrinoByMemberId(prismaMember.id);
        let ahijadosList = 'Sin ahijados';
        if (yourPadrinoProfile) {
            const yourPrismaMemberAhijados = await cache_1.cacheService.getAhijadosByMemberId(yourPadrinoProfile?.id);
            ahijadosList =
                yourPrismaMemberAhijados && yourPrismaMemberAhijados.length > 0
                    ? yourPrismaMemberAhijados.map((ahijado) => ahijado.discordDisplayName).join(', ')
                    : 'Sin ahijados';
        }
        // Create an embed message
        const embed = new builders_1.EmbedBuilder()
            .setColor(0x0099ff)
            .setThumbnail(prismaMember.discordProfilePicture)
            .addFields({ name: 'Nombre', value: prismaMember.discordDisplayName, inline: false }, { name: 'Nivel:', value: prismaMember.discordTemporalLevel.toString(), inline: true }, { name: 'Experiencia:', value: prismaMember.discordTemporalLevelXp.toString(), inline: true }, {
            name: prefix + ' padrino:',
            value: yourPrismaPadrinoMember ? yourPrismaPadrinoMember.discordDisplayName : 'Sin padrino',
            inline: false,
        }, {
            name: prefix + 's ahijados:',
            value: ahijadosList,
            inline: false,
        });
        // Send embed message
        try {
            await _discordInteraction.reply({
                content: '# ' + prefix + ' perfil',
                embeds: [embed],
                ephemeral: true,
            });
        }
        catch (error) {
            console.error('Failed to send embed message', error);
        }
    },
};
exports.default = seeProfile;
