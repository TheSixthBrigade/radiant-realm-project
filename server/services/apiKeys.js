/**
 * API Keys Service
 * Handles API key validation and management
 */

import db from '../lib/db.js';

/**
 * Validate an API key
 * @param {string} apiKey - The API key to validate
 * @returns {Object} Validation result with developer info
 */
export async function validateApiKey(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, error: 'Invalid API key format' };
    }
    
    const key = await db.queryOne(
      `SELECT dk.id, dk.developer_id, dk.name, ds.tier
       FROM developer_api_keys dk
       LEFT JOIN developer_subscriptions ds ON dk.developer_id = ds.developer_id
       WHERE dk.api_key = $1 AND dk.is_active = true`,
      [apiKey]
    );
    
    if (!key) {
      return { valid: false, error: 'Invalid or inactive API key' };
    }
    
    // Update last used timestamp
    await db.query(
      'UPDATE developer_api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );
    
    return {
      valid: true,
      apiKeyId: key.id,
      developer: {
        id: key.developer_id,
        tier: key.tier || 'free'
      }
    };
    
  } catch (error) {
    console.error('API key validation error:', error.message);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Get API key usage stats
 * @param {string} apiKeyId - The API key ID
 * @returns {Object} Usage statistics
 */
export async function getApiKeyUsage(apiKeyId) {
  try {
    const key = await db.queryOne(
      `SELECT id, name, created_at, last_used_at, is_active
       FROM developer_api_keys WHERE id = $1`,
      [apiKeyId]
    );
    
    return key;
  } catch (error) {
    console.error('Get API key usage error:', error.message);
    return null;
  }
}

export default {
  validateApiKey,
  getApiKeyUsage
};
