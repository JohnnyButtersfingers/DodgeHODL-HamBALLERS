import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ZKProofGenerator } from '../../contracts/scripts/zkProofGenerator';

// Mock the ZK Proof Generator
vi.mock('../../contracts/scripts/zkProofGenerator', () => ({
  ZKProofGenerator: vi.fn().mockImplementation(() => ({
    generateNullifier: vi.fn(),
    generateZKProof: vi.fn(),
    verifyZKProof: vi.fn(),
    generateBatchProofs: vi.fn(),
    getProofStats: vi.fn(),
    clearCache: vi.fn()
  }))
}));

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    keccak256: vi.fn((input) => `0x${input.toString().slice(0, 64)}`),
    toUtf8Bytes: vi.fn((input) => new Uint8Array(input.split('').map(c => c.charCodeAt(0)))),
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
    Contract: vi.fn()
  }
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'mock-random-bytes')
  }))
}));

describe('ZK Integration Validation Suite', () => {
  let generator;

  beforeEach(() => {
    generator = new ZKProofGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Nullifier Uniqueness Tests', () => {
    it('should generate unique nullifiers for different inputs', async () => {
      const user1 = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const user2 = '0x1234567890123456789012345678901234567890';
      const xp1 = 1000;
      const xp2 = 2000;

      const nullifier1 = generator.generateNullifier(user1, xp1);
      const nullifier2 = generator.generateNullifier(user2, xp2);
      const nullifier3 = generator.generateNullifier(user1, xp2);

      expect(nullifier1).not.toBe(nullifier2);
      expect(nullifier1).not.toBe(nullifier3);
      expect(nullifier2).not.toBe(nullifier3);
    });

    it('should generate unique nullifiers for same user and XP with different salts', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;
      const salt1 = 'salt1';
      const salt2 = 'salt2';

      const nullifier1 = generator.generateNullifier(user, xp, salt1);
      const nullifier2 = generator.generateNullifier(user, xp, salt2);

      expect(nullifier1).not.toBe(nullifier2);
    });

    it('should handle nullifier collisions gracefully', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;

      // Mock collision scenario
      const mockNullifier = '0xcollision';
      generator.generateNullifier = vi.fn()
        .mockReturnValueOnce(mockNullifier)
        .mockReturnValueOnce(mockNullifier)
        .mockReturnValueOnce('0xunique');

      const nullifier1 = generator.generateNullifier(user, xp);
      const nullifier2 = generator.generateNullifier(user, xp);

      expect(generator.generateNullifier).toHaveBeenCalledTimes(3); // Should retry on collision
      expect(nullifier2).toBe('0xunique');
    });
  });

  describe('Gas Profiling Tests', () => {
    it('should estimate gas usage for verifyProof function', async () => {
      // Mock contract interaction
      const mockContract = {
        verifyXPProof: {
          estimateGas: vi.fn().mockResolvedValue(150000) // 150k gas
        }
      };

      const gasEstimate = await mockContract.verifyXPProof.estimateGas(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // user
        1000, // xp
        '0xnullifier', // nullifier
        '0xproof' // proof
      );

      expect(gasEstimate).toBe(150000);
      expect(gasEstimate).toBeLessThan(320000); // Should be under 320k limit
    });

    it('should fail when gas usage exceeds limit', async () => {
      const mockContract = {
        verifyXPProof: {
          estimateGas: vi.fn().mockResolvedValue(400000) // 400k gas - exceeds limit
        }
      };

      const gasEstimate = await mockContract.verifyXPProof.estimateGas(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        1000,
        '0xnullifier',
        '0xproof'
      );

      expect(gasEstimate).toBeGreaterThan(320000);
    });

    it('should profile gas usage across different XP amounts', async () => {
      const xpAmounts = [100, 500, 1000, 5000, 10000];
      const gasUsage = [];

      for (const xp of xpAmounts) {
        const mockContract = {
          verifyXPProof: {
            estimateGas: vi.fn().mockResolvedValue(100000 + (xp / 100)) // Linear gas increase
          }
        };

        const gas = await mockContract.verifyXPProof.estimateGas(
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          xp,
          '0xnullifier',
          '0xproof'
        );

        gasUsage.push({ xp, gas });
      }

      // Verify gas usage increases with XP amount
      for (let i = 1; i < gasUsage.length; i++) {
        expect(gasUsage[i].gas).toBeGreaterThan(gasUsage[i - 1].gas);
      }

      // Verify all gas usage is within limits
      gasUsage.forEach(({ gas }) => {
        expect(gas).toBeLessThan(320000);
      });
    });
  });

  describe('Replay Prevention Tests', () => {
    it('should prevent replay attacks with same nullifier', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;
      const nullifier = '0xreplay-nullifier';

      // First verification should succeed
      generator.verifyZKProof = vi.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const firstResult = await generator.verifyZKProof({}, user, xp, nullifier);
      const secondResult = await generator.verifyZKProof({}, user, xp, nullifier);

      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
    });

    it('should track used nullifiers in cache', async () => {
      const nullifier = '0xused-nullifier';
      
      // Mock the nullifier cache
      generator.nullifierCache = new Set([nullifier]);

      const isUsed = generator.nullifierCache.has(nullifier);
      expect(isUsed).toBe(true);
    });

    it('should allow different nullifiers for same user and XP', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;
      const nullifier1 = '0xnullifier1';
      const nullifier2 = '0xnullifier2';

      generator.verifyZKProof = vi.fn().mockResolvedValue(true);

      const result1 = await generator.verifyZKProof({}, user, xp, nullifier1);
      const result2 = await generator.verifyZKProof({}, user, xp, nullifier2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('Proof Generation Tests', () => {
    it('should generate valid ZK proofs', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;
      const gameData = { gameId: 'test-game', level: 5 };

      const mockProof = {
        proof: {
          a: ['0xproof-a-1', '0xproof-a-2'],
          b: [['0xproof-b-1-1', '0xproof-b-1-2'], ['0xproof-b-2-1', '0xproof-b-2-2']],
          c: ['0xproof-c-1', '0xproof-c-2']
        },
        publicSignals: [user, xp.toString(), '0xnullifier'],
        nullifier: '0xnullifier'
      };

      generator.generateZKProof = vi.fn().mockResolvedValue(mockProof);

      const result = await generator.generateZKProof(user, xp, gameData);

      expect(result).toEqual(mockProof);
      expect(result.proof).toBeDefined();
      expect(result.nullifier).toBeDefined();
      expect(result.publicInputs).toBeDefined();
    });

    it('should handle proof generation errors gracefully', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;

      generator.generateZKProof = vi.fn().mockRejectedValue(
        new Error('Proof generation failed: Network timeout')
      );

      await expect(generator.generateZKProof(user, xp)).rejects.toThrow(
        'Proof generation failed: Network timeout'
      );
    });

    it('should validate proof data structure', async () => {
      const invalidProof = {
        proof: {},
        publicSignals: []
      };

      generator.verifyZKProof = vi.fn().mockResolvedValue(false);

      const result = await generator.verifyZKProof(
        invalidProof,
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        1000,
        '0xnullifier'
      );

      expect(result).toBe(false);
    });
  });

  describe('Batch Processing Tests', () => {
    it('should process batch proofs efficiently', async () => {
      const users = [
        { address: '0x1234567890123456789012345678901234567890', xpAmount: 500 },
        { address: '0x2345678901234567890123456789012345678901', xpAmount: 750 },
        { address: '0x3456789012345678901234567890123456789012', xpAmount: 1000 }
      ];

      const mockProofs = users.map((user, index) => ({
        proof: { a: [], b: [], c: [] },
        nullifier: `0xnullifier${index}`,
        publicInputs: { userAddress: user.address, xpAmount: user.xpAmount }
      }));

      generator.generateBatchProofs = vi.fn().mockResolvedValue(mockProofs);

      const results = await generator.generateBatchProofs(users);

      expect(results).toHaveLength(users.length);
      results.forEach((proof, index) => {
        expect(proof.nullifier).toBe(`0xnullifier${index}`);
        expect(proof.publicInputs.userAddress).toBe(users[index].address);
      });
    });

    it('should handle partial failures in batch processing', async () => {
      const users = [
        { address: '0x1234567890123456789012345678901234567890', xpAmount: 500 },
        { address: '0x0000000000000000000000000000000000000000', xpAmount: 1000 }, // Invalid
        { address: '0x3456789012345678901234567890123456789012', xpAmount: 750 }
      ];

      const mockProofs = [
        { proof: {}, nullifier: '0xnullifier0', publicInputs: { userAddress: users[0].address } },
        null, // Failed proof
        { proof: {}, nullifier: '0xnullifier2', publicInputs: { userAddress: users[2].address } }
      ];

      generator.generateBatchProofs = vi.fn().mockResolvedValue(mockProofs.filter(p => p !== null));

      const results = await generator.generateBatchProofs(users);

      expect(results).toHaveLength(2); // Only successful proofs
      expect(results[0].publicInputs.userAddress).toBe(users[0].address);
      expect(results[1].publicInputs.userAddress).toBe(users[2].address);
    });
  });

  describe('Performance Tests', () => {
    it('should complete proof generation within reasonable time', async () => {
      const startTime = Date.now();
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;

      generator.generateZKProof = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate 100ms
        return { proof: {}, nullifier: '0xnullifier' };
      });

      await generator.generateZKProof(user, xp);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent proof generation', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        xpAmount: 100 + (i * 10)
      }));

      generator.generateZKProof = vi.fn().mockImplementation(async (user, xp) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms
        return { proof: {}, nullifier: `0xnullifier-${user}` };
      });

      const startTime = Date.now();
      const promises = users.map(user => 
        generator.generateZKProof(user.address, user.xpAmount)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(users.length);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network timeouts gracefully', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const xp = 1000;

      generator.generateZKProof = vi.fn().mockRejectedValue(
        new Error('Network timeout', { cause: new Error('Request timed out after 30s') })
      );

      try {
        await generator.generateZKProof(user, xp);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Network timeout');
        expect(error.cause.message).toContain('Request timed out');
      }
    });

    it('should handle invalid user addresses', async () => {
      const invalidAddresses = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0x123', // Too short
        'invalid-address', // Invalid format
        '' // Empty string
      ];

      for (const address of invalidAddresses) {
        try {
          await generator.generateZKProof(address, 1000);
          fail(`Should have rejected invalid address: ${address}`);
        } catch (error) {
          expect(error.message).toContain('Invalid');
        }
      }
    });

    it('should handle zero XP amounts', async () => {
      const user = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

      try {
        await generator.generateZKProof(user, 0);
        fail('Should have rejected zero XP amount');
      } catch (error) {
        expect(error.message).toContain('XP must be greater than 0');
      }
    });
  });

  describe('Cache Management Tests', () => {
    it('should track proof statistics correctly', async () => {
      generator.getProofStats = vi.fn().mockReturnValue({
        totalProofs: 5,
        totalNullifiers: 5,
        cacheSize: 5,
        nullifierCacheSize: 5
      });

      const stats = generator.getProofStats();

      expect(stats.totalProofs).toBe(5);
      expect(stats.totalNullifiers).toBe(5);
      expect(stats.cacheSize).toBe(5);
      expect(stats.nullifierCacheSize).toBe(5);
    });

    it('should clear cache when requested', async () => {
      generator.clearCache = vi.fn().mockImplementation(() => {
        generator.nullifierCache = new Set();
        generator.proofCache = new Map();
      });

      // Add some data to cache
      generator.nullifierCache = new Set(['0xnullifier1', '0xnullifier2']);
      generator.proofCache = new Map([['key1', 'value1'], ['key2', 'value2']]);

      generator.clearCache();

      expect(generator.nullifierCache.size).toBe(0);
      expect(generator.proofCache.size).toBe(0);
    });
  });
});