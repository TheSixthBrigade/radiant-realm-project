import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { isBotOwner } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('admin-config-copy')
  .setDescription('Copy product config from another server (Bot owner only)')
  .addStringOption(option =>
    option
      .setName('source_server_id')
      .setDescription('The server ID to copy config from')
      .setRequired(true)
  )
  .addBooleanOption(option =>
    option
      .setName('create_roles')
      .setDescription('Create roles for products if source had roles (default: true)')
      .setRequired(false)
  );

async function execute(interaction, { serverConfigService }) {
  // Bot owner only - check first before deferring
  if (!isBotOwner(interaction)) {
    return await interaction.reply({
      content: 'This command is only available to the bot owner.',
      ephemeral: true
    });
  }

  if (!interaction.guildId) {
    return await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true
    });
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'AdminConfigCopy.deferReply' });
    return;
  }

  const configService = serverConfigService || interaction.client.serverConfigService;
  
  if (!configService) {
    return await interaction.editReply({
      content: 'Config service not initialized.'
    });
  }

  try {
    const sourceServerId = interaction.options.getString('source_server_id');
    const targetServerId = interaction.guildId;
    const createRoles = interaction.options.getBoolean('create_roles') ?? true;

    if (sourceServerId === targetServerId) {
      return await interaction.editReply({
        content: 'Cannot copy config to the same server.'
      });
    }

    // Check bot permissions for role creation
    const botMember = interaction.guild.members.me;
    const canCreateRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);

    if (createRoles && !canCreateRoles) {
      return await interaction.editReply({
        content: 'Bot lacks Manage Roles permission. Either grant the permission or use create_roles:false.'
      });
    }

    // Get source server products
    const sourceProducts = await configService.getProducts(sourceServerId);

    logBotEvent('CONFIG_COPY_SOURCE', {
      source_server: sourceServerId,
      product_count: sourceProducts.length,
      products: sourceProducts.map(p => p.name)
    });

    if (sourceProducts.length === 0) {
      return await interaction.editReply({
        content: `No products found in server ${sourceServerId}.`
      });
    }

    // Get existing products in target server
    const existingProducts = await configService.getProducts(targetServerId);
    const existingNames = existingProducts.map(p => p.name.toLowerCase());

    let copied = 0;
    let skipped = 0;
    let rolesCreated = 0;
    const results = [];

    for (const product of sourceProducts) {
      // Skip if product with same name exists
      if (existingNames.includes(product.name.toLowerCase())) {
        skipped++;
        results.push(`${product.name} - skipped (already exists)`);
        continue;
      }

      let newRoleId = null;

      // Create role if source product had a role and createRoles is enabled
      if (product.roleId && createRoles && canCreateRoles) {
        try {
          const newRole = await interaction.guild.roles.create({
            name: product.name,
            reason: `Auto-created for product: ${product.name}`
          });
          newRoleId = newRole.id;
          rolesCreated++;
          
          logBotEvent('ROLE_CREATED_FOR_PRODUCT', {
            guild_id: targetServerId,
            role_id: newRole.id,
            role_name: newRole.name,
            product_name: product.name
          });
        } catch (roleErr) {
          logError(roleErr, {
            context: 'AdminConfigCopy.createRole',
            product_name: product.name
          });
          // Continue without role if creation fails
        }
      }

      // Add product to target server
      const result = await configService.addProduct(targetServerId, {
        name: product.name,
        payhipApiKey: product.payhipApiKey,
        robloxGroupId: product.robloxGroupId,
        roleId: newRoleId,
        redemptionMessage: product.redemptionMessage || null
      });

      if (result.success) {
        copied++;
        let status = 'copied';
        if (newRoleId) {
          status += ` + role created`;
        } else if (product.roleId && createRoles) {
          status += ` (role creation failed)`;
        }
        results.push(`${product.name} - ${status}`);
      } else {
        results.push(`${product.name} - failed: ${result.error}`);
      }
    }

    // Force save the config after all products are added
    await configService.saveConfig(targetServerId);

    logBotEvent('CONFIG_COPIED', {
      user_id: interaction.user.id,
      source_server: sourceServerId,
      target_server: targetServerId,
      copied,
      skipped,
      roles_created: rolesCreated
    });

    const embed = new EmbedBuilder()
      .setColor(copied > 0 ? 0x2ECC71 : 0xF39C12)
      .setTitle('Config Copy Complete')
      .setDescription(`Copied ${copied} product(s), skipped ${skipped}, created ${rolesCreated} role(s).`)
      .addFields([
        { name: 'Details', value: results.join('\n') || 'No products processed' }
      ]);

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logError(error, {
      context: 'AdminConfigCopyExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'Failed to copy config. Check the server ID and try again.'
    });
  }
}

export default {
  data,
  execute
};
