/**
 * Proof Cache Service
 * Caches generated ZK proofs for efficient retries and recovery
 */

class ProofCacheService {
  constructor() {
    this.cache = new Map();
    this.storage = window.localStorage;
    this.cacheKeyPrefix = 'hamballer_proof_cache_';
    this.maxCacheAge = 3600000; // 1 hour
    this.maxCacheSize = 50;
    
    // Load cached proofs on initialization
    this.loadFromStorage();
  }

  /**
   * Generate cache key from proof parameters
   */
  generateCacheKey(playerAddress, xpEarned, runId) {
    return `${playerAddress.toLowerCase()}_${runId}_${xpEarned}`;
  }

  /**
   * Store proof in cache
   */
  cacheProof(playerAddress, xpEarned, runId, proofData) {
    const key = this.generateCacheKey(playerAddress, xpEarned, runId);
    const cacheEntry = {
      proof: proofData,
      timestamp: Date.now(),
      attempts: 0,
      lastAttempt: null
    };
    
    this.cache.set(key, cacheEntry);
    this.saveToStorage(key, cacheEntry);
    
    // Cleanup old entries if cache is too large
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldest();
    }
    
    console.log(`✅ Cached proof for ${key}`);
    return cacheEntry;
  }

  /**
   * Retrieve proof from cache
   */
  getCachedProof(playerAddress, xpEarned, runId) {
    const key = this.generateCacheKey(playerAddress, xpEarned, runId);
    const cacheEntry = this.cache.get(key);
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if cache entry is expired
    if (Date.now() - cacheEntry.timestamp > this.maxCacheAge) {
      this.removeProof(key);
      return null;
    }
    
    // Update access time
    cacheEntry.lastAccess = Date.now();
    this.cache.set(key, cacheEntry);
    
    console.log(`📦 Retrieved cached proof for ${key}`);
    return cacheEntry.proof;
  }

  /**
   * Update attempt count for a cached proof
   */
  updateAttemptCount(playerAddress, xpEarned, runId) {
    const key = this.generateCacheKey(playerAddress, xpEarned, runId);
    const cacheEntry = this.cache.get(key);
    
    if (cacheEntry) {
      cacheEntry.attempts++;
      cacheEntry.lastAttempt = Date.now();
      this.cache.set(key, cacheEntry);
      this.saveToStorage(key, cacheEntry);
    }
  }

  /**
   * Remove proof from cache
   */
  removeProof(key) {
    this.cache.delete(key);
    this.storage.removeItem(this.cacheKeyPrefix + key);
  }

  /**
   * Clear all cached proofs
   */
  clearCache() {
    // Clear memory cache
    this.cache.clear();
    
    // Clear storage cache
    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(this.cacheKeyPrefix)) {
        this.storage.removeItem(key);
      }
    });
    
    console.log('🧹 Proof cache cleared');
  }

  /**
   * Load cached proofs from local storage
   */
  loadFromStorage() {
    const keys = Object.keys(this.storage);
    let loaded = 0;
    
    keys.forEach(key => {
      if (key.startsWith(this.cacheKeyPrefix)) {
        try {
          const cacheKey = key.replace(this.cacheKeyPrefix, '');
          const data = JSON.parse(this.storage.getItem(key));
          
          // Skip expired entries
          if (Date.now() - data.timestamp <= this.maxCacheAge) {
            this.cache.set(cacheKey, data);
            loaded++;
          } else {
            this.storage.removeItem(key);
          }
        } catch (error) {
          console.error('Failed to load cached proof:', error);
          this.storage.removeItem(key);
        }
      }
    });
    
    if (loaded > 0) {
      console.log(`📂 Loaded ${loaded} cached proofs from storage`);
    }
  }

  /**
   * Save proof to local storage
   */
  saveToStorage(key, cacheEntry) {
    try {
      this.storage.setItem(
        this.cacheKeyPrefix + key,
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.error('Failed to save proof to storage:', error);
      // If storage is full, clear old entries
      if (error.name === 'QuotaExceededError') {
        this.evictOldest();
      }
    }
  }

  /**
   * Evict oldest cache entries
   */
  evictOldest() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.removeProof(entries[i][0]);
    }
    
    console.log(`🧹 Evicted ${toRemove} old cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      totalEntries: this.cache.size,
      averageAge: entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length || 0,
      totalAttempts: entries.reduce((sum, e) => sum + e.attempts, 0),
      oldestEntry: Math.min(...entries.map(e => e.timestamp)) || null,
      newestEntry: Math.max(...entries.map(e => e.timestamp)) || null
    };
  }
}

// Export singleton instance
export const proofCacheService = new ProofCacheService();
export default proofCacheService;