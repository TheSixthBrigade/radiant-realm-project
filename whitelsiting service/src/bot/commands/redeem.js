import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('redeem')
  .setDescription('Redeem your product key for Roblox group access')
  .addStringOption(option =>
    option
      .setName('key')
      .setDescription('Your product key')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('username')
      .setDescription('Your Roblox username')
      .setRequired(true)
  );

async function execute(interaction, { serverConfigService, keyManager, robloxApi }) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'RedeemCommand.deferReply' });
    return;
  }

  const configService = serverConfigService || interaction.client.serverConfigService;
  const keyMgr = keyManager || interaction.client.keyManager;
  const robloxService = robloxApi || interaction.client.robloxApi;
  
  if (!keyMgr || !robloxService) {
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
    const key = interaction.options.getString('key');
    const robloxUsername = interaction.options.getString('username');
    const discordUserId = interaction.user.id;

    const products = configService ? await configService.getProducts(interaction.guildId) : [];

    if (products.length === 0) {
      return await interaction.editReply({
        content: 'No products configured for this server. Please ask an administrator to set up products.'
      });
    }

    let selectedProduct;

    if (products.length > 1) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('product_select')
        .setPlaceholder('Select a product')
        .addOptions(
          products.map(p => ({
            label: p.name,
            description: `Group: ${p.robloxGroupId}`,
            value: p.name
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await interaction.editReply({
        content: 'Select which product you want to redeem for:',
        components: [row]
      });

      try {
        const selectInteraction = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60000
        });

        selectedProduct = products.find(p => p.name === selectInteraction.values[0]);
        
        await selectInteraction.update({
          content: `Processing redemption for **${selectedProduct.name}**...`,
          components: []
        });

      } catch (timeoutError) {
        return await interaction.editReply({
          content: 'Selection timed out. Please try again.',
          components: []
        });
      }
    } else {
      selectedProduct = products[0];
    }

    logBotEvent('REDEEM_COMMAND_STARTED', {
      user_id: discordUserId,
      roblox_username: robloxUsername,
      product_name: selectedProduct.name
    });

    const redemptionData = {
      key,
      discordUserId,
      robloxUsername,
      ipAddress: null,
      userAgent: 'Discord Bot'
    };

    const context = {
      isAdmin: false,
      discordUserId,
      source: 'discord_command'
    };

    const result = await keyMgr.redeemKey(redemptionData, context, {
      payhipApiKey: selectedProduct.payhipApiKey,
      robloxGroupId: selectedProduct.robloxGroupId
    });

    if (result.success) {
      // Assign role if configured for this product
      let roleAssigned = false;
      let roleError = null;
      
      if (selectedProduct.roleId && interaction.guild) {
        try {
          const member = await interaction.guild.members.fetch(discordUserId);
          if (member && !member.roles.cache.has(selectedProduct.roleId)) {
            await member.roles.add(selectedProduct.roleId);
            roleAssigned = true;
            logBotEvent('ROLE_ASSIGNED', {
              user_id: discordUserId,
              role_id: selectedProduct.roleId,
              product_name: selectedProduct.name
            });
          }
        } catch (roleErr) {
          roleError = roleErr.message;
          logError(roleErr, {
            context: 'RoleAssignment',
            user_id: discordUserId,
            role_id: selectedProduct.roleId
          });
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('Redemption Successful')
        .setDescription(`You've been added to the group.`)
        .addFields([
          { name: 'Product', value: selectedProduct.name, inline: true },
          { name: 'Roblox User', value: result.robloxUsername, inline: true }
        ]);

      if (roleAssigned) {
        embed.addFields([{ name: 'Role', value: `<@&${selectedProduct.roleId}>`, inline: true }]);
      }

      // Add custom redemption message if configured
      if (selectedProduct.redemptionMessage) {
        embed.addFields([{ name: 'Message', value: selectedProduct.redemptionMessage, inline: false }]);
      }

      if (result.warning || roleError) {
        let note = '';
        if (result.warning) {
          note = 'There was a minor issue recording your redemption.';
        }
        if (roleError) {
          note += note ? ' ' : '';
          note += 'Could not assign role (bot may lack permissions).';
        }
        embed.setDescription(`You've been added to the group.\n\nNote: ${note} Contact support if you have problems.`);
      }

      logBotEvent('REDEEM_COMMAND_SUCCESS', {
        user_id: discordUserId,
        roblox_username: result.robloxUsername,
        product_name: selectedProduct.name,
        role_assigned: roleAssigned
      });

      await interaction.editReply({ embeds: [embed], components: [] });

    } else {
      let message = result.message;
      
      // Clean up messages
      switch (result.step) {
        case 'RATE_LIMIT':
          message = 'Too many attempts. Please wait a few minutes and try again.';
          break;
        case 'VALIDATION':
          message = 'Invalid input. Please check your key and username.';
          break;
        case 'PAYHIP_VALIDATION':
          message = 'Invalid or expired product key.';
          break;
        case 'KEY_CHECK':
          message = 'This key has already been redeemed.';
          break;
        case 'USER_LOOKUP':
          message = `Roblox user "${robloxUsername}" not found. Check the spelling.`;
          break;
        case 'MEMBERSHIP_CHECK':
          message = 'You are already a member of this group.';
          break;
        case 'PENDING_CHECK':
          message = `You need to send a join request to the group first.\n\n${result.groupUrl || ''}`;
          break;
        case 'ACCEPT_REQUEST':
          message = 'Failed to accept your join request. Please contact support.';
          break;
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('Redemption Failed')
        .setDescription(message);

      logBotEvent('REDEEM_COMMAND_FAILED', {
        user_id: discordUserId,
        roblox_username: robloxUsername,
        step: result.step,
        error: result.error
      });

      await interaction.editReply({ embeds: [embed], components: [] });
    }

  } catch (error) {
    logError(error, {
      context: 'RedeemCommandExecution',
      user_id: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('Error')
      .setDescription('Something went wrong. Please try again later.');

    try {
      await interaction.editReply({ embeds: [embed], components: [] });
    } catch (replyError) {
      logError(replyError, { context: 'RedeemCommandErrorReply' });
    }
  }
}

export default {
  data,
  execute
};
