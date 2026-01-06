import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { isBotOwner } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const EXPORT_DIR = 'E:\\Files_To_Obfuscate';

const data = new SlashCommandBuilder()
  .setName('securefolder')
  .setDescription('Secure all .lua files in E:\\ - adds whitelist + obfuscates (Bot owner only)')
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

async function processLocalFile(filePath, groupId, tempDir, obfuscatorPath, level) {
  const fileName = path.basename(filePath);
  const baseName = fileName.replace('.lua', '');
  const inputPath = path.join(tempDir, `${baseName}_whitelisted.lua`);
  const outputPath = path.join(tempDir, `${baseName}_whitelisted_obfuscated.lua`);

  // Read original file
  const fileContent = await fs.readFile(filePath, 'utf-8');

  // Add whitelist
  const whitelistCode = generateWhitelistCode(groupId);
  const whitelistedContent = whitelistCode + '\n' + fileContent;

  // Write whitelisted file to temp
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
    return { success: false, name: fileName, error: result.stderr || result.stdout || 'Unknown error' };
  }

  // Check output exists
  try {
    await fs.access(outputPath);
  } catch {
    return { success: false, name: fileName, error: 'Output file not found' };
  }

  // Read obfuscated content
  const obfuscatedContent = await fs.readFile(outputPath, 'utf-8');

  // Rename original to _original.lua
  const originalPath = filePath.replace('.lua', '_original.lua');
  await fs.rename(filePath, originalPath);

  // Write secured content to original filename
  await fs.writeFile(filePath, obfuscatedContent, 'utf-8');

  return {
    success: true,
    name: fileName,
    originalPath: originalPath
  };
}

async function execute(interaction, { serverConfigService }) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'SecureFolder.deferReply' });
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
    // Check if E:\ exists and is accessible
    try {
      await fs.access(EXPORT_DIR);
    } catch {
      return await interaction.editReply({
        content: `Cannot access ${EXPORT_DIR}. Make sure the drive exists.`
      });
    }

    // Find all .lua files in E:\ (not recursive, skip _original files)
    const files = await fs.readdir(EXPORT_DIR);
    const luaFiles = files.filter(f => 
      f.endsWith('.lua') && 
      !f.endsWith('_original.lua') &&
      !f.endsWith('_secured.lua')
    );

    if (luaFiles.length === 0) {
      return await interaction.editReply({
        content: `No .lua files found in ${EXPORT_DIR}. Export scripts from Roblox Studio first.`
      });
    }

    // Get all products
    const allProducts = [];
    const configs = configService.configs;
    
    for (const [, config] of configs) {
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
      .setCustomId('securefolder_product_select')
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
      content: `Found ${luaFiles.length} .lua file(s) in ${EXPORT_DIR}:\n${luaFiles.map(f => `- ${f}`).join('\n')}\n\nSelect which product to whitelist for:`,
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
        content: `Processing ${luaFiles.length} file(s) for **${productName}**...`,
        components: []
      });

    } catch (timeoutError) {
      return await interaction.editReply({
        content: 'Selection timed out. Please try again.',
        components: []
      });
    }

    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `securefolder_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const obfuscatorPath = path.join(process.cwd(), 'new_obfuscator', 'obfuscate.py');
    const level = interaction.options.getString('level') || 'L2';

    // Process all files
    const results = [];

    for (const fileName of luaFiles) {
      const filePath = path.join(EXPORT_DIR, fileName);
      try {
        const result = await processLocalFile(filePath, selectedGroupId, tempDir, obfuscatorPath, level);
        results.push(result);
      } catch (err) {
        results.push({ success: false, name: fileName, error: err.message });
      }
    }

    // Cleanup temp
    await fs.rm(tempDir, { recursive: true, force: true });

    // Build summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    let summary = `Processed ${luaFiles.length} file(s) for **${selectedProductName}** (${level}).\n`;
    summary += `Success: ${successful.length}, Failed: ${failed.length}\n\n`;

    if (successful.length > 0) {
      summary += 'Secured files (originals renamed to _original.lua):\n';
      for (const s of successful) {
        summary += `- ${s.name}\n`;
      }
    }

    if (failed.length > 0) {
      summary += '\nFailed files:\n';
      for (const f of failed) {
        summary += `- ${f.name}: ${f.error}\n`;
      }
    }

    logBotEvent('SECUREFOLDER_SUCCESS', {
      user_id: interaction.user.id,
      product_name: selectedProductName,
      group_id: selectedGroupId,
      level: level,
      total_files: luaFiles.length,
      successful: successful.length,
      failed: failed.length
    });

    await interaction.editReply({
      content: summary,
      components: []
    });

  } catch (error) {
    logError(error, {
      context: 'SecureFolderExecution',
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
