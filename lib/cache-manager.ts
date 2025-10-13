import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Cache configuration
const CACHE_CONFIG = {
  // TTL in seconds
  TTL: {
    SHORT: 60,          // 1 minute for volatile data
    MEDIUM: 300,        // 5 minutes for semi-static data
    LONG: 3600,         // 1 hour for static data
    SESSION: 86400,     // 24 hours for session data
    PERMANENT: 2592000  // 30 days for permanent cache
  },

  // Cache key prefixes
  PREFIX: {
    PROJECT: 'project:',
    USER: 'user:',
    FILES: 'files:',
    MESSAGES: 'messages:',
    TOKEN_USAGE: 'token_usage:',
    QUERY_RESULT: 'query:',
    SESSION: 'session:',
    STATS: 'stats:'
  },

  // Cache versioning for invalidation
  VERSION: 'v1'
};

export class CacheManager {
  private redis: Redis;
  private localCache: Map<string, { value: any; expires: number }> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });

    // Clear expired local cache entries periodically
    setInterval(() => this.cleanupLocalCache(), 60000);
  }

  /**
   * Generate cache key with versioning
   */
  private generateKey(prefix: string, identifier: string): string {
    return `${CACHE_CONFIG.VERSION}:${prefix}${identifier}`;
  }

  /**
   * Get from cache with local L1 cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check L1 local cache first
      const local = this.localCache.get(key);
      if (local && local.expires > Date.now()) {
        this.stats.hits++;
        return local.value;
      }

      // Check L2 Redis cache
      const value = await this.redis.get<T>(key);
      if (value) {
        this.stats.hits++;
        // Store in L1 cache with short TTL
        this.localCache.set(key, {
          value,
          expires: Date.now() + 10000 // 10 seconds L1 cache
        });
        return value;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number = CACHE_CONFIG.TTL.MEDIUM): Promise<void> {
    try {
      await this.redis.set(key, value, { ex: ttl });

      // Also set in L1 cache
      this.localCache.set(key, {
        value,
        expires: Date.now() + (Math.min(ttl, 60) * 1000) // Max 60s in L1
      });

      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.localCache.delete(key);
      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // For Upstash, we need to scan and delete
      // This is a simplified implementation
      const keys = Array.from(this.localCache.keys()).filter(k => k.includes(pattern));
      for (const key of keys) {
        await this.delete(key);
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete pattern error', { pattern, error });
    }
  }

  /**
   * Clean up expired local cache entries
   */
  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expires < now) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      localCacheSize: this.localCache.size
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  // ====================================
  // Domain-specific caching methods
  // ====================================

  /**
   * Cache project data
   */
  async cacheProject(projectId: string, projectData: any): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.PROJECT, projectId);
    await this.set(key, projectData, CACHE_CONFIG.TTL.MEDIUM);
  }

  async getProject(projectId: string): Promise<any | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.PROJECT, projectId);
    return this.get(key);
  }

  async invalidateProject(projectId: string): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.PROJECT, projectId);
    await this.delete(key);
    // Also invalidate related caches
    await this.invalidateProjectFiles(projectId);
    await this.invalidateProjectMessages(projectId);
  }

  /**
   * Cache project files
   */
  async cacheProjectFiles(projectId: string, files: any[]): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.FILES, projectId);
    await this.set(key, files, CACHE_CONFIG.TTL.MEDIUM);
  }

  async getProjectFiles(projectId: string): Promise<any[] | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.FILES, projectId);
    return this.get(key);
  }

  async invalidateProjectFiles(projectId: string): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.FILES, projectId);
    await this.delete(key);
  }

  /**
   * Cache project messages with pagination support
   */
  async cacheProjectMessages(
    projectId: string,
    messages: any[],
    cursor?: string
  ): Promise<void> {
    const key = this.generateKey(
      CACHE_CONFIG.PREFIX.MESSAGES,
      `${projectId}:${cursor || 'initial'}`
    );
    await this.set(key, messages, CACHE_CONFIG.TTL.SHORT);
  }

  async getProjectMessages(projectId: string, cursor?: string): Promise<any[] | null> {
    const key = this.generateKey(
      CACHE_CONFIG.PREFIX.MESSAGES,
      `${projectId}:${cursor || 'initial'}`
    );
    return this.get(key);
  }

  async invalidateProjectMessages(projectId: string): Promise<void> {
    // Invalidate all message caches for this project
    await this.deletePattern(`${CACHE_CONFIG.PREFIX.MESSAGES}${projectId}:`);
  }

  /**
   * Cache user data
   */
  async cacheUser(userId: string, userData: any): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.USER, userId);
    await this.set(key, userData, CACHE_CONFIG.TTL.LONG);
  }

  async getUser(userId: string): Promise<any | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.USER, userId);
    return this.get(key);
  }

  async invalidateUser(userId: string): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.USER, userId);
    await this.delete(key);
  }

  /**
   * Cache token usage statistics
   */
  async cacheTokenUsage(userId: string, stats: any): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.TOKEN_USAGE, userId);
    await this.set(key, stats, CACHE_CONFIG.TTL.SHORT);
  }

  async getTokenUsage(userId: string): Promise<any | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.TOKEN_USAGE, userId);
    return this.get(key);
  }

  /**
   * Cache query results
   */
  async cacheQueryResult(queryHash: string, result: any, ttl?: number): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.QUERY_RESULT, queryHash);
    await this.set(key, result, ttl || CACHE_CONFIG.TTL.SHORT);
  }

  async getQueryResult(queryHash: string): Promise<any | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.QUERY_RESULT, queryHash);
    return this.get(key);
  }

  /**
   * Cache session data
   */
  async cacheSession(sessionToken: string, sessionData: any): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.SESSION, sessionToken);
    await this.set(key, sessionData, CACHE_CONFIG.TTL.SESSION);
  }

  async getSession(sessionToken: string): Promise<any | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.SESSION, sessionToken);
    return this.get(key);
  }

  async invalidateSession(sessionToken: string): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.SESSION, sessionToken);
    await this.delete(key);
  }

  /**
   * Cache aggregated statistics
   */
  async cacheStats(statType: string, stats: any): Promise<void> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.STATS, statType);
    await this.set(key, stats, CACHE_CONFIG.TTL.MEDIUM);
  }

  async getStats(statType: string): Promise<any | null> {
    const key = this.generateKey(CACHE_CONFIG.PREFIX.STATS, statType);
    return this.get(key);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(projectIds: string[], userIds: string[]): Promise<void> {
    logger.info('Starting cache warmup', {
      projects: projectIds.length,
      users: userIds.length
    });

    // This would fetch and cache the most frequently accessed data
    // Implementation depends on your specific needs
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.localCache.clear();
      this.resetStats();
      logger.info('All caches cleared');
    } catch (error) {
      logger.error('Failed to clear all caches', { error });
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Cache decorator for methods
export function Cacheable(
  keyGenerator: (args: any[]) => string,
  ttl: number = CACHE_CONFIG.TTL.MEDIUM
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(args);

      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      if (result !== null && result !== undefined) {
        await cacheManager.set(cacheKey, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

// Export cache configuration for other modules
export { CACHE_CONFIG };