import axios from 'axios';
import { logApiCall, logError, logWarning, logDebug } from '../utils/logger.js';

/**
 * Roblox Open Cloud API service for group management operations
 * Handles authentication, rate limiting, and error handling
 */
class RobloxApiService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ROBLOX_API_KEY;
    this.groupId = config.groupId || process.env.ROBLOX_GROUP_ID || '5451777';
    this.baseUrl = 'https://apis.roblox.com/cloud/v2';
    this.usersBaseUrl = 'https://users.roblox.com';
    this.legacyBaseUrl = 'https://groups.roblox.com';
    
    // Rate limiting configuration
    this.rateLimiter = {
      requests: [],
      maxRequests: 100, // Max requests per minute
      windowMs: 60000, // 1 minute window
      retryDelay: 1000, // Base retry delay in ms
      maxRetries: 3
    };
    
    // Initialize HTTP client for Open Cloud API
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey // Use x-api-key header for Open Cloud
      }
    });
    
    // Initialize legacy client for endpoints not yet in Open Cloud
    this.legacyClient = axios.create({
      baseURL: this.legacyBaseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
    
    this.legacyClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if API key is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];
    
    if (!this.apiKey) {
      errors.push('ROBLOX_API_KEY is required');
    }
    
    if (!this.groupId) {
      errors.push('ROBLOX_GROUP_ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < this.rateLimiter.windowMs
    );
    
    // Check if we're at the limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimiter.requests);
      const waitTime = this.rateLimiter.windowMs - (now - oldestRequest);
      
      logWarning('Rate limit reached, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add current request timestamp
    this.rateLimiter.requests.push(now);
  }

  /**
   * Make authenticated API request with retry logic
   */
  async makeRequest(method, url, data = null, retryCount = 0) {
    try {
      // Check rate limiting
      await this.checkRateLimit();
      
      logDebug('Making Roblox API request', { method, url, retryCount });
      
      const config = {
        method,
        url,
        ...(data && { data })
      };
      
      // Use Open Cloud client for new API endpoints
      const response = await this.client(config);
      
      logApiCall('Roblox', url, true, {
        status: response.status,
        method,
        retryCount
      });
      
      return response.data;
      
    } catch (error) {
      const shouldRetry = this.shouldRetry(error, retryCount);
      
      logApiCall('Roblox', url, false, {
        error: error.message,
        status: error.response?.status,
        method,
        retryCount,
        willRetry: shouldRetry
      });
      
      if (shouldRetry) {
        const delay = this.calculateRetryDelay(retryCount);
        logDebug('Retrying request after delay', { delay, retryCount: retryCount + 1 });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(method, url, data, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Determine if request should be retried
   */
  shouldRetry(error, retryCount) {
    if (retryCount >= this.rateLimiter.maxRetries) {
      return false;
    }
    
    // Retry on network errors
    if (!error.response) {
      return true;
    }
    
    const status = error.response.status;
    
    // Retry on rate limiting and server errors
    return status === 429 || (status >= 500 && status < 600);
  }

  /**
   * Calculate exponential backoff delay
   */
  calculateRetryDelay(retryCount) {
    const baseDelay = this.rateLimiter.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    
    return Math.min(exponentialDelay + jitter, 60000); // Max 60 seconds
  }

  /**
   * Handle API errors and log appropriately
   */
  handleApiError(error) {
    const context = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status
    };
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      if (status === 401) {
        logError(new Error('Roblox API authentication failed - check API key'), context);
      } else if (status === 403) {
        logError(new Error('Roblox API access forbidden - insufficient permissions'), context);
      } else if (status === 429) {
        logWarning('Roblox API rate limit exceeded', context);
      } else if (status >= 500) {
        logError(new Error('Roblox API server error'), context);
      } else {
        logError(new Error(`Roblox API error: ${status}`), context);
      }
    } else if (error.request) {
      // Network error
      logError(new Error('Roblox API network error'), context);
    } else {
      // Other error
      logError(error, context);
    }
  }

  /**
   * Get user ID by username
   */
  async getUserIdByUsername(username) {
    try {
      logDebug('Looking up Roblox user ID', { username });
      
      // Use the legacy users API for username lookup (not available in Open Cloud yet)
      const response = await axios.post(`${this.usersBaseUrl}/v1/usernames/users`, {
        usernames: [username]
      }, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const userData = response.data.data[0];
        if (userData.id) {
          const userId = userData.id;
          logDebug('Found Roblox user ID', { username, userId });
          return userId;
        }
      }
      
      logWarning('User not found', { username });
      return null;
      
    } catch (error) {
      if (error.response?.status === 404) {
        logDebug('Roblox user not found', { username });
        return null;
      }
      
      logError(error, { context: 'getUserIdByUsername', username });
      throw new Error(`Failed to lookup user: ${error.message}`);
    }
  }

  /**
   * Get username by user ID
   */
  async getUsernameById(userId) {
    try {
      logDebug('Looking up Roblox username by ID', { userId });
      
      // Use the legacy users API for user lookup (not available in Open Cloud yet)
      const response = await axios.post(`${this.usersBaseUrl}/v1/users`, {
        userIds: [userId]
      }, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const userData = response.data.data[0];
        if (userData.name) {
          const username = userData.name;
          logDebug('Found Roblox username', { userId, username });
          return username;
        }
      }
      
      logWarning('Username not found for user ID', { userId });
      return null;
      
    } catch (error) {
      if (error.response?.status === 404) {
        logDebug('Roblox user ID not found', { userId });
        return null;
      }
      
      logError(error, { context: 'getUsernameById', userId });
      throw new Error(`Failed to lookup username: ${error.message}`);
    }
  }

  /**
   * Check if user has pending join request for the group
   */
  async checkPendingJoinRequest(username) {
    try {
      // First get the user ID
      const userId = await this.getUserIdByUsername(username);
      if (!userId) {
        return {
          isPending: false,
          userId: null,
          error: 'User not found'
        };
      }
      
      logDebug('Checking pending join request', { username, userId, groupId: this.groupId });
      
      // Use Open Cloud API to get join requests
      try {
        const response = await this.client.get(`/groups/${this.groupId}/join-requests`);
        
        if (response.data && response.data.groupJoinRequests) {
          // Check if user has pending request
          const pendingRequest = response.data.groupJoinRequests.find(
            request => request.user === `users/${userId}`
          );
          
          const isPending = !!pendingRequest;
          
          logDebug('Join request check result (Open Cloud)', { 
            username, 
            userId, 
            isPending,
            totalRequests: response.data.groupJoinRequests.length 
          });
          
          return {
            isPending,
            userId,
            error: null
          };
        }
        
        return {
          isPending: false,
          userId,
          error: null
        };
        
      } catch (openCloudError) {
        logDebug('Open Cloud API failed for join requests', { error: openCloudError.message });
        
        // If Open Cloud fails, assume pending for non-members (fallback)
        const memberCheck = await this.isUserMember(userId);
        
        if (memberCheck.error) {
          return {
            isPending: false,
            userId,
            error: memberCheck.error
          };
        }
        
        // If they're already a member, they don't have a pending request
        if (memberCheck.isMember) {
          return {
            isPending: false,
            userId,
            error: null
          };
        }
        
        // Assume pending for non-members as fallback
        return {
          isPending: true,
          userId,
          error: null
        };
      }
      
    } catch (error) {
      logError(error, { context: 'checkPendingJoinRequest', username });
      
      return {
        isPending: false,
        userId: null,
        error: error.message
      };
    }
  }

  /**
   * Accept a join request for the group
   */
  async acceptJoinRequest(userId) {
    try {
      logDebug('Accepting join request', { userId, groupId: this.groupId });
      
      // Use Open Cloud API to accept join request
      // Endpoint: POST /groups/{groupId}/join-requests/{userId}:accept
      const response = await this.client.post(`/groups/${this.groupId}/join-requests/${userId}:accept`, {});
      
      logDebug('Join request accepted successfully', { userId, groupId: this.groupId });
      
      return {
        success: true,
        error: null
      };
      
    } catch (error) {
      logError(error, { context: 'acceptJoinRequest', userId, groupId: this.groupId });
      
      // Check for specific error types
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Join request not found - user may not have a pending request'
        };
      }
      
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Permission denied - API key may not have group management permissions'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get group information
   */
  async getGroupInfo() {
    try {
      logDebug('Getting group information', { groupId: this.groupId });
      
      // Try Open Cloud API first
      try {
        const response = await this.client.get(`/groups/${this.groupId}`);
        
        return {
          success: true,
          data: response.data,
          error: null
        };
      } catch (openCloudError) {
        logDebug('Open Cloud API failed for group info, trying legacy API', { error: openCloudError.message });
        
        // Fall back to legacy API (public endpoint)
        const response = await axios.get(`${this.legacyBaseUrl}/v1/groups/${this.groupId}`, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
            'Content-Type': 'application/json'
          }
        });
        
        return {
          success: true,
          data: response.data,
          error: null
        };
      }
      
    } catch (error) {
      logError(error, { context: 'getGroupInfo', groupId: this.groupId });
      
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Check if user is already a member of the group
   */
  async isUserMember(userId) {
    try {
      logDebug('Checking group membership', { userId, groupId: this.groupId });
      
      // Use Open Cloud API to get group memberships
      const response = await this.client.get(`/groups/${this.groupId}/memberships`);
      
      let isMember = false;
      if (response.data && response.data.groupMemberships) {
        isMember = response.data.groupMemberships.some(
          membership => membership.user === `users/${userId}`
        );
      }
      
      logDebug('Membership check result (Open Cloud)', { userId, groupId: this.groupId, isMember });
      
      return {
        isMember,
        error: null
      };
      
    } catch (error) {
      logError(error, { context: 'isUserMember', userId, groupId: this.groupId });
      
      // Fall back to legacy API if Open Cloud fails
      try {
        logDebug('Open Cloud failed, trying legacy API for membership check', { error: error.message });
        
        const response = await axios.get(`${this.legacyBaseUrl}/v1/groups/${this.groupId}/users`, {
          params: {
            sortOrder: 'Asc',
            limit: 100
          },
          timeout: 30000,
          headers: {
            'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
            'Content-Type': 'application/json'
          }
        });
        
        let isMember = false;
        if (response.data && response.data.data) {
          isMember = response.data.data.some(
            member => member.user && member.user.userId === userId
          );
        }
        
        logDebug('Membership check result (Legacy)', { userId, groupId: this.groupId, isMember });
        
        return {
          isMember,
          error: null
        };
        
      } catch (legacyError) {
        logError(legacyError, { context: 'isUserMember_legacy', userId, groupId: this.groupId });
        
        return {
          isMember: false,
          error: legacyError.message
        };
      }
    }
  }

  /**
   * Get API status and health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Try to get group info as a health check
      const result = await this.getGroupInfo();
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: result.success,
        responseTime,
        apiKeyConfigured: this.isConfigured(),
        groupId: this.groupId,
        error: result.error
      };
      
    } catch (error) {
      logError(error, { context: 'healthCheck' });
      
      return {
        healthy: false,
        responseTime: null,
        apiKeyConfigured: this.isConfigured(),
        groupId: this.groupId,
        error: error.message
      };
    }
  }

  /**
   * Kick/remove a user from the group
   */
  async kickMember(userId) {
    try {
      logDebug('Kicking member from group', { userId, groupId: this.groupId });
      
      // Use Open Cloud API to remove member
      // DELETE /groups/{groupId}/memberships/{userId}
      await this.client.delete(`/groups/${this.groupId}/memberships/users/${userId}`);
      
      logDebug('Member kicked successfully', { userId, groupId: this.groupId });
      
      return {
        success: true,
        error: null
      };
      
    } catch (error) {
      logError(error, { context: 'kickMember', userId, groupId: this.groupId });
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'User is not a member of this group'
        };
      }
      
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Permission denied - API key may not have group management permissions'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get rate limiting statistics
   */
  getRateLimitStats() {
    const now = Date.now();
    const recentRequests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < this.rateLimiter.windowMs
    );
    
    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.rateLimiter.maxRequests,
      windowMs: this.rateLimiter.windowMs,
      remainingRequests: Math.max(0, this.rateLimiter.maxRequests - recentRequests.length)
    };
  }
}

export default RobloxApiService;