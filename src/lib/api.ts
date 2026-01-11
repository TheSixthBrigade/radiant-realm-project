/**
 * API Client for Local PostgreSQL Backend
 * Replaces Supabase client with local API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Token storage
let tokens: AuthTokens | null = null;

function loadTokens(): AuthTokens | null {
  if (tokens) return tokens;
  
  const stored = localStorage.getItem('auth_tokens');
  if (stored) {
    try {
      tokens = JSON.parse(stored);
      return tokens;
    } catch {
      return null;
    }
  }
  return null;
}

function saveTokens(newTokens: AuthTokens): void {
  tokens = newTokens;
  localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
}

function clearTokens(): void {
  tokens = null;
  localStorage.removeItem('auth_tokens');
}

async function refreshAccessToken(): Promise<boolean> {
  const currentTokens = loadTokens();
  if (!currentTokens?.refreshToken) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentTokens.refreshToken })
    });
    
    if (!response.ok) {
      clearTokens();
      return false;
    }
    
    const data = await response.json();
    saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (data.expiresIn * 1000)
    });
    
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentTokens = loadTokens();
  if (!currentTokens) return {};
  
  // Check if token is expired or about to expire (within 1 minute)
  if (currentTokens.expiresAt < Date.now() + 60000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return {};
  }
  
  const updatedTokens = loadTokens();
  if (!updatedTokens) return {};
  
  return { 'Authorization': `Bearer ${updatedTokens.accessToken}` };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const authHeaders = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.message || data.error || 'Request failed' };
    }
    
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ==================== AUTH API ====================

export const auth = {
  async register(email: string, password: string, username?: string) {
    const result = await apiRequest<{ user: unknown; accessToken: string; refreshToken: string; expiresIn: number }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, username })
      }
    );
    
    if (result.data) {
      saveTokens({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresAt: Date.now() + (result.data.expiresIn * 1000)
      });
    }
    
    return result;
  },
  
  async login(email: string, password: string) {
    const result = await apiRequest<{ user: unknown; accessToken: string; refreshToken: string; expiresIn: number }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }
    );
    
    if (result.data) {
      saveTokens({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresAt: Date.now() + (result.data.expiresIn * 1000)
      });
    }
    
    return result;
  },
  
  async logout() {
    const currentTokens = loadTokens();
    if (currentTokens?.refreshToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: currentTokens.refreshToken })
      });
    }
    clearTokens();
  },
  
  async getUser() {
    return apiRequest<{ user: unknown }>('/auth/me');
  },
  
  isAuthenticated(): boolean {
    const currentTokens = loadTokens();
    return !!currentTokens?.accessToken;
  },
  
  getDiscordOAuthUrl() {
    return `${API_BASE_URL}/auth/discord`;
  }
};

// ==================== PRODUCTS API ====================

export const products = {
  async list(filters?: { seller_id?: string; category?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.seller_id) params.set('seller_id', filters.seller_id);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.limit) params.set('limit', filters.limit.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ products: unknown[] }>(`/products${query}`);
  },
  
  async get(id: string) {
    return apiRequest<{ product: unknown }>(`/products/${id}`);
  },
  
  async create(product: {
    name: string;
    description?: string;
    price: number;
    category?: string;
    image_url?: string;
  }) {
    return apiRequest<{ product: unknown }>('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  },
  
  async update(id: string, updates: Partial<{
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
    is_active: boolean;
  }>) {
    return apiRequest<{ product: unknown }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  async delete(id: string) {
    return apiRequest(`/products/${id}`, { method: 'DELETE' });
  }
};

// ==================== SALES API ====================

export const sales = {
  async list(filters?: { start_date?: string; end_date?: string }) {
    const params = new URLSearchParams();
    if (filters?.start_date) params.set('start_date', filters.start_date);
    if (filters?.end_date) params.set('end_date', filters.end_date);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ sales: unknown[]; total: number }>(`/sales${query}`);
  },
  
  async getStats() {
    return apiRequest<{ stats: unknown }>('/sales/stats');
  }
};

// ==================== STRIPE API ====================

export const stripe = {
  async getOnboardingLink() {
    return apiRequest<{ url: string }>('/stripe/onboard', { method: 'POST' });
  },
  
  async getStatus() {
    return apiRequest<{ status: string; account_id?: string }>('/stripe/status');
  },
  
  async createCheckout(productId: string, successUrl: string, cancelUrl: string) {
    return apiRequest<{ url: string; sessionId: string }>('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ productId, successUrl, cancelUrl })
    });
  }
};

// ==================== WHITELIST API ====================

export const whitelist = {
  async list(productId?: string) {
    const query = productId ? `?product_id=${productId}` : '';
    return apiRequest<{ entries: unknown[] }>(`/whitelist${query}`);
  },
  
  async add(entry: {
    product_id: string;
    discord_id: string;
    roblox_id?: string;
    roblox_username?: string;
  }) {
    return apiRequest<{ entry: unknown }>('/whitelist', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  },
  
  async remove(id: string) {
    return apiRequest(`/whitelist/${id}`, { method: 'DELETE' });
  },
  
  async check(discordId: string, productId: string) {
    return apiRequest<{ whitelisted: boolean }>(`/whitelist/check?discord_id=${discordId}&product_id=${productId}`);
  }
};

// ==================== DEVELOPER API ====================

export const developer = {
  async listKeys() {
    return apiRequest<{ keys: unknown[] }>('/developer/keys');
  },
  
  async createKey(name?: string) {
    return apiRequest<{ key: unknown }>('/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },
  
  async deleteKey(id: string) {
    return apiRequest(`/developer/keys/${id}`, { method: 'DELETE' });
  },
  
  async getSubscription() {
    return apiRequest<{ subscription: unknown; credits: number }>('/developer/subscription');
  },
  
  async listProducts() {
    return apiRequest<{ products: unknown[] }>('/developer/products');
  },
  
  async createProduct(product: {
    product_name: string;
    roblox_group_id: string;
    description?: string;
  }) {
    return apiRequest<{ product: unknown }>('/developer/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  }
};

// ==================== PROFILES API ====================

export const profiles = {
  async get(userId?: string) {
    const endpoint = userId ? `/profiles/${userId}` : '/profiles/me';
    return apiRequest<{ profile: unknown }>(endpoint);
  },
  
  async update(updates: Partial<{
    username: string;
    avatar_url: string;
    bio: string;
  }>) {
    return apiRequest<{ profile: unknown }>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
};

// Default export with all APIs
export default {
  auth,
  products,
  sales,
  stripe,
  whitelist,
  developer,
  profiles
};
