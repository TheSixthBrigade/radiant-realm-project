/**
 * Server Configuration Data Models
 * Defines Product and ServerConfig structures for multi-server support
 */

/**
 * Validate Payhip API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} True if valid format
 */
export function isValidPayhipApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  return apiKey.startsWith('prod_sk_');
}

/**
 * Validate Roblox group ID format
 * @param {string} groupId - The group ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidRobloxGroupId(groupId) {
  if (!groupId) {
    return false;
  }
  const strGroupId = String(groupId);
  return /^\d+$/.test(strGroupId) && strGroupId.length > 0;
}

/**
 * Validate product name
 * @param {string} name - The product name to validate
 * @returns {boolean} True if valid
 */
export function isValidProductName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

/**
 * Validate product input
 * @param {Object} input - Product input to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateProductInput(input) {
  const errors = [];

  if (!input) {
    return { isValid: false, errors: ['Product input is required'] };
  }

  if (!isValidProductName(input.name)) {
    errors.push('Product name must be 1-100 characters');
  }

  if (!isValidPayhipApiKey(input.payhipApiKey)) {
    errors.push('Invalid Payhip API key. Must start with "prod_sk_"');
  }

  if (!isValidRobloxGroupId(input.robloxGroupId)) {
    errors.push('Invalid Roblox group ID. Must be a numeric value');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? {
      name: input.name.trim(),
      payhipApiKey: input.payhipApiKey.trim(),
      robloxGroupId: String(input.robloxGroupId).trim(),
      roleId: input.roleId || null,
      redemptionMessage: input.redemptionMessage || null
    } : null
  };
}

/**
 * Create a new Product object
 * @param {Object} input - Product input data
 * @returns {Object} Product object
 */
export function createProduct(input) {
  const now = new Date().toISOString();
  return {
    name: input.name.trim(),
    payhipApiKey: input.payhipApiKey.trim(),
    robloxGroupId: String(input.robloxGroupId).trim(),
    roleId: input.roleId ? String(input.roleId).trim() : null,
    redemptionMessage: input.redemptionMessage ? String(input.redemptionMessage).trim() : null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Create a new ServerConfig object
 * @param {string} guildId - Discord guild ID
 * @returns {Object} ServerConfig object
 */
export function createServerConfig(guildId) {
  const now = new Date().toISOString();
  return {
    guildId,
    products: [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Mask API key for display (show first 10 chars + last 4)
 * @param {string} apiKey - The API key to mask
 * @returns {string} Masked API key
 */
export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 14) {
    return '***';
  }
  return `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`;
}
