import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import winston from 'winston';

/**
 * Supabase Database Service for the Whitelist Bot
 * Replaces the local JSON file storage with Supabase
 */
class SupabaseDatabaseService {
  constructor(config = {}) {
    this.supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL || 'https://cmmeqzkbiiqqfvzkmkzt.supabase.co';
    // Use service role key for bot operations (bypasses RLS)
    // Fall back to anon key if service role not available
    this.supabaseKey = config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWVxemtiaWlxcWZ2emtta3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDcyNjQsImV4cCI6MjA3NDQ4MzI2NH0.iFnZXQmCkindqhm1sevUrIWdC2z-IjrI_duZE2RxjWg';
    this.encryptionKey = config.encryptionKey || process.env.DB_ENCRYPTION_KEY;
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    this.isInitialized = false;
    
    // Security configuration
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
          filename: './logs/supabase-audit.log',
          maxsize: 10485760,
          maxFiles: 5,
          tailable: true
        })
      ]
    });
  }

  async initializeDatabase() {
    try {
      // Test connection
      const { data, error } = await this.supabase.from('discord_servers').select('count').limit(1);
      
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      this.auditLog('DATABASE_INITIALIZED', null, { 
        message: 'Supabase database initialized',
        url: this.supabaseUrl
      });
      
      console.log('✅ Supabase database initialized');
      return true;
    } catch (error) {
      this.auditLog('DATABASE_INIT_ERROR', null, { error: error.message });
      throw error;
    }
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

  // ==================== SERVER CONFIG ====================

  async getServerConfig(guildId) {
    try {
      const { data: server, error } = await this.supabase
        .from('discord_servers')
        .select('*')
        .eq('guild_id', guildId)
        .single();
      
      if (error || !server) return null;
      
      // Get products for this server
      const { data: products } = await this.supabase
        .from('bot_products')
        .select('*')
        .eq('server_id', server.id);
      
      // Decrypt Roblox API keys for products that have them
      const productsWithKeys = await Promise.all((products || []).map(async (p) => {
        let robloxApiKey = null;
        
        // If product has encrypted key, decrypt it
        if (p.roblox_api_key_encrypted) {
          try {
            const { data: decryptedKey } = await this.supabase.rpc('get_roblox_api_key', {
              p_product_id: p.id
            });
            robloxApiKey = decryptedKey;
          } catch (decryptError) {
            this.auditLog('DECRYPT_KEY_ERROR', null, { productId: p.id, error: decryptError.message });
          }
        }
        
        return {
          id: p.id,
          name: p.name,
          robloxGroupId: p.roblox_group_id,
          payhipApiKey: p.payhip_api_key,
          roleId: p.role_id,
          redemptionMessage: p.redemption_message,
          robloxApiKey: robloxApiKey
        };
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
    try {
      // Upsert server
      const { data: server, error: serverError } = await this.supabase
        .from('discord_servers')
        .upsert({
          guild_id: guildId,
          guild_name: config.guildName || config.guild_name,
          owner_id: config.ownerId || '0',
          updated_at: new Date().toISOString()
        }, { onConflict: 'guild_id' })
        .select()
        .single();
      
      if (serverError) throw serverError;
      
      // Delete existing products and re-insert
      await this.supabase.from('bot_products').delete().eq('server_id', server.id);
      
      for (const product of (config.products || [])) {
        await this.supabase.from('bot_products').insert({
          server_id: server.id,
          name: product.name,
          roblox_group_id: product.robloxGroupId,
          payhip_api_key: product.payhipApiKey,
          role_id: product.roleId || null,
          redemption_message: product.redemptionMessage || null
        });
      }
      
      this.auditLog('SERVER_CONFIG_SAVED', null, { guildId });
      return true;
    } catch (error) {
      this.auditLog('SAVE_SERVER_CONFIG_ERROR', null, { guildId, error: error.message });
      throw error;
    }
  }

  async loadServerConfigs() {
    try {
      const { data: servers } = await this.supabase.from('discord_servers').select('*');
      const configs = {};
      
      for (const server of (servers || [])) {
        const { data: products } = await this.supabase
          .from('bot_products')
          .select('*')
          .eq('server_id', server.id);
        
        // Decrypt Roblox API keys for products that have them
        const productsWithKeys = await Promise.all((products || []).map(async (p) => {
          let robloxApiKey = null;
          
          // If product has encrypted key, decrypt it
          if (p.roblox_api_key_encrypted) {
            try {
              const { data: decryptedKey } = await this.supabase.rpc('get_roblox_api_key', {
                p_product_id: p.id
              });
              robloxApiKey = decryptedKey;
            } catch (decryptError) {
              this.auditLog('DECRYPT_KEY_ERROR', null, { productId: p.id, error: decryptError.message });
            }
          }
          
          return {
            id: p.id,
            name: p.name,
            robloxGroupId: p.roblox_group_id,
            payhipApiKey: p.payhip_api_key,
            roleId: p.role_id,
            redemptionMessage: p.redemption_message,
            robloxApiKey: robloxApiKey
          };
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
        robloxGroupId: redemptionData.robloxGroupId,
        productGroupId: redemptionData.productGroupId
      });
      
      const keyHash = await this.hashKey(redemptionData.key);
      
      // Find the product for this redemption
      const groupIdToSearch = redemptionData.robloxGroupId || redemptionData.productGroupId;
      console.log('[storeRedemption] Searching for product with roblox_group_id:', groupIdToSearch);
      
      const { data: products, error: productError } = await this.supabase
        .from('bot_products')
        .select('id, server_id, name, roblox_group_id')
        .eq('roblox_group_id', groupIdToSearch);
      
      if (productError) {
        console.error('[storeRedemption] Error querying products:', productError);
        throw new Error(`Failed to query products: ${productError.message}`);
      }
      
      console.log('[storeRedemption] Products found:', products?.length || 0, products);
      
      if (!products || products.length === 0) {
        console.error('[storeRedemption] No product found for group ID:', groupIdToSearch);
        throw new Error(`Product not found for roblox_group_id: ${groupIdToSearch}`);
      }
      
      // Use the first matching product (or specific one if server context provided)
      const product = products[0];
      console.log('[storeRedemption] Using product:', product.id, product.name);
      
      // Insert whitelisted user
      const insertData = {
        product_id: product.id,
        discord_id: redemptionData.discordUserId,
        discord_username: redemptionData.discordUsername || null,
        roblox_username: redemptionData.robloxUsername,
        roblox_id: redemptionData.robloxUserId?.toString(),
        license_key: keyHash,
        redeemed_at: new Date().toISOString()
      };
      console.log('[storeRedemption] Inserting whitelist entry:', { ...insertData, license_key: '[REDACTED]' });
      
      const { data, error } = await this.supabase
        .from('bot_whitelisted_users')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('[storeRedemption] Insert error:', error);
        throw error;
      }
      
      console.log('[storeRedemption] SUCCESS - Whitelist entry created:', data.id);
      
      this.auditLog('REDEMPTION_STORED', redemptionData.discordUserId, {
        roblox_username: redemptionData.robloxUsername,
        product_id: product.id
      });
      
      return { id: data.id, success: true };
    } catch (error) {
      console.error('[storeRedemption] FAILED:', error.message);
      this.auditLog('REDEMPTION_STORE_ERROR', redemptionData?.discordUserId, { error: error.message });
      throw error;
    }
  }

  async isKeyRedeemed(key) {
    try {
      // Get all whitelisted users and check key hash
      const { data: users } = await this.supabase
        .from('bot_whitelisted_users')
        .select('license_key');
      
      for (const user of (users || [])) {
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
      const { data, error } = await this.supabase
        .from('bot_whitelisted_users')
        .select('*')
        .eq('discord_id', discordUserId)
        .order('redeemed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) return null;
      
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
      const { data } = await this.supabase
        .from('bot_whitelisted_users')
        .select('*')
        .order('redeemed_at', { ascending: false });
      
      return (data || []).map(r => ({
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
      const { error } = await this.supabase
        .from('bot_whitelisted_users')
        .delete()
        .eq('id', redemptionId);
      
      if (error) throw error;
      
      this.auditLog('REDEMPTION_DELETED', context.discordUserId, { redemption_id: redemptionId });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== WHITELIST QUERIES ====================

  /**
   * Get whitelisted users for a product by roblox_group_id
   * This ensures copied configs share the same whitelist
   * Products with the same roblox_group_id share whitelisted users
   */
  async getWhitelistedUsersForProduct(productId) {
    try {
      // First get the product's roblox_group_id
      const { data: product } = await this.supabase
        .from('bot_products')
        .select('roblox_group_id')
        .eq('id', productId)
        .single();
      
      if (!product) return [];
      
      // Get ALL products with the same roblox_group_id
      const { data: allProducts } = await this.supabase
        .from('bot_products')
        .select('id')
        .eq('roblox_group_id', product.roblox_group_id);
      
      if (!allProducts || allProducts.length === 0) return [];
      
      // Get whitelisted users for ALL products with this group ID
      const productIds = allProducts.map(p => p.id);
      const { data: users } = await this.supabase
        .from('bot_whitelisted_users')
        .select('*')
        .in('product_id', productIds);
      
      // Deduplicate by discord_id (same user might be in multiple products)
      const uniqueUsers = [];
      const seenDiscordIds = new Set();
      for (const user of (users || [])) {
        if (!seenDiscordIds.has(user.discord_id)) {
          seenDiscordIds.add(user.discord_id);
          uniqueUsers.push(user);
        }
      }
      
      return uniqueUsers;
    } catch (error) {
      this.auditLog('GET_WHITELIST_ERROR', null, { productId, error: error.message });
      return [];
    }
  }

  /**
   * Get whitelisted users by roblox_group_id directly
   * Useful when you have the group ID but not a specific product
   */
  async getWhitelistedUsersByGroupId(robloxGroupId) {
    try {
      // Get ALL products with this roblox_group_id
      const { data: products } = await this.supabase
        .from('bot_products')
        .select('id')
        .eq('roblox_group_id', robloxGroupId);
      
      if (!products || products.length === 0) return [];
      
      // Get whitelisted users for ALL products with this group ID
      const productIds = products.map(p => p.id);
      const { data: users } = await this.supabase
        .from('bot_whitelisted_users')
        .select('*')
        .in('product_id', productIds);
      
      // Deduplicate by discord_id
      const uniqueUsers = [];
      const seenDiscordIds = new Set();
      for (const user of (users || [])) {
        if (!seenDiscordIds.has(user.discord_id)) {
          seenDiscordIds.add(user.discord_id);
          uniqueUsers.push(user);
        }
      }
      
      return uniqueUsers;
    } catch (error) {
      this.auditLog('GET_WHITELIST_BY_GROUP_ERROR', null, { robloxGroupId, error: error.message });
      return [];
    }
  }

  /**
   * Check if a user is whitelisted for a specific roblox_group_id
   */
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
      // Get server
      const { data: server } = await this.supabase
        .from('discord_servers')
        .select('id')
        .eq('guild_id', guildId)
        .single();
      
      if (!server) return [];
      
      // Get products for server
      const { data: products } = await this.supabase
        .from('bot_products')
        .select('id, roblox_group_id')
        .eq('server_id', server.id);
      
      if (!products || products.length === 0) return [];
      
      // Get unique roblox_group_ids
      const groupIds = [...new Set(products.map(p => p.roblox_group_id))];
      
      // Get ALL products with these group IDs (includes copied configs)
      const { data: allProducts } = await this.supabase
        .from('bot_products')
        .select('id')
        .in('roblox_group_id', groupIds);
      
      if (!allProducts || allProducts.length === 0) return [];
      
      // Get whitelisted users for all products
      const productIds = allProducts.map(p => p.id);
      const { data: users } = await this.supabase
        .from('bot_whitelisted_users')
        .select('*')
        .in('product_id', productIds);
      
      // Deduplicate by discord_id
      const uniqueUsers = [];
      const seenDiscordIds = new Set();
      for (const user of (users || [])) {
        if (!seenDiscordIds.has(user.discord_id)) {
          seenDiscordIds.add(user.discord_id);
          uniqueUsers.push(user);
        }
      }
      
      return uniqueUsers;
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
      database_type: 'Supabase',
      url: this.supabaseUrl,
      initialized: this.isInitialized
    };
  }

  async close() {
    this.isInitialized = false;
    console.log('✅ Supabase database connection closed');
  }
}

export default SupabaseDatabaseService;
