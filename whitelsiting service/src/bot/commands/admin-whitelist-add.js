import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('admin-whitelist-add')
  .setDescription('Manually whitelist a user (accepts their join request)')
  .addStringOption(option =>
    option
      .setName('roblox_username')
      .setDescription('Roblox username to whitelist')
      .setRequired(true)
  )
  .addUserOption(option =>
    option
      .setName('discord_user')
      .setDescription('Discord user to link (optional)')
      .setRequired(false)
  );

async function execute(interaction, { database, serverConfigService }) {
  const guildError = requireGuild(interaction);
  if (guildError) {
    return interaction.reply({ content: guildError, ephemeral: true });
  }

  const permError = await requireCommandPermission(interaction);
  if (permError) {
    return interaction.reply({ content: permError, ephemeral: true });
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'AdminWhitelistAdd.deferReply' });
    return;
  }

  const db = database || interaction.client.database;
  const configService = serverConfigService || interaction.client.serverConfigService;

  if (!db) {
    return await interaction.editReply({
      content: 'Database service not initialized.'
    });
  }

  try {
    const robloxUsername = interaction.options.getString('roblox_username');
    const discordUser = interaction.options.getUser('discord_user');
    const discordUserId = discordUser?.id || interaction.user.id;

    // Get products for this server
    const products = await configService.getProducts(interaction.guildId);

    if (products.length === 0) {
      return await interaction.editReply({
        content: 'No products configured for this server. Add a product first.'
      });
    }

    // Import Roblox API
    const RobloxApiService = (await import('../../services/robloxApi.js')).default;

    // Get Roblox user ID
    const tempApi = new RobloxApiService();
    const robloxUserId = await tempApi.getUserIdByUsername(robloxUsername);

    if (!robloxUserId) {
      return await interaction.editReply({
        content: `Roblox user "${robloxUsername}" not found.`
      });
    }

    // If multiple products, let admin choose
    let selectedProducts = products;

    if (products.length > 1) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('whitelist_product_select')
        .setPlaceholder('Select products to whitelist for')
        .setMinValues(1)
        .setMaxValues(products.length)
        .addOptions(
          products.map(p => ({
            label: p.name,
            description: `Group ID: ${p.robloxGroupId}`,
            value: p.name
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await interaction.editReply({
        content: `Found Roblox user **${robloxUsername}** (ID: ${robloxUserId}).\n\nSelect which products to whitelist them for:`,
        components: [row]
      });

      try {
        const selectInteraction = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60000
        });

        const selectedNames = selectInteraction.values;
        selectedProducts = products.filter(p => selectedNames.includes(p.name));

        await selectInteraction.update({
          content: `Whitelisting **${robloxUsername}** for ${selectedProducts.length} product(s)...`,
          components: []
        });

      } catch (timeoutError) {
        return await interaction.editReply({
          content: 'Selection timed out. Please try again.',
          components: []
        });
      }
    }

    // Process each selected product
    const results = [];

    for (const product of selectedProducts) {
      const robloxApi = new RobloxApiService({ groupId: product.robloxGroupId });

      // Check if already a member
      const memberCheck = await robloxApi.isUserMember(robloxUserId);
      
      if (memberCheck.isMember) {
        results.push({
          product: product.name,
          success: true,
          message: 'Already a member'
        });
        continue;
      }

      // Check for pending join request
      const pendingCheck = await robloxApi.checkPendingJoinRequest(robloxUsername);

      if (!pendingCheck.isPending) {
        results.push({
          product: product.name,
          success: false,
          message: 'No pending join request'
        });
        continue;
      }

      // Accept the join request
      const acceptResult = await robloxApi.acceptJoinRequest(robloxUserId);

      if (acceptResult.success) {
        results.push({
          product: product.name,
          success: true,
          message: 'Accepted to group'
        });
      } else {
        results.push({
          product: product.name,
          success: false,
          message: acceptResult.error
        });
      }
    }

    // Store redemption record (use a generated key hash)
    const successCount = results.filter(r => r.success).length;

    if (successCount > 0) {
      try {
        // Generate a fake key for manual whitelists
        const manualKey = `MANUAL_${Date.now()}_${robloxUserId}`;
        
        await db.storeRedemption({
          key: manualKey,
          discordUserId,
          robloxUsername,
          robloxUserId,
          ipAddress: null,
          userAgent: 'Manual Admin Whitelist'
        }, {
          isAdmin: true,
          discordUserId: interaction.user.id
        });
      } catch (storeErr) {
        logError(storeErr, { context: 'AdminWhitelistAdd.storeRedemption' });
        // Continue even if storage fails
      }
    }

    // Build response
    const embed = new EmbedBuilder()
      .setColor(successCount > 0 ? 0x2ECC71 : 0xE74C3C)
      .setTitle('Manual Whitelist')
      .addFields([
        { name: 'Roblox User', value: robloxUsername, inline: true },
        { name: 'Roblox ID', value: String(robloxUserId), inline: true },
        { name: 'Discord', value: `<@${discordUserId}>`, inline: true }
      ]);

    const resultText = results.map(r => 
      `${r.product}: ${r.success ? r.message : r.message}`
    ).join('\n');

    embed.addFields([{
      name: 'Results',
      value: resultText || 'No results',
      inline: false
    }]);

    if (successCount > 0) {
      embed.setDescription(`Successfully whitelisted for ${successCount} product(s).`);
    } else {
      embed.setDescription('Failed to whitelist. User may need to send join requests to the groups first.');
    }

    logBotEvent('MANUAL_WHITELIST_ADDED', {
      admin_id: interaction.user.id,
      roblox_username: robloxUsername,
      roblox_user_id: robloxUserId,
      discord_user_id: discordUserId,
      success_count: successCount
    });

    await interaction.editReply({ embeds: [embed], components: [] });

  } catch (error) {
    logError(error, {
      context: 'AdminWhitelistAddExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'Failed to add whitelist.'
    });
  }
}

export default {
  data,
  execute
};
