import crypto from 'crypto';

/**
 * Input validation utilities for Discord Roblox Whitelist Bot
 * Provides secure validation for product keys, usernames, and other inputs
 */

/**
 * Payhip product key validation patterns
 * Based on common Payhip key formats
 */
const PRODUCT_KEY_PATTERNS = [
  /^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/i, // UUID format
  /^[A-Z0-9]{16,32}$/i, // Alphanumeric 16-32 chars
  /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i, // Dashed format
  /^PH[A-Z0-9]{14,30}$/i, // Payhip prefixed format
];

/**
 * Roblox username validation pattern
 * Based on Roblox's username requirements:
 * - 3-20 characters
 * - Letters, numbers, and underscores only
 * - Cannot start or end with underscore
 * - Cannot have consecutive underscores
 */
const ROBLOX_USERNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9_]*[a-zA-Z0-9])?$/;

/**
 * Discord user ID pattern (Snowflake format)
 * 17-19 digit number
 */
const DISCORD_USER_ID_PATTERN = /^\d{17,19}$/;

/**
 * Validation error types
 */
export const ValidationErrors = {
  INVALID_FORMAT: 'INVALID_FORMAT',
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  CONTAINS_INVALID_CHARS: 'CONTAINS_INVALID_CHARS',
  EMPTY_INPUT: 'EMPTY_INPUT',
  SUSPICIOUS_PATTERN: 'SUSPICIOUS_PATTERN'
};

/**
 * Validation result structure
 */
class ValidationResult {
  constructor(isValid, error = null, sanitized = null) {
    this.isValid = isValid;
    this.error = error;
    this.sanitized = sanitized;
  }
}

/**
 * Validate product secret key format
 * @param {string} key - The product key to validate
 * @returns {ValidationResult} Validation result with sanitized key
 */
export function validateProductKey(key) {
  // Check for empty input
  if (!key || typeof key !== 'string') {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'Product key is required'
    });
  }

  // Sanitize input - remove whitespace
  const sanitized = key.trim();

  // Check length constraints
  if (sanitized.length < 8) {
    return new ValidationResult(false, {
      type: ValidationErrors.TOO_SHORT,
      message: 'Product key must be at least 8 characters long'
    });
  }

  if (sanitized.length > 100) {
    return new ValidationResult(false, {
      type: ValidationErrors.TOO_LONG,
      message: 'Product key cannot exceed 100 characters'
    });
  }

  // Basic format check - allow any alphanumeric characters and common separators
  const basicPattern = /^[A-Za-z0-9\-_]+$/;
  if (!basicPattern.test(sanitized)) {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Product key contains invalid characters'
    });
  }

  return new ValidationResult(true, null, sanitized);
}

/**
 * Validate Roblox username or user ID format
 * @param {string} input - The Roblox username or user ID to validate
 * @returns {ValidationResult} Validation result with sanitized input and type
 */
export function validateRobloxUsername(input) {
  // Check for empty input
  if (!input || typeof input !== 'string') {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'Roblox username or user ID is required'
    });
  }

  // Sanitize input - trim whitespace but preserve case
  const sanitized = input.trim();

  // Check if input is all numbers (user ID)
  const isNumeric = /^\d+$/.test(sanitized);
  
  if (isNumeric) {
    // Validate as user ID
    const userId = parseInt(sanitized, 10);
    
    if (userId <= 0) {
      return new ValidationResult(false, {
        type: ValidationErrors.INVALID_FORMAT,
        message: 'Roblox user ID must be a positive number'
      });
    }
    
    if (userId > 9999999999) {
      return new ValidationResult(false, {
        type: ValidationErrors.INVALID_FORMAT,
        message: 'Roblox user ID exceeds maximum value'
      });
    }
    
    return new ValidationResult(true, null, {
      value: sanitized,
      type: 'user_id',
      userId: userId
    });
  } else {
    // Validate as username
    // Check length constraints (Roblox: 3-20 characters)
    if (sanitized.length < 3) {
      return new ValidationResult(false, {
        type: ValidationErrors.TOO_SHORT,
        message: 'Roblox username must be at least 3 characters long'
      });
    }

    if (sanitized.length > 20) {
      return new ValidationResult(false, {
        type: ValidationErrors.TOO_LONG,
        message: 'Roblox username cannot exceed 20 characters'
      });
    }

    // Check format against Roblox pattern
    if (!ROBLOX_USERNAME_PATTERN.test(sanitized)) {
      return new ValidationResult(false, {
        type: ValidationErrors.INVALID_FORMAT,
        message: 'Roblox username can only contain letters, numbers, and underscores. Cannot start/end with underscore or have consecutive underscores.'
      });
    }

    // Check for consecutive underscores
    if (sanitized.includes('__')) {
      return new ValidationResult(false, {
        type: ValidationErrors.INVALID_FORMAT,
        message: 'Roblox username cannot contain consecutive underscores'
      });
    }

    return new ValidationResult(true, null, {
      value: sanitized,
      type: 'username'
    });
  }
}

/**
 * Validate Discord user ID format
 * @param {string} userId - The Discord user ID to validate
 * @returns {ValidationResult} Validation result with sanitized user ID
 */
export function validateDiscordUserId(userId) {
  // Check for empty input
  if (!userId || typeof userId !== 'string') {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'Discord user ID is required'
    });
  }

  // Sanitize input - remove whitespace
  const sanitized = userId.trim();

  // Check format against Discord snowflake pattern
  if (!DISCORD_USER_ID_PATTERN.test(sanitized)) {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Discord user ID must be a 17-19 digit number'
    });
  }

  return new ValidationResult(true, null, sanitized);
}

/**
 * Validate Roblox user ID (numeric)
 * @param {number|string} userId - The Roblox user ID to validate
 * @returns {ValidationResult} Validation result with sanitized user ID
 */
export function validateRobloxUserId(userId) {
  // Convert to number if string
  let numericId;
  if (typeof userId === 'string') {
    numericId = parseInt(userId.trim(), 10);
  } else if (typeof userId === 'number') {
    numericId = userId;
  } else {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Roblox user ID must be a number'
    });
  }

  // Check if conversion was successful
  if (isNaN(numericId) || !isFinite(numericId)) {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Roblox user ID must be a valid number'
    });
  }

  // Check range (Roblox user IDs are positive integers)
  if (numericId <= 0) {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Roblox user ID must be a positive number'
    });
  }

  // Check reasonable upper bound (current max Roblox user ID is in billions)
  if (numericId > 9999999999) {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Roblox user ID exceeds maximum value'
    });
  }

  return new ValidationResult(true, null, numericId);
}

/**
 * Sanitize general text input to prevent injection attacks
 * @param {string} input - The input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {ValidationResult} Validation result with sanitized input
 */
export function sanitizeTextInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'Input is required'
    });
  }

  // Remove potentially dangerous characters and normalize whitespace
  let sanitized = input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>'"&]/g, '') // Remove HTML/XML special characters
    .replace(/\s+/g, ' '); // Normalize whitespace

  if (sanitized.length === 0) {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'Input cannot be empty after sanitization'
    });
  }

  if (sanitized.length > maxLength) {
    return new ValidationResult(false, {
      type: ValidationErrors.TOO_LONG,
      message: `Input cannot exceed ${maxLength} characters`
    });
  }

  return new ValidationResult(true, null, sanitized);
}

/**
 * Check if a product key appears suspicious (test data, repeated patterns, etc.)
 * @param {string} key - The sanitized product key
 * @returns {boolean} True if key appears suspicious
 */
function isSuspiciousKey(key) {
  // Check for obvious test patterns
  const testPatterns = [
    /^(TEST|DEMO|SAMPLE|EXAMPLE)/i,
    /^(1234|ABCD|0000|FFFF)/,
    /^(.)\1{7,}/, // 8+ repeated characters
    /^(12345678|ABCDEFGH|00000000|FFFFFFFF)/i
  ];

  return testPatterns.some(pattern => pattern.test(key));
}

/**
 * Validate IP address format (for logging purposes)
 * @param {string} ip - The IP address to validate
 * @returns {ValidationResult} Validation result
 */
export function validateIpAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'IP address is required'
    });
  }

  const sanitized = ip.trim();

  // IPv4 pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (!ipv4Pattern.test(sanitized) && !ipv6Pattern.test(sanitized)) {
    return new ValidationResult(false, {
      type: ValidationErrors.INVALID_FORMAT,
      message: 'Invalid IP address format'
    });
  }

  return new ValidationResult(true, null, sanitized);
}

/**
 * Validate user agent string (for logging purposes)
 * @param {string} userAgent - The user agent string to validate
 * @returns {ValidationResult} Validation result
 */
export function validateUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return new ValidationResult(false, {
      type: ValidationErrors.EMPTY_INPUT,
      message: 'User agent is required'
    });
  }

  const sanitized = userAgent.trim();

  if (sanitized.length > 500) {
    return new ValidationResult(false, {
      type: ValidationErrors.TOO_LONG,
      message: 'User agent string too long'
    });
  }

  // Remove potentially dangerous characters
  const cleanUserAgent = sanitized.replace(/[<>'"&\x00-\x1F\x7F]/g, '');

  return new ValidationResult(true, null, cleanUserAgent);
}

/**
 * Comprehensive validation for redemption data
 * @param {Object} data - The redemption data to validate
 * @returns {Object} Validation results for all fields
 */
export function validateRedemptionData(data) {
  const results = {
    isValid: true,
    errors: {},
    sanitized: {}
  };

  // Validate product key
  const keyResult = validateProductKey(data.key);
  if (!keyResult.isValid) {
    results.isValid = false;
    results.errors.key = keyResult.error;
  } else {
    results.sanitized.key = keyResult.sanitized;
  }

  // Validate Discord user ID
  const discordResult = validateDiscordUserId(data.discordUserId);
  if (!discordResult.isValid) {
    results.isValid = false;
    results.errors.discordUserId = discordResult.error;
  } else {
    results.sanitized.discordUserId = discordResult.sanitized;
  }

  // Validate Roblox username or user ID
  const usernameResult = validateRobloxUsername(data.robloxUsername);
  if (!usernameResult.isValid) {
    results.isValid = false;
    results.errors.robloxUsername = usernameResult.error;
  } else {
    results.sanitized.robloxUsername = usernameResult.sanitized;
  }

  // Skip Roblox user ID validation since it's now handled in username validation

  // Validate optional IP address
  if (data.ipAddress) {
    const ipResult = validateIpAddress(data.ipAddress);
    if (!ipResult.isValid) {
      results.isValid = false;
      results.errors.ipAddress = ipResult.error;
    } else {
      results.sanitized.ipAddress = ipResult.sanitized;
    }
  }

  // Validate optional user agent
  if (data.userAgent) {
    const uaResult = validateUserAgent(data.userAgent);
    if (!uaResult.isValid) {
      results.isValid = false;
      results.errors.userAgent = uaResult.error;
    } else {
      results.sanitized.userAgent = uaResult.sanitized;
    }
  }

  return results;
}

/**
 * Generate validation error messages for user display
 * @param {Object} errors - Validation errors object
 * @returns {string} User-friendly error message
 */
export function generateErrorMessage(errors) {
  const messages = [];

  if (errors.key) {
    messages.push(`Product Key: ${errors.key.message}`);
  }
  if (errors.discordUserId) {
    messages.push(`Discord User: ${errors.discordUserId.message}`);
  }
  if (errors.robloxUsername) {
    messages.push(`Roblox Username: ${errors.robloxUsername.message}`);
  }
  if (errors.robloxUserId) {
    messages.push(`Roblox User ID: ${errors.robloxUserId.message}`);
  }
  if (errors.ipAddress) {
    messages.push(`IP Address: ${errors.ipAddress.message}`);
  }
  if (errors.userAgent) {
    messages.push(`User Agent: ${errors.userAgent.message}`);
  }

  return messages.join('\n');
}

export default {
  validateProductKey,
  validateRobloxUsername,
  validateDiscordUserId,
  validateRobloxUserId,
  sanitizeTextInput,
  validateIpAddress,
  validateUserAgent,
  validateRedemptionData,
  generateErrorMessage,
  ValidationErrors
};