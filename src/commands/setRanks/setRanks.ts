import {
  Collection,
  CommandInteraction,
  CommandInteractionOptionResolver,
  GuildMember,
  PermissionsBitField,
  Role,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../../types/command';
import { cacheService } from '../../services/cache';

const setRanks: Command = {
  data: new SlashCommandBuilder()
    .setName('set-ranks')
    .setDescription('Setup ranks')
    .addStringOption((option) =>
      option.setName('prefijo').setDescription('Perfijo de los roles a buscar').setRequired(true),
    ) as SlashCommandBuilder,
  execute: async (interaction: CommandInteraction) => {
    // Only admins can use this command
    if (!(interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator)) {
      interaction.reply({
        content: 'No tenés permisos para usar este comando',
        ephemeral: true,
      });

      return;
    }

    const discordInteraction = interaction;

    const prefix: string = (discordInteraction.options as CommandInteractionOptionResolver).getString('prefijo', true);

    // Get all roles that start with the prefix
    const roles: Collection<string, Role> | undefined = discordInteraction.guild?.roles.cache.filter((role) =>
      role.name.toLowerCase().startsWith(prefix.toLowerCase()),
    );

    if (!roles || roles.size === 0) {
      await discordInteraction.reply({
        content: 'No se encontraron roles con el prefijo especificado.',
        ephemeral: true,
      });

      return;
    } else {
      roles.forEach(async (role) => {
        cacheService.upsertRole(role.guild.id, role.id, role.name);
      });
    }

    // Reply with the roles found
    await discordInteraction.reply({
      content: `Se encontraron y almacenaron ${roles.size} roles con el prefijo **"${prefix}"**.\n\n**Son los siguientes:**\n- ${roles.map((role) => '**id:** `' + role.id + '` - **name:** `' + role.name + '`').join('\n- ')}`,
      ephemeral: true,
    });
  },
};

export default setRanks;
