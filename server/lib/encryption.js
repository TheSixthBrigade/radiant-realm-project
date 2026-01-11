/**
 * Encryption Service
 * Provides AES-256-GCM encryption for sensitive data at rest
 */

import crypto from 'crypto';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_ITERATIONS = 100000;

/**
 * Get the master encryption key from environment
 * @returns {string} Master encryption key
 * @throws {Error} If key is not configured
 */
function getMasterKey() {
  const key = process.env.DB_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('DB_ENCRYPTION_KEY environment variable is not set');
  }
  
  if (key.length < 32) {
    throw new Error('DB_ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  return key;
}

/**
 * Derive an encryption key from a password using PBKDF2
 * @param {string} password - Password to derive key from
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Promise<Buffer>} Derived key
 */
export async function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256',
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      }
    );
  });
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} plaintext - Text to encrypt
 * @returns {Promise<string>} Base64 encoded encrypted data (salt:iv:authTag:ciphertext)
 */
export async function encrypt(plaintext) {
  if (!plaintext) {
    return null;
  }
  
  const masterKey = getMasterKey();
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from master key using salt
  const key = await deriveKey(masterKey, salt);
  
  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine all parts: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(encryptedData) {
  if (!encryptedData) {
    return null;
  }
  
  const masterKey = getMasterKey();
  
  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract parts
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  // Derive key from master key using salt
  const key = await deriveKey(masterKey, salt);
  
  // Create decipher and decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Encrypt data with a specific key (for key rotation)
 * @param {string} plaintext - Text to encrypt
 * @param {string} encryptionKey - Encryption key to use
 * @returns {Promise<string>} Base64 encoded encrypted data
 */
export async function encryptWithKey(plaintext, encryptionKey) {
  if (!plaintext) {
    return null;
  }
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(encryptionKey, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt data with a specific key (for key rotation)
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} encryptionKey - Encryption key to use
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptWithKey(encryptedData, encryptionKey) {
  if (!encryptedData) {
    return null;
  }
  
  const combined = Buffer.from(encryptedData, 'base64');
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = await deriveKey(encryptionKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Rotate encryption key - re-encrypt data with new key
 * @param {string} encryptedData - Data encrypted with old key
 * @param {string} oldKey - Old encryption key
 * @param {string} newKey - New encryption key
 * @returns {Promise<string>} Data encrypted with new key
 */
export async function rotateKey(encryptedData, oldKey, newKey) {
  // Decrypt with old key
  const plaintext = await decryptWithKey(encryptedData, oldKey);
  
  // Re-encrypt with new key
  return encryptWithKey(plaintext, newKey);
}

/**
 * Hash a value using SHA-256 (for non-reversible hashing like API keys)
 * @param {string} value - Value to hash
 * @returns {string} Hex encoded hash
 */
export function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random string
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure API key
 * @param {string} prefix - Prefix for the key (e.g., 'vb_')
 * @returns {string} API key
 */
export function generateApiKey(prefix = 'vb_') {
  return prefix + generateSecureToken(24);
}

/**
 * Verify encryption is working correctly
 * @returns {Promise<boolean>} True if encryption is working
 */
export async function verifyEncryption() {
  try {
    const testValue = 'encryption_test_' + Date.now();
    const encrypted = await encrypt(testValue);
    const decrypted = await decrypt(encrypted);
    return decrypted === testValue;
  } catch (error) {
    console.error('Encryption verification failed:', error.message);
    return false;
  }
}

// Export default object
export default {
  encrypt,
  decrypt,
  encryptWithKey,
  decryptWithKey,
  rotateKey,
  deriveKey,
  hash,
  generateSecureToken,
  generateApiKey,
  verifyEncryption
};
