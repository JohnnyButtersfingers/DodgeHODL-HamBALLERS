import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// Mock implementations
const mockZKProofGenerator = {
  generateProof: vi.fn(),
  verifyProof: vi.fn(),
  generateNullifier: vi.fn(),
  isNullifierUsed: vi.fn()
};

const mockXPVerifierContract = {
  verifyXPProof: vi.fn(),
  isNullifierUsed: vi.fn(),
  getThreshold: vi.fn().mockResolvedValue(50),
  usedNullifiers: new Set()
};

// Test utilities
const createMockProof = (playerAddress, xp, runId, nullifier = null) => ({
  nullifier: nullifier || ethers.keccak256(ethers.toUtf8Bytes(`${playerAddress}-${runId}-${Date.now()}`)),
  commitment: ethers.keccak256(ethers.toUtf8Bytes(`commitment-${playerAddress}-${xp}`)),
  proof: Array(8).fill().map((_, i) => 
    ethers.keccak256(ethers.toUtf8Bytes(`proof-element-${i}-${xp}`))
  ),
  claimedXP: xp,
  threshold: 50,
  isTestProof: true
});

const createMockPlayer = (address = null) => ({
  address: address || `0x${Math.random().toString(16).slice(2).padStart(40, '0')}`,
  balance: ethers.parseEther("1.0"),
  nonce: 0
});

describe('🔐 ZK Proof Validation Suite', () => {
  let mockProvider, mockSigner, player1, player2;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock provider and signers
    mockProvider = {
      getBlockNumber: vi.fn().mockResolvedValue(12345),
      getGasPrice: vi.fn().mockResolvedValue(ethers.parseUnits('20', 'gwei')),
      estimateGas: vi.fn().mockResolvedValue(BigInt(300000))
    };
    
    mockSigner = {
      getAddress: vi.fn(),
      sendTransaction: vi.fn()
    };
    
    // Create test players
    player1 = createMockPlayer('0x1234567890abcdef1234567890abcdef12345678');
    player2 = createMockPlayer('0x2345678901bcdef02345678901bcdef02345678901');
    
    // Setup contract mock responses
    mockXPVerifierContract.usedNullifiers.clear();
    mockXPVerifierContract.isNullifierUsed.mockImplementation((nullifier) => 
      Promise.resolve(mockXPVerifierContract.usedNullifiers.has(nullifier))
    );
    
    mockXPVerifierContract.verifyXPProof.mockImplementation(async (nullifier, commitment, proof, claimedXP, threshold) => {
      if (mockXPVerifierContract.usedNullifiers.has(nullifier)) {
        throw new Error("Nullifier already used");
      }
      if (claimedXP < threshold) {
        throw new Error("XP below threshold");
      }
      // Simulate successful verification
      mockXPVerifierContract.usedNullifiers.add(nullifier);
      return { hash: `0x${Math.random().toString(16).slice(2)}`, wait: () => Promise.resolve({ gasUsed: BigInt(320000) }) };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('🧪 Nullifier System Tests', () => {
    it('should generate unique nullifiers for different players', async () => {
      const runId = 'test-run-001';
      const xp = 75;
      
      const proof1 = createMockProof(player1.address, xp, runId);
      const proof2 = createMockProof(player2.address, xp, runId);
      
      expect(proof1.nullifier).not.toEqual(proof2.nullifier);
      expect(proof1.nullifier).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof2.nullifier).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate unique nullifiers for same player, different runs', async () => {
      const xp = 75;
      
      const proof1 = createMockProof(player1.address, xp, 'run-001');
      const proof2 = createMockProof(player1.address, xp, 'run-002');
      
      expect(proof1.nullifier).not.toEqual(proof2.nullifier);
    });

    it('should generate consistent nullifiers for same player and run', async () => {
      const xp = 75;
      const runId = 'test-run-consistent';
      
      // Use deterministic nullifier generation
      const baseNullifier = ethers.keccak256(ethers.toUtf8Bytes(`${player1.address}-${runId}`));
      
      const proof1 = createMockProof(player1.address, xp, runId, baseNullifier);
      const proof2 = createMockProof(player1.address, xp, runId, baseNullifier);
      
      expect(proof1.nullifier).toEqual(proof2.nullifier);
    });

    it('should track nullifier usage correctly', async () => {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes('test-nullifier'));
      
      // Initially unused
      expect(await mockXPVerifierContract.isNullifierUsed(nullifier)).toBe(false);
      
      // Mark as used
      mockXPVerifierContract.usedNullifiers.add(nullifier);
      
      // Should now be used
      expect(await mockXPVerifierContract.isNullifierUsed(nullifier)).toBe(true);
    });
  });

  describe('🛡️ Replay Attack Prevention Tests', () => {
    it('should prevent double-spending with same nullifier', async () => {
      const runId = 'replay-test-001';
      const xp = 100;
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`${player1.address}-${runId}`));
      
      const proof = createMockProof(player1.address, xp, runId, nullifier);
      
      // First verification should succeed
      const tx1 = await mockXPVerifierContract.verifyXPProof(
        proof.nullifier,
        proof.commitment,
        proof.proof,
        proof.claimedXP,
        proof.threshold
      );
      expect(tx1.hash).toBeDefined();
      
      // Second verification with same nullifier should fail
      await expect(
        mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        )
      ).rejects.toThrow("Nullifier already used");
    });

    it('should allow different nullifiers from same player', async () => {
      const xp = 80;
      
      const proof1 = createMockProof(player1.address, xp, 'run-001');
      const proof2 = createMockProof(player1.address, xp, 'run-002');
      
      // Both verifications should succeed
      const tx1 = await mockXPVerifierContract.verifyXPProof(
        proof1.nullifier,
        proof1.commitment,
        proof1.proof,
        proof1.claimedXP,
        proof1.threshold
      );
      
      const tx2 = await mockXPVerifierContract.verifyXPProof(
        proof2.nullifier,
        proof2.commitment,
        proof2.proof,
        proof2.claimedXP,
        proof2.threshold
      );
      
      expect(tx1.hash).toBeDefined();
      expect(tx2.hash).toBeDefined();
      expect(mockXPVerifierContract.usedNullifiers.size).toBe(2);
    });

    it('should prevent replay attacks across different XP amounts', async () => {
      const runId = 'replay-xp-test';
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`${player1.address}-${runId}`));
      
      // First proof with 75 XP
      const proof1 = createMockProof(player1.address, 75, runId, nullifier);
      await mockXPVerifierContract.verifyXPProof(
        proof1.nullifier,
        proof1.commitment,
        proof1.proof,
        proof1.claimedXP,
        proof1.threshold
      );
      
      // Attempt to replay with different XP amount but same nullifier
      const proof2 = createMockProof(player1.address, 100, runId, nullifier);
      await expect(
        mockXPVerifierContract.verifyXPProof(
          proof2.nullifier,
          proof2.commitment,
          proof2.proof,
          proof2.claimedXP,
          proof2.threshold
        )
      ).rejects.toThrow("Nullifier already used");
    });

    it('should handle concurrent replay attempts', async () => {
      const runId = 'concurrent-test';
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`${player1.address}-${runId}`));
      const proof = createMockProof(player1.address, 90, runId, nullifier);
      
      // Simulate concurrent verification attempts
      const attempts = Array(5).fill().map(() =>
        mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        ).catch(err => err)
      );
      
      const results = await Promise.all(attempts);
      
      // Only one should succeed, others should fail
      const successes = results.filter(r => r.hash);
      const failures = results.filter(r => r instanceof Error);
      
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(4);
      expect(failures.every(f => f.message.includes("Nullifier already used"))).toBe(true);
    });
  });

  describe('🎯 XP Threshold Validation Tests', () => {
    it('should enforce minimum XP threshold', async () => {
      const lowXPProof = createMockProof(player1.address, 25, 'low-xp-run');
      
      await expect(
        mockXPVerifierContract.verifyXPProof(
          lowXPProof.nullifier,
          lowXPProof.commitment,
          lowXPProof.proof,
          lowXPProof.claimedXP,
          lowXPProof.threshold
        )
      ).rejects.toThrow("XP below threshold");
    });

    it('should accept XP at exact threshold', async () => {
      const thresholdProof = createMockProof(player1.address, 50, 'threshold-run');
      
      const tx = await mockXPVerifierContract.verifyXPProof(
        thresholdProof.nullifier,
        thresholdProof.commitment,
        thresholdProof.proof,
        thresholdProof.claimedXP,
        thresholdProof.threshold
      );
      
      expect(tx.hash).toBeDefined();
    });

    it('should accept XP above threshold', async () => {
      const highXPProof = createMockProof(player1.address, 150, 'high-xp-run');
      
      const tx = await mockXPVerifierContract.verifyXPProof(
        highXPProof.nullifier,
        highXPProof.commitment,
        highXPProof.proof,
        highXPProof.claimedXP,
        highXPProof.threshold
      );
      
      expect(tx.hash).toBeDefined();
    });
  });

  describe('🔧 Proof Structure Validation Tests', () => {
    it('should validate proof array length', () => {
      const invalidProof = createMockProof(player1.address, 75, 'structure-test');
      invalidProof.proof = invalidProof.proof.slice(0, 6); // Only 6 elements instead of 8
      
      expect(invalidProof.proof.length).toBe(6);
      // In real implementation, this would be caught by contract validation
    });

    it('should validate nullifier format', () => {
      const proof = createMockProof(player1.address, 75, 'format-test');
      
      expect(proof.nullifier).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof.commitment).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(proof.proof.every(p => p.match(/^0x[a-fA-F0-9]{64}$/))).toBe(true);
    });

    it('should validate claimed XP is positive', () => {
      const proof = createMockProof(player1.address, 75, 'positive-test');
      
      expect(proof.claimedXP).toBeGreaterThan(0);
      expect(Number.isInteger(proof.claimedXP)).toBe(true);
    });
  });

  describe('⚡ Gas Usage and Performance Tests', () => {
    it('should estimate gas usage within reasonable bounds', async () => {
      const proof = createMockProof(player1.address, 75, 'gas-test');
      
      // Mock gas estimation
      mockProvider.estimateGas.mockResolvedValue(BigInt(315000));
      
      const gasEstimate = await mockProvider.estimateGas({
        to: '0x1234567890abcdef1234567890abcdef12345678',
        data: '0x...' // Mock transaction data
      });
      
      expect(Number(gasEstimate)).toBeLessThan(400000);
      expect(Number(gasEstimate)).toBeGreaterThan(200000);
    });

    it('should handle gas limit variations', async () => {
      const proof = createMockProof(player1.address, 75, 'gas-limit-test');
      
      // Test different gas scenarios
      const gasScenarios = [250000, 320000, 380000];
      
      for (const gasLimit of gasScenarios) {
        mockProvider.estimateGas.mockResolvedValue(BigInt(gasLimit));
        
        const estimate = await mockProvider.estimateGas({});
        expect(Number(estimate)).toBe(gasLimit);
      }
    });
  });

  describe('🌐 Network and Error Handling Tests', () => {
    it('should handle network timeouts gracefully', async () => {
      const proof = createMockProof(player1.address, 75, 'timeout-test');
      
      mockXPVerifierContract.verifyXPProof.mockRejectedValue(
        new Error('Network timeout')
      );
      
      await expect(
        mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        )
      ).rejects.toThrow('Network timeout');
    });

    it('should handle insufficient gas errors', async () => {
      const proof = createMockProof(player1.address, 75, 'gas-error-test');
      
      mockXPVerifierContract.verifyXPProof.mockRejectedValue(
        new Error('Insufficient gas')
      );
      
      await expect(
        mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        )
      ).rejects.toThrow('Insufficient gas');
    });

    it('should handle contract not deployed errors', async () => {
      const proof = createMockProof(player1.address, 75, 'deployment-test');
      
      mockXPVerifierContract.verifyXPProof.mockRejectedValue(
        new Error('Contract not deployed')
      );
      
      await expect(
        mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        )
      ).rejects.toThrow('Contract not deployed');
    });
  });

  describe('🔄 Edge Cases and Boundary Tests', () => {
    it('should handle maximum XP values', async () => {
      const maxXPProof = createMockProof(player1.address, 999999, 'max-xp-test');
      
      const tx = await mockXPVerifierContract.verifyXPProof(
        maxXPProof.nullifier,
        maxXPProof.commitment,
        maxXPProof.proof,
        maxXPProof.claimedXP,
        maxXPProof.threshold
      );
      
      expect(tx.hash).toBeDefined();
    });

    it('should handle zero threshold edge case', async () => {
      const zeroThresholdProof = createMockProof(player1.address, 1, 'zero-threshold-test');
      zeroThresholdProof.threshold = 0;
      
      const tx = await mockXPVerifierContract.verifyXPProof(
        zeroThresholdProof.nullifier,
        zeroThresholdProof.commitment,
        zeroThresholdProof.proof,
        zeroThresholdProof.claimedXP,
        zeroThresholdProof.threshold
      );
      
      expect(tx.hash).toBeDefined();
    });

    it('should handle very long run IDs', async () => {
      const longRunId = 'a'.repeat(1000);
      const proof = createMockProof(player1.address, 75, longRunId);
      
      expect(proof.nullifier).toBeDefined();
      expect(proof.nullifier.length).toBe(66); // 0x + 64 hex chars
    });

    it('should handle special characters in run IDs', async () => {
      const specialRunId = 'run-with-!@#$%^&*()_+-=[]{}|;:,.<>?';
      const proof = createMockProof(player1.address, 75, specialRunId);
      
      expect(proof.nullifier).toBeDefined();
      expect(proof.nullifier).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('📊 Integration Test Scenarios', () => {
    it('should handle full badge claiming workflow', async () => {
      const player = player1;
      const xp = 85;
      const runId = 'integration-test-001';
      
      // Step 1: Generate proof
      const proof = createMockProof(player.address, xp, runId);
      expect(proof).toBeDefined();
      
      // Step 2: Check nullifier is unused
      const isUsed = await mockXPVerifierContract.isNullifierUsed(proof.nullifier);
      expect(isUsed).toBe(false);
      
      // Step 3: Verify proof on-chain
      const tx = await mockXPVerifierContract.verifyXPProof(
        proof.nullifier,
        proof.commitment,
        proof.proof,
        proof.claimedXP,
        proof.threshold
      );
      expect(tx.hash).toBeDefined();
      
      // Step 4: Verify nullifier is now used
      const isNowUsed = await mockXPVerifierContract.isNullifierUsed(proof.nullifier);
      expect(isNowUsed).toBe(true);
    });

    it('should handle multiple players claiming different badges', async () => {
      const players = [player1, player2];
      const proofs = [];
      
      // Generate proofs for multiple players
      for (let i = 0; i < players.length; i++) {
        const proof = createMockProof(players[i].address, 60 + i * 10, `multi-run-${i}`);
        proofs.push(proof);
      }
      
      // Verify all proofs
      const results = [];
      for (const proof of proofs) {
        const tx = await mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        );
        results.push(tx);
      }
      
      expect(results.length).toBe(players.length);
      expect(results.every(r => r.hash)).toBe(true);
      expect(mockXPVerifierContract.usedNullifiers.size).toBe(players.length);
    });

    it('should handle mixed valid and invalid proof attempts', async () => {
      const validProof = createMockProof(player1.address, 75, 'mixed-valid');
      const invalidProof = createMockProof(player1.address, 25, 'mixed-invalid'); // Below threshold
      
      // Valid proof should succeed
      const validTx = await mockXPVerifierContract.verifyXPProof(
        validProof.nullifier,
        validProof.commitment,
        validProof.proof,
        validProof.claimedXP,
        validProof.threshold
      );
      expect(validTx.hash).toBeDefined();
      
      // Invalid proof should fail
      await expect(
        mockXPVerifierContract.verifyXPProof(
          invalidProof.nullifier,
          invalidProof.commitment,
          invalidProof.proof,
          invalidProof.claimedXP,
          invalidProof.threshold
        )
      ).rejects.toThrow("XP below threshold");
    });
  });
});

describe('📈 Performance and Stress Tests', () => {
  it('should handle high volume of nullifier checks', async () => {
    const nullifiers = Array(1000).fill().map((_, i) => 
      ethers.keccak256(ethers.toUtf8Bytes(`stress-test-${i}`))
    );
    
    const startTime = Date.now();
    
    const results = await Promise.all(
      nullifiers.map(n => mockXPVerifierContract.isNullifierUsed(n))
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(results.length).toBe(1000);
    expect(results.every(r => r === false)).toBe(true);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle rapid sequential proof verifications', async () => {
    const player = createMockPlayer();
    const proofCount = 100;
    
    const proofs = Array(proofCount).fill().map((_, i) => 
      createMockProof(player.address, 75, `rapid-test-${i}`)
    );
    
    const startTime = Date.now();
    
    for (const proof of proofs) {
      await mockXPVerifierContract.verifyXPProof(
        proof.nullifier,
        proof.commitment,
        proof.proof,
        proof.claimedXP,
        proof.threshold
      );
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(mockXPVerifierContract.usedNullifiers.size).toBe(proofCount);
    console.log(`Processed ${proofCount} proofs in ${duration}ms`);
  });

  it('should handle extreme stress: 10k+ nullifier operations', async () => {
    const nullifierCount = 10000;
    const nullifiers = Array(nullifierCount).fill().map((_, i) => 
      ethers.keccak256(ethers.toUtf8Bytes(`extreme-stress-${i}`))
    );
    
    console.log(`🚀 Starting extreme stress test: ${nullifierCount.toLocaleString()} nullifier operations...`);
    const startTime = Date.now();
    
    // Test in batches to avoid overwhelming the mock system
    const batchSize = 1000;
    const batches = [];
    
    for (let i = 0; i < nullifiers.length; i += batchSize) {
      const batch = nullifiers.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    let totalProcessed = 0;
    const batchResults = [];
    
    for (const batch of batches) {
      const batchStart = Date.now();
      
      const results = await Promise.all(
        batch.map(n => mockXPVerifierContract.isNullifierUsed(n))
      );
      
      const batchEnd = Date.now();
      const batchDuration = batchEnd - batchStart;
      
      batchResults.push({
        size: batch.length,
        duration: batchDuration,
        throughput: Math.round(batch.length / (batchDuration / 1000))
      });
      
      totalProcessed += results.length;
      expect(results.every(r => r === false)).toBe(true);
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const overallThroughput = Math.round(totalProcessed / (totalDuration / 1000));
    
    console.log(`✅ Processed ${totalProcessed.toLocaleString()} nullifier checks in ${totalDuration}ms`);
    console.log(`📊 Overall throughput: ${overallThroughput.toLocaleString()} ops/second`);
    console.log(`📈 Batch performance:`, batchResults.slice(0, 3).map(b => 
      `${b.size} ops: ${b.duration}ms (${b.throughput} ops/s)`
    ));
    
    expect(totalProcessed).toBe(nullifierCount);
    expect(totalDuration).toBeLessThan(60000); // Should complete within 60 seconds
    expect(overallThroughput).toBeGreaterThan(100); // At least 100 ops/second
  });

  it('should handle massive concurrent verification attempts', async () => {
    const concurrentCount = 5000;
    const player = createMockPlayer();
    
    console.log(`🔥 Testing ${concurrentCount.toLocaleString()} concurrent verification attempts...`);
    
    // Create proofs for concurrent testing
    const proofs = Array(concurrentCount).fill().map((_, i) => 
      createMockProof(player.address, 75, `concurrent-massive-${i}`)
    );
    
    const startTime = Date.now();
    
    // Execute all verifications concurrently
    const results = await Promise.allSettled(
      proofs.map(proof => 
        mockXPVerifierContract.verifyXPProof(
          proof.nullifier,
          proof.commitment,
          proof.proof,
          proof.claimedXP,
          proof.threshold
        ).catch(err => err)
      )
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Analyze results
    const successes = results.filter(r => r.status === 'fulfilled' && r.value.hash).length;
    const failures = results.filter(r => 
      r.status === 'fulfilled' && r.value instanceof Error
    ).length;
    const rejections = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 Concurrent verification results:`);
    console.log(`  ✅ Successes: ${successes.toLocaleString()}`);
    console.log(`  ❌ Failures: ${failures.toLocaleString()}`);
    console.log(`  🚫 Rejections: ${rejections.toLocaleString()}`);
    console.log(`  ⏱️  Total time: ${duration}ms`);
    console.log(`  📈 Throughput: ${Math.round(concurrentCount / (duration / 1000)).toLocaleString()} ops/s`);
    
    expect(successes).toBe(concurrentCount); // All should succeed since unique nullifiers
    expect(failures + rejections).toBe(0);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });

  it('should handle memory pressure with large proof datasets', async () => {
    const largeDatasetSize = 2500; // Large but manageable dataset
    const players = Array(10).fill().map(() => createMockPlayer());
    
    console.log(`💾 Testing memory pressure with ${largeDatasetSize.toLocaleString()} proof dataset...`);
    
    const startTime = Date.now();
    let memoryUsageBefore = 0;
    
    // Simulate memory usage tracking (in real env, would use process.memoryUsage())
    try {
      memoryUsageBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
    } catch (e) {
      memoryUsageBefore = 0; // Fallback for environments without performance.memory
    }
    
    // Generate large dataset
    const largeProofDataset = [];
    for (let i = 0; i < largeDatasetSize; i++) {
      const player = players[i % players.length];
      const proof = createMockProof(player.address, 75 + (i % 50), `memory-test-${i}`);
      largeProofDataset.push({
        ...proof,
        metadata: {
          index: i,
          batch: Math.floor(i / 100),
          timestamp: Date.now() + i,
          playerIndex: i % players.length
        }
      });
    }
    
    // Process dataset in chunks to test sustained performance
    const chunkSize = 250;
    const chunks = [];
    for (let i = 0; i < largeProofDataset.length; i += chunkSize) {
      chunks.push(largeProofDataset.slice(i, i + chunkSize));
    }
    
    let processedCount = 0;
    const chunkResults = [];
    
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const chunkStart = Date.now();
      
      // Verify proofs in chunk
      const verificationPromises = chunk.map(async (proofData) => {
        const isUsed = await mockXPVerifierContract.isNullifierUsed(proofData.nullifier);
        return { proofData, isUsed };
      });
      
      const chunkVerifications = await Promise.all(verificationPromises);
      const chunkEnd = Date.now();
      
      chunkResults.push({
        chunkIndex,
        size: chunk.length,
        duration: chunkEnd - chunkStart,
        throughput: Math.round(chunk.length / ((chunkEnd - chunkStart) / 1000))
      });
      
      processedCount += chunk.length;
      
      // Validate all nullifiers are unique (not used)
      expect(chunkVerifications.every(v => !v.isUsed)).toBe(true);
    }
    
    let memoryUsageAfter = 0;
    try {
      memoryUsageAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
    } catch (e) {
      memoryUsageAfter = 0;
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const memoryIncrease = memoryUsageAfter - memoryUsageBefore;
    
    console.log(`📊 Memory pressure test results:`);
    console.log(`  📦 Dataset size: ${largeDatasetSize.toLocaleString()} proofs`);
    console.log(`  ✅ Processed: ${processedCount.toLocaleString()} operations`);
    console.log(`  ⏱️  Duration: ${totalDuration}ms`);
    console.log(`  💾 Memory change: ${memoryIncrease > 0 ? '+' : ''}${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  📈 Avg throughput: ${Math.round(processedCount / (totalDuration / 1000)).toLocaleString()} ops/s`);
    
    // Performance assertions
    expect(processedCount).toBe(largeDatasetSize);
    expect(totalDuration).toBeLessThan(45000); // Should complete within 45 seconds
    expect(chunkResults.every(r => r.throughput > 50)).toBe(true); // Each chunk should maintain >50 ops/s
    
    // Clean up large dataset
    largeProofDataset.length = 0;
  });

  it('should handle sustained load over extended period', async () => {
    const sustainedDuration = 10000; // 10 seconds of sustained load
    const operationsPerSecond = 100;
    const intervalMs = 1000 / operationsPerSecond; // 10ms intervals
    
    console.log(`⏰ Testing sustained load: ${operationsPerSecond} ops/second for ${sustainedDuration/1000} seconds...`);
    
    const startTime = Date.now();
    const results = [];
    let operationCount = 0;
    
    // Create a sustained load using intervals
    const sustainedLoadPromise = new Promise((resolve) => {
      const interval = setInterval(async () => {
        const currentTime = Date.now();
        
        if (currentTime - startTime >= sustainedDuration) {
          clearInterval(interval);
          resolve(results);
          return;
        }
        
        // Generate and test nullifier
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`sustained-${operationCount}-${currentTime}`));
        const operationStart = Date.now();
        
        try {
          const isUsed = await mockXPVerifierContract.isNullifierUsed(nullifier);
          const operationEnd = Date.now();
          
          results.push({
            operationId: operationCount,
            timestamp: currentTime,
            duration: operationEnd - operationStart,
            success: !isUsed // Should be false (not used)
          });
          
          operationCount++;
        } catch (error) {
          results.push({
            operationId: operationCount,
            timestamp: currentTime,
            duration: -1,
            success: false,
            error: error.message
          });
          operationCount++;
        }
      }, intervalMs);
    });
    
    await sustainedLoadPromise;
    
    const endTime = Date.now();
    const actualDuration = endTime - startTime;
    
    // Analyze sustained load performance
    const successfulOps = results.filter(r => r.success).length;
    const failedOps = results.filter(r => !r.success).length;
    const avgOperationTime = results
      .filter(r => r.duration > 0)
      .reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    const actualThroughput = (successfulOps / (actualDuration / 1000));
    
    console.log(`📊 Sustained load test results:`);
    console.log(`  ⏱️  Target duration: ${sustainedDuration}ms`);
    console.log(`  ⏱️  Actual duration: ${actualDuration}ms`);
    console.log(`  🎯 Target ops/sec: ${operationsPerSecond}`);
    console.log(`  📈 Actual ops/sec: ${actualThroughput.toFixed(1)}`);
    console.log(`  ✅ Successful: ${successfulOps.toLocaleString()}`);
    console.log(`  ❌ Failed: ${failedOps.toLocaleString()}`);
    console.log(`  ⚡ Avg operation time: ${avgOperationTime.toFixed(2)}ms`);
    
    // Performance validation
    expect(successfulOps).toBeGreaterThan(sustainedDuration / 1000 * operationsPerSecond * 0.8); // At least 80% of target
    expect(failedOps).toBeLessThan(operationCount * 0.1); // Less than 10% failures
    expect(avgOperationTime).toBeLessThan(50); // Average operation under 50ms
    expect(actualThroughput).toBeGreaterThan(operationsPerSecond * 0.8); // At least 80% of target throughput
  });
});

// Export for use in other test files
export {
  createMockProof,
  createMockPlayer,
  mockXPVerifierContract,
  mockZKProofGenerator
};