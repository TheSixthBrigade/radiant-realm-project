// Client-side caching utilities for API responses

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ClientCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100;

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cache with TTL (time to live in ms)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance
export const clientCache = new ClientCache();

// Cache TTL presets
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  HOUR: 60 * 60 * 1000,      // 1 hour
} as const;

/**
 * Wrapper for caching async functions
 */
export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> => {
  // Check cache first
  const cached = clientCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  clientCache.set(key, data, ttl);
  return data;
};

/**
 * Generate cache key from params
 */
export const generateCacheKey = (prefix: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
};

// Cleanup expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => clientCache.cleanup(), 60 * 1000); // Every minute
}
