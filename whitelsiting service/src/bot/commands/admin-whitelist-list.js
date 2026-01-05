import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('admin-whitelist-list')
  .setDescription('List all whitelisted users')
  .addIntegerOption(option =>
    option
      .setName('page')
      .setDescription('Page number (10 per page)')
      .setRequired(false)
  );

async function execute(interaction, { database }) {
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
    logError(deferError, { context: 'AdminWhitelistList.deferReply' });
    return;
  }

  const db = database || interaction.client.database;

  if (!db) {
    return await interaction.editReply({
      content: 'Database service not initialized.'
    });
  }

  try {
    const page = interaction.options.getInteger('page') || 1;
    const perPage = 10;

    const redemptions = await db.getAllRedemptions({
      isAdmin: true,
      discordUserId: interaction.user.id
    });

    if (redemptions.length === 0) {
      return await interaction.editReply({
        content: 'No whitelisted users found.'
      });
    }

    // Sort by most recent first
    redemptions.sort((a, b) => new Date(b.redeemed_at) - new Date(a.redeemed_at));

    const totalPages = Math.ceil(redemptions.length / perPage);
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * perPage;
    const pageRedemptions = redemptions.slice(start, start + perPage);

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('Whitelisted Users')
      .setDescription(`Total: ${redemptions.length} | Page ${currentPage}/${totalPages}`)
      .setFooter({ text: 'Use /admin-whitelist-remove to remove a user' });

    const fields = pageRedemptions.map((r, i) => ({
      name: `${start + i + 1}. ${r.roblox_username}`,
      value: `Roblox ID: ${r.roblox_user_id}\nDiscord: <@${r.discord_user_id}>\nRedeemed: ${new Date(r.redeemed_at).toLocaleDateString()}`,
      inline: true
    }));

    embed.addFields(fields);

    logBotEvent('WHITELIST_LIST_VIEWED', {
      user_id: interaction.user.id,
      page: currentPage,
      total: redemptions.length
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logError(error, {
      context: 'AdminWhitelistListExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'Failed to list whitelisted users.'
    });
  }
}

export default {
  data,
  execute
};
