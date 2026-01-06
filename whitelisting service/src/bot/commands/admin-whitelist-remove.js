import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('admin-whitelist-remove')
  .setDescription('Remove a user from whitelist and kick from Roblox group')
  .addUserOption(option =>
    option
      .setName('discord_user')
      .setDescription('Discord user to remove (shows all their Roblox accounts)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('roblox_username')
      .setDescription('Roblox username to remove (if not using discord_user)')
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
    logError(deferError, { context: 'AdminWhitelistRemove.deferReply' });
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
    const discordUser = interaction.options.getUser('discord_user');
    const robloxUsername = interaction.options.getString('roblox_username');

    if (!discordUser && !robloxUsername) {
      return await interaction.editReply({
        content: 'Please provide either a Discord user or Roblox username.'
      });
    }

    let redemptions = [];

    if (discordUser) {
      // Get all redemptions for this Discord user
      redemptions = await db.getAllRedemptionsByDiscordUser(discordUser.id, {
        isAdmin: true,
        discordUserId: interaction.user.id
      });

      if (redemptions.length === 0) {
        return await interaction.editReply({
          content: `No whitelists found for <@${discordUser.id}>.`
        });
      }
    } else {
      // Search by Roblox username
      const redemption = await db.getRedemptionByRobloxUsername(robloxUsername, {
        isAdmin: true,
        discordUserId: interaction.user.id
      });

      if (!redemption) {
        return await interaction.editReply({
          content: `No whitelist found for Roblox user "${robloxUsername}".`
        });
      }

      redemptions = [redemption];
    }

    // Get products for this server
    const products = await configService.getProducts(interaction.guildId);

    // If single redemption, process directly
    if (redemptions.length === 1) {
      await processSingleRemoval(interaction, db, products, redemptions[0]);
      return;
    }

    // Multiple redemptions - show selection
    const options = redemptions.slice(0, 24).map((r, i) => ({
      label: r.roblox_username,
      description: `ID: ${r.roblox_user_id} | ${new Date(r.redeemed_at).toLocaleDateString()}`,
      value: r.id
    }));

    // Add "Remove All" option
    options.push({
      label: 'Remove ALL accounts',
      description: `Remove all ${redemptions.length} Roblox accounts`,
      value: 'REMOVE_ALL'
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('whitelist_remove_select')
      .setPlaceholder('Select account(s) to remove')
      .setMinValues(1)
      .setMaxValues(options.length)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      content: `Found **${redemptions.length}** Roblox accounts linked to <@${discordUser.id}>:\n\n${redemptions.map((r, i) => `${i + 1}. **${r.roblox_username}** (ID: ${r.roblox_user_id})`).join('\n')}\n\nSelect which account(s) to remove:`,
      components: [row]
    });

    try {
      const selectInteraction = await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 60000
      });

      const selectedValues = selectInteraction.values;
      const removeAll = selectedValues.includes('REMOVE_ALL');

      let toRemove = [];
      if (removeAll) {
        toRemove = redemptions;
      } else {
        toRemove = redemptions.filter(r => selectedValues.includes(r.id));
      }

      await selectInteraction.update({
        content: `Removing **${toRemove.length}** account(s)...`,
        components: []
      });

      // Process removals
      const results = [];
      for (const redemption of toRemove) {
        const result = await removeRedemption(db, products, redemption);
        results.push(result);
      }

      // Build response embed
      const embed = buildMultiResultEmbed(discordUser, results);

      logBotEvent('WHITELIST_BULK_REMOVED', {
        user_id: interaction.user.id,
        target_discord_id: discordUser?.id,
        removed_count: results.filter(r => r.dbDeleted).length,
        kicked_count: results.reduce((sum, r) => sum + r.kickedGroups.length, 0)
      });

      await interaction.editReply({ embeds: [embed], components: [] });

    } catch (timeoutError) {
      await interaction.editReply({
        content: 'Selection timed out. Please try again.',
        components: []
      });
    }

  } catch (error) {
    logError(error, {
      context: 'AdminWhitelistRemoveExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'Failed to remove whitelist.'
    });
  }
}

async function processSingleRemoval(interaction, db, products, redemption) {
  const configService = interaction.client.serverConfigService;

  if (products.length === 0) {
    // No products, just delete
    const deleteResult = await db.deleteRedemption(redemption.id, {
      isAdmin: true,
      discordUserId: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setColor(deleteResult.success ? 0x2ECC71 : 0xE74C3C)
      .setTitle('Whitelist Removal')
      .addFields([
        { name: 'Roblox User', value: redemption.roblox_username, inline: true },
        { name: 'Roblox ID', value: String(redemption.roblox_user_id), inline: true },
        { name: 'Discord', value: `<@${redemption.discord_user_id}>`, inline: true }
      ])
      .setDescription(deleteResult.success ? 'Whitelist removed.' : `Failed: ${deleteResult.error}`);

    return await interaction.editReply({ embeds: [embed] });
  }

  // If multiple products, let admin choose which groups to kick from
  if (products.length > 1) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('kick_group_select')
      .setPlaceholder('Select groups to kick from')
      .setMinValues(1)
      .setMaxValues(products.length)
      .addOptions(
        products.map(p => ({
          label: p.name,
          description: `Group ID: ${p.robloxGroupId}`,
          value: p.robloxGroupId
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      content: `Found whitelist for **${redemption.roblox_username}** (ID: ${redemption.roblox_user_id}).\n\nSelect which groups to kick them from:`,
      components: [row]
    });

    try {
      const selectInteraction = await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 60000
      });

      const selectedGroupIds = selectInteraction.values;

      await selectInteraction.update({
        content: `Removing **${redemption.roblox_username}** from ${selectedGroupIds.length} group(s)...`,
        components: []
      });

      const kickResults = await kickFromGroups(redemption.roblox_user_id, selectedGroupIds);
      const deleteResult = await db.deleteRedemption(redemption.id, {
        isAdmin: true,
        discordUserId: interaction.user.id
      });

      const embed = buildSingleResultEmbed(redemption, kickResults, deleteResult);

      logBotEvent('WHITELIST_REMOVED', {
        user_id: interaction.user.id,
        roblox_username: redemption.roblox_username,
        roblox_user_id: redemption.roblox_user_id,
        groups_kicked: kickResults.filter(r => r.success).length
      });

      await interaction.editReply({ embeds: [embed], components: [] });

    } catch (timeoutError) {
      await interaction.editReply({
        content: 'Selection timed out. Please try again.',
        components: []
      });
    }
  } else {
    // Single product
    const product = products[0];
    const kickResults = await kickFromGroups(redemption.roblox_user_id, [product.robloxGroupId]);
    const deleteResult = await db.deleteRedemption(redemption.id, {
      isAdmin: true,
      discordUserId: interaction.user.id
    });

    const embed = buildSingleResultEmbed(redemption, kickResults, deleteResult);

    logBotEvent('WHITELIST_REMOVED', {
      user_id: interaction.user.id,
      roblox_username: redemption.roblox_username,
      roblox_user_id: redemption.roblox_user_id,
      groups_kicked: kickResults.filter(r => r.success).length
    });

    await interaction.editReply({ embeds: [embed] });
  }
}

async function removeRedemption(db, products, redemption) {
  const result = {
    redemption,
    kickedGroups: [],
    failedGroups: [],
    dbDeleted: false,
    dbError: null
  };

  // Kick from all configured groups
  for (const product of products) {
    try {
      const RobloxApiService = (await import('../../services/robloxApi.js')).default;
      const robloxApi = new RobloxApiService({ groupId: product.robloxGroupId });
      const kickResult = await robloxApi.kickMember(redemption.roblox_user_id);

      if (kickResult.success) {
        result.kickedGroups.push(product.robloxGroupId);
      } else {
        result.failedGroups.push({ groupId: product.robloxGroupId, error: kickResult.error });
      }
    } catch (err) {
      result.failedGroups.push({ groupId: product.robloxGroupId, error: err.message });
    }
  }

  // Delete from database
  try {
    const deleteResult = await db.deleteRedemption(redemption.id, {
      isAdmin: true,
      discordUserId: 'system'
    });
    result.dbDeleted = deleteResult.success;
    result.dbError = deleteResult.error;
  } catch (err) {
    result.dbError = err.message;
  }

  return result;
}

async function kickFromGroups(robloxUserId, groupIds) {
  const results = [];
  const RobloxApiService = (await import('../../services/robloxApi.js')).default;

  for (const groupId of groupIds) {
    try {
      const robloxApi = new RobloxApiService({ groupId });
      const result = await robloxApi.kickMember(robloxUserId);
      results.push({
        groupId,
        success: result.success,
        error: result.error
      });
    } catch (err) {
      results.push({
        groupId,
        success: false,
        error: err.message
      });
    }
  }

  return results;
}

function buildSingleResultEmbed(redemption, kickResults, deleteResult) {
  const successKicks = kickResults.filter(r => r.success);
  const failedKicks = kickResults.filter(r => !r.success);

  const embed = new EmbedBuilder()
    .setColor(deleteResult.success ? 0x2ECC71 : 0xE74C3C)
    .setTitle('Whitelist Removal')
    .addFields([
      { name: 'Roblox User', value: redemption.roblox_username, inline: true },
      { name: 'Roblox ID', value: String(redemption.roblox_user_id), inline: true },
      { name: 'Discord', value: `<@${redemption.discord_user_id}>`, inline: true }
    ]);

  if (deleteResult.success) {
    embed.setDescription('Whitelist record removed.');
  } else {
    embed.setDescription(`Failed to remove: ${deleteResult.error}`);
  }

  if (successKicks.length > 0) {
    embed.addFields([{
      name: 'Kicked from Groups',
      value: successKicks.map(r => `Group ${r.groupId}`).join('\n'),
      inline: false
    }]);
  }

  if (failedKicks.length > 0) {
    embed.addFields([{
      name: 'Failed to Kick',
      value: failedKicks.map(r => `Group ${r.groupId}: ${r.error}`).join('\n'),
      inline: false
    }]);
  }

  return embed;
}

function buildMultiResultEmbed(discordUser, results) {
  const totalRemoved = results.filter(r => r.dbDeleted).length;
  const totalKicked = results.reduce((sum, r) => sum + r.kickedGroups.length, 0);

  const embed = new EmbedBuilder()
    .setColor(totalRemoved > 0 ? 0x2ECC71 : 0xE74C3C)
    .setTitle('Bulk Whitelist Removal')
    .setDescription(`Removed **${totalRemoved}/${results.length}** accounts, kicked from **${totalKicked}** group(s).`);

  if (discordUser) {
    embed.addFields([{ name: 'Discord User', value: `<@${discordUser.id}>`, inline: true }]);
  }

  const details = results.map(r => {
    let status = r.dbDeleted ? 'Removed' : `Failed: ${r.dbError}`;
    if (r.kickedGroups.length > 0) {
      status += ` | Kicked from ${r.kickedGroups.length} group(s)`;
    }
    return `**${r.redemption.roblox_username}**: ${status}`;
  }).join('\n');

  if (details.length <= 1024) {
    embed.addFields([{ name: 'Details', value: details, inline: false }]);
  } else {
    embed.addFields([{ name: 'Details', value: details.substring(0, 1021) + '...', inline: false }]);
  }

  return embed;
}

export default {
  data,
  execute
};
