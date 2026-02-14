"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const builders_1 = require("@discordjs/builders");
const cache_1 = require("../../services/cache");
const setRanks = {
    data: new builders_1.SlashCommandBuilder()
        .setName('set-ranks')
        .setDescription('Setup ranks')
        .addStringOption((option) => option.setName('prefijo').setDescription('Perfijo de los roles a buscar').setRequired(true)),
    execute: async (interaction) => {
        // Only admins can use this command
        if (!interaction.member.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            interaction.reply({
                content: 'No tenés permisos para usar este comando',
                ephemeral: true,
            });
            return;
        }
        const discordInteraction = interaction;
        const prefix = discordInteraction.options.getString('prefijo', true);
        // Get all roles that start with the prefix
        const roles = discordInteraction.guild?.roles.cache.filter((role) => role.name.toLowerCase().startsWith(prefix.toLowerCase()));
        if (!roles || roles.size === 0) {
            await discordInteraction.reply({
                content: 'No se encontraron roles con el prefijo especificado.',
                ephemeral: true,
            });
            return;
        }
        else {
            roles.forEach(async (role) => {
                cache_1.cacheService.upsertRole(role.guild.id, role.id, role.name);
            });
        }
        // Reply with the roles found
        await discordInteraction.reply({
            content: `Se encontraron y almacenaron ${roles.size} roles con el prefijo **"${prefix}"**.\n\n**Son los siguientes:**\n- ${roles.map((role) => '**id:** `' + role.id + '` - **name:** `' + role.name + '`').join('\n- ')}`,
            ephemeral: true,
        });
    },
};
exports.default = setRanks;
