import { initializeDatabase, validateDatabaseConfig } from './config/database.js';
import { fetchConfig } from './config/supabaseConfig.js';
import DiscordBotClient from './bot/client.js';
import CommandRegistry from './bot/commandRegistry.js';
import RobloxApiService from './services/robloxApi.js';
import KeyManagerService from './services/keyManager.js';
import ServerConfigService from './services/serverConfigService.js';
import redeemCommand from './bot/commands/redeem.js';
import adminProductAddCommand from './bot/commands/admin-product-add.js';
import adminProductRemoveCommand from './bot/commands/admin-product-remove.js';
import adminProductListCommand from './bot/commands/admin-product-list.js';
import adminProductEditCommand from './bot/commands/admin-product-edit.js';
import adminConfigCopyCommand from './bot/commands/admin-config-copy.js';
import obfuscateCommand from './bot/commands/obfuscate.js';
import whitelistCommand from './bot/commands/whitelist.js';
import fullsecurityCommand from './bot/commands/fullsecurity.js';
import bulksecurityCommand from './bot/commands/bulksecurity.js';
import securefolderCommand from './bot/commands/securefolder.js';
import updateCommand from './bot/commands/update.js';
import adminWhitelistListCommand from './bot/commands/admin-whitelist-list.js';
import adminWhitelistAddCommand from './bot/commands/admin-whitelist-add.js';
import adminWhitelistRemoveCommand from './bot/commands/admin-whitelist-remove.js';
import { logBotEvent, logError, logDebug } from './utils/logger.js';

// Config loaded from Supabase (no .env needed!)
let config = {};

/**
 * Discord Roblox Whitelist Bot
 * Main application entry point
 */
class WhitelistBot {
  constructor() {
    this.database = null;
    this.robloxApi = null;
    this.keyManager = null;
    this.serverConfigService = null;
    this.botClient = null;
    this.commandRegistry = null;
    this.isInitialized = false;
    this.isShuttingDown = false;
  }

  /**
   * Validate all configuration
   */
  validateConfiguration() {
    const errors = [];
    
    // Check required config values (loaded from Supabase)
    if (!config.DISCORD_TOKEN) {
      errors.push('DISCORD_TOKEN is required');
    }
    
    if (!config.DISCORD_CLIENT_ID) {
      errors.push('DISCORD_CLIENT_ID is required');
    }
    
    if (!config.ROBLOX_API_KEY) {
      errors.push('ROBLOX_API_KEY is required');
    }
    
    if (!config.ROBLOX_GROUP_ID) {
      errors.push('ROBLOX_GROUP_ID is required');
    }
    
    // Note: PAYHIP_API_KEY is now per-product in bot_products table
    // No longer a global requirement
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Initialize all services
   */
  async initializeServices() {
    try {
      logBotEvent('INITIALIZING_SERVICES');
      
      // Initialize database
      console.log('🔒 Initializing secure database...');
      this.database = await initializeDatabase();
      
      // Initialize Roblox API service
      console.log('🎮 Initializing Roblox API service...');
      this.robloxApi = new RobloxApiService({
        apiKey: config.ROBLOX_API_KEY,
        groupId: config.ROBLOX_GROUP_ID
      });
      
      // Validate Roblox API configuration
      const robloxValidation = this.robloxApi.validateConfig();
      if (!robloxValidation.isValid) {
        throw new Error(`Roblox API configuration invalid: ${robloxValidation.errors.join(', ')}`);
      }
      
      // Test Roblox API connection
      const healthCheck = await this.robloxApi.healthCheck();
      if (!healthCheck.healthy) {
        console.warn('⚠️ Roblox API health check failed:', healthCheck.error);
      } else {
        console.log('✅ Roblox API connection verified');
      }
      
      // Initialize key manager
      console.log('🔑 Initializing key manager...');
      this.keyManager = new KeyManagerService(this.database, this.robloxApi);
      
      // Initialize server config service
      console.log('⚙️ Initializing server config service...');
      this.serverConfigService = new ServerConfigService(this.database);
      await this.serverConfigService.initialize();
      
      // Initialize Discord bot client
      console.log('🤖 Initializing Discord bot...');
      this.botClient = new DiscordBotClient({
        token: config.DISCORD_TOKEN,
        clientId: config.DISCORD_CLIENT_ID
      });
      
      // Attach services to bot client for command access
      this.botClient.client.database = this.database;
      this.botClient.client.robloxApi = this.robloxApi;
      this.botClient.client.keyManager = this.keyManager;
      this.botClient.client.serverConfigService = this.serverConfigService;
      this.botClient.client.botClient = this.botClient;
      
      // Set services for new command pattern
      this.botClient.setServices({
        database: this.database,
        robloxApi: this.robloxApi,
        keyManager: this.keyManager,
        serverConfigService: this.serverConfigService
      });
      
      logBotEvent('SERVICES_INITIALIZED');
      
    } catch (error) {
      logError(error, { context: 'ServiceInitialization' });
      throw error;
    }
  }

  /**
   * Register and deploy commands
   */
  async setupCommands() {
    try {
      logBotEvent('SETTING_UP_COMMANDS');
      
      // Initialize command registry
      this.commandRegistry = new CommandRegistry({
        token: config.DISCORD_TOKEN,
        clientId: config.DISCORD_CLIENT_ID,
        guildId: config.DISCORD_GUILD_ID
      });
      
      // Register commands with the bot client
      this.botClient.registerCommand(redeemCommand);
      this.botClient.registerCommand(adminProductAddCommand);
      this.botClient.registerCommand(adminProductRemoveCommand);
      this.botClient.registerCommand(adminProductListCommand);
      this.botClient.registerCommand(adminProductEditCommand);
      this.botClient.registerCommand(adminConfigCopyCommand);
      this.botClient.registerCommand(obfuscateCommand);
      this.botClient.registerCommand(whitelistCommand);
      this.botClient.registerCommand(fullsecurityCommand);
      this.botClient.registerCommand(bulksecurityCommand);
      this.botClient.registerCommand(securefolderCommand);
      this.botClient.registerCommand(updateCommand);
      this.botClient.registerCommand(adminWhitelistListCommand);
      this.botClient.registerCommand(adminWhitelistAddCommand);
      this.botClient.registerCommand(adminWhitelistRemoveCommand);
      
      // Add commands to registry for deployment
      this.commandRegistry.addCommand(redeemCommand.data);
      this.commandRegistry.addCommand(adminProductAddCommand.data);
      this.commandRegistry.addCommand(adminProductRemoveCommand.data);
      this.commandRegistry.addCommand(adminProductListCommand.data);
      this.commandRegistry.addCommand(adminProductEditCommand.data);
      this.commandRegistry.addCommand(adminConfigCopyCommand.data);
      this.commandRegistry.addCommand(obfuscateCommand.data);
      this.commandRegistry.addCommand(whitelistCommand.data);
      this.commandRegistry.addCommand(fullsecurityCommand.data);
      this.commandRegistry.addCommand(bulksecurityCommand.data);
      this.commandRegistry.addCommand(securefolderCommand.data);
      this.commandRegistry.addCommand(updateCommand.data);
      this.commandRegistry.addCommand(adminWhitelistListCommand.data);
      this.commandRegistry.addCommand(adminWhitelistAddCommand.data);
      this.commandRegistry.addCommand(adminWhitelistRemoveCommand.data);
      
      // Deploy commands
      if (config.DISCORD_GUILD_ID) {
        // Deploy to specific guild (faster for development)
        console.log('📋 Deploying guild commands...');
        await this.commandRegistry.deployGuildCommands();
      } else {
        // Deploy globally (takes up to 1 hour to propagate)
        console.log('🌍 Deploying global commands...');
        await this.commandRegistry.deployGlobalCommands();
      }
      
      logBotEvent('COMMANDS_DEPLOYED');
      
    } catch (error) {
      logError(error, { context: 'CommandSetup' });
      throw error;
    }
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      console.log('🚀 Starting Discord Roblox Whitelist Bot...\n');
      
      // Load configuration from Supabase
      console.log('☁️ Loading configuration from Supabase...');
      try {
        config = await fetchConfig();
        console.log('✅ Configuration loaded from Supabase\n');
      } catch (error) {
        console.error('❌ Failed to load config from Supabase:', error.message);
        console.error('   Make sure SUPABASE_SERVICE_KEY is set or bot_config table exists');
        process.exit(1);
      }
      
      // Validate configuration
      console.log('⚙️ Validating configuration...');
      const configValidation = this.validateConfiguration();
      if (!configValidation.isValid) {
        console.error('❌ Configuration validation failed:');
        configValidation.errors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      console.log('✅ Configuration valid\n');
      
      // Initialize services
      await this.initializeServices();
      console.log('✅ All services initialized\n');
      
      // Setup commands
      await this.setupCommands();
      console.log('✅ Commands registered and deployed\n');
      
      // Start Discord bot
      console.log('🔗 Connecting to Discord...');
      await this.botClient.initialize();
      
      this.isInitialized = true;
      
      // Setup cleanup handlers
      this.setupGracefulShutdown();
      
      // Start periodic cleanup
      this.startPeriodicCleanup();
      
      console.log('\nBot is running.');
      console.log('Commands: /redeem, /update, /admin-product-*, /admin-whitelist-*, /admin-config-copy, /obfuscate, /whitelist, /fullsecurity, /bulksecurity, /securefolder');
      
      logBotEvent('BOT_STARTED');
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error.message);
      logError(error, { context: 'BotStartup' });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      logBotEvent('SHUTDOWN_INITIATED', { signal });
      
      try {
        // Stop Discord bot
        if (this.botClient) {
          console.log('🤖 Shutting down Discord bot...');
          await this.botClient.shutdown();
        }
        
        // Close database
        if (this.database) {
          console.log('🔒 Closing database...');
          await this.database.close();
        }
        
        console.log('✅ Graceful shutdown complete');
        logBotEvent('SHUTDOWN_COMPLETE');
        
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        logError(error, { context: 'Shutdown' });
        process.exit(1);
      }
    };
    
    // Handle various shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      logError(error, { context: 'UncaughtException' });
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      logError(new Error(`Unhandled Rejection: ${reason}`), { context: 'UnhandledRejection' });
      shutdown('UNHANDLED_REJECTION');
    });
  }

  /**
   * Start periodic cleanup tasks
   */
  startPeriodicCleanup() {
    // Clean up old redemption attempts every 5 minutes
    setInterval(() => {
      try {
        if (this.keyManager) {
          this.keyManager.cleanup();
        }
      } catch (error) {
        logError(error, { context: 'PeriodicCleanup' });
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    logDebug('Periodic cleanup started');
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      shutting_down: this.isShuttingDown,
      bot_ready: this.botClient ? this.botClient.isClientReady() : false,
      database_ready: this.database ? this.database.isInitialized : false,
      roblox_api_configured: this.robloxApi ? this.robloxApi.isConfigured() : false
    };
  }
}

// Create and start the bot
const bot = new WhitelistBot();

// Start the bot if this file is run directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  bot.start().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export default WhitelistBot;