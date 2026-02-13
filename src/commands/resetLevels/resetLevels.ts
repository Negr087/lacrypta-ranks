import { cacheService } from '../../services/cache';
import { Command } from '../../types/command';
import { SlashCommandBuilder, CommandInteraction, GuildMember, PermissionsBitField } from 'discord.js';

const resetLevels: Command = {
  data: new SlashCommandBuilder().setName('reset-levels').setDescription('Resetear el ranking de niveles'),
  execute: async (_discordInteraction: CommandInteraction) => {
    // Only admins can use this command
    if (!(_discordInteraction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator)) {
      _discordInteraction.reply({
        content: 'No tenés permisos para usar este comando',
        ephemeral: true,
      });

      return;
    }

    const resetLevelsStatus: boolean = await cacheService.resetLevels();

    if (resetLevelsStatus) {
      _discordInteraction.reply({
        content: 'Se resetearon los niveles correctamente',
      });
    } else {
      _discordInteraction.reply({
        content: 'Ocurrió un error al resetear los niveles',
      });
    }
  },
};

export default resetLevels;
