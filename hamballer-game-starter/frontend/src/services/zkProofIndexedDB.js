/**
 * ZK Proof IndexedDB Service
 * Implements secure proof caching with IndexedDB for better performance and reliability
 */

import { ethers } from 'ethers';

class ZKProofIndexedDB {
  constructor() {
    this.dbName = 'HamballerZKProofs';
    this.dbVersion = 1;
    this.storeName = 'proofs';
    this.db = null;
    this.memCache = new Map(); // In-memory memoization layer
    this.maxMemCacheSize = 100;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize IndexedDB
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ ZK Proof IndexedDB initialized');
        
        // Setup error handling
        this.db.onerror = (event) => {
          console.error('Database error:', event.target.error);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { 
            keyPath: 'hash' 
          });
          
          // Create indexes for efficient querying
          objectStore.createIndex('playerAddress', 'playerAddress', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * Generate secure hash for proof caching
   * Uses keccak256 for consistency with smart contracts
   */
  generateProofHash(playerAddress, xpEarned, runId, nonce = '') {
    const data = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'string', 'string'],
      [playerAddress, xpEarned, runId, nonce]
    );
    return ethers.utils.keccak256(data);
  }

  /**
   * Store proof with secure hashing and metadata
   */
  async storeProof(playerAddress, xpEarned, runId, proofData, ttlHours = 24) {
    await this.initPromise;
    
    const hash = this.generateProofHash(playerAddress, xpEarned, runId);
    const timestamp = Date.now();
    const expiresAt = timestamp + (ttlHours * 60 * 60 * 1000);
    
    const proofEntry = {
      hash,
      playerAddress: playerAddress.toLowerCase(),
      xpEarned,
      runId,
      proof: {
        ...proofData,
        // Encrypt sensitive data if needed
        nullifier: this.encryptData(proofData.nullifier),
        commitment: this.encryptData(proofData.commitment)
      },
      metadata: {
        timestamp,
        expiresAt,
        accessCount: 0,
        lastAccessed: timestamp,
        version: 1
      }
    };

    try {
      // Store in IndexedDB
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await this.promisifyRequest(store.put(proofEntry));
      
      // Update memory cache
      this.updateMemCache(hash, proofEntry);
      
      // Clean up expired entries
      this.cleanupExpiredEntries();
      
      console.log(`✅ Proof cached: ${hash.slice(0, 10)}...`);
      return { success: true, hash };
      
    } catch (error) {
      console.error('Failed to store proof:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve proof with memoization
   */
  async getProof(playerAddress, xpEarned, runId) {
    await this.initPromise;
    
    const hash = this.generateProofHash(playerAddress, xpEarned, runId);
    
    // Check memory cache first
    if (this.memCache.has(hash)) {
      const cached = this.memCache.get(hash);
      if (cached.metadata.expiresAt > Date.now()) {
        console.log(`📦 Proof retrieved from memory cache`);
        this.updateAccessMetadata(hash);
        return this.decryptProofData(cached.proof);
      } else {
        this.memCache.delete(hash);
      }
    }
    
    try {
      // Check IndexedDB
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(hash);
      const proofEntry = await this.promisifyRequest(request);
      
      if (proofEntry && proofEntry.metadata.expiresAt > Date.now()) {
        // Update memory cache
        this.updateMemCache(hash, proofEntry);
        
        // Update access metadata
        this.updateAccessMetadata(hash);
        
        console.log(`📦 Proof retrieved from IndexedDB`);
        return this.decryptProofData(proofEntry.proof);
      }
      
      // Proof not found or expired
      if (proofEntry) {
        this.deleteProof(hash);
      }
      
      return null;
      
    } catch (error) {
      console.error('Failed to retrieve proof:', error);
      return null;
    }
  }

  /**
   * Batch retrieve proofs for multiple claims
   */
  async getBatchProofs(claims) {
    await this.initPromise;
    
    const results = new Map();
    const missingHashes = [];
    
    // Check memory cache first
    for (const claim of claims) {
      const hash = this.generateProofHash(claim.playerAddress, claim.xpEarned, claim.runId);
      
      if (this.memCache.has(hash)) {
        const cached = this.memCache.get(hash);
        if (cached.metadata.expiresAt > Date.now()) {
          results.set(hash, this.decryptProofData(cached.proof));
        } else {
          missingHashes.push({ hash, claim });
        }
      } else {
        missingHashes.push({ hash, claim });
      }
    }
    
    // Batch fetch from IndexedDB
    if (missingHashes.length > 0) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        const promises = missingHashes.map(async ({ hash, claim }) => {
          const proofEntry = await this.promisifyRequest(store.get(hash));
          
          if (proofEntry && proofEntry.metadata.expiresAt > Date.now()) {
            this.updateMemCache(hash, proofEntry);
            results.set(hash, this.decryptProofData(proofEntry.proof));
          }
        });
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Batch proof retrieval failed:', error);
      }
    }
    
    return results;
  }

  /**
   * Update access metadata
   */
  async updateAccessMetadata(hash) {
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(hash);
      const proofEntry = await this.promisifyRequest(request);
      
      if (proofEntry) {
        proofEntry.metadata.accessCount++;
        proofEntry.metadata.lastAccessed = Date.now();
        await this.promisifyRequest(store.put(proofEntry));
      }
    } catch (error) {
      console.error('Failed to update access metadata:', error);
    }
  }

  /**
   * Delete proof
   */
  async deleteProof(hash) {
    await this.initPromise;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await this.promisifyRequest(store.delete(hash));
      
      // Remove from memory cache
      this.memCache.delete(hash);
      
      return true;
    } catch (error) {
      console.error('Failed to delete proof:', error);
      return false;
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpiredEntries() {
    await this.initPromise;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          console.log(`🧹 Removing expired proof: ${cursor.value.hash.slice(0, 10)}...`);
          cursor.delete();
          this.memCache.delete(cursor.value.hash);
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    await this.initPromise;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();
      const count = await this.promisifyRequest(countRequest);
      
      // Get size estimate
      let totalSize = 0;
      const cursorRequest = store.openCursor();
      
      return new Promise((resolve) => {
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            totalSize += JSON.stringify(cursor.value).length;
            cursor.continue();
          } else {
            resolve({
              count,
              totalSize,
              memCacheSize: this.memCache.size,
              estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2)
            });
          }
        };
      });
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Memory cache management
   */
  updateMemCache(hash, proofEntry) {
    // LRU eviction if cache is full
    if (this.memCache.size >= this.maxMemCacheSize) {
      const oldestKey = this.memCache.keys().next().value;
      this.memCache.delete(oldestKey);
    }
    
    this.memCache.set(hash, proofEntry);
  }

  /**
   * Simple encryption for sensitive data
   * In production, use a proper encryption library
   */
  encryptData(data) {
    // For demo purposes - in production use Web Crypto API
    return btoa(data);
  }

  /**
   * Decrypt proof data
   */
  decryptProofData(encryptedProof) {
    return {
      ...encryptedProof,
      nullifier: atob(encryptedProof.nullifier),
      commitment: atob(encryptedProof.commitment)
    };
  }

  /**
   * Promisify IndexedDB requests
   */
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached proofs
   */
  async clearAll() {
    await this.initPromise;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await this.promisifyRequest(store.clear());
      
      this.memCache.clear();
      
      console.log('🧹 All cached proofs cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Export proofs for backup
   */
  async exportProofs() {
    await this.initPromise;
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      const proofs = await this.promisifyRequest(request);
      
      return {
        version: this.dbVersion,
        exportDate: new Date().toISOString(),
        proofs: proofs.map(p => ({
          ...p,
          proof: this.decryptProofData(p.proof)
        }))
      };
    } catch (error) {
      console.error('Failed to export proofs:', error);
      return null;
    }
  }

  /**
   * Import proofs from backup
   */
  async importProofs(exportData) {
    await this.initPromise;
    
    if (!exportData || !exportData.proofs) {
      throw new Error('Invalid export data');
    }
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      for (const proof of exportData.proofs) {
        // Re-encrypt sensitive data
        proof.proof.nullifier = this.encryptData(proof.proof.nullifier);
        proof.proof.commitment = this.encryptData(proof.proof.commitment);
        
        await this.promisifyRequest(store.put(proof));
      }
      
      console.log(`✅ Imported ${exportData.proofs.length} proofs`);
      return true;
    } catch (error) {
      console.error('Failed to import proofs:', error);
      return false;
    }
  }
}

// Export singleton instance
export const zkProofIndexedDB = new ZKProofIndexedDB();
export default zkProofIndexedDB;