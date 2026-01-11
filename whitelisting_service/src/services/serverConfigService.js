import {
  validateProductInput,
  createProduct,
  createServerConfig,
  maskApiKey
} from '../models/serverConfig.js';
import { logDebug, logError, logSecurityEvent } from '../utils/logger.js';
import { getSupabaseClient } from '../config/supabaseConfig.js';

// Use the shared Supabase client from supabaseConfig
function getSupabase() {
  return getSupabaseClient();
}

/**
 * Server Configuration Service
 * Manages per-server product configurations
 */
class ServerConfigService {
  constructor(database) {
    this.database = database;
    this.configs = new Map(); // guildId -> ServerConfig
  }

  /**
   * Initialize service by loading configs from database
   */
  async initialize() {
    try {
      logDebug('Initializing ServerConfigService');
      const configs = await this.database.loadServerConfigs();
      
      if (configs && typeof configs === 'object') {
        for (const [guildId, config] of Object.entries(configs)) {
          this.configs.set(guildId, config);
          // Sync existing products to Supabase on startup
          if (config.products && config.products.length > 0) {
            await this.syncProductsToSupabase(guildId, config.products);
          }
        }
      }
      
      logDebug('ServerConfigService initialized', { 
        serverCount: this.configs.size 
      });
    } catch (error) {
      logError(error, { context: 'ServerConfigService.initialize' });
      // Don't throw - start with empty configs
    }
  }

  /**
   * Get or create server config
   * @param {string} guildId - Discord guild ID
   * @returns {Object} Server config
   */
  getOrCreateConfig(guildId) {
    if (!this.configs.has(guildId)) {
      this.configs.set(guildId, createServerConfig(guildId));
    }
    return this.configs.get(guildId);
  }

  /**
   * Get all products for a server
   * @param {string} guildId - Discord guild ID
   * @returns {Array} Array of products
   */
  async getProducts(guildId) {
    const config = this.getOrCreateConfig(guildId);
    return config.products || [];
  }

  /**
   * Get a specific product by name
   * @param {string} guildId - Discord guild ID
   * @param {string} productName - Product name
   * @returns {Object|null} Product or null if not found
   */
  async getProduct(guildId, productName) {
    const products = await this.getProducts(guildId);
    return products.find(p => p.name.toLowerCase() === productName.toLowerCase()) || null;
  }

  /**
   * Add a new product to a server
   * @param {string} guildId - Discord guild ID
   * @param {Object} productInput - Product input data
   * @returns {Object} Result with success status
   */
  async addProduct(guildId, productInput) {
    try {
      // Validate input
      const validation = validateProductInput(productInput);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      const config = this.getOrCreateConfig(guildId);
      
      // Check for duplicate name
      const existingProduct = config.products.find(
        p => p.name.toLowerCase() === validation.sanitized.name.toLowerCase()
      );
      
      if (existingProduct) {
        return {
          success: false,
          error: 'A product with this name already exists'
        };
      }

      // Create and add product
      const product = createProduct(validation.sanitized);
      
      // Add robloxApiKey if provided
      if (productInput.robloxApiKey) {
        product.robloxApiKey = productInput.robloxApiKey.trim();
      }
      
      config.products.push(product);
      config.updatedAt = new Date().toISOString();

      // Persist to database
      await this.saveConfig(guildId);

      logSecurityEvent('PRODUCT_ADDED', 'LOW', {
        guild_id: guildId,
        product_name: product.name,
        group_id: product.robloxGroupId,
        has_roblox_key: !!product.robloxApiKey
      });

      return {
        success: true,
        product: {
          name: product.name,
          robloxGroupId: product.robloxGroupId,
          payhipApiKey: maskApiKey(product.payhipApiKey),
          roleId: product.roleId || null,
          hasRobloxApiKey: !!product.robloxApiKey
        }
      };
    } catch (error) {
      logError(error, { context: 'ServerConfigService.addProduct', guildId });
      return {
        success: false,
        error: 'Failed to add product. Please try again.'
      };
    }
  }

  /**
   * Remove a product from a server
   * @param {string} guildId - Discord guild ID
   * @param {string} productName - Product name to remove
   * @returns {Object} Result with success status
   */
  async removeProduct(guildId, productName) {
    try {
      const config = this.getOrCreateConfig(guildId);
      
      const productIndex = config.products.findIndex(
        p => p.name.toLowerCase() === productName.toLowerCase()
      );

      if (productIndex === -1) {
        return {
          success: false,
          error: `Product "${productName}" not found`
        };
      }

      const removedProduct = config.products.splice(productIndex, 1)[0];
      config.updatedAt = new Date().toISOString();

      // Persist to database
      await this.saveConfig(guildId);

      logSecurityEvent('PRODUCT_REMOVED', 'LOW', {
        guild_id: guildId,
        product_name: removedProduct.name
      });

      return {
        success: true,
        productName: removedProduct.name
      };
    } catch (error) {
      logError(error, { context: 'ServerConfigService.removeProduct', guildId });
      return {
        success: false,
        error: 'Failed to remove product. Please try again.'
      };
    }
  }

  /**
   * Update an existing product
   * @param {string} guildId - Discord guild ID
   * @param {string} productName - Product name to update
   * @param {Object} updates - Fields to update
   * @returns {Object} Result with success status
   */
  async updateProduct(guildId, productName, updates) {
    try {
      const config = this.getOrCreateConfig(guildId);
      
      const product = config.products.find(
        p => p.name.toLowerCase() === productName.toLowerCase()
      );

      if (!product) {
        return {
          success: false,
          error: `Product "${productName}" not found`
        };
      }

      // Validate updates if provided
      if (updates.name !== undefined) {
        const trimmedName = updates.name.trim();
        if (trimmedName.length < 1 || trimmedName.length > 100) {
          return {
            success: false,
            error: 'Product name must be 1-100 characters'
          };
        }
        // Check for duplicate name (if changing name)
        if (trimmedName.toLowerCase() !== product.name.toLowerCase()) {
          const duplicate = config.products.find(
            p => p.name.toLowerCase() === trimmedName.toLowerCase()
          );
          if (duplicate) {
            return {
              success: false,
              error: 'A product with this name already exists'
            };
          }
        }
        product.name = trimmedName;
      }

      if (updates.payhipApiKey !== undefined) {
        const trimmedKey = updates.payhipApiKey.trim();
        if (!trimmedKey.startsWith('prod_sk_')) {
          return {
            success: false,
            error: 'Invalid Payhip API key. Must start with "prod_sk_"'
          };
        }
        product.payhipApiKey = trimmedKey;
      }

      if (updates.robloxGroupId !== undefined) {
        const strGroupId = String(updates.robloxGroupId).trim();
        if (!/^\d+$/.test(strGroupId)) {
          return {
            success: false,
            error: 'Invalid Roblox group ID. Must be a numeric value'
          };
        }
        product.robloxGroupId = strGroupId;
      }

      // Handle roleId update (can be set to null to remove)
      if ('roleId' in updates) {
        product.roleId = updates.roleId ? String(updates.roleId).trim() : null;
      }

      // Handle robloxApiKey update (can be set to null to remove)
      if ('robloxApiKey' in updates) {
        if (updates.robloxApiKey) {
          const trimmedKey = String(updates.robloxApiKey).trim();
          // Basic validation - Roblox API keys are typically long alphanumeric strings
          if (trimmedKey.length < 20) {
            return {
              success: false,
              error: 'Invalid Roblox API key. The key appears too short.'
            };
          }
          product.robloxApiKey = trimmedKey;
        } else {
          product.robloxApiKey = null;
        }
      }

      // Handle redemptionMessage update (can be set to null to remove)
      if ('redemptionMessage' in updates) {
        product.redemptionMessage = updates.redemptionMessage ? String(updates.redemptionMessage).trim() : null;
      }

      product.updatedAt = new Date().toISOString();
      config.updatedAt = new Date().toISOString();

      // Persist to database
      await this.saveConfig(guildId);

      logSecurityEvent('PRODUCT_UPDATED', 'LOW', {
        guild_id: guildId,
        product_name: product.name
      });

      return {
        success: true,
        product: {
          name: product.name,
          robloxGroupId: product.robloxGroupId,
          payhipApiKey: maskApiKey(product.payhipApiKey),
          roleId: product.roleId || null,
          redemptionMessage: product.redemptionMessage || null,
          hasRobloxApiKey: !!product.robloxApiKey
        }
      };
    } catch (error) {
      logError(error, { context: 'ServerConfigService.updateProduct', guildId });
      return {
        success: false,
        error: 'Failed to update product. Please try again.'
      };
    }
  }

  /**
   * Get products formatted for display
   * @param {string} guildId - Discord guild ID
   * @returns {Array} Products with masked API keys
   */
  async getProductsForDisplay(guildId) {
    const products = await this.getProducts(guildId);
    return products.map(p => ({
      name: p.name,
      robloxGroupId: p.robloxGroupId,
      payhipApiKey: maskApiKey(p.payhipApiKey),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
  }

  /**
   * Save config to database
   * @param {string} guildId - Discord guild ID
   */
  async saveConfig(guildId) {
    const config = this.configs.get(guildId);
    if (config) {
      await this.database.saveServerConfig(guildId, config);
      // Also sync to Supabase for dashboard visibility
      await this.syncProductsToSupabase(guildId, config.products);
    }
  }

  /**
   * Sync products to Supabase for dashboard visibility
   * @param {string} guildId - Discord guild ID
   * @param {Array} products - Array of products
   */
  async syncProductsToSupabase(guildId, products) {
    const sb = getSupabase();
    if (!sb) {
      logDebug('Supabase not configured, skipping product sync');
      return;
    }

    try {
      // Get the server's UUID from discord_servers table
      const { data: server, error: serverError } = await sb
        .from('discord_servers')
        .select('id')
        .eq('guild_id', guildId)
        .single();

      if (serverError || !server) {
        logError(serverError || new Error('Server not found'), { 
          context: 'SyncProductsToSupabase', 
          guildId 
        });
        return;
      }

      const serverId = server.id;

      // Delete existing products for this server (we'll re-insert all)
      await sb
        .from('bot_products')
        .delete()
        .eq('server_id', serverId);

      // Insert all current products
      if (products && products.length > 0) {
        const productsToInsert = products.map(p => ({
          server_id: serverId,
          name: p.name,
          roblox_group_id: p.robloxGroupId,
          payhip_api_key: p.payhipApiKey,
          role_id: p.roleId || null,
          redemption_message: p.redemptionMessage || null
        }));

        const { error: insertError } = await sb
          .from('bot_products')
          .insert(productsToInsert);

        if (insertError) {
          logError(insertError, { context: 'SyncProductsToSupabase.insert', guildId });
        } else {
          logDebug('Products synced to Supabase', { 
            guildId, 
            productCount: products.length 
          });
        }

        // Update Roblox API keys separately using the encryption function
        for (const p of products) {
          if (p.robloxApiKey) {
            try {
              // Use raw SQL to call the encryption function
              const { error: keyError } = await sb.rpc('encrypt_and_store_roblox_key', {
                p_product_name: p.name,
                p_server_id: serverId,
                p_api_key: p.robloxApiKey
              });
              
              if (keyError) {
                logError(keyError, { context: 'SyncProductsToSupabase.encryptKey', guildId, product: p.name });
              }
            } catch (encryptError) {
              logError(encryptError, { context: 'SyncProductsToSupabase.encryptKey', guildId, product: p.name });
            }
          }
        }
      }
    } catch (error) {
      logError(error, { context: 'SyncProductsToSupabase', guildId });
    }
  }

  /**
   * Get product count for a server
   * @param {string} guildId - Discord guild ID
   * @returns {number} Number of products
   */
  async getProductCount(guildId) {
    const products = await this.getProducts(guildId);
    return products.length;
  }
}

export default ServerConfigService;
