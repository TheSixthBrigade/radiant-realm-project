import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } from 'discord.js';
import { requireCommandPermission, requireGuild } from '../middleware/adminCheck.js';
import { logDebug, logError } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-product-edit')
    .setDescription('Edit an existing product'),

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

    try {
      const products = await serverConfigService.getProducts(interaction.guildId);

      if (products.length === 0) {
        return interaction.reply({
          content: 'No products configured. Use /admin-product-add first.',
          ephemeral: true
        });
      }

      // Step 1: Select product
      const productSelect = new StringSelectMenuBuilder()
        .setCustomId('edit_product_select')
        .setPlaceholder('Select a product to edit')
        .addOptions(
          products.slice(0, 25).map(p => ({
            label: p.name,
            description: `Group: ${p.robloxGroupId}`,
            value: p.name
          }))
        );

      const productRow = new ActionRowBuilder().addComponents(productSelect);

      const response = await interaction.reply({
        content: 'Select the product you want to edit:',
        components: [productRow],
        ephemeral: true
      });

      let selectedProductName;
      try {
        const productInteraction = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60000
        });
        selectedProductName = productInteraction.values[0];

        // Step 2: Select what to edit
        const fieldSelect = new StringSelectMenuBuilder()
          .setCustomId('edit_field_select')
          .setPlaceholder('What do you want to edit?')
          .addOptions([
            { label: 'Product Name', value: 'name', description: 'Change the product name' },
            { label: 'Payhip API Key', value: 'payhip_key', description: 'Change the Payhip API key' },
            { label: 'Roblox Group ID', value: 'group_id', description: 'Change the Roblox group ID' },
            { label: 'Roblox API Key', value: 'roblox_api_key', description: 'Set/change Roblox Open Cloud API key (groups permission only)' },
            { label: 'Remove Roblox API Key', value: 'remove_roblox_key', description: 'Remove the Roblox API key' },
            { label: 'Redemption Role', value: 'role', description: 'Set or change the role given on redemption' },
            { label: 'Remove Role', value: 'remove_role', description: 'Remove the redemption role' },
            { label: 'Redemption Message', value: 'message', description: 'Custom message shown after redemption' },
            { label: 'Remove Message', value: 'remove_message', description: 'Remove the custom redemption message' }
          ]);

        const fieldRow = new ActionRowBuilder().addComponents(fieldSelect);

        await productInteraction.update({
          content: `Editing **${selectedProductName}**. What do you want to change?`,
          components: [fieldRow]
        });

        const fieldInteraction = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60000
        });

        const selectedField = fieldInteraction.values[0];

        // Handle remove_role immediately
        if (selectedField === 'remove_role') {
          const result = await serverConfigService.updateProduct(
            interaction.guildId,
            selectedProductName,
            { roleId: null }
          );

          if (result.success) {
            return fieldInteraction.update({
              content: `Role removed from **${selectedProductName}**.`,
              components: []
            });
          } else {
            return fieldInteraction.update({
              content: `Failed to remove role: ${result.error}`,
              components: []
            });
          }
        }

        // Handle remove_roblox_key immediately
        if (selectedField === 'remove_roblox_key') {
          const result = await serverConfigService.updateProduct(
            interaction.guildId,
            selectedProductName,
            { robloxApiKey: null }
          );

          if (result.success) {
            return fieldInteraction.update({
              content: `Roblox API key removed from **${selectedProductName}**.`,
              components: []
            });
          } else {
            return fieldInteraction.update({
              content: `Failed to remove Roblox API key: ${result.error}`,
              components: []
            });
          }
        }

        // Handle remove_message immediately
        if (selectedField === 'remove_message') {
          const result = await serverConfigService.updateProduct(
            interaction.guildId,
            selectedProductName,
            { redemptionMessage: null }
          );

          if (result.success) {
            return fieldInteraction.update({
              content: `Custom message removed from **${selectedProductName}**.`,
              components: []
            });
          } else {
            return fieldInteraction.update({
              content: `Failed to remove message: ${result.error}`,
              components: []
            });
          }
        }

        // For all other fields, show a modal
        const fieldConfig = {
          name: { label: 'New Product Name', placeholder: 'Enter new product name', maxLength: 100, style: TextInputStyle.Short },
          payhip_key: { label: 'New Payhip API Key', placeholder: 'prod_sk_...', style: TextInputStyle.Short },
          group_id: { label: 'New Roblox Group ID', placeholder: 'Enter Roblox group ID (numbers only)', style: TextInputStyle.Short },
          roblox_api_key: { label: 'Roblox Open Cloud API Key', placeholder: 'Enter your Roblox API key (groups permission only!)', style: TextInputStyle.Short },
          role: { label: 'Role ID', placeholder: 'Right-click role > Copy ID', style: TextInputStyle.Short },
          message: { label: 'Redemption Message', placeholder: 'Message shown to user after successful redemption', maxLength: 1000, style: TextInputStyle.Paragraph }
        };

        const config = fieldConfig[selectedField];

        const modal = new ModalBuilder()
          .setCustomId(`edit_modal_${selectedField}`)
          .setTitle(`Edit ${config.label}`);

        const input = new TextInputBuilder()
          .setCustomId('edit_value')
          .setLabel(config.label)
          .setStyle(config.style)
          .setPlaceholder(config.placeholder)
          .setRequired(true);

        if (config.maxLength) {
          input.setMaxLength(config.maxLength);
        }

        const modalRow = new ActionRowBuilder().addComponents(input);
        modal.addComponents(modalRow);

        await fieldInteraction.showModal(modal);

        // Wait for modal submission
        try {
          const modalInteraction = await fieldInteraction.awaitModalSubmit({
            time: 120000,
            filter: i => i.customId === `edit_modal_${selectedField}` && i.user.id === interaction.user.id
          });

          const newValue = modalInteraction.fields.getTextInputValue('edit_value').trim();

          const updates = {};
          if (selectedField === 'name') updates.name = newValue;
          if (selectedField === 'payhip_key') updates.payhipApiKey = newValue;
          if (selectedField === 'group_id') updates.robloxGroupId = newValue;
          if (selectedField === 'roblox_api_key') updates.robloxApiKey = newValue;
          if (selectedField === 'role') {
            // Extract role ID from mention or use as-is
            const roleId = newValue.replace(/<@&|>/g, '').trim();
            
            // Validate role exists
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
              return modalInteraction.reply({
                content: `Role not found. Make sure you provide a valid role ID.\n\nTo get a role ID: Settings > App Settings > Advanced > Enable Developer Mode, then right-click the role > Copy ID`,
                ephemeral: true
              });
            }
            updates.roleId = roleId;
          }
          if (selectedField === 'message') updates.redemptionMessage = newValue;

          logDebug('Editing product', {
            guild_id: interaction.guildId,
            product_name: selectedProductName,
            field: selectedField
          });

          const result = await serverConfigService.updateProduct(
            interaction.guildId,
            selectedProductName,
            updates
          );

          if (!result.success) {
            return modalInteraction.reply({
              content: `Failed to update: ${result.error}`,
              ephemeral: true
            });
          }

          let responseMsg = `Product updated.\n\n**Name:** ${result.product.name}\n**Group ID:** ${result.product.robloxGroupId}`;
          if (result.product.hasRobloxApiKey) {
            responseMsg += `\n**Roblox API Key:** ✅ Set (encrypted)`;
          }
          if (result.product.roleId) {
            responseMsg += `\n**Role:** <@&${result.product.roleId}>`;
          }
          if (result.product.redemptionMessage) {
            responseMsg += `\n**Message:** ${result.product.redemptionMessage.substring(0, 100)}${result.product.redemptionMessage.length > 100 ? '...' : ''}`;
          }

          return modalInteraction.reply({
            content: responseMsg,
            ephemeral: true
          });

        } catch (modalError) {
          // Modal timed out or was dismissed
          return;
        }

      } catch (timeoutError) {
        try {
          await interaction.editReply({
            content: 'Selection timed out. Please try again.',
            components: []
          });
        } catch (e) {}
        return;
      }

    } catch (error) {
      logError(error, { context: 'AdminProductEdit', user_id: interaction.user.id });
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: 'An error occurred while editing the product.',
            components: []
          });
        } else {
          await interaction.reply({
            content: 'An error occurred while editing the product.',
            ephemeral: true
          });
        }
      } catch (e) {}
    }
  }
};
