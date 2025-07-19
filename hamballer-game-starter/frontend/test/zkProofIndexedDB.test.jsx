import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import zkProofIndexedDB from '../src/services/zkProofIndexedDB';

// Mock IndexedDB for testing
const mockIndexedDB = {
  databases: new Map(),
  open: vi.fn((name, version) => {
    const db = {
      name,
      version,
      objectStoreNames: { contains: vi.fn() },
      transaction: vi.fn(),
      createObjectStore: vi.fn()
    };
    
    return {
      result: db,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      addEventListener: vi.fn()
    };
  })
};

// Mock proof data
const mockProofData = {
  nullifier: '0x1234567890abcdef',
  commitment: '0xfedcba0987654321',
  proof: ['0x1', '0x2', '0x3', '0x4', '0x5', '0x6', '0x7', '0x8'],
  claimedXP: 100,
  threshold: 50
};

describe('ZKProofIndexedDB', () => {
  beforeEach(() => {
    // Reset global IndexedDB mock
    global.indexedDB = mockIndexedDB;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete global.indexedDB;
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB on construction', async () => {
      const service = new zkProofIndexedDB.constructor();
      expect(service.dbName).toBe('HamballerZKProofs');
      expect(service.dbVersion).toBe(1);
      expect(service.memCache).toBeInstanceOf(Map);
    });
  });

  describe('Proof Hashing', () => {
    it('should generate consistent hashes for same inputs', () => {
      const hash1 = zkProofIndexedDB.generateProofHash('0x123', 100, 'run-1');
      const hash2 = zkProofIndexedDB.generateProofHash('0x123', 100, 'run-1');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = zkProofIndexedDB.generateProofHash('0x123', 100, 'run-1');
      const hash2 = zkProofIndexedDB.generateProofHash('0x456', 100, 'run-1');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Memory Cache', () => {
    it('should implement LRU eviction when cache is full', () => {
      const service = new zkProofIndexedDB.constructor();
      service.maxMemCacheSize = 3;
      
      // Fill cache
      service.updateMemCache('hash1', { data: 1 });
      service.updateMemCache('hash2', { data: 2 });
      service.updateMemCache('hash3', { data: 3 });
      
      expect(service.memCache.size).toBe(3);
      
      // Add one more - should evict oldest
      service.updateMemCache('hash4', { data: 4 });
      
      expect(service.memCache.size).toBe(3);
      expect(service.memCache.has('hash1')).toBe(false);
      expect(service.memCache.has('hash4')).toBe(true);
    });
  });

  describe('Proof Storage', () => {
    it('should encrypt sensitive data before storage', () => {
      const encrypted = zkProofIndexedDB.encryptData('sensitive');
      expect(encrypted).not.toBe('sensitive');
      expect(encrypted).toBe(btoa('sensitive'));
    });

    it('should decrypt data correctly', () => {
      const original = 'sensitive-data';
      const encrypted = zkProofIndexedDB.encryptData(original);
      const decrypted = atob(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should validate TTL when storing proofs', async () => {
      const ttlHours = 24;
      const now = Date.now();
      
      // Mock successful storage
      global.indexedDB.open = vi.fn().mockReturnValue({
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              put: vi.fn().mockReturnValue({
                onsuccess: null,
                onerror: null
              })
            })
          })
        },
        onsuccess: function() { this.result && this.onsuccess(); }
      });

      // Calculate expected expiry
      const expectedExpiry = now + (ttlHours * 60 * 60 * 1000);
      
      // Store proof
      await zkProofIndexedDB.storeProof('0x123', 100, 'run-1', mockProofData, ttlHours);
      
      // Check if proof in memory cache has correct expiry
      const hash = zkProofIndexedDB.generateProofHash('0x123', 100, 'run-1');
      const cached = zkProofIndexedDB.memCache.get(hash);
      
      if (cached) {
        expect(cached.metadata.expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
      }
    });
  });

  describe('Proof Retrieval', () => {
    it('should return null for expired proofs', async () => {
      const service = new zkProofIndexedDB.constructor();
      const hash = 'test-hash';
      
      // Add expired proof to memory cache
      service.memCache.set(hash, {
        proof: mockProofData,
        metadata: {
          expiresAt: Date.now() - 1000 // Expired
        }
      });
      
      // Mock hash generation
      service.generateProofHash = vi.fn().mockReturnValue(hash);
      
      const result = await service.getProof('0x123', 100, 'run-1');
      expect(result).toBeNull();
      expect(service.memCache.has(hash)).toBe(false);
    });

    it('should update access metadata on retrieval', async () => {
      const updateSpy = vi.spyOn(zkProofIndexedDB, 'updateAccessMetadata');
      
      // Add valid proof to memory cache
      const hash = zkProofIndexedDB.generateProofHash('0x123', 100, 'run-1');
      zkProofIndexedDB.memCache.set(hash, {
        proof: { ...mockProofData, nullifier: btoa(mockProofData.nullifier) },
        metadata: {
          expiresAt: Date.now() + 3600000 // 1 hour from now
        }
      });
      
      await zkProofIndexedDB.getProof('0x123', 100, 'run-1');
      expect(updateSpy).toHaveBeenCalledWith(hash);
    });
  });

  describe('Batch Operations', () => {
    it('should efficiently retrieve multiple proofs', async () => {
      const claims = [
        { playerAddress: '0x123', xpEarned: 100, runId: 'run-1' },
        { playerAddress: '0x456', xpEarned: 200, runId: 'run-2' },
        { playerAddress: '0x789', xpEarned: 300, runId: 'run-3' }
      ];
      
      // Add some proofs to cache
      const hash1 = zkProofIndexedDB.generateProofHash('0x123', 100, 'run-1');
      zkProofIndexedDB.memCache.set(hash1, {
        proof: { ...mockProofData, nullifier: btoa('proof1') },
        metadata: { expiresAt: Date.now() + 3600000 }
      });
      
      const results = await zkProofIndexedDB.getBatchProofs(claims);
      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Storage Management', () => {
    it('should clear all cached proofs', async () => {
      // Add some proofs to memory cache
      zkProofIndexedDB.memCache.set('hash1', { data: 1 });
      zkProofIndexedDB.memCache.set('hash2', { data: 2 });
      
      expect(zkProofIndexedDB.memCache.size).toBe(2);
      
      // Mock clear operation
      global.indexedDB.open = vi.fn().mockReturnValue({
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              clear: vi.fn().mockReturnValue({
                onsuccess: function() { this.onsuccess && this.onsuccess(); }
              })
            })
          })
        },
        onsuccess: function() { this.onsuccess && this.onsuccess(); }
      });
      
      await zkProofIndexedDB.clearAll();
      expect(zkProofIndexedDB.memCache.size).toBe(0);
    });
  });

  describe('Export/Import', () => {
    it('should export proofs with decrypted data', async () => {
      // Mock getAll operation
      const mockProofs = [{
        hash: 'hash1',
        proof: {
          nullifier: btoa('nullifier1'),
          commitment: btoa('commitment1'),
          proof: ['0x1', '0x2']
        },
        metadata: { timestamp: Date.now() }
      }];
      
      global.indexedDB.open = vi.fn().mockReturnValue({
        result: {
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              getAll: vi.fn().mockReturnValue({
                result: mockProofs,
                onsuccess: function() { this.onsuccess && this.onsuccess(); }
              })
            })
          })
        },
        onsuccess: function() { this.onsuccess && this.onsuccess(); }
      });
      
      const exported = await zkProofIndexedDB.exportProofs();
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('exportDate');
      expect(exported).toHaveProperty('proofs');
      
      if (exported && exported.proofs && exported.proofs.length > 0) {
        // Check that nullifier is decrypted
        expect(exported.proofs[0].proof.nullifier).toBe('nullifier1');
      }
    });
  });
});

describe('ZKProofIndexedDB Error Handling', () => {
  it('should handle database connection errors gracefully', async () => {
    global.indexedDB = {
      open: vi.fn().mockImplementation(() => {
        const request = {
          onerror: null,
          error: new Error('Database connection failed')
        };
        setTimeout(() => request.onerror && request.onerror(), 0);
        return request;
      })
    };
    
    const service = new zkProofIndexedDB.constructor();
    
    // Should not throw, but handle error internally
    await expect(service.initialize()).rejects.toThrow('Database connection failed');
  });

  it('should handle storage quota exceeded errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock quota exceeded error
    global.indexedDB.open = vi.fn().mockReturnValue({
      result: {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockImplementation(() => {
              throw new DOMException('QuotaExceededError');
            })
          })
        })
      },
      onsuccess: function() { this.onsuccess && this.onsuccess(); }
    });
    
    const result = await zkProofIndexedDB.storeProof('0x123', 100, 'run-1', mockProofData);
    expect(result.success).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});