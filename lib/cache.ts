/**
 * High-Performance In-Memory Cache
 * 
 * Features:
 * - TTL-based expiration
 * - Stale-while-revalidate pattern
 * - In-flight request deduplication
 * - Automatic cleanup
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;      // Hard expiry
  staleAt: number;        // Soft expiry (returns stale + revalidates)
  createdAt: number;
}

// In-flight request tracker (prevents thundering herd)
const inFlightFetches = new Map<string, Promise<unknown>>();

const cache = new Map<string, CacheEntry>();

// Default TTL: 30 seconds (was 5 minutes - now shorter for fresher data)
const DEFAULT_TTL = 30;
const DEFAULT_STALE_WHILE_REVALIDATE = 60; // Additional seconds to serve stale

// Cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
      }
    }
  }, 60 * 1000);
}

export const cacheManager = {
  /**
   * Store data in cache with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number = DEFAULT_TTL): void {
    const now = Date.now();
    cache.set(key, {
      data,
      staleAt: now + ttlSeconds * 1000,
      expiresAt: now + (ttlSeconds + DEFAULT_STALE_WHILE_REVALIDATE) * 1000,
      createdAt: now,
    });
  },

  /**
   * Get data from cache
   * Returns { data, isStale } - isStale indicates background revalidation needed
   */
  getWithMeta<T>(key: string): { data: T | null; isStale: boolean; isMiss: boolean } {
    const entry = cache.get(key);
    const now = Date.now();

    // Cache miss
    if (!entry) {
      return { data: null, isStale: false, isMiss: true };
    }

    // Fully expired - delete and miss
    if (now > entry.expiresAt) {
      cache.delete(key);
      return { data: null, isStale: false, isMiss: true };
    }

    // Stale but usable - return data + signal revalidation
    if (now > entry.staleAt) {
      return { data: entry.data as T, isStale: true, isMiss: false };
    }

    // Fresh hit
    return { data: entry.data as T, isStale: false, isMiss: false };
  },

  /**
   * Simple get (backwards compatible)
   */
  get<T>(key: string): T | null {
    const { data } = this.getWithMeta<T>(key);
    return data;
  },

  /**
   * Check if key exists (fresh or stale)
   */
  has(key: string): boolean {
    const { data } = this.getWithMeta(key);
    return data !== null;
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
    inFlightFetches.clear();
    return count;
  },

  /**
   * Get cache statistics
   */
  stats(): {
    totalEntries: number;
    validEntries: number;
    staleEntries: number;
    expiredEntries: number;
    inFlightRequests: number;
    keys: string[];
    entries: Array<{
      key: string;
      expiresIn: number;
      staleIn: number;
      age: number;
      status: 'fresh' | 'stale' | 'expired';
    }>;
  } {
    const now = Date.now();
    let validCount = 0;
    let staleCount = 0;
    let expiredCount = 0;
    const entries: Array<{ 
      key: string; 
      expiresIn: number; 
      staleIn: number;
      age: number; 
      status: 'fresh' | 'stale' | 'expired';
    }> = [];

    for (const [key, entry] of cache.entries()) {
      const isExpired = now > entry.expiresAt;
      const isStale = now > entry.staleAt;
      
      if (isExpired) {
        expiredCount++;
      } else if (isStale) {
        staleCount++;
        entries.push({
          key,
          expiresIn: Math.round((entry.expiresAt - now) / 1000),
          staleIn: 0,
          age: Math.round((now - entry.createdAt) / 1000),
          status: 'stale',
        });
      } else {
        validCount++;
        entries.push({
          key,
          expiresIn: Math.round((entry.expiresAt - now) / 1000),
          staleIn: Math.round((entry.staleAt - now) / 1000),
          age: Math.round((now - entry.createdAt) / 1000),
          status: 'fresh',
        });
      }
    }

    return {
      totalEntries: cache.size,
      validEntries: validCount,
      staleEntries: staleCount,
      expiredEntries: expiredCount,
      inFlightRequests: inFlightFetches.size,
      keys: Array.from(cache.keys()),
      entries,
    };
  },

  /**
   * Get or set with stale-while-revalidate
   * - Returns cached data immediately (even if stale)
   * - Triggers background revalidation if stale
   * - Deduplicates concurrent requests to same key
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL
  ): Promise<T> {
    const { data, isStale, isMiss } = this.getWithMeta<T>(key);

    // Cache hit (fresh) - return immediately
    if (data !== null && !isStale) {
      return data;
    }

    // Cache hit (stale) - return stale + trigger background revalidate
    if (data !== null && isStale) {
      // Background revalidation (fire and forget)
      if (!inFlightFetches.has(key)) {
        const revalidate = async () => {
          try {
            const freshData = await fetchFn();
            this.set(key, freshData, ttlSeconds);
          } catch {
            // Silent fail - stale data is better than error
          } finally {
            inFlightFetches.delete(key);
          }
        };
        inFlightFetches.set(key, revalidate());
      }
      return data;
    }

    // Cache miss - fetch with deduplication
    const existingFetch = inFlightFetches.get(key);
    if (existingFetch) {
      return existingFetch as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const freshData = await fetchFn();
        this.set(key, freshData, ttlSeconds);
        return freshData;
      } finally {
        inFlightFetches.delete(key);
      }
    })();

    inFlightFetches.set(key, fetchPromise);
    return fetchPromise;
  },

  /**
   * Parallel get-or-set for multiple keys
   * Great for fetching multiple related pieces of data at once
   */
  async getOrSetMany<T>(
    requests: Array<{ key: string; fetchFn: () => Promise<T>; ttl?: number }>
  ): Promise<T[]> {
    return Promise.all(
      requests.map(({ key, fetchFn, ttl }) => 
        this.getOrSet(key, fetchFn, ttl ?? DEFAULT_TTL)
      )
    );
  },
};

// Export default TTL for consistency
export const CACHE_TTL = {
  INSTANT: 10,    // 10 seconds (very fresh data)
  SHORT: 30,      // 30 seconds (default)
  MEDIUM: 60,     // 1 minute
  LONG: 300,      // 5 minutes
  VERY_LONG: 900, // 15 minutes
};

/**
 * Generate cache key for API queries
 */
export function apiCacheKey(
  endpoint: string,
  params: Record<string, string | undefined>
): string {
  const sortedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `api:${endpoint}:${sortedParams}`;
}

