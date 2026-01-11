import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('update')
  .setDescription('Get your role if you are already whitelisted for a product in another server');

async function execute(interaction, { serverConfigService, robloxApi, database }) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'UpdateCommand.deferReply' });
    return;
  }

  const configService = serverConfigService || interaction.client.serverConfigService;
  const robloxService = robloxApi || interaction.client.robloxApi;
  const db = database || interaction.client.database;

  if (!configService || !robloxService || !db) {
    return await interaction.editReply({
      content: 'Bot services are not properly initialized. Please contact an administrator.'
    });
  }

  if (!interaction.guildId) {
    return await interaction.editReply({
      content: 'This command can only be used in a server.'
    });
  }

  try {
    const discordUserId = interaction.user.id;

    // Get products configured for this server
    const products = await configService.getProducts(interaction.guildId);

    if (products.length === 0) {
      return await interaction.editReply({
        content: 'No products configured for this server.'
      });
    }

    // Filter products that have a role configured
    const productsWithRoles = products.filter(p => p.roleId);

    if (productsWithRoles.length === 0) {
      return await interaction.editReply({
        content: 'No products in this server have roles configured.'
      });
    }

    // Get user's redemption record to find their Roblox user ID
    let redemption;
    try {
      redemption = await db.getRedemptionByDiscordUser(discordUserId, {
        isAdmin: true,
        discordUserId
      });
    } catch (err) {
      logError(err, { context: 'UpdateCommand.getRedemption', user_id: discordUserId });
    }

    if (!redemption) {
      return await interaction.editReply({
        content: 'You have not redeemed any product yet. Use /redeem first.'
      });
    }

    const robloxUserId = redemption.roblox_user_id;
    const robloxUsername = redemption.roblox_username;

    logBotEvent('UPDATE_COMMAND_STARTED', {
      user_id: discordUserId,
      roblox_user_id: robloxUserId,
      roblox_username: robloxUsername
    });

    // Check which products the user is a member of
    const eligibleProducts = [];

    for (const product of productsWithRoles) {
      try {
        // Create a Roblox API instance for this product's group
        // Use product-specific API key if available, otherwise use global API key from robloxService
        const RobloxApiService = (await import('../../services/robloxApi.js')).default;
        const productRobloxApi = new RobloxApiService({ 
          groupId: product.robloxGroupId,
          apiKey: product.robloxApiKey || robloxService.apiKey
        });

        const memberCheck = await productRobloxApi.isUserMember(robloxUserId);
        
        if (memberCheck.isMember) {
          eligibleProducts.push(product);
        }
      } catch (err) {
        logError(err, {
          context: 'UpdateCommand.memberCheck',
          product_name: product.name,
          group_id: product.robloxGroupId
        });
      }
    }

    if (eligibleProducts.length === 0) {
      return await interaction.editReply({
        content: `You are not a member of any Roblox groups associated with products in this server.\n\nRoblox account: ${robloxUsername}`
      });
    }

    // Assign roles for eligible products
    const member = await interaction.guild.members.fetch(discordUserId);
    const rolesAssigned = [];
    const rolesFailed = [];
    const rolesAlreadyHad = [];
    const rolesCreated = [];

    for (const product of eligibleProducts) {
      try {
        let roleId = product.roleId;
        
        // Check if role exists in this server
        let role = interaction.guild.roles.cache.get(roleId);
        
        // If role doesn't exist, create it
        if (!role) {
          const botMember = interaction.guild.members.me;
          const canCreateRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);
          
          if (canCreateRoles) {
            try {
              role = await interaction.guild.roles.create({
                name: product.name,
                reason: `Auto-created for product: ${product.name}`
              });
              roleId = role.id;
              rolesCreated.push({ product, role });
              
              // Update the product config with the new role ID
              await configService.updateProduct(interaction.guildId, product.name, { roleId: role.id });
              
              logBotEvent('ROLE_AUTO_CREATED', {
                guild_id: interaction.guildId,
                role_id: role.id,
                role_name: role.name,
                product_name: product.name
              });
            } catch (createErr) {
              rolesFailed.push({ product, error: `Could not create role: ${createErr.message}` });
              logError(createErr, {
                context: 'UpdateCommand.createRole',
                product_name: product.name
              });
              continue;
            }
          } else {
            rolesFailed.push({ product, error: 'Role does not exist and bot cannot create roles' });
            continue;
          }
        }
        
        if (member.roles.cache.has(roleId)) {
          rolesAlreadyHad.push(product);
        } else {
          await member.roles.add(roleId);
          rolesAssigned.push(product);
          
          logBotEvent('ROLE_ASSIGNED_UPDATE', {
            user_id: discordUserId,
            role_id: roleId,
            product_name: product.name
          });
        }
      } catch (roleErr) {
        rolesFailed.push({ product, error: roleErr.message });
        logError(roleErr, {
          context: 'UpdateCommand.roleAssign',
          user_id: discordUserId,
          role_id: product.roleId,
          product_name: product.name
        });
      }
    }

    // Build response
    const embed = new EmbedBuilder()
      .setColor(rolesAssigned.length > 0 ? 0x2ECC71 : (rolesAlreadyHad.length > 0 ? 0x3498DB : 0xE74C3C))
      .setTitle('Role Update')
      .addFields([
        { name: 'Roblox Account', value: robloxUsername, inline: true }
      ]);

    if (rolesAssigned.length > 0) {
      embed.setDescription('Roles have been assigned based on your whitelist status.');
      embed.addFields([{
        name: 'Roles Assigned',
        value: rolesAssigned.map(p => `<@&${p.roleId}> (${p.name})`).join('\n'),
        inline: false
      }]);
    }

    if (rolesCreated.length > 0) {
      embed.addFields([{
        name: 'Roles Created',
        value: rolesCreated.map(r => `<@&${r.role.id}> (${r.product.name})`).join('\n'),
        inline: false
      }]);
    }

    if (rolesAlreadyHad.length > 0) {
      embed.addFields([{
        name: 'Already Had',
        value: rolesAlreadyHad.map(p => `<@&${p.roleId}> (${p.name})`).join('\n'),
        inline: false
      }]);
    }

    if (rolesFailed.length > 0) {
      embed.addFields([{
        name: 'Failed',
        value: rolesFailed.map(r => `${r.product.name}: ${r.error}`).join('\n'),
        inline: false
      }]);
    }

    if (rolesAssigned.length === 0 && rolesAlreadyHad.length > 0) {
      embed.setDescription('You already have all the roles you are eligible for.');
    }

    if (rolesAssigned.length === 0 && rolesAlreadyHad.length === 0 && rolesFailed.length > 0) {
      embed.setDescription('Failed to assign roles. The bot may lack permissions.');
    }

    logBotEvent('UPDATE_COMMAND_COMPLETE', {
      user_id: discordUserId,
      roles_assigned: rolesAssigned.length,
      roles_already_had: rolesAlreadyHad.length,
      roles_failed: rolesFailed.length,
      roles_created: rolesCreated.length
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logError(error, {
      context: 'UpdateCommandExecution',
      user_id: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('Error')
      .setDescription('Something went wrong. Please try again later.');

    try {
      await interaction.editReply({ embeds: [embed] });
    } catch (replyError) {
      logError(replyError, { context: 'UpdateCommandErrorReply' });
    }
  }
}

export default {
  data,
  execute
};
