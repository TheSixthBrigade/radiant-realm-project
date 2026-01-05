import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { isBotOwner } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
  .setName('whitelist')
  .setDescription('Insert whitelist system into a Lua file (Bot owner only)')
  .addAttachmentOption(option =>
    option
      .setName('file')
      .setDescription('The Lua file to add whitelist to')
      .setRequired(true)
  );

function generateWhitelistCode(groupId) {
  // Luau whitelist code that checks if GAME OWNER is in the specified group
  return `-- Whitelist System
local GroupService = game:GetService("GroupService")

local WHITELIST_GROUP_ID = ${groupId}

local function checkWhitelist()
    local success, result = pcall(function()
        local gameOwnerId = game.CreatorId
        if game.CreatorType == Enum.CreatorType.Group then
            local groupInfo = GroupService:GetGroupInfoAsync(game.CreatorId)
            gameOwnerId = groupInfo.Owner.Id
        end
        return GroupService:GetGroupsAsync(gameOwnerId)
    end)
    
    if not success then
        return false
    end
    
    for _, group in ipairs(result) do
        if group.Id == WHITELIST_GROUP_ID then
            return true
        end
    end
    
    return false
end

if checkWhitelist() then
    print("Whitelisted")
else
    warn("Unwhitelisted - Contact salusetutela")
    script:Destroy()
    return
end

`;
}

async function execute(interaction, { serverConfigService }) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'Whitelist.deferReply' });
    return;
  }

  if (!isBotOwner(interaction)) {
    return await interaction.editReply({
      content: 'This command is only available to the bot owner.'
    });
  }

  const configService = serverConfigService || interaction.client.serverConfigService;

  if (!configService) {
    return await interaction.editReply({
      content: 'Config service not initialized.'
    });
  }

  try {
    const attachment = interaction.options.getAttachment('file');
    
    if (!attachment.name.endsWith('.lua')) {
      return await interaction.editReply({
        content: 'Please provide a .lua file.'
      });
    }

    // Get all products across all servers (bot owner can see all)
    const allProducts = [];
    const configs = configService.configs;
    
    for (const [guildId, config] of configs) {
      if (config.products && config.products.length > 0) {
        for (const product of config.products) {
          allProducts.push({
            name: product.name,
            groupId: product.robloxGroupId,
            guildId: guildId
          });
        }
      }
    }

    if (allProducts.length === 0) {
      return await interaction.editReply({
        content: 'No products configured. Add products first with /admin-product-add.'
      });
    }

    // Show product selection
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('whitelist_product_select')
      .setPlaceholder('Select which product/group to whitelist for')
      .addOptions(
        allProducts.slice(0, 25).map(p => ({
          label: p.name,
          description: `Group ID: ${p.groupId}`,
          value: `${p.groupId}|${p.name}`
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      content: 'Select which product to add whitelist for:',
      components: [row]
    });

    let selectedGroupId;
    let selectedProductName;

    try {
      const selectInteraction = await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 60000
      });

      const [groupId, productName] = selectInteraction.values[0].split('|');
      selectedGroupId = groupId;
      selectedProductName = productName;

      await selectInteraction.update({
        content: `Processing whitelist for **${productName}** (Group: ${groupId})...`,
        components: []
      });

    } catch (timeoutError) {
      return await interaction.editReply({
        content: 'Selection timed out. Please try again.',
        components: []
      });
    }

    // Download the file
    const fileResponse = await fetch(attachment.url);
    const fileContent = await fileResponse.text();

    // Generate whitelist code
    const whitelistCode = generateWhitelistCode(selectedGroupId);

    // Insert whitelist at the beginning of the file
    const modifiedContent = whitelistCode + '\n' + fileContent;

    // Create output attachment
    const baseName = attachment.name.replace('.lua', '');
    const outputAttachment = new AttachmentBuilder(
      Buffer.from(modifiedContent, 'utf-8'),
      { name: `${baseName}_whitelisted.lua` }
    );

    logBotEvent('WHITELIST_INSERT_SUCCESS', {
      user_id: interaction.user.id,
      input_file: attachment.name,
      product_name: selectedProductName,
      group_id: selectedGroupId
    });

    await interaction.editReply({
      content: `Whitelist added for **${selectedProductName}** (Group: ${selectedGroupId}).`,
      files: [outputAttachment],
      components: []
    });

  } catch (error) {
    logError(error, {
      context: 'WhitelistExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'An error occurred while adding whitelist.',
      components: []
    });
  }
}

export default {
  data,
  execute
};
