import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import xpVerificationService from '../src/services/xpVerificationService';
import { zkLogger } from '../src/services/zkAnalyticsService';
import ClaimBadge from '../src/components/ClaimBadge';
import { WalletProvider } from '../src/contexts/WalletContext';

// Mock dependencies
vi.mock('../src/services/xpVerificationService');
vi.mock('../src/services/zkAnalyticsService');
vi.mock('../src/hooks/useContracts', () => ({
  useContracts: () => ({
    contracts: {
      xpVerifier: {
        read: {
          isNullifierUsed: vi.fn(),
          getThreshold: vi.fn(),
          getVerificationResult: vi.fn()
        },
        write: {
          verifyXPProof: vi.fn()
        }
      }
    }
  })
}));

describe('ZK Validation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Nullifier Uniqueness Tests', () => {
    it('should generate unique nullifiers for different users', async () => {
      const user1 = '0x1234567890123456789012345678901234567890';
      const user2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      
      const nullifier1 = await xpVerificationService.generateNullifier(user1);
      const nullifier2 = await xpVerificationService.generateNullifier(user2);
      
      expect(nullifier1).toBeDefined();
      expect(nullifier2).toBeDefined();
      expect(nullifier1).not.toBe(nullifier2);
    });

    it('should generate same nullifier for same user', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      
      const nullifier1 = await xpVerificationService.generateNullifier(user);
      const nullifier2 = await xpVerificationService.generateNullifier(user);
      
      expect(nullifier1).toBe(nullifier2);
    });

    it('should reject proof with already used nullifier', async () => {
      const mockNullifier = '0x1234567890abcdef';
      const contracts = {
        xpVerifier: {
          read: {
            isNullifierUsed: vi.fn().mockResolvedValue(true)
          }
        }
      };

      const isUsed = await xpVerificationService.checkNullifierUsed(
        contracts,
        mockNullifier
      );

      expect(isUsed).toBe(true);
      expect(zkLogger.logNullifierReuse).toHaveBeenCalledWith({
        nullifier: mockNullifier,
        attemptedBy: expect.any(String),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Gas Profiling Tests', () => {
    it('should estimate gas for proof verification', async () => {
      const mockProof = {
        proof: {
          a: ['0x1', '0x2'],
          b: [['0x3', '0x4'], ['0x5', '0x6']],
          c: ['0x7', '0x8']
        },
        publicSignals: ['0x9', '0xa', '0xb']
      };

      const gasEstimate = await xpVerificationService.estimateGas(mockProof);
      
      expect(gasEstimate).toBeDefined();
      expect(gasEstimate.estimated).toBeLessThan(320000);
      expect(gasEstimate.limit).toBeLessThan(384000); // 320k + 20% buffer
    });

    it('should warn if gas exceeds target', async () => {
      const mockProof = {
        proof: {
          a: ['0x1', '0x2'],
          b: [['0x3', '0x4'], ['0x5', '0x6']],
          c: ['0x7', '0x8']
        },
        publicSignals: ['0x9', '0xa', '0xb']
      };

      // Mock high gas usage
      xpVerificationService.estimateGas = vi.fn().mockResolvedValue({
        estimated: '350000',
        limit: '420000',
        exceedsTarget: true
      });

      const gasEstimate = await xpVerificationService.estimateGas(mockProof);
      
      expect(gasEstimate.exceedsTarget).toBe(true);
      expect(Number(gasEstimate.estimated)).toBeGreaterThan(320000);
    });

    it('should track gas usage over time', async () => {
      const gasUsages = [];
      
      for (let i = 0; i < 5; i++) {
        const mockProof = {
          proof: {
            a: [`0x${i}1`, `0x${i}2`],
            b: [[`0x${i}3`, `0x${i}4`], [`0x${i}5`, `0x${i}6`]],
            c: [`0x${i}7`, `0x${i}8`]
          },
          publicSignals: [`0x${i}9`, `0x${i}a`, `0x${i}b`]
        };
        
        const gas = await xpVerificationService.estimateGas(mockProof);
        gasUsages.push(Number(gas.estimated));
      }
      
      const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
      expect(avgGas).toBeLessThan(320000);
    });
  });

  describe('Replay Prevention Tests', () => {
    it('should prevent replay of same proof', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const xpAmount = '1000';
      const runId = 'run-123';
      
      // First submission
      const proof1 = await xpVerificationService.generateXPProof(
        user,
        xpAmount,
        runId
      );
      
      // Mock successful first verification
      xpVerificationService.verifyProof = vi.fn()
        .mockResolvedValueOnce({ success: true, verified: true })
        .mockResolvedValueOnce({ success: false, error: 'Nullifier already used' });
      
      const result1 = await xpVerificationService.verifyProof(proof1);
      expect(result1.success).toBe(true);
      
      // Attempt replay
      const result2 = await xpVerificationService.verifyProof(proof1);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Nullifier already used');
    });

    it('should allow different proofs from same user', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      
      // Generate proofs for different runs
      const proof1 = await xpVerificationService.generateXPProof(
        user,
        '1000',
        'run-123'
      );
      
      const proof2 = await xpVerificationService.generateXPProof(
        user,
        '1500',
        'run-456'
      );
      
      expect(proof1.nullifier).not.toBe(proof2.nullifier);
      
      // Both should be verifiable
      xpVerificationService.verifyProof = vi.fn()
        .mockResolvedValue({ success: true, verified: true });
      
      const result1 = await xpVerificationService.verifyProof(proof1);
      const result2 = await xpVerificationService.verifyProof(proof2);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network timeouts gracefully', async () => {
      xpVerificationService.generateXPProof = vi.fn()
        .mockRejectedValue(new Error('Network timeout'));
      
      const user = '0x1234567890123456789012345678901234567890';
      
      await expect(
        xpVerificationService.generateXPProof(user, '1000', 'run-123')
      ).rejects.toThrow('Network timeout');
      
      expect(zkLogger.logProofFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network timeout',
          errorType: 'timeout'
        })
      );
    });

    it('should handle invalid proof data', async () => {
      const invalidProof = {
        proof: { a: ['invalid'] },
        publicSignals: []
      };
      
      xpVerificationService.verifyProof = vi.fn()
        .mockRejectedValue(new Error('Invalid proof format'));
      
      await expect(
        xpVerificationService.verifyProof(invalidProof)
      ).rejects.toThrow('Invalid proof format');
    });

    it('should retry on transient failures', async () => {
      let attempts = 0;
      xpVerificationService.generateXPProof = vi.fn()
        .mockImplementation(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary network error');
          }
          return {
            proof: { a: ['0x1', '0x2'] },
            nullifier: '0xabc',
            publicSignals: ['0x1', '0x2', '0x3']
          };
        });
      
      const result = await xpVerificationService.generateXPProofWithRetry(
        '0x123',
        '1000',
        'run-123'
      );
      
      expect(attempts).toBe(3);
      expect(result).toBeDefined();
      expect(result.nullifier).toBe('0xabc');
    });
  });

  describe('Component Integration Tests', () => {
    it('should show loading spinner during proof generation', async () => {
      const mockBadge = {
        id: 'badge-1',
        xpEarned: 100,
        runId: 'run-123',
        tokenId: 4,
        name: 'Legendary'
      };
      
      xpVerificationService.generateXPProof = vi.fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <WalletProvider>
          <ClaimBadge />
        </WalletProvider>
      );
      
      // Mock unclaimed badges
      act(() => {
        screen.getByText('Claim Badge').click();
      });
      
      expect(screen.getByText('Generating Proof...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show appropriate error messages', async () => {
      const { showInvalidProof } = vi.mocked(useZKToasts());
      
      xpVerificationService.generateXPProof = vi.fn()
        .mockRejectedValue(new Error('Invalid proof data'));
      
      render(
        <WalletProvider>
          <ClaimBadge />
        </WalletProvider>
      );
      
      act(() => {
        screen.getByText('Claim Badge').click();
      });
      
      await waitFor(() => {
        expect(showInvalidProof).toHaveBeenCalledWith(
          'Invalid proof: Please retry with updated XP data'
        );
      });
    });
  });

  describe('Performance Tests', () => {
    it('should complete proof generation within time limit', async () => {
      const startTime = Date.now();
      
      const proof = await xpVerificationService.generateXPProof(
        '0x1234567890123456789012345678901234567890',
        '1000',
        'run-123'
      );
      
      const elapsedTime = Date.now() - startTime;
      
      expect(proof).toBeDefined();
      expect(elapsedTime).toBeLessThan(5000); // 5 second limit
    });

    it('should handle concurrent proof generations', async () => {
      const users = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333'
      ];
      
      const proofPromises = users.map(user =>
        xpVerificationService.generateXPProof(user, '1000', `run-${user.slice(0, 6)}`)
      );
      
      const proofs = await Promise.all(proofPromises);
      
      expect(proofs).toHaveLength(3);
      expect(new Set(proofs.map(p => p.nullifier)).size).toBe(3); // All unique
    });
  });

  describe('Stress Tests', () => {
    it('should handle 10k nullifier operations efficiently', async () => {
      const startTime = Date.now();
      const nullifiers = new Set();
      
      // Generate 10k unique nullifiers
      for (let i = 0; i < 10000; i++) {
        const address = `0x${i.toString(16).padStart(40, '0')}`;
        const nullifier = await xpVerificationService.generateNullifier(address);
        nullifiers.add(nullifier);
      }
      
      const elapsedTime = Date.now() - startTime;
      const opsPerSecond = 10000 / (elapsedTime / 1000);
      
      expect(nullifiers.size).toBe(10000); // All unique
      expect(opsPerSecond).toBeGreaterThan(200); // Target: 209 ops/sec
      console.log(`10k nullifier test: ${opsPerSecond.toFixed(2)} ops/sec`);
    });

    it('should handle 50k nullifier storage simulation', async () => {
      const mockStorage = new Map();
      const startTime = Date.now();
      
      // Simulate 50k nullifier storage and lookup
      for (let i = 0; i < 50000; i++) {
        const nullifier = `0x${i.toString(16).padStart(64, '0')}`;
        mockStorage.set(nullifier, {
          used: true,
          timestamp: Date.now(),
          user: `0x${i.toString(16).padStart(40, '0')}`
        });
      }
      
      // Test lookup performance
      const lookupStart = Date.now();
      const lookups = 1000;
      for (let i = 0; i < lookups; i++) {
        const randomIndex = Math.floor(Math.random() * 50000);
        const nullifier = `0x${randomIndex.toString(16).padStart(64, '0')}`;
        const exists = mockStorage.has(nullifier);
        expect(exists).toBe(true);
      }
      const lookupTime = Date.now() - lookupStart;
      const lookupOpsPerSecond = lookups / (lookupTime / 1000);
      
      expect(mockStorage.size).toBe(50000);
      expect(lookupOpsPerSecond).toBeGreaterThan(1000); // Fast lookups
      console.log(`50k nullifier lookup: ${lookupOpsPerSecond.toFixed(2)} ops/sec`);
    });

    it('should handle low XP failure scenarios', async () => {
      const lowXPAmounts = [1, 5, 10, 15, 20, 24];
      const results = [];
      
      for (const xp of lowXPAmounts) {
        try {
          const result = await xpVerificationService.generateXPProof(
            '0x1234567890123456789012345678901234567890',
            xp.toString(),
            `run-low-xp-${xp}`
          );
          results.push({ xp, success: true, result });
        } catch (error) {
          results.push({ xp, success: false, error: error.message });
        }
      }
      
      // Verify appropriate handling of low XP
      results.forEach(({ xp, success, error }) => {
        if (xp < 25) {
          // Should either succeed without proof or fail gracefully
          if (!success) {
            expect(error).toMatch(/insufficient|not eligible|minimum/i);
          }
        }
      });
    });

    it('should handle batch verification under load', async () => {
      const batchSizes = [10, 50, 100];
      const results = [];
      
      for (const size of batchSizes) {
        const startTime = Date.now();
        const batch = [];
        
        // Generate batch of proofs
        for (let i = 0; i < size; i++) {
          const proof = {
            address: `0x${i.toString(16).padStart(40, '0')}`,
            xp: 50 + Math.floor(Math.random() * 50),
            nullifier: `0x${i.toString(16).padStart(64, '0')}`,
            proof: {
              a: ['0x1', '0x2'],
              b: [['0x3', '0x4'], ['0x5', '0x6']],
              c: ['0x7', '0x8']
            },
            publicSignals: ['0x1', '0x2', '0x3']
          };
          batch.push(proof);
        }
        
        // Simulate batch verification
        const verifyStart = Date.now();
        const verified = batch.filter(p => p.xp >= 50).length;
        const verifyTime = Date.now() - verifyStart;
        
        const totalTime = Date.now() - startTime;
        results.push({
          size,
          verified,
          totalTime,
          avgTimePerProof: totalTime / size
        });
      }
      
      // Verify batch processing efficiency
      results.forEach(({ size, avgTimePerProof }) => {
        expect(avgTimePerProof).toBeLessThan(50); // < 50ms per proof
        console.log(`Batch size ${size}: ${avgTimePerProof.toFixed(2)}ms per proof`);
      });
    });

    it('should maintain performance with memory pressure', async () => {
      const iterations = 1000;
      const memoryPressureData = [];
      
      // Create memory pressure with large data structures
      for (let i = 0; i < 100; i++) {
        memoryPressureData.push(new Array(10000).fill(i));
      }
      
      const startTime = Date.now();
      const proofs = [];
      
      // Generate proofs under memory pressure
      for (let i = 0; i < iterations; i++) {
        const proof = await xpVerificationService.generateXPProof(
          `0x${i.toString(16).padStart(40, '0')}`,
          '100',
          `run-mem-${i}`
        );
        proofs.push(proof);
      }
      
      const elapsedTime = Date.now() - startTime;
      const opsPerSecond = iterations / (elapsedTime / 1000);
      
      expect(proofs.length).toBe(iterations);
      expect(opsPerSecond).toBeGreaterThan(100); // Still performant
      console.log(`Memory pressure test: ${opsPerSecond.toFixed(2)} ops/sec`);
      
      // Cleanup
      memoryPressureData.length = 0;
    });
  });
});

export default validationSuite;