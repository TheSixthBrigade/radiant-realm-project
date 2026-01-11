/**
 * Secrets Management Service
 * Handles encrypted storage and retrieval of sensitive data
 */

import db from '../lib/db.js';
import { encrypt, decrypt } from '../lib/encryption.js';

/**
 * Get a secret by key name
 * @param {string} keyName - The secret key name
 * @param {string} userId - Optional user ID for audit logging
 * @returns {string|null} The decrypted secret value
 */
export async function getSecret(keyName, userId = null) {
  try {
    const secret = await db.queryOne(
      `SELECT encrypted_value FROM secrets WHERE key_name = $1`,
      [keyName]
    );
    
    if (!secret) {
      return null;
    }
    
    // Update access timestamp
    await db.query(
      `UPDATE secrets SET accessed_at = NOW() WHERE key_name = $1`,
      [keyName]
    );
    
    // Log access (without the actual value)
    if (userId) {
      await logSecretAccess(userId, keyName, 'read');
    }
    
    // Decrypt and return
    const decrypted = decrypt(secret.encrypted_value.toString('base64'));
    return decrypted;
    
  } catch (error) {
    console.error('Get secret error:', error.message);
    return null;
  }
}

/**
 * Set a secret value
 * @param {string} keyName - The secret key name
 * @param {string} value - The secret value to store
 * @param {string} userId - Optional user ID for audit logging
 * @returns {boolean} Success status
 */
export async function setSecret(keyName, value, userId = null) {
  try {
    // Encrypt the value
    const encrypted = encrypt(value);
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    
    // Upsert the secret
    await db.query(
      `INSERT INTO secrets (key_name, encrypted_value)
       VALUES ($1, $2)
       ON CONFLICT (key_name) DO UPDATE
       SET encrypted_value = $2, accessed_at = NOW()`,
      [keyName, encryptedBuffer]
    );
    
    // Log the operation (without the actual value)
    if (userId) {
      await logSecretAccess(userId, keyName, 'write');
    }
    
    return true;
    
  } catch (error) {
    console.error('Set secret error:', error.message);
    return false;
  }
}

/**
 * Delete a secret
 * @param {string} keyName - The secret key name
 * @param {string} userId - Optional user ID for audit logging
 * @returns {boolean} Success status
 */
export async function deleteSecret(keyName, userId = null) {
  try {
    const result = await db.query(
      `DELETE FROM secrets WHERE key_name = $1`,
      [keyName]
    );
    
    // Log the operation
    if (userId) {
      await logSecretAccess(userId, keyName, 'delete');
    }
    
    return result.rowCount > 0;
    
  } catch (error) {
    console.error('Delete secret error:', error.message);
    return false;
  }
}

/**
 * List all secret key names (not values)
 * @returns {Array} List of secret key names
 */
export async function listSecrets() {
  try {
    const secrets = await db.queryAll(
      `SELECT key_name, created_at, accessed_at FROM secrets ORDER BY key_name`
    );
    
    return secrets;
    
  } catch (error) {
    console.error('List secrets error:', error.message);
    return [];
  }
}

/**
 * Check if a secret exists
 * @param {string} keyName - The secret key name
 * @returns {boolean} Whether the secret exists
 */
export async function secretExists(keyName) {
  try {
    const result = await db.queryOne(
      `SELECT 1 FROM secrets WHERE key_name = $1`,
      [keyName]
    );
    
    return !!result;
    
  } catch (error) {
    console.error('Secret exists check error:', error.message);
    return false;
  }
}

/**
 * Log secret access for audit trail
 * @param {string} userId - User ID
 * @param {string} keyName - Secret key name
 * @param {string} action - Action performed (read/write/delete)
 */
async function logSecretAccess(userId, keyName, action) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'secret', $3, $4)`,
      [userId, `secret_${action}`, keyName, JSON.stringify({ key_name: keyName })]
    );
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Audit log error:', error.message);
  }
}

/**
 * Bulk import secrets (for migration)
 * @param {Object} secrets - Key-value pairs of secrets
 * @param {string} userId - User ID for audit logging
 * @returns {Object} Import results
 */
export async function bulkImportSecrets(secrets, userId = null) {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const [keyName, value] of Object.entries(secrets)) {
    try {
      await setSecret(keyName, value, userId);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ keyName, error: error.message });
    }
  }
  
  return results;
}

export default {
  getSecret,
  setSecret,
  deleteSecret,
  listSecrets,
  secretExists,
  bulkImportSecrets
};
