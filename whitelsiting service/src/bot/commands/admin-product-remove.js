import { SlashCommandBuilder } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logDebug } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-product-remove')
    .setDescription('Remove a product from this server')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Product name to remove')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction, { serverConfigService }) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const products = await serverConfigService.getProducts(interaction.guildId);
      
      const filtered = products
        .filter(p => p.name.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(p => ({ name: p.name, value: p.name }));
      
      await interaction.respond(filtered);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction, { serverConfigService }) {
    // Check guild context
    const guildError = requireGuild(interaction);
    if (guildError) {
      return interaction.reply({ content: guildError, ephemeral: true });
    }

    // Check command permission
    const permError = await requireCommandPermission(interaction);
    if (permError) {
      return interaction.reply({ content: permError, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const name = interaction.options.getString('name');

      logDebug('Removing product', {
        guild_id: interaction.guildId,
        product_name: name
      });

      const result = await serverConfigService.removeProduct(interaction.guildId, name);

      if (!result.success) {
        return interaction.editReply({
          content: result.error
        });
      }

      return interaction.editReply({
        content: `Product "${result.productName}" removed.`
      });

    } catch (error) {
      console.error('Error removing product:', error);
      return interaction.editReply({
        content: 'An error occurred while removing the product.'
      });
    }
  }
};
