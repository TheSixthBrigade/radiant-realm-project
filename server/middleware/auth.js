/**
 * Authentication Middleware
 * Handles JWT token validation and user context
 */

import { verifyToken } from '../services/auth.js';

/**
 * Authentication middleware - requires valid JWT token
 * Adds user object to req.user if authenticated
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No authorization header provided',
        requestId: req.requestId
      });
    }
    
    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid authorization header format',
        requestId: req.requestId
      });
    }
    
    const token = parts[1];
    
    // Verify token
    const user = await verifyToken(token);
    
    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        requestId: req.requestId
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication failed',
      requestId: req.requestId
    });
  }
}

/**
 * Optional authentication middleware
 * Adds user object to req.user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null;
      return next();
    }
    
    const token = parts[1];
    const user = await verifyToken(token);
    
    req.user = user;
    next();
    
  } catch (error) {
    req.user = null;
    next();
  }
}

/**
 * API key authentication middleware
 * For developer API endpoints
 */
export async function requireApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No API key provided',
        requestId: req.requestId
      });
    }
    
    // Import here to avoid circular dependency
    const { validateApiKey } = await import('../services/apiKeys.js');
    
    const result = await validateApiKey(apiKey);
    
    if (!result.valid) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: result.error || 'Invalid API key',
        requestId: req.requestId
      });
    }
    
    // Attach developer info to request
    req.developer = result.developer;
    req.apiKeyId = result.apiKeyId;
    next();
    
  } catch (error) {
    console.error('API key middleware error:', error.message);
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'API key validation failed',
      requestId: req.requestId
    });
  }
}

/**
 * Rate limiting state (in-memory, use Redis in production)
 */
const rateLimitState = new Map();

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 */
export function rateLimit(options = {}) {
  const windowMs = options.windowMs || 60000; // 1 minute default
  const max = options.max || 100; // 100 requests default
  
  return (req, res, next) => {
    // Use API key or IP as identifier
    const identifier = req.headers['x-api-key'] || req.ip || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitState.get(identifier);
    
    if (!entry || now - entry.windowStart > windowMs) {
      entry = { windowStart: now, count: 0 };
      rateLimitState.set(identifier, entry);
    }
    
    entry.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((entry.windowStart + windowMs) / 1000));
    
    if (entry.count > max) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        requestId: req.requestId,
        retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000)
      });
    }
    
    next();
  };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitState.entries()) {
    if (now - entry.windowStart > 300000) { // 5 minutes
      rateLimitState.delete(key);
    }
  }
}, 60000); // Every minute

export default {
  requireAuth,
  optionalAuth,
  requireApiKey,
  rateLimit
};
