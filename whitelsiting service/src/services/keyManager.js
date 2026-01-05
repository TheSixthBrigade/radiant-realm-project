import { validateRedemptionData } from '../utils/validation.js';
import { logRedemption, logSecurityEvent, logError, logDebug } from '../utils/logger.js';
import PayhipApiService from './payhipApi.js';

/**
 * Key Management Service
 * Handles product key validation, redemption, and duplicate prevention
 */
class KeyManagerService {
  constructor(database, robloxApi) {
    this.database = database;
    this.robloxApi = robloxApi;
    this.payhipApi = new PayhipApiService();
    
    // Track redemption attempts for rate limiting
    this.redemptionAttempts = new Map();
    this.maxAttemptsPerUser = 5;
    this.attemptWindowMs = 300000; // 5 minutes
  }

  /**
   * Validate redemption data
   */
  validateRedemption(data) {
    logDebug('Validating redemption data', {
      discord_user_id: data.discordUserId,
      roblox_username: data.robloxUsername
    });
    
    const validation = validateRedemptionData(data);
    
    if (!validation.isValid) {
      logSecurityEvent('INVALID_REDEMPTION_DATA', 'LOW', {
        discord_user_id: data.discordUserId,
        errors: validation.errors
      });
    }
    
    return validation;
  }

  /**
   * Check if user has exceeded redemption attempt limit
   */
  checkAttemptLimit(discordUserId) {
    const now = Date.now();
    const userAttempts = this.redemptionAttempts.get(discordUserId) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.attemptWindowMs
    );
    
    if (recentAttempts.length >= this.maxAttemptsPerUser) {
      logSecurityEvent('REDEMPTION_RATE_LIMIT', 'MEDIUM', {
        discord_user_id: discordUserId,
        attempts: recentAttempts.length,
        window_ms: this.attemptWindowMs
      });
      
      return {
        allowed: false,
        attemptsRemaining: 0,
        resetTime: Math.min(...recentAttempts) + this.attemptWindowMs
      };
    }
    
    // Update attempts
    recentAttempts.push(now);
    this.redemptionAttempts.set(discordUserId, recentAttempts);
    
    return {
      allowed: true,
      attemptsRemaining: this.maxAttemptsPerUser - recentAttempts.length,
      resetTime: null
    };
  }

  /**
   * Check if a key has already been redeemed
   */
  async isKeyRedeemed(key) {
    try {
      logDebug('Checking if key is redeemed');
      
      const isRedeemed = await this.database.isKeyRedeemed(key);
      
      if (isRedeemed) {
        logSecurityEvent('DUPLICATE_KEY_ATTEMPT', 'MEDIUM', {
          message: 'Attempt to redeem already used key'
        });
      }
      
      return isRedeemed;
      
    } catch (error) {
      logError(error, { context: 'isKeyRedeemed' });
      throw new Error('Failed to check key status');
    }
  }

  /**
   * Redeem a product key
   * @param {Object} redemptionData - Redemption data
   * @param {Object} context - Security context
   * @param {Object} productCredentials - Optional product-specific credentials
   */
  async redeemKey(redemptionData, context = {}, productCredentials = null) {
    const startTime = Date.now();
    
    // Create product-specific Payhip API instance if credentials provided
    let payhipApi = this.payhipApi;
    let robloxApi = this.robloxApi;
    
    if (productCredentials) {
      if (productCredentials.payhipApiKey) {
        payhipApi = new PayhipApiService({ apiKey: productCredentials.payhipApiKey });
      }
      if (productCredentials.robloxGroupId) {
        // Create a new RobloxApi instance with the product's group ID
        const RobloxApiService = (await import('./robloxApi.js')).default;
        robloxApi = new RobloxApiService({ groupId: productCredentials.robloxGroupId });
      }
    }
    
    try {
      logDebug('Starting key redemption process', {
        discord_user_id: redemptionData.discordUserId,
        roblox_username: redemptionData.robloxUsername,
        product_group_id: productCredentials?.robloxGroupId || 'default'
      });
      
      // Step 1: Check attempt limit
      const attemptCheck = this.checkAttemptLimit(redemptionData.discordUserId);
      if (!attemptCheck.allowed) {
        const resetDate = new Date(attemptCheck.resetTime);
        return {
          success: false,
          step: 'RATE_LIMIT',
          message: `Too many redemption attempts. Please try again after ${resetDate.toLocaleTimeString()}.`,
          error: 'RATE_LIMIT_EXCEEDED'
        };
      }
      
      // Step 2: Validate input data
      const validation = this.validateRedemption(redemptionData);
      if (!validation.isValid) {
        return {
          success: false,
          step: 'VALIDATION',
          message: 'Invalid redemption data provided.',
          errors: validation.errors,
          error: 'VALIDATION_FAILED'
        };
      }
      
      // Use sanitized data
      const sanitizedData = {
        ...redemptionData,
        ...validation.sanitized
      };
      
      // Step 3: Validate product key with Payhip
      logDebug('Validating product key with Payhip', {
        discord_user_id: sanitizedData.discordUserId,
        key_prefix: sanitizedData.key.substring(0, 8) + '...'
      });
      
      const payhipValidation = await payhipApi.validateProductKey(sanitizedData.key);
      
      // Check if key is disabled/expired
      if (payhipValidation.isDisabled) {
        logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, false, {
          reason: 'Product key expired/disabled',
          payhip_error: payhipValidation.error,
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'PAYHIP_VALIDATION',
          message: '❌ Invalid product key. This key has expired or been disabled.',
          error: 'KEY_EXPIRED'
        };
      }
      
      if (!payhipValidation.isValid) {
        logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, false, {
          reason: 'Invalid product key',
          payhip_error: payhipValidation.error,
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'PAYHIP_VALIDATION',
          message: '❌ Invalid product key. Please check your key and try again.',
          error: payhipValidation.error || 'INVALID_PRODUCT_KEY'
        };
      }
      
      if (payhipValidation.isUsed) {
        logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, false, {
          reason: 'Product key already used',
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'PAYHIP_VALIDATION',
          message: '❌ This product key has already been used and cannot be redeemed again.',
          error: 'KEY_ALREADY_USED'
        };
      }
      
      // Step 4: Check if key is already redeemed in our database
      const isRedeemed = await this.isKeyRedeemed(sanitizedData.key);
      if (isRedeemed) {
        logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, false, {
          reason: 'Key already redeemed in database',
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'KEY_CHECK',
          message: 'This product key has already been redeemed and cannot be used again.',
          error: 'KEY_ALREADY_REDEEMED'
        };
      }
      
      // Step 5: Get Roblox user ID (handle both username and user ID input)
      let userId;
      let actualUsername = sanitizedData.robloxUsername;
      
      // Check if the sanitized username data includes type information
      if (typeof sanitizedData.robloxUsername === 'object' && sanitizedData.robloxUsername.type) {
        if (sanitizedData.robloxUsername.type === 'user_id') {
          // User provided a user ID directly
          userId = sanitizedData.robloxUsername.userId;
          
          // Get the username from the user ID
          const usernameResult = await robloxApi.getUsernameById(userId);
          if (!usernameResult) {
            logRedemption(sanitizedData.discordUserId, userId, false, {
              reason: 'Roblox user ID not found',
              duration_ms: Date.now() - startTime
            });
            
            return {
              success: false,
              step: 'USER_LOOKUP',
              message: `Roblox user ID "${userId}" not found. Please check the ID and try again.`,
              error: 'USER_NOT_FOUND'
            };
          }
          actualUsername = usernameResult;
        } else {
          // User provided a username
          actualUsername = sanitizedData.robloxUsername.value;
          userId = await robloxApi.getUserIdByUsername(actualUsername);
        }
      } else {
        // Fallback for string input
        userId = await robloxApi.getUserIdByUsername(sanitizedData.robloxUsername);
      }
      
      if (!userId) {
        logRedemption(sanitizedData.discordUserId, actualUsername, false, {
          reason: 'Roblox user not found',
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'USER_LOOKUP',
          message: `Roblox user "${actualUsername}" not found. Please check the username and try again.`,
          error: 'USER_NOT_FOUND'
        };
      }
      
      sanitizedData.robloxUserId = userId;
      sanitizedData.robloxUsername = actualUsername;
      
      // Store the product's group ID for proper product association
      if (productCredentials?.robloxGroupId) {
        sanitizedData.robloxGroupId = productCredentials.robloxGroupId;
      }

      // Step 6: Check if user is already a member
      const memberCheck = await robloxApi.isUserMember(userId);
      if (memberCheck.isMember) {
        logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, false, {
          reason: 'User already a member',
          roblox_user_id: userId,
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'MEMBERSHIP_CHECK',
          message: 'You are already a member of the group!',
          error: 'ALREADY_MEMBER'
        };
      }
      
      // Step 7: Check for pending join request
      const pendingCheck = await robloxApi.checkPendingJoinRequest(sanitizedData.robloxUsername);
      if (pendingCheck.error) {
        logError(new Error(pendingCheck.error), {
          context: 'checkPendingJoinRequest',
          discord_user_id: sanitizedData.discordUserId,
          roblox_username: sanitizedData.robloxUsername
        });
        
        return {
          success: false,
          step: 'PENDING_CHECK',
          message: 'Failed to check group join request status. Please try again later.',
          error: 'API_ERROR'
        };
      }
      
      if (!pendingCheck.isPending) {
        logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, false, {
          reason: 'No pending join request',
          roblox_user_id: userId,
          duration_ms: Date.now() - startTime
        });
        
        return {
          success: false,
          step: 'PENDING_CHECK',
          message: `Please send a join request to the group first: https://www.roblox.com/communities/${robloxApi.groupId}/#!/about\n\nAfter sending the request, try redeeming your key again.`,
          error: 'NO_PENDING_REQUEST',
          groupUrl: `https://www.roblox.com/communities/${robloxApi.groupId}/#!/about`
        };
      }
      
      // Step 7: Accept the join request
      const acceptResult = await robloxApi.acceptJoinRequest(userId);
      if (!acceptResult.success) {
        logError(new Error(acceptResult.error), {
          context: 'acceptJoinRequest',
          discord_user_id: sanitizedData.discordUserId,
          roblox_username: sanitizedData.robloxUsername,
          roblox_user_id: userId
        });
        
        return {
          success: false,
          step: 'ACCEPT_REQUEST',
          message: 'Failed to accept your join request. Please contact support.\n\nError: ' + acceptResult.error,
          error: 'ACCEPT_FAILED'
        };
      }
      
      // Step 8: Store redemption in database and mark key as used
      try {
        await this.database.storeRedemption(sanitizedData, {
          ...context,
          isAdmin: true,
          discordUserId: sanitizedData.discordUserId
        });
        
        // Mark key as used in Payhip (only after successful redemption)
        try {
          await payhipApi.markKeyAsUsed(sanitizedData.key);
          logDebug('Product key marked as used in Payhip', {
            discord_user_id: sanitizedData.discordUserId,
            key_prefix: sanitizedData.key.substring(0, 8) + '...'
          });
        } catch (payhipError) {
          logError(payhipError, {
            context: 'markKeyAsUsed',
            discord_user_id: sanitizedData.discordUserId,
            key_prefix: sanitizedData.key.substring(0, 8) + '...'
          });
          // Don't fail the redemption if Payhip marking fails
        }
        
      } catch (error) {
        logError(error, {
          context: 'storeRedemption',
          discord_user_id: sanitizedData.discordUserId,
          roblox_username: sanitizedData.robloxUsername,
          roblox_user_id: userId
        });
        
        // Even if storage fails, the user was accepted to the group
        // Log this as a critical issue but don't fail the redemption
        logSecurityEvent('REDEMPTION_STORAGE_FAILED', 'CRITICAL', {
          discord_user_id: sanitizedData.discordUserId,
          roblox_username: sanitizedData.robloxUsername,
          roblox_user_id: userId,
          error: error.message
        });
        
        return {
          success: true,
          step: 'COMPLETE_WITH_WARNING',
          message: '✅ You have been accepted to the Roblox group!\n\n⚠️ Note: There was an issue recording your redemption. Please contact support if you encounter any issues.',
          warning: 'STORAGE_FAILED',
          robloxUserId: userId,
          robloxUsername: sanitizedData.robloxUsername,
          duration_ms: Date.now() - startTime
        };
      }
      
      // Success!
      logRedemption(sanitizedData.discordUserId, sanitizedData.robloxUsername, true, {
        roblox_user_id: userId,
        duration_ms: Date.now() - startTime
      });
      
      return {
        success: true,
        step: 'COMPLETE',
        message: '✅ Success! You have been accepted to the Roblox group!\n\nYour product key has been redeemed and you now have access to the group.',
        robloxUserId: userId,
        robloxUsername: sanitizedData.robloxUsername,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      logError(error, {
        context: 'redeemKey',
        discord_user_id: redemptionData.discordUserId,
        roblox_username: redemptionData.robloxUsername
      });
      
      logRedemption(redemptionData.discordUserId, redemptionData.robloxUsername, false, {
        reason: 'Unexpected error',
        error: error.message,
        duration_ms: Date.now() - startTime
      });
      
      return {
        success: false,
        step: 'ERROR',
        message: 'An unexpected error occurred. Please try again later or contact support.',
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Get redemption statistics
   */
  getStats() {
    const now = Date.now();
    let totalAttempts = 0;
    let activeUsers = 0;
    
    for (const [userId, attempts] of this.redemptionAttempts.entries()) {
      const recentAttempts = attempts.filter(
        timestamp => now - timestamp < this.attemptWindowMs
      );
      
      if (recentAttempts.length > 0) {
        totalAttempts += recentAttempts.length;
        activeUsers++;
      }
    }
    
    return {
      active_users: activeUsers,
      total_recent_attempts: totalAttempts,
      max_attempts_per_user: this.maxAttemptsPerUser,
      attempt_window_ms: this.attemptWindowMs
    };
  }

  /**
   * Clear old redemption attempts (cleanup)
   */
  cleanup() {
    const now = Date.now();
    
    for (const [userId, attempts] of this.redemptionAttempts.entries()) {
      const recentAttempts = attempts.filter(
        timestamp => now - timestamp < this.attemptWindowMs
      );
      
      if (recentAttempts.length === 0) {
        this.redemptionAttempts.delete(userId);
      } else {
        this.redemptionAttempts.set(userId, recentAttempts);
      }
    }
    
    logDebug('Cleaned up old redemption attempts', {
      remaining_users: this.redemptionAttempts.size
    });
  }
}

export default KeyManagerService;