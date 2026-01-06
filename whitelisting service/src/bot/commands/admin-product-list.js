import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logDebug } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-product-list')
    .setDescription('List all products configured for this server'),

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
      logDebug('Listing products', { guild_id: interaction.guildId });

      const products = await serverConfigService.getProductsForDisplay(interaction.guildId);

      if (products.length === 0) {
        return interaction.editReply({
          content: 'No products configured for this server.\n\nUse `/admin-product-add` to add a product.'
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Configured Products')
        .setColor(0x5865F2)
        .setDescription(`${products.length} product(s) configured.`);

      for (const product of products) {
        embed.addFields({
          name: product.name,
          value: `**Group ID:** ${product.robloxGroupId}\n**Payhip Key:** \`${product.payhipApiKey}\``,
          inline: false
        });
      }

      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error listing products:', error);
      return interaction.editReply({
        content: 'An error occurred while listing products.'
      });
    }
  }
};
