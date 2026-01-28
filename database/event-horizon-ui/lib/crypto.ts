import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

/**
 * Encrypts data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @param key - 32-byte encryption key (hex string or Buffer)
 * @returns Base64 encoded string: IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string, key: string | Buffer): string {
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);
    return combined.toString('base64');
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param ciphertext - Base64 encoded string from encrypt()
 * @param key - 32-byte encryption key (hex string or Buffer)
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string, key: string | Buffer): string {
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    const combined = Buffer.from(ciphertext, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Hashes a password using SHA-256 with a random salt
 * @param password - The password to hash
 * @returns Object containing salt and hash (both hex encoded)
 */
export function hashPassword(password: string): { salt: string; hash: string } {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    return { salt, hash };
}

/**
 * Verifies a password against a stored hash
 * @param password - The password to verify
 * @param salt - The salt used during hashing
 * @param storedHash - The stored hash to compare against
 * @returns True if password matches
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Generates a cryptographically secure API key
 * @param prefix - Optional prefix for the key (e.g., 'anon', 'secret')
 * @returns A secure API key string
 */
export function generateApiKey(prefix: string = 'eh'): string {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}_${randomPart}`;
}

/**
 * Generates a 256-bit encryption key
 * @returns Hex-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a SHA-256 hash of the input
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Derives a project-specific 32-byte encryption key
 * @param salt - Project-specific salt
 * @returns 32-byte Buffer
 */
export function deriveProjectKey(salt: string): Buffer {
    const masterSecret = process.env.ENCRYPTION_KEY || process.env.DB_PASSWORD || 'vectabase-default-insecure-key';
    return crypto.scryptSync(masterSecret, salt || 'default-salt', 32);
}
