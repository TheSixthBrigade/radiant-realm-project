import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { isBotOwner } from '../middleware/adminCheck.js';
import { logBotEvent, logError } from '../../utils/logger.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const data = new SlashCommandBuilder()
  .setName('obfuscate')
  .setDescription('Obfuscate a Lua file (Bot owner only)')
  .addAttachmentOption(option =>
    option
      .setName('file')
      .setDescription('The Lua file to obfuscate')
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

async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (deferError) {
    logError(deferError, { context: 'Obfuscate.deferReply' });
    return;
  }

  if (!isBotOwner(interaction)) {
    return await interaction.editReply({
      content: 'This command is only available to the bot owner.'
    });
  }

  try {
    const attachment = interaction.options.getAttachment('file');
    
    if (!attachment.name.endsWith('.lua')) {
      return await interaction.editReply({
        content: 'Please provide a .lua file.'
      });
    }

    // Download the file
    const response = await fetch(attachment.url);
    const fileContent = await response.text();

    // Create temp directory for processing
    const tempDir = path.join(os.tmpdir(), `obfuscate_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, attachment.name);
    const baseName = attachment.name.replace('.lua', '');
    const outputPath = path.join(tempDir, `${baseName}_obfuscated.lua`);

    // Write input file
    await fs.writeFile(inputPath, fileContent, 'utf-8');

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
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
      
      return await interaction.editReply({
        content: `Obfuscation failed:\n\`\`\`${result.stderr || result.stdout || 'Unknown error'}\`\`\``
      });
    }

    // Check if output file exists
    try {
      await fs.access(outputPath);
    } catch {
      await fs.rm(tempDir, { recursive: true, force: true });
      return await interaction.editReply({
        content: 'Obfuscation completed but output file not found.'
      });
    }

    // Read output file
    const obfuscatedContent = await fs.readFile(outputPath, 'utf-8');

    // Create attachment
    const outputAttachment = new AttachmentBuilder(
      Buffer.from(obfuscatedContent, 'utf-8'),
      { name: `${baseName}_obfuscated.lua` }
    );

    logBotEvent('OBFUSCATE_SUCCESS', {
      user_id: interaction.user.id,
      input_file: attachment.name,
      level: level,
      input_size: fileContent.length,
      output_size: obfuscatedContent.length
    });

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    await interaction.editReply({
      content: `Obfuscation complete (${level}).`,
      files: [outputAttachment]
    });

  } catch (error) {
    logError(error, {
      context: 'ObfuscateExecution',
      user_id: interaction.user.id
    });

    await interaction.editReply({
      content: 'An error occurred during obfuscation.'
    });
  }
}

export default {
  data,
  execute
};
