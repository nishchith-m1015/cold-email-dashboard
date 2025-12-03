// In-memory cache with TTL (Time To Live)
// Dramatically speeds up Google Sheets API calls

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

// Default TTL: 5 minutes (300 seconds)
const DEFAULT_TTL = 300;

export const cacheManager = {
  /**
   * Store data in cache with TTL
   * @param key - Unique cache key
   * @param data - Data to cache
   * @param ttlSeconds - Time to live in seconds (default: 300)
   */
  set<T>(key: string, data: T, ttlSeconds: number = DEFAULT_TTL): void {
    const now = Date.now();
    cache.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    });
  },

  /**
   * Get data from cache (returns null if expired or not found)
   * @param key - Cache key to lookup
   */
  get<T>(key: string): T | null {
    const entry = cache.get(key);

    // Cache miss
    if (!entry) return null;

    // Cache expired
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }

    // Cache hit
    return entry.data as T;
  },

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return false;
    }
    return true;
  },

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): boolean {
    return cache.delete(key);
  },

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
        count++;
      }
    }
    return count;
  },

  /**
   * Clear all cache entries
   */
  invalidateAll(): number {
    const count = cache.size;
    cache.clear();
    return count;
  },

  /**
   * Get cache statistics
   */
  stats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    keys: string[];
    entries: Array<{
      key: string;
      expiresIn: number;
      age: number;
    }>;
  } {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    const entries: Array<{ key: string; expiresIn: number; age: number }> = [];

    for (const [key, entry] of cache.entries()) {
      const isExpired = now > entry.expiresAt;
      if (isExpired) {
        expiredCount++;
      } else {
        validCount++;
        entries.push({
          key,
          expiresIn: Math.round((entry.expiresAt - now) / 1000), // seconds until expiry
          age: Math.round((now - entry.createdAt) / 1000), // seconds since creation
        });
      }
    }

    return {
      totalEntries: cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      keys: Array.from(cache.keys()),
      entries,
    };
  },

  /**
   * Get or set pattern - returns cached data or fetches fresh
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache it
    this.set(key, data, ttlSeconds);
    
    return data;
  },
};

// Export default TTL for consistency
export const CACHE_TTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes (default)
  LONG: 900,      // 15 minutes
  VERY_LONG: 3600, // 1 hour
};

