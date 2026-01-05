import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { isBotOwner } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const data = new SlashCommandBuilder()
  .setName('bulksecurity')
  .setDescription('Add whitelist and obfuscate multiple Lua files (Bot owner only)')
  .addAttachmentOption(option =>
    option.setName('file1').setDescription('Lua file 1').setRequired(true)
  )
  .addAttachmentOption(option =>
    option.setName('file2').setDescription('Lua file 2').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file3').setDescription('Lua file 3').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file4').setDescription('Lua file 4').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file5').setDescription('Lua file 5').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file6').setDescription('Lua file 6').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file7').setDescription('Lua file 7').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file8').setDescription('Lua file 8').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file9').setDescription('Lua file 9').setRequired(false)
  )
  .addAttachmentOption(option =>
    option.setName('file10').setDescription('Lua file 10').setRequired(false)
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

async function processFile(attachment, groupId, tempDir, obfuscatorPath, level) {
  const baseName = attachment.name.replace('.lua', '');
  const inputPath = path.join(tempDir, `${baseName}_whitelisted.lua`);
  const outputPath = path.join(tempDir, `${baseName}_whitelisted_obfuscated.lua`);

  // Download file
  const response = await fetch(attachment.url);
  const fileContent = await response.text();

  // Add whitelist
  const whitelistCode = generateWhitelistCode(groupId);
  const whitelistedContent = whitelistCode + '\n' + fileContent;

  // Write whitelisted file
  await fs.writeFile(inputPath, whitelistedContent, 'utf-8');

  // Run obfuscator with level
  const result = await new Promise((resolve, reject) => {
    const proc = spawn('python', [obfuscatorPath, inputPath, level], {
      cwd: path.dirname(obfuscatorPath),
      timeout: 120000
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => { resolve({ code, stdout, stderr }); });
    proc.on('error', (err) => { reject(err); });
  });

  if (result.code !== 0) {
    return { success: false, name: attachment.name, error: result.stderr || result.stdout || 'Unknown error' };
  }

  // Check output exists
  try {
    await fs.access(outputPath);
  } catch {
    return { success: false, name: attachment.name, error: 'Output file not found' };
  }

  // Read output
  const obfuscatedContent = await fs.readFile(outputPath, 'utf-8');

  return {
    success: true,
    name: attachment.name,
    outputName: `${baseName}_secured.lua`,
    content: obfuscatedContent
  };
}

async function execute(interaction, { serverConfigService }) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'BulkSecurity.deferReply' });
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
    // Collect all attachments
    const attachments = [];
    for (let i = 1; i <= 10; i++) {
      const att = interaction.options.getAttachment(`file${i}`);
      if (att) {
        if (!att.name.endsWith('.lua')) {
          return await interaction.editReply({
            content: `File ${att.name} is not a .lua file.`
          });
        }
        attachments.push(att);
      }
    }

    if (attachments.length === 0) {
      return await interaction.editReply({
        content: 'Please provide at least one .lua file.'
      });
    }

    // Get all products
    const allProducts = [];
    const configs = configService.configs;
    
    for (const [guildId, config] of configs) {
      if (config.products && config.products.length > 0) {
        for (const product of config.products) {
          allProducts.push({
            name: product.name,
            groupId: product.robloxGroupId
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
      .setCustomId('bulksecurity_product_select')
      .setPlaceholder('Select which product/group for all files')
      .addOptions(
        allProducts.slice(0, 25).map(p => ({
          label: p.name,
          description: `Group ID: ${p.groupId}`,
          value: `${p.groupId}|${p.name}`
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.editReply({
      content: `Processing ${attachments.length} file(s). Select which product to whitelist for:`,
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
        content: `Processing ${attachments.length} file(s) for **${productName}**...`,
        components: []
      });

    } catch (timeoutError) {
      return await interaction.editReply({
        content: 'Selection timed out. Please try again.',
        components: []
      });
    }

    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `bulksecurity_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const obfuscatorPath = path.join(process.cwd(), 'new_obfuscator', 'obfuscate.py');
    const level = interaction.options.getString('level') || 'L2';

    // Process all files
    const results = [];
    const outputFiles = [];

    for (const attachment of attachments) {
      try {
        const result = await processFile(attachment, selectedGroupId, tempDir, obfuscatorPath, level);
        results.push(result);
        
        if (result.success) {
          outputFiles.push(new AttachmentBuilder(
            Buffer.from(result.content, 'utf-8'),
            { name: result.outputName }
          ));
        }
      } catch (err) {
        results.push({ success: false, name: attachment.name, error: err.message });
      }
    }

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    // Build summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    let summary = `Processed ${attachments.length} file(s) for **${selectedProductName}**.\n`;
    summary += `Success: ${successful}, Failed: ${failed.length}`;

    if (failed.length > 0) {
      summary += '\n\nFailed files:\n';
      for (const f of failed) {
        summary += `- ${f.name}: ${f.error}\n`;
      }
    }

    logBotEvent('BULKSECURITY_SUCCESS', {
      user_id: interaction.user.id,
      product_name: selectedProductName,
      group_id: selectedGroupId,
      level: level,
      total_files: attachments.length,
      successful,
      failed: failed.length
    });

    await interaction.editReply({
      content: summary,
      files: outputFiles,
      components: []
    });

  } catch (error) {
    logError(error, {
      context: 'BulkSecurityExecution',
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
