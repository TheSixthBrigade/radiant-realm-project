import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { logBotEvent, logError, logDebug } from '../utils/logger.js';
import { registerGuildEvents, syncAllGuilds } from './events/guildEvents.js';

/**
 * Discord Bot Client
 * Handles bot initialization, command registration, and event management
 */
class DiscordBotClient {
  constructor(config = {}) {
    this.token = config.token || process.env.DISCORD_TOKEN;
    this.clientId = config.clientId || process.env.DISCORD_CLIENT_ID;
    this.isReady = false;
    
    // Initialize Discord client with minimal intents for slash commands
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds // Required for slash commands
      ]
    });
    
    // Command collection
    this.commands = new Collection();
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup Discord client event handlers
   */
  setupEventHandlers() {
    // Ready event
    this.client.once(Events.ClientReady, async (readyClient) => {
      this.isReady = true;
      logBotEvent('BOT_READY', {
        username: readyClient.user.tag,
        id: readyClient.user.id,
        guild_count: readyClient.guilds.cache.size
      });
      
      console.log(`✅ Discord bot ready! Logged in as ${readyClient.user.tag}`);
      
      // Sync all current guilds to database
      await syncAllGuilds(readyClient);
    });

    // Register guild join/leave events
    registerGuildEvents(this.client);

    // Interaction create event (for slash commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      // Handle autocomplete interactions
      if (interaction.isAutocomplete()) {
        const command = this.commands.get(interaction.commandName);
        
        if (!command || !command.autocomplete) {
          return;
        }
        
        try {
          await command.autocomplete(interaction, this.services || {});
        } catch (error) {
          logError(error, {
            context: 'AutocompleteExecution',
            command_name: interaction.commandName,
            user_id: interaction.user.id
          });
        }
        return;
      }
      
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);

      if (!command) {
        logError(new Error(`Unknown command: ${interaction.commandName}`), {
          context: 'InteractionCreate',
          command_name: interaction.commandName,
          user_id: interaction.user.id
        });
        return;
      }

      try {
        logBotEvent('COMMAND_EXECUTED', {
          command_name: interaction.commandName,
          user_id: interaction.user.id,
          guild_id: interaction.guildId,
          channel_id: interaction.channelId
        });
        
        // Pass services to command execute
        await command.execute(interaction, this.services || {});
        
      } catch (error) {
        logError(error, {
          context: 'CommandExecution',
          command_name: interaction.commandName,
          user_id: interaction.user.id,
          guild_id: interaction.guildId
        });

        const errorMessage = 'There was an error while executing this command!';
        
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
          }
        } catch (replyError) {
          logError(replyError, { context: 'ErrorReply' });
        }
      }
    });

    // Error event
    this.client.on(Events.Error, (error) => {
      logError(error, { context: 'DiscordClientError' });
    });

    // Warning event
    this.client.on(Events.Warn, (warning) => {
      logBotEvent('BOT_WARNING', { warning });
    });

    // Debug event (only in debug mode)
    if (process.env.LOG_LEVEL === 'debug') {
      this.client.on(Events.Debug, (info) => {
        logDebug('Discord client debug', { info });
      });
    }

    // Disconnect event
    this.client.on(Events.Disconnect, () => {
      this.isReady = false;
      logBotEvent('BOT_DISCONNECTED');
    });

    // Reconnecting event
    this.client.on(Events.Reconnecting, () => {
      logBotEvent('BOT_RECONNECTING');
    });

    // Resume event
    this.client.on(Events.Resume, () => {
      this.isReady = true;
      logBotEvent('BOT_RESUMED');
    });
  }

  /**
   * Register a command
   */
  registerCommand(command) {
    if (!command.data || !command.execute) {
      throw new Error('Command must have data and execute properties');
    }
    
    this.commands.set(command.data.name, command);
    logDebug('Command registered', { command_name: command.data.name });
  }

  /**
   * Register multiple commands
   */
  registerCommands(commands) {
    for (const command of commands) {
      this.registerCommand(command);
    }
  }

  /**
   * Set services to be passed to commands
   */
  setServices(services) {
    this.services = services;
    logDebug('Services set for bot client', { 
      services: Object.keys(services) 
    });
  }

  /**
   * Initialize and login the bot
   */
  async initialize() {
    try {
      if (!this.token) {
        throw new Error('DISCORD_TOKEN is required');
      }

      logBotEvent('BOT_INITIALIZING');
      
      await this.client.login(this.token);
      
      // Wait for ready event
      await new Promise((resolve) => {
        if (this.isReady) {
          resolve();
        } else {
          this.client.once(Events.ClientReady, resolve);
        }
      });
      
      logBotEvent('BOT_INITIALIZED');
      
    } catch (error) {
      logError(error, { context: 'BotInitialization' });
      throw new Error(`Failed to initialize Discord bot: ${error.message}`);
    }
  }

  /**
   * Gracefully shutdown the bot
   */
  async shutdown() {
    try {
      logBotEvent('BOT_SHUTTING_DOWN');
      
      if (this.client) {
        this.client.destroy();
      }
      
      this.isReady = false;
      
      logBotEvent('BOT_SHUTDOWN_COMPLETE');
      
    } catch (error) {
      logError(error, { context: 'BotShutdown' });
    }
  }

  /**
   * Get bot status information
   */
  getStatus() {
    if (!this.client || !this.isReady) {
      return {
        ready: false,
        uptime: null,
        guilds: 0,
        users: 0,
        commands: this.commands.size
      };
    }

    return {
      ready: this.isReady,
      uptime: this.client.uptime,
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      commands: this.commands.size,
      ping: this.client.ws.ping,
      user: {
        id: this.client.user.id,
        username: this.client.user.username,
        tag: this.client.user.tag
      }
    };
  }

  /**
   * Check if bot is ready
   */
  isClientReady() {
    return this.isReady && this.client && this.client.user;
  }

  /**
   * Get the Discord client instance
   */
  getClient() {
    return this.client;
  }
}

export default DiscordBotClient;