import { SlashCommandBuilder } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logDebug } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-product-add')
    .setDescription('Add a new product for this server')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Product display name')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('payhip_key')
        .setDescription('Payhip license API key (starts with prod_sk_)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('group_id')
        .setDescription('Roblox group ID')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to assign when user redeems this product')
        .setRequired(false)
    ),

  async execute(interaction, { serverConfigService }) {
    // Check guild context
    const guildError = requireGuild(interaction);
    if (guildError) {
      return interaction.reply({ content: guildError, ephemeral: true });
    }

    // Check command permission (uses Supabase permissions if configured)
    const permError = await requireCommandPermission(interaction);
    if (permError) {
      return interaction.reply({ content: permError, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const name = interaction.options.getString('name');
      const payhipApiKey = interaction.options.getString('payhip_key');
      const robloxGroupId = interaction.options.getString('group_id');
      const role = interaction.options.getRole('role');
      const roleId = role ? role.id : null;

      logDebug('Adding product', {
        guild_id: interaction.guildId,
        product_name: name,
        group_id: robloxGroupId,
        role_id: roleId
      });

      const result = await serverConfigService.addProduct(interaction.guildId, {
        name,
        payhipApiKey,
        robloxGroupId,
        roleId
      });

      if (!result.success) {
        return interaction.editReply({
          content: `Failed to add product: ${result.error}`
        });
      }

      let response = `Product added.\n\n**Name:** ${result.product.name}\n**Group ID:** ${result.product.robloxGroupId}\n**Payhip Key:** ${result.product.payhipApiKey}`;
      if (result.product.roleId) {
        response += `\n**Role:** <@&${result.product.roleId}>`;
      }

      return interaction.editReply({
        content: response
      });

    } catch (error) {
      console.error('Error adding product:', error);
      return interaction.editReply({
        content: 'An error occurred while adding the product.'
      });
    }
  }
};
