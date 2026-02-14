"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const obtenerPadrinoHelpers_1 = require("./obtenerPadrinoHelpers");
const obtenerPadrino = {
    data: new discord_js_1.SlashCommandBuilder().setName('obtener-padrino').setDescription('Elegí tu padrino'),
    execute: async (interaction) => {
        await (0, obtenerPadrinoHelpers_1.createSelectPadrino)(interaction);
    },
};
exports.default = obtenerPadrino;
