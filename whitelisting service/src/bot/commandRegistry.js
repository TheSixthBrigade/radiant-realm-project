import { REST, Routes } from 'discord.js';
import { logBotEvent, logError, logDebug } from '../utils/logger.js';

/**
 * Discord Command Registry
 * Handles registration and deployment of slash commands
 */
class CommandRegistry {
  constructor(config = {}) {
    this.token = config.token || process.env.DISCORD_TOKEN;
    this.clientId = config.clientId || process.env.DISCORD_CLIENT_ID;
    this.guildId = config.guildId || process.env.DISCORD_GUILD_ID; // Optional for guild-specific commands
    
    this.rest = new REST({ version: '10' }).setToken(this.token);
    this.commands = [];
  }

  /**
   * Add a command to the registry
   */
  addCommand(commandData) {
    if (!commandData.name || !commandData.description) {
      throw new Error('Command must have name and description');
    }
    
    this.commands.push(commandData.toJSON ? commandData.toJSON() : commandData);
    logDebug('Command added to registry', { command_name: commandData.name });
  }

  /**
   * Add multiple commands to the registry
   */
  addCommands(commands) {
    for (const command of commands) {
      this.addCommand(command);
    }
  }

  /**
   * Deploy commands to Discord (global)
   */
  async deployGlobalCommands() {
    try {
      if (!this.clientId) {
        throw new Error('DISCORD_CLIENT_ID is required for command deployment');
      }

      logBotEvent('DEPLOYING_GLOBAL_COMMANDS', { 
        command_count: this.commands.length 
      });

      const data = await this.rest.put(
        Routes.applicationCommands(this.clientId),
        { body: this.commands }
      );

      logBotEvent('GLOBAL_COMMANDS_DEPLOYED', { 
        deployed_count: data.length 
      });

      console.log(`✅ Successfully deployed ${data.length} global slash commands`);
      return data;

    } catch (error) {
      logError(error, { context: 'DeployGlobalCommands' });
      throw new Error(`Failed to deploy global commands: ${error.message}`);
    }
  }

  /**
   * Deploy commands to a specific guild (faster for development)
   */
  async deployGuildCommands(guildId = null) {
    try {
      const targetGuildId = guildId || this.guildId;
      
      if (!this.clientId) {
        throw new Error('DISCORD_CLIENT_ID is required for command deployment');
      }
      
      if (!targetGuildId) {
        throw new Error('Guild ID is required for guild command deployment');
      }

      logBotEvent('DEPLOYING_GUILD_COMMANDS', { 
        guild_id: targetGuildId,
        command_count: this.commands.length 
      });

      const data = await this.rest.put(
        Routes.applicationGuildCommands(this.clientId, targetGuildId),
        { body: this.commands }
      );

      logBotEvent('GUILD_COMMANDS_DEPLOYED', { 
        guild_id: targetGuildId,
        deployed_count: data.length 
      });

      console.log(`✅ Successfully deployed ${data.length} guild slash commands to ${targetGuildId}`);
      return data;

    } catch (error) {
      logError(error, { 
        context: 'DeployGuildCommands',
        guild_id: guildId || this.guildId 
      });
      throw new Error(`Failed to deploy guild commands: ${error.message}`);
    }
  }

  /**
   * Delete all global commands
   */
  async deleteGlobalCommands() {
    try {
      if (!this.clientId) {
        throw new Error('DISCORD_CLIENT_ID is required');
      }

      logBotEvent('DELETING_GLOBAL_COMMANDS');

      await this.rest.put(
        Routes.applicationCommands(this.clientId),
        { body: [] }
      );

      logBotEvent('GLOBAL_COMMANDS_DELETED');
      console.log('✅ Successfully deleted all global slash commands');

    } catch (error) {
      logError(error, { context: 'DeleteGlobalCommands' });
      throw new Error(`Failed to delete global commands: ${error.message}`);
    }
  }

  /**
   * Delete all guild commands
   */
  async deleteGuildCommands(guildId = null) {
    try {
      const targetGuildId = guildId || this.guildId;
      
      if (!this.clientId || !targetGuildId) {
        throw new Error('DISCORD_CLIENT_ID and Guild ID are required');
      }

      logBotEvent('DELETING_GUILD_COMMANDS', { guild_id: targetGuildId });

      await this.rest.put(
        Routes.applicationGuildCommands(this.clientId, targetGuildId),
        { body: [] }
      );

      logBotEvent('GUILD_COMMANDS_DELETED', { guild_id: targetGuildId });
      console.log(`✅ Successfully deleted all guild slash commands from ${targetGuildId}`);

    } catch (error) {
      logError(error, { 
        context: 'DeleteGuildCommands',
        guild_id: guildId || this.guildId 
      });
      throw new Error(`Failed to delete guild commands: ${error.message}`);
    }
  }

  /**
   * Get all registered commands
   */
  getCommands() {
    return this.commands;
  }

  /**
   * Clear all commands from registry
   */
  clearCommands() {
    this.commands = [];
    logDebug('Command registry cleared');
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];
    
    if (!this.token) {
      errors.push('DISCORD_TOKEN is required');
    }
    
    if (!this.clientId) {
      errors.push('DISCORD_CLIENT_ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default CommandRegistry;