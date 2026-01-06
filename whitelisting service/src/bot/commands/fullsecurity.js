import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { isBotOwner } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const data = new SlashCommandBuilder()
  .setName('fullsecurity')
  .setDescription('Add whitelist and obfuscate a Lua file (Bot owner only)')
  .addAttachmentOption(option =>
    option
      .setName('file')
      .setDescription('The Lua file to secure')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('level')
      .setDescription('Security level (L1=max security, L2=balanced, L3=max performance)')
      .setRequired(false)
      .addChoices(
        { name: 'L1 - Max Security (slower)', value: 'L1' },
        { name: 'L2 - Balanced (default)', value: 'L2' },
        { name: 'L3 - Max Performance (faster)', value: 'L3' }
      )
  );

function generateWhitelistCode(groupId) {
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
    logError(deferError, { context: 'FullSecurity.deferReply' });
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

    // Get all products across all servers
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
      .setCustomId('fullsecurity_product_select')
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
        content: `Adding whitelist and obfuscating for **${productName}**...`,
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

    // Step 1: Add whitelist code
    const whitelistCode = generateWhitelistCode(selectedGroupId);
    const whitelistedContent = whitelistCode + '\n' + fileContent;

    // Step 2: Obfuscate the whitelisted file
    const tempDir = path.join(os.tmpdir(), `fullsecurity_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const baseName = attachment.name.replace('.lua', '');
    const inputPath = path.join(tempDir, `${baseName}_whitelisted.lua`);
    const outputPath = path.join(tempDir, `${baseName}_whitelisted_obfuscated.lua`);

    // Write whitelisted file
    await fs.writeFile(inputPath, whitelistedContent, 'utf-8');

    // Get obfuscator path and level
    const obfuscatorPath = path.join(process.cwd(), 'new_obfuscator', 'obfuscate.py');
    const level = interaction.options.getString('level') || 'L2';

    // Run obfuscator with level
    const result = await new Promise((resolve, reject) => {
      const proc = spawn('python', [obfuscatorPath, inputPath, level], {
        cwd: path.join(process.cwd(), 'new_obfuscator'),
        timeout: 120000
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    if (result.code !== 0) {
      await fs.rm(tempDir, { recursive: true, force: true });
      
      return await interaction.editReply({
        content: `Obfuscation failed:\n\`\`\`${result.stderr || result.stdout || 'Unknown error'}\`\`\``,
        components: []
      });
    }

    // Check if output file exists
    try {
      await fs.access(outputPath);
    } catch {
      await fs.rm(tempDir, { recursive: true, force: true });
      return await interaction.editReply({
        content: 'Obfuscation completed but output file not found.',
        components: []
      });
    }

    // Read output file
    const obfuscatedContent = await fs.readFile(outputPath, 'utf-8');

    // Create attachment
    const outputAttachment = new AttachmentBuilder(
      Buffer.from(obfuscatedContent, 'utf-8'),
      { name: `${baseName}_secured.lua` }
    );

    logBotEvent('FULLSECURITY_SUCCESS', {
      user_id: interaction.user.id,
      input_file: attachment.name,
      product_name: selectedProductName,
      group_id: selectedGroupId,
      level: level,
      input_size: fileContent.length,
      output_size: obfuscatedContent.length
    });

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    await interaction.editReply({
      content: `Whitelist added for **${selectedProductName}** and obfuscated (${level}).`,
      files: [outputAttachment],
      components: []
    });

  } catch (error) {
    logError(error, {
      context: 'FullSecurityExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'An error occurred during processing.',
      components: []
    });
  }
}

export default {
  data,
  execute
};
