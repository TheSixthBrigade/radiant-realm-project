import axios from 'axios';
import { logApiCall, logError, logDebug } from '../utils/logger.js';

/**
 * Payhip API service for product key validation
 * Handles authentication and key verification with Payhip
 */
class PayhipApiService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.PAYHIP_API_KEY;
    this.productLink = config.productLink || process.env.PAYHIP_PRODUCT_LINK || 'BE3nO';
    this.baseUrl = 'https://payhip.com/api/v2';
    
    // Initialize HTTP client
    this.client = axios.create({
      baseURL: this.baseUrl, // Fixed: use baseURL instead of baseUrl
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Discord-Roblox-Whitelist-Bot/1.0.0',
        'product-secret-key': this.apiKey
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
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];
    
    if (!this.apiKey) {
      errors.push('Payhip API key is required');
    }
    
    if (this.apiKey && !this.apiKey.startsWith('prod_sk_')) {
      errors.push('Payhip API key must be a secret key (starts with prod_sk_)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if service is properly configured
   */
  isConfigured() {
    return this.validateConfig().isValid;
  }

  /**
   * Validate a product key with Payhip
   * @param {string} productKey - The product key to validate
   * @returns {Object} Validation result
   */
  async validateProductKey(productKey) {
    try {
      logDebug('Validating product key with Payhip', { 
        keyPrefix: productKey.substring(0, 8) + '...' 
      });
      
      // Use Payhip's v2 license verification endpoint
      // Only requires license_key parameter
      const params = {
        license_key: productKey
      };
      
      logDebug('Making Payhip API request', {
        url: '/license/verify',
        baseURL: this.baseUrl,
        params: params
      });
      
      const response = await this.client.get('/license/verify', { params });
      
      logApiCall('Payhip', '/license/verify', true, {
        status: response.status,
        enabled: response.data?.data?.enabled || false
      });
      
      if (response.data && response.data.data) {
        const licenseData = response.data.data;
        
        // Check if key is disabled/expired
        const isEnabled = licenseData.enabled === true;
        const isUsed = licenseData.uses > 0;
        
        // If key is disabled, it's invalid (expired or manually disabled)
        if (!isEnabled) {
          return {
            isValid: false,
            isUsed: isUsed,
            isDisabled: true,
            productId: licenseData.product_link,
            productName: licenseData.product_name || 'Unknown Product',
            purchaseDate: licenseData.created_at,
            buyerEmail: licenseData.buyer_email,
            uses: licenseData.uses,
            maxUses: licenseData.max_uses,
            error: 'KEY_DISABLED'
          };
        }
        
        return {
          isValid: true,
          isUsed: isUsed,
          isDisabled: false,
          productId: licenseData.product_link,
          productName: licenseData.product_name || 'Unknown Product',
          purchaseDate: licenseData.created_at,
          buyerEmail: licenseData.buyer_email,
          uses: licenseData.uses,
          maxUses: licenseData.max_uses,
          error: null
        };
      } else {
        return {
          isValid: false,
          isUsed: false,
          isDisabled: false,
          productId: null,
          productName: null,
          purchaseDate: null,
          error: 'Invalid product key'
        };
      }
      
    } catch (error) {
      logApiCall('Payhip', '/license/verify', false, {
        error: error.message,
        status: error.response?.status
      });
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        return {
          isValid: false,
          isUsed: false,
          isDisabled: false,
          productId: null,
          productName: null,
          purchaseDate: null,
          error: 'Product key not found'
        };
      }
      
      if (error.response?.status === 401) {
        logError(new Error('Payhip API authentication failed - check API key'), {
          context: 'validateProductKey'
        });
        return {
          isValid: false,
          isUsed: false,
          isDisabled: false,
          productId: null,
          productName: null,
          purchaseDate: null,
          error: 'API authentication failed'
        };
      }
      
      logError(error, { context: 'validateProductKey', keyPrefix: productKey.substring(0, 8) });
      
      return {
        isValid: false,
        isUsed: false,
        isDisabled: false,
        productId: null,
        productName: null,
        purchaseDate: null,
        error: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Mark a product key as used (if Payhip supports this)
   * @param {string} productKey - The product key to mark as used
   * @returns {Object} Operation result
   */
  async markKeyAsUsed(productKey) {
    try {
      logDebug('Marking product key as used', { 
        keyPrefix: productKey.substring(0, 8) + '...' 
      });
      
      // Use Payhip's license disable endpoint
      const params = {
        license_key: productKey
      };
      
      const response = await this.client.post('/license/disable', params);
      
      logApiCall('Payhip', '/license/disable', true, {
        status: response.status
      });
      
      return {
        success: true,
        error: null
      };
      
    } catch (error) {
      logApiCall('Payhip', '/license/disable', false, {
        error: error.message,
        status: error.response?.status
      });
      
      // If the endpoint doesn't exist, that's okay - we'll track usage locally
      if (error.response?.status === 404 || error.response?.status === 405) {
        logDebug('Payhip does not support disabling keys - using local tracking');
        return {
          success: true,
          error: null,
          localTrackingOnly: true
        };
      }
      
      logError(error, { context: 'markKeyAsUsed', keyPrefix: productKey.substring(0, 8) });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get product information
   * @param {string} productId - The product ID
   * @returns {Object} Product information
   */
  async getProductInfo(productId) {
    try {
      logDebug('Getting product information', { productId });
      
      const response = await this.client.get(`/products/${productId}`);
      
      logApiCall('Payhip', `/products/${productId}`, true, {
        status: response.status
      });
      
      return {
        success: true,
        data: response.data,
        error: null
      };
      
    } catch (error) {
      logApiCall('Payhip', `/products/${productId}`, false, {
        error: error.message,
        status: error.response?.status
      });
      
      logError(error, { context: 'getProductInfo', productId });
      
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Health check for Payhip API
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Try to verify a dummy license key to test API connectivity
      // This will fail but should return a proper error, confirming API is working
      try {
        const response = await this.client.get('/license/verify', {
          params: {
            license_key: 'TEST-KEY-FOR-HEALTH-CHECK'
          }
        });
        
        const responseTime = Date.now() - startTime;
        
        return {
          healthy: true,
          responseTime,
          apiKeyConfigured: this.isConfigured(),
          error: null
        };
      } catch (testError) {
        const responseTime = Date.now() - startTime;
        
        // If we get a 404 or similar, that means the API is working but the key is invalid
        // This is actually a good sign for a health check
        if (testError.response?.status === 404 || testError.response?.status === 400) {
          return {
            healthy: true,
            responseTime,
            apiKeyConfigured: this.isConfigured(),
            error: null
          };
        }
        
        throw testError;
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logError(error, { context: 'Payhip healthCheck' });
      
      return {
        healthy: false,
        responseTime,
        apiKeyConfigured: this.isConfigured(),
        error: error.message
      };
    }
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
      const status = error.response.status;
      
      if (status === 401) {
        logError(new Error('Payhip API authentication failed - check API key'), context);
      } else if (status === 403) {
        logError(new Error('Payhip API access forbidden - insufficient permissions'), context);
      } else if (status === 429) {
        logError(new Error('Payhip API rate limit exceeded'), context);
      } else if (status >= 500) {
        logError(new Error('Payhip API server error'), context);
      } else {
        logError(new Error(`Payhip API error: ${status}`), context);
      }
    } else if (error.request) {
      logError(new Error('Payhip API network error'), context);
    } else {
      logError(error, context);
    }
  }
}

export default PayhipApiService;