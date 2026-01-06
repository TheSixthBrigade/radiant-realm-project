import { PermissionFlagsBits } from 'discord.js';
import { logSecurityEvent } from '../../utils/logger.js';
import { getSupabaseClient } from '../../config/supabaseConfig.js';

// Bot owner ID - always has admin access
const BOT_OWNER_ID = '1431385498214994040';

// Owner-only commands that cannot be configured
const OWNER_ONLY_COMMANDS = ['obfuscate', 'whitelist', 'fullsecurity', 'bulksecurity', 'securefolder'];

// Use the shared Supabase client from supabaseConfig
const supabase = getSupabaseClient();

/**
 * Check if user is the bot owner
 * @param {Object} interaction - Discord interaction
 * @returns {boolean} True if user is bot owner
 */
export function isBotOwner(interaction) {
  return interaction.user.id === BOT_OWNER_ID;
}

/**
 * Check if command is owner-only
 * @param {string} commandName - Name of the command
 * @returns {boolean} True if command is owner-only
 */
export function isOwnerOnlyCommand(commandName) {
  return OWNER_ONLY_COMMANDS.includes(commandName);
}

/**
 * Check if user has Administrator permission in the guild
 * @param {Object} interaction - Discord interaction
 * @returns {boolean} True if user is admin
 */
export function isAdmin(interaction) {
  // Bot owner always has admin access
  if (isBotOwner(interaction)) {
    return true;
  }
  
  if (!interaction.member) {
    return false;
  }
  
  return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Check command permissions from Supabase
 * @param {Object} interaction - Discord interaction
 * @param {string} commandName - Name of the command
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function checkCommandPermission(interaction, commandName) {
  // Bot owner can use any command
  if (isBotOwner(interaction)) {
    return { allowed: true };
  }
  
  // Owner-only commands are restricted
  if (isOwnerOnlyCommand(commandName)) {
    return { 
      allowed: false, 
      reason: '❌ This command is restricted to the bot owner only.' 
    };
  }
  
  // If no Supabase client, fall back to admin check
  if (!supabase) {
    return { allowed: isAdmin(interaction) };
  }
  
  try {
    // Get server from database
    const { data: server } = await supabase
      .from('discord_servers')
      .select('id')
      .eq('guild_id', interaction.guildId)
      .single();
    
    if (!server) {
      // Server not in database, fall back to admin check
      return { allowed: isAdmin(interaction) };
    }
    
    // Get command permissions
    const { data: permission } = await supabase
      .from('bot_command_permissions')
      .select('*')
      .eq('server_id', server.id)
      .eq('command_name', commandName)
      .single();
    
    // No custom permissions set, fall back to admin check
    if (!permission) {
      return { allowed: isAdmin(interaction) };
    }
    
    // Command is disabled
    if (!permission.enabled) {
      return { 
        allowed: false, 
        reason: '❌ This command is disabled in this server.' 
      };
    }
    
    // Requires admin permission
    if (permission.require_admin) {
      return { allowed: isAdmin(interaction) };
    }
    
    // Check if user has one of the allowed roles
    if (permission.allowed_role_ids && permission.allowed_role_ids.length > 0) {
      const memberRoles = interaction.member?.roles?.cache?.map(r => r.id) || [];
      const hasAllowedRole = permission.allowed_role_ids.some(roleId => 
        memberRoles.includes(roleId)
      );
      
      if (hasAllowedRole) {
        return { allowed: true };
      }
    }
    
    // Fall back to admin check
    return { allowed: isAdmin(interaction) };
    
  } catch (error) {
    console.error('Error checking command permissions:', error);
    // On error, fall back to admin check
    return { allowed: isAdmin(interaction) };
  }
}

/**
 * Middleware to require admin permission (legacy - uses simple admin check)
 * Returns error message if not admin, null if admin
 * @param {Object} interaction - Discord interaction
 * @returns {string|null} Error message or null
 */
export function requireAdmin(interaction) {
  if (!isAdmin(interaction)) {
    logSecurityEvent('ADMIN_ACCESS_DENIED', 'MEDIUM', {
      user_id: interaction.user.id,
      guild_id: interaction.guildId,
      command: interaction.commandName
    });
    
    return '❌ You need Administrator permission to use this command.';
  }
  
  return null;
}

/**
 * Middleware to require command permission (checks Supabase permissions)
 * Returns error message if not allowed, null if allowed
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<string|null>} Error message or null
 */
export async function requireCommandPermission(interaction) {
  const commandName = interaction.commandName;
  const result = await checkCommandPermission(interaction, commandName);
  
  if (!result.allowed) {
    logSecurityEvent('COMMAND_ACCESS_DENIED', 'MEDIUM', {
      user_id: interaction.user.id,
      guild_id: interaction.guildId,
      command: commandName,
      reason: result.reason
    });
    
    return result.reason || '❌ You do not have permission to use this command.';
  }
  
  return null;
}

/**
 * Check if interaction is in a guild (not DM)
 * @param {Object} interaction - Discord interaction
 * @returns {boolean} True if in guild
 */
export function isInGuild(interaction) {
  return !!interaction.guildId;
}

/**
 * Middleware to require guild context
 * @param {Object} interaction - Discord interaction
 * @returns {string|null} Error message or null
 */
export function requireGuild(interaction) {
  if (!isInGuild(interaction)) {
    return '❌ This command can only be used in a server.';
  }
  
  return null;
}

/**
 * Middleware to require bot owner
 * @param {Object} interaction - Discord interaction
 * @returns {string|null} Error message or null
 */
export function requireBotOwner(interaction) {
  if (!isBotOwner(interaction)) {
    logSecurityEvent('OWNER_ACCESS_DENIED', 'HIGH', {
      user_id: interaction.user.id,
      guild_id: interaction.guildId,
      command: interaction.commandName
    });
    
    return '❌ This command is restricted to the bot owner only.';
  }
  
  return null;
}
