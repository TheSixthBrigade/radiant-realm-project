/**
 * Developer API Routes
 * Handles API keys, subscriptions, and developer products
 */

import { Router } from 'express';
import db from '../lib/db.js';
import { requireAuth, requireApiKey, rateLimit } from '../middleware/auth.js';
import { generateApiKey } from '../lib/encryption.js';

const router = Router();

// ============================================
// API KEY MANAGEMENT
// ============================================

/**
 * GET /api/developer/keys
 * List user's API keys
 */
router.get('/keys', requireAuth, async (req, res) => {
  try {
    const keys = await db.queryAll(
      `SELECT id, name, created_at, last_used_at, is_active,
              LEFT(api_key, 10) || '...' as api_key_preview
       FROM developer_api_keys
       WHERE developer_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    res.json({ keys });
    
  } catch (error) {
    console.error('List API keys error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/developer/keys
 * Create a new API key
 */
router.post('/keys', requireAuth, async (req, res) => {
  try {
    const { name = 'Default' } = req.body;
    
    // Generate API key
    const apiKey = generateApiKey('vb_');
    
    const key = await db.queryOne(
      `INSERT INTO developer_api_keys (developer_id, api_key, name)
       VALUES ($1, $2, $3)
       RETURNING id, name, created_at, is_active`,
      [req.user.id, apiKey, name]
    );
    
    // Return full key only on creation
    res.status(201).json({
      key: {
        ...key,
        api_key: apiKey // Full key shown only once
      }
    });
    
  } catch (error) {
    console.error('Create API key error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * DELETE /api/developer/keys/:id
 * Delete an API key
 */
router.delete('/keys/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM developer_api_keys WHERE id = $1 AND developer_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'API key not found',
        requestId: req.requestId
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete API key error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * GET /api/developer/subscription
 * Get user's subscription info
 */
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await db.queryOne(
      `SELECT * FROM developer_subscriptions WHERE developer_id = $1`,
      [req.user.id]
    );
    
    const credits = await db.queryOne(
      `SELECT credits FROM obfuscation_credits WHERE developer_id = $1`,
      [req.user.id]
    );
    
    res.json({
      subscription: subscription || { tier: 'free' },
      credits: credits?.credits || 0
    });
    
  } catch (error) {
    console.error('Get subscription error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// ============================================
// DEVELOPER PRODUCTS
// ============================================

/**
 * GET /api/developer/products
 * List developer's products
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await db.queryAll(
      `SELECT dp.*, COUNT(we.id) as whitelist_count
       FROM developer_products dp
       LEFT JOIN whitelist_entries we ON dp.id = we.product_id
       WHERE dp.developer_id = $1
       GROUP BY dp.id
       ORDER BY dp.created_at DESC`,
      [req.user.id]
    );
    
    res.json({ products });
    
  } catch (error) {
    console.error('List developer products error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/developer/products
 * Create a developer product
 */
router.post('/products', requireAuth, async (req, res) => {
  try {
    const { product_name, roblox_group_id, description } = req.body;
    
    if (!product_name || !roblox_group_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'product_name and roblox_group_id are required',
        requestId: req.requestId
      });
    }
    
    const product = await db.queryOne(
      `INSERT INTO developer_products (developer_id, product_name, roblox_group_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, product_name, roblox_group_id, description]
    );
    
    res.status(201).json({ product });
    
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        error: 'DUPLICATE_ERROR',
        message: 'Product with this Roblox group already exists',
        requestId: req.requestId
      });
    }
    
    console.error('Create developer product error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// ============================================
// PUBLIC API ENDPOINTS (API Key Auth)
// ============================================

/**
 * POST /api/developer/verify
 * Verify an API key (public endpoint)
 */
router.post('/verify', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'API key required',
        requestId: req.requestId
      });
    }
    
    const key = await db.queryOne(
      `SELECT dk.*, ds.tier
       FROM developer_api_keys dk
       JOIN developer_subscriptions ds ON dk.developer_id = ds.developer_id
       WHERE dk.api_key = $1 AND dk.is_active = true`,
      [apiKey]
    );
    
    if (!key) {
      return res.json({ valid: false });
    }
    
    // Update last used
    await db.query(
      'UPDATE developer_api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );
    
    res.json({
      valid: true,
      tier: key.tier,
      developer_id: key.developer_id
    });
    
  } catch (error) {
    console.error('Verify API key error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * GET /api/developer/whitelist/check
 * Check if a user is whitelisted (API key auth)
 */
router.get('/whitelist/check', requireApiKey, rateLimit({ windowMs: 60000, max: 60 }), async (req, res) => {
  try {
    const { roblox_user_id, roblox_group_id } = req.query;
    
    if (!roblox_user_id || !roblox_group_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'roblox_user_id and roblox_group_id are required',
        requestId: req.requestId
      });
    }
    
    // Find product by group ID
    const product = await db.queryOne(
      `SELECT id FROM developer_products
       WHERE developer_id = $1 AND roblox_group_id = $2`,
      [req.developer.id, roblox_group_id]
    );
    
    if (!product) {
      return res.json({
        whitelisted: false,
        message: 'Product not found'
      });
    }
    
    // Check whitelist
    const entry = await db.queryOne(
      `SELECT * FROM whitelist_entries
       WHERE product_id = $1 AND roblox_user_id = $2 AND expiry_date > NOW()`,
      [product.id, roblox_user_id]
    );
    
    res.json({
      whitelisted: !!entry,
      expiry_date: entry?.expiry_date || null
    });
    
  } catch (error) {
    console.error('Whitelist check error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/developer/whitelist/add
 * Add a user to whitelist (API key auth)
 */
router.post('/whitelist/add', requireApiKey, rateLimit({ windowMs: 60000, max: 30 }), async (req, res) => {
  try {
    const { roblox_user_id, discord_id, roblox_group_id, expiry_days = 30 } = req.body;
    
    if (!roblox_user_id || !discord_id || !roblox_group_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'roblox_user_id, discord_id, and roblox_group_id are required',
        requestId: req.requestId
      });
    }
    
    // Find product
    const product = await db.queryOne(
      `SELECT id FROM developer_products
       WHERE developer_id = $1 AND roblox_group_id = $2`,
      [req.developer.id, roblox_group_id]
    );
    
    if (!product) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found',
        requestId: req.requestId
      });
    }
    
    // Calculate expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry_days);
    
    // Upsert whitelist entry
    const entry = await db.queryOne(
      `INSERT INTO whitelist_entries (product_id, roblox_user_id, discord_id, expiry_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, roblox_user_id) DO UPDATE
       SET discord_id = $3, expiry_date = $4, updated_at = NOW()
       RETURNING *`,
      [product.id, roblox_user_id, discord_id, expiryDate]
    );
    
    res.json({
      success: true,
      entry
    });
    
  } catch (error) {
    console.error('Whitelist add error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

/**
 * POST /api/developer/whitelist/remove
 * Remove a user from whitelist (API key auth)
 */
router.post('/whitelist/remove', requireApiKey, rateLimit({ windowMs: 60000, max: 30 }), async (req, res) => {
  try {
    const { roblox_user_id, roblox_group_id } = req.body;
    
    if (!roblox_user_id || !roblox_group_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'roblox_user_id and roblox_group_id are required',
        requestId: req.requestId
      });
    }
    
    // Find product
    const product = await db.queryOne(
      `SELECT id FROM developer_products
       WHERE developer_id = $1 AND roblox_group_id = $2`,
      [req.developer.id, roblox_group_id]
    );
    
    if (!product) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Product not found',
        requestId: req.requestId
      });
    }
    
    const result = await db.query(
      `DELETE FROM whitelist_entries
       WHERE product_id = $1 AND roblox_user_id = $2`,
      [product.id, roblox_user_id]
    );
    
    res.json({
      success: true,
      removed: result.rowCount > 0
    });
    
  } catch (error) {
    console.error('Whitelist remove error:', error.message);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: error.message,
      requestId: req.requestId
    });
  }
});

// Export validateApiKey for middleware
export async function validateApiKey(apiKey) {
  try {
    const key = await db.queryOne(
      `SELECT dk.id, dk.developer_id, ds.tier
       FROM developer_api_keys dk
       JOIN developer_subscriptions ds ON dk.developer_id = ds.developer_id
       WHERE dk.api_key = $1 AND dk.is_active = true`,
      [apiKey]
    );
    
    if (!key) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    // Update last used
    await db.query(
      'UPDATE developer_api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );
    
    return {
      valid: true,
      apiKeyId: key.id,
      developer: {
        id: key.developer_id,
        tier: key.tier
      }
    };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export default router;
