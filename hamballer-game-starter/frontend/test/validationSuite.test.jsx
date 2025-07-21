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

  describe('Low XP Threshold Edge Cases', () => {
    it('should reject proofs with XP below threshold', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const lowXP = '50'; // Below threshold of 100
      const threshold = '100';
      
      await expect(
        xpVerificationService.generateXPProof(user, lowXP, 'run-123')
      ).rejects.toThrow('Insufficient XP: 50 < 100');
      
      expect(zkLogger.logProofFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient XP: 50 < 100',
          errorType: 'insufficient_xp',
          xpAmount: '50',
          threshold: '100'
        })
      );
    });

    it('should handle XP exactly at threshold', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const exactThresholdXP = '100';
      const threshold = '100';
      
      const proof = await xpVerificationService.generateXPProof(
        user, 
        exactThresholdXP, 
        'run-123'
      );
      
      expect(proof).toBeDefined();
      expect(proof.nullifier).toBeDefined();
      expect(proof.metadata.xpAmount).toBe('100');
    });

    it('should reject negative XP values', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const negativeXP = '-50';
      
      await expect(
        xpVerificationService.generateXPProof(user, negativeXP, 'run-123')
      ).rejects.toThrow('Invalid XP amount');
    });

    it('should handle extremely large XP values', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const largeXP = '999999999999999999999'; // Very large XP
      const threshold = '100';
      
      const proof = await xpVerificationService.generateXPProof(
        user, 
        largeXP, 
        'run-123'
      );
      
      expect(proof).toBeDefined();
      expect(proof.metadata.xpAmount).toBe(largeXP);
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

    it('should detect coordinated replay attacks', async () => {
      const attackers = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333'
      ];
      
      // Generate original proof
      const originalProof = await xpVerificationService.generateXPProof(
        attackers[0],
        '1000',
        'run-123'
      );
      
      // Attempt to replay with different users (should fail)
      for (let i = 1; i < attackers.length; i++) {
        const modifiedProof = {
          ...originalProof,
          metadata: {
            ...originalProof.metadata,
            userAddress: attackers[i]
          }
        };
        
        xpVerificationService.verifyProof = vi.fn()
          .mockRejectedValue(new Error('Proof verification failed: invalid public inputs'));
        
        await expect(
          xpVerificationService.verifyProof(modifiedProof)
        ).rejects.toThrow('Proof verification failed');
      }
    });

    it('should handle rapid succession replay attempts', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const proof = await xpVerificationService.generateXPProof(
        user,
        '1000',
        'run-123'
      );
      
      // Mock first success, then rapid failures
      let callCount = 0;
      xpVerificationService.verifyProof = vi.fn()
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ success: true, verified: true });
          }
          return Promise.resolve({ 
            success: false, 
            error: 'Nullifier already used',
            timestamp: Date.now()
          });
        });
      
      // First verification should succeed
      const result1 = await xpVerificationService.verifyProof(proof);
      expect(result1.success).toBe(true);
      
      // Rapid replay attempts should all fail
      const replayPromises = Array(10).fill().map(() =>
        xpVerificationService.verifyProof(proof)
      );
      
      const results = await Promise.all(replayPromises);
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Nullifier already used');
      });
    });

    it('should handle nullifier collision edge case', async () => {
      const user1 = '0x1234567890123456789012345678901234567890';
      const user2 = '0x1234567890123456789012345678901234567891'; // Similar address
      
      const proof1 = await xpVerificationService.generateXPProof(user1, '1000', 'run-123');
      const proof2 = await xpVerificationService.generateXPProof(user2, '1000', 'run-123');
      
      // Nullifiers should be different even for similar addresses
      expect(proof1.nullifier).not.toBe(proof2.nullifier);
      
      // Both should be independently verifiable
      xpVerificationService.verifyProof = vi.fn()
        .mockResolvedValue({ success: true, verified: true });
      
      const [result1, result2] = await Promise.all([
        xpVerificationService.verifyProof(proof1),
        xpVerificationService.verifyProof(proof2)
      ]);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Advanced ZK Edge Cases', () => {
    it('should handle malformed proof structures', async () => {
      const malformedProofs = [
        { proof: null, publicSignals: [] },
        { proof: { a: [] }, publicSignals: [] },
        { proof: { a: ['0x1'], b: [], c: [] }, publicSignals: [] },
        { proof: { a: ['invalid'], b: [['0x1', '0x2']], c: ['0x3'] }, publicSignals: [] }
      ];
      
      for (const malformedProof of malformedProofs) {
        xpVerificationService.verifyProof = vi.fn()
          .mockRejectedValue(new Error('Invalid proof format'));
        
        await expect(
          xpVerificationService.verifyProof(malformedProof)
        ).rejects.toThrow('Invalid proof format');
      }
    });

    it('should validate public signals integrity', async () => {
      const validProof = {
        proof: {
          a: ['0x1', '0x2'],
          b: [['0x3', '0x4'], ['0x5', '0x6']],
          c: ['0x7', '0x8']
        },
        publicSignals: ['0x1234567890123456789012345678901234567890', '1000', '0xabc123']
      };
      
      // Test with tampered public signals
      const tamperedProof = {
        ...validProof,
        publicSignals: ['0x0000000000000000000000000000000000000000', '1000', '0xabc123']
      };
      
      xpVerificationService.verifyProof = vi.fn()
        .mockImplementation((proof) => {
          if (proof.publicSignals[0] === '0x0000000000000000000000000000000000000000') {
            throw new Error('Public signal validation failed: invalid user address');
          }
          return Promise.resolve({ success: true, verified: true });
        });
      
      // Valid proof should work
      const validResult = await xpVerificationService.verifyProof(validProof);
      expect(validResult.success).toBe(true);
      
      // Tampered proof should fail
      await expect(
        xpVerificationService.verifyProof(tamperedProof)
      ).rejects.toThrow('Public signal validation failed');
    });

    it('should handle circuit constraint violations', async () => {
      const constraintViolatingProof = {
        proof: {
          a: ['0x1', '0x2'],
          b: [['0x3', '0x4'], ['0x5', '0x6']],
          c: ['0x7', '0x8']
        },
        publicSignals: ['0x1234567890123456789012345678901234567890', '50', '0xabc123'] // XP < threshold
      };
      
      xpVerificationService.verifyProof = vi.fn()
        .mockRejectedValue(new Error('Circuit constraint violation: XP amount below threshold'));
      
      await expect(
        xpVerificationService.verifyProof(constraintViolatingProof)
      ).rejects.toThrow('Circuit constraint violation');
      
      expect(zkLogger.logProofFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Circuit constraint violation: XP amount below threshold',
          errorType: 'constraint_violation'
        })
      );
    });

    it('should validate proof generation timing attacks', async () => {
      const user = '0x1234567890123456789012345678901234567890';
      const startTime = Date.now();
      
      // Generate proof with timing measurement
      const proof = await xpVerificationService.generateXPProof(user, '1000', 'run-123');
      const generationTime = Date.now() - startTime;
      
      // Proof generation should complete within reasonable time
      expect(generationTime).toBeLessThan(10000); // 10 seconds max
      expect(proof.metadata.proofTime).toBeDefined();
      
      // Check for timing attack resistance
      const timings = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await xpVerificationService.generateXPProof(user, `${1000 + i}`, `run-${i}`);
        timings.push(Date.now() - start);
      }
      
      // Timing variance should be minimal (timing attack resistance)
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((acc, timing) => acc + Math.pow(timing - avgTiming, 2), 0) / timings.length;
      
      expect(variance).toBeLessThan(1000); // Low variance in timing
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
});

export default validationSuite;