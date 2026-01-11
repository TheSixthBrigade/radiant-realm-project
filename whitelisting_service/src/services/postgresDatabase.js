/**
 * PostgreSQL Database Service for the Whitelist Bot
 * Replaces Supabase with local PostgreSQL database
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import winston from 'winston';

const { Pool } = pg;

/**
 * PostgreSQL Database Service
 * Same interface as SupabaseDatabaseService for drop-in replacement
 */
class PostgresDatabaseService {
  constructor(config = {}) {
    this.pool = new Pool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'vectabase',
      user: config.user || process.env.DB_USER || 'vectabase_admin',
      password: config.password || process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    this.encryptionKey = config.encryptionKey || process.env.DB_ENCRYPTION_KEY;
    this.isInitialized = false;
    this.saltRounds = 12;
    
    // Initialize logger
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: './logs/postgres-audit.log',
          maxsize: 10485760,
          maxFiles: 5,
          tailable: true
        })
      ]
    });
    
    // Connection retry settings
    this.maxRetries = 5;
    this.retryDelay = 1000;
  }

  async initializeDatabase() {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        this.isInitialized = true;
        this.auditLog('DATABASE_INITIALIZED', null, { 
          message: 'PostgreSQL database initialized',
          host: process.env.DB_HOST || 'localhost'
        });
        
        console.log('✅ PostgreSQL database initialized');
        return true;
      } catch (error) {
        retries++;
        console.error(`Database connection attempt ${retries} failed:`, error.message);
        
        if (retries < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retries - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.auditLog('DATABASE_INIT_ERROR', null, { error: error.message });
          throw new Error(`Failed to connect to PostgreSQL after ${this.maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  // ==================== HELPER METHODS ====================
  
  async query(text, params) {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  }

  async queryOne(text, params) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  }

  async queryAll(text, params) {
    const result = await this.query(text, params);
    return result.rows;
  }

  // ==================== KEY HASHING ====================
  
  async hashKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided for hashing');
    }
    const sha256Hash = crypto.createHash('sha256').update(key).digest('hex');
    return await bcrypt.hash(sha256Hash, this.saltRounds);
  }

  async verifyKey(key, hash) {
    if (!key || !hash) return false;
    try {
      const sha256Hash = crypto.createHash('sha256').update(key).digest('hex');
      return await bcrypt.compare(sha256Hash, hash);
    } catch (error) {
      return false;
    }
  }

  hashSensitiveData(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data + (this.encryptionKey || 'default')).digest('hex');
  }

  // ==================== ENCRYPTION ====================
  
  encrypt(text) {
    if (!text || !this.encryptionKey) return null;
    
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
  }

  decrypt(encryptedText) {
    if (!encryptedText || !this.encryptionKey) return null;
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) return null;
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const key = Buffer.from(this.encryptionKey, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.auditLog('DECRYPT_ERROR', null, { error: error.message });
      return null;
    }
  }

  // ==================== SERVER CONFIG ====================

  async getServerConfig(guildId) {
    try {
      const server = await this.queryOne(
        'SELECT * FROM discord_servers WHERE guild_id = $1',
        [guildId]
      );
      
      if (!server) return null;
      
      const products = await this.queryAll(
        'SELECT * FROM bot_products WHERE server_id = $1',
        [server.id]
      );
      
      const productsWithKeys = products.map(p => ({
        id: p.id,
        name: p.name,
        robloxGroupId: p.roblox_group_id,
        payhipApiKey: p.payhip_api_key,
        roleId: p.role_id,
        redemptionMessage: p.redemption_message,
        robloxApiKey: p.roblox_api_key_encrypted ? this.decrypt(p.roblox_api_key_encrypted.toString()) : null
      }));
      
      return {
        guildId: server.guild_id,
        guildName: server.guild_name,
        products: productsWithKeys
      };
    } catch (error) {
      this.auditLog('GET_SERVER_CONFIG_ERROR', null, { guildId, error: error.message });
      return null;
    }
  }

  async saveServerConfig(guildId, config) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Upsert server
      const serverResult = await client.query(
        `INSERT INTO discord_servers (guild_id, guild_name, owner_id, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (guild_id) DO UPDATE
         SET guild_name = $2, updated_at = NOW()
         RETURNING *`,
        [guildId, config.guildName || config.guild_name, config.ownerId || '0']
      );
      
      const server = serverResult.rows[0];
      
      // Delete existing products
      await client.query('DELETE FROM bot_products WHERE server_id = $1', [server.id]);
      
      // Insert new products
      for (const product of (config.products || [])) {
        await client.query(
          `INSERT INTO bot_products (server_id, name, roblox_group_id, payhip_api_key, role_id, redemption_message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [server.id, product.name, product.robloxGroupId, product.payhipApiKey, product.roleId || null, product.redemptionMessage || null]
        );
      }
      
      await client.query('COMMIT');
      
      this.auditLog('SERVER_CONFIG_SAVED', null, { guildId });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      this.auditLog('SAVE_SERVER_CONFIG_ERROR', null, { guildId, error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  async loadServerConfigs() {
    try {
      const servers = await this.queryAll('SELECT * FROM discord_servers');
      const configs = {};
      
      for (const server of servers) {
        const products = await this.queryAll(
          'SELECT * FROM bot_products WHERE server_id = $1',
          [server.id]
        );
        
        const productsWithKeys = products.map(p => ({
          id: p.id,
          name: p.name,
          robloxGroupId: p.roblox_group_id,
          payhipApiKey: p.payhip_api_key,
          roleId: p.role_id,
          redemptionMessage: p.redemption_message,
          robloxApiKey: p.roblox_api_key_encrypted ? this.decrypt(p.roblox_api_key_encrypted.toString()) : null
        }));
        
        configs[server.guild_id] = {
          guildId: server.guild_id,
          guildName: server.guild_name,
          products: productsWithKeys
        };
      }
      
      return configs;
    } catch (error) {
      this.auditLog('LOAD_SERVER_CONFIGS_ERROR', null, { error: error.message });
      return {};
    }
  }

  // ==================== REDEMPTIONS ====================

  async storeRedemption(redemptionData, context = {}) {
    try {
      console.log('[storeRedemption] Starting with data:', {
        discordUserId: redemptionData.discordUserId,
        robloxUsername: redemptionData.robloxUsername,
        robloxGroupId: redemptionData.robloxGroupId
      });
      
      const keyHash = await this.hashKey(redemptionData.key);
      const groupIdToSearch = redemptionData.robloxGroupId || redemptionData.productGroupId;
      
      // Find product
      const products = await this.queryAll(
        'SELECT id, server_id, name, roblox_group_id FROM bot_products WHERE roblox_group_id = $1',
        [groupIdToSearch]
      );
      
      if (!products || products.length === 0) {
        throw new Error(`Product not found for roblox_group_id: ${groupIdToSearch}`);
      }
      
      const product = products[0];
      
      // Insert whitelisted user
      const result = await this.queryOne(
        `INSERT INTO bot_whitelisted_users (product_id, discord_id, discord_username, roblox_username, roblox_id, license_key, redeemed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [product.id, redemptionData.discordUserId, redemptionData.discordUsername || null, redemptionData.robloxUsername, redemptionData.robloxUserId?.toString(), keyHash]
      );
      
      console.log('[storeRedemption] SUCCESS - Whitelist entry created:', result.id);
      
      this.auditLog('REDEMPTION_STORED', redemptionData.discordUserId, {
        roblox_username: redemptionData.robloxUsername,
        product_id: product.id
      });
      
      return { id: result.id, success: true };
    } catch (error) {
      console.error('[storeRedemption] FAILED:', error.message);
      this.auditLog('REDEMPTION_STORE_ERROR', redemptionData?.discordUserId, { error: error.message });
      throw error;
    }
  }

  async isKeyRedeemed(key) {
    try {
      const users = await this.queryAll('SELECT license_key FROM bot_whitelisted_users');
      
      for (const user of users) {
        if (await this.verifyKey(key, user.license_key)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.auditLog('KEY_CHECK_ERROR', null, { error: error.message });
      return false;
    }
  }

  async getRedemptionByDiscordUser(discordUserId, context = {}) {
    try {
      const data = await this.queryOne(
        `SELECT * FROM bot_whitelisted_users WHERE discord_id = $1 ORDER BY redeemed_at DESC LIMIT 1`,
        [discordUserId]
      );
      
      if (!data) return null;
      
      return {
        id: data.id,
        discord_user_id: data.discord_id,
        roblox_username: data.roblox_username,
        roblox_user_id: data.roblox_id,
        redeemed_at: data.redeemed_at
      };
    } catch (error) {
      return null;
    }
  }

  async getAllRedemptions(context = {}) {
    try {
      const data = await this.queryAll(
        'SELECT * FROM bot_whitelisted_users ORDER BY redeemed_at DESC'
      );
      
      return data.map(r => ({
        id: r.id,
        discord_user_id: r.discord_id,
        roblox_username: r.roblox_username,
        roblox_user_id: r.roblox_id,
        redeemed_at: r.redeemed_at
      }));
    } catch (error) {
      return [];
    }
  }

  async deleteRedemption(redemptionId, context = {}) {
    try {
      await this.query('DELETE FROM bot_whitelisted_users WHERE id = $1', [redemptionId]);
      
      this.auditLog('REDEMPTION_DELETED', context.discordUserId, { redemption_id: redemptionId });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== WHITELIST QUERIES ====================

  async getWhitelistedUsersForProduct(productId) {
    try {
      const product = await this.queryOne(
        'SELECT roblox_group_id FROM bot_products WHERE id = $1',
        [productId]
      );
      
      if (!product) return [];
      
      const allProducts = await this.queryAll(
        'SELECT id FROM bot_products WHERE roblox_group_id = $1',
        [product.roblox_group_id]
      );
      
      if (!allProducts.length) return [];
      
      const productIds = allProducts.map(p => p.id);
      const users = await this.queryAll(
        `SELECT DISTINCT ON (discord_id) * FROM bot_whitelisted_users WHERE product_id = ANY($1)`,
        [productIds]
      );
      
      return users;
    } catch (error) {
      this.auditLog('GET_WHITELIST_ERROR', null, { productId, error: error.message });
      return [];
    }
  }

  async getWhitelistedUsersByGroupId(robloxGroupId) {
    try {
      const products = await this.queryAll(
        'SELECT id FROM bot_products WHERE roblox_group_id = $1',
        [robloxGroupId]
      );
      
      if (!products.length) return [];
      
      const productIds = products.map(p => p.id);
      const users = await this.queryAll(
        `SELECT DISTINCT ON (discord_id) * FROM bot_whitelisted_users WHERE product_id = ANY($1)`,
        [productIds]
      );
      
      return users;
    } catch (error) {
      this.auditLog('GET_WHITELIST_BY_GROUP_ERROR', null, { robloxGroupId, error: error.message });
      return [];
    }
  }

  async isUserWhitelisted(discordUserId, robloxGroupId) {
    try {
      const users = await this.getWhitelistedUsersByGroupId(robloxGroupId);
      return users.some(u => u.discord_id === discordUserId);
    } catch (error) {
      return false;
    }
  }

  async getWhitelistedUsersForServer(guildId) {
    try {
      const server = await this.queryOne(
        'SELECT id FROM discord_servers WHERE guild_id = $1',
        [guildId]
      );
      
      if (!server) return [];
      
      const products = await this.queryAll(
        'SELECT id, roblox_group_id FROM bot_products WHERE server_id = $1',
        [server.id]
      );
      
      if (!products.length) return [];
      
      const groupIds = [...new Set(products.map(p => p.roblox_group_id))];
      
      const allProducts = await this.queryAll(
        'SELECT id FROM bot_products WHERE roblox_group_id = ANY($1)',
        [groupIds]
      );
      
      if (!allProducts.length) return [];
      
      const productIds = allProducts.map(p => p.id);
      const users = await this.queryAll(
        `SELECT DISTINCT ON (discord_id) * FROM bot_whitelisted_users WHERE product_id = ANY($1)`,
        [productIds]
      );
      
      return users;
    } catch (error) {
      return [];
    }
  }

  // ==================== LOGGING ====================

  auditLog(eventType, userId, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: userId,
      details: details,
      process_id: process.pid
    };
    this.auditLogger.info(logEntry);
  }

  logActivity(eventType, discordUserId, details = {}) {
    this.auditLog(eventType, discordUserId, details);
  }

  logSecurityEvent(eventType, sourceIp, userIdentifier, details, riskLevel = 'LOW') {
    this.auditLog('SECURITY_EVENT', userIdentifier, {
      event_type: eventType,
      risk_level: riskLevel,
      ...details
    });
  }

  // ==================== STATS ====================

  getStats() {
    return {
      database_type: 'PostgreSQL',
      host: process.env.DB_HOST || 'localhost',
      initialized: this.isInitialized
    };
  }

  async close() {
    await this.pool.end();
    this.isInitialized = false;
    console.log('✅ PostgreSQL database connection closed');
  }
}

export default PostgresDatabaseService;
