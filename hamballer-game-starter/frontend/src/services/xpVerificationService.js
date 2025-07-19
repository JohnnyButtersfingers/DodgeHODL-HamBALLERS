import { apiFetch } from './useApiService';
import proofCacheService from './proofCacheService';

class XPVerificationService {
  constructor() {
    this.verificationQueue = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 2000;
  }

  /**
   * Generate ZK proof for XP claim with caching
   * @param {string} playerAddress - Player's wallet address
   * @param {number} xpClaimed - Amount of XP being claimed
   * @param {string} runId - ID of the run that earned the XP
   * @returns {Promise<Object>} Verification data including proof
   */
  async generateXPProof(playerAddress, xpClaimed, runId) {
    if (!playerAddress || !xpClaimed || !runId) {
      throw new Error('Missing required parameters for XP proof generation');
    }

    // Check cache first
    const cachedProof = proofCacheService.getCachedProof(playerAddress, xpClaimed, runId);
    if (cachedProof) {
      console.log('🎯 Using cached proof for faster retry');
      proofCacheService.updateAttemptCount(playerAddress, xpClaimed, runId);
      return cachedProof;
    }

    const verificationKey = `${playerAddress}-${runId}-${xpClaimed}`;
    
    // Check if already in queue
    if (this.verificationQueue.has(verificationKey)) {
      console.log('XP proof generation already in progress for this claim');
      return this.verificationQueue.get(verificationKey);
    }

    const proofPromise = this._generateProofWithRetry(playerAddress, xpClaimed, runId);
    this.verificationQueue.set(verificationKey, proofPromise);

    try {
      const result = await proofPromise;
      
      // Cache the generated proof
      proofCacheService.cacheProof(playerAddress, xpClaimed, runId, result);
      
      return result;
    } finally {
      this.verificationQueue.delete(verificationKey);
    }
  }

  /**
   * Generate proof with retry logic
   * @private
   */
  async _generateProofWithRetry(playerAddress, xpClaimed, runId, attempt = 1) {
    try {
      console.log(`🔄 Generating XP proof (attempt ${attempt}/${this.retryAttempts})`);
      
      const response = await apiFetch('/api/xp/generate-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          xpClaimed,
          runId,
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const verificationData = await response.json();
      
      // Validate proof structure
      if (!this._validateProofData(verificationData)) {
        throw new Error('Invalid proof data received from server');
      }

      console.log('✅ XP proof generated successfully');
      return verificationData;
      
    } catch (error) {
      console.error(`❌ XP proof generation failed (attempt ${attempt}):`, error.message);
      
      if (attempt < this.retryAttempts) {
        console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this._generateProofWithRetry(playerAddress, xpClaimed, runId, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Validate proof data structure
   * @private
   */
  _validateProofData(data) {
    return (
      data &&
      typeof data.nullifier === 'string' &&
      typeof data.commitment === 'string' &&
      Array.isArray(data.proof) &&
      data.proof.length === 8 &&
      typeof data.claimedXP === 'number' &&
      typeof data.threshold === 'number'
    );
  }

  /**
   * Check if nullifier has been used
   * @param {Object} contracts - Contract instances
   * @param {string} nullifier - The nullifier to check
   * @returns {Promise<boolean>} Whether nullifier is used
   */
  async isNullifierUsed(contracts, nullifier) {
    if (!contracts?.xpVerifier || !nullifier) {
      return false;
    }

    try {
      const isUsed = await contracts.xpVerifier.read.isNullifierUsed([nullifier]);
      return isUsed;
    } catch (error) {
      console.error('Error checking nullifier:', error);
      return false;
    }
  }

  /**
   * Submit XP proof to contract
   * @param {Object} contracts - Contract instances
   * @param {Object} proofData - The proof data
   * @returns {Promise<string>} Transaction hash
   */
  async submitXPProof(contracts, proofData) {
    if (!contracts?.xpVerifier) {
      throw new Error('XP Verifier contract not available');
    }

    if (!this._validateProofData(proofData)) {
      throw new Error('Invalid proof data provided');
    }

    try {
      // Check if nullifier is already used
      const isUsed = await this.isNullifierUsed(contracts, proofData.nullifier);
      if (isUsed) {
        throw new Error('This XP claim has already been verified');
      }

      console.log('📤 Submitting XP proof to contract...');
      
      const tx = await contracts.xpVerifier.write.verifyXPProof([
        proofData.nullifier,
        proofData.commitment,
        proofData.proof,
        proofData.claimedXP,
        proofData.threshold
      ]);

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      console.log('✅ XP proof verified on-chain:', receipt.transactionHash);
      return receipt.transactionHash;
      
    } catch (error) {
      console.error('❌ XP proof submission failed:', error);
      throw error;
    }
  }

  /**
   * Get verification result for a player and nullifier
   * @param {Object} contracts - Contract instances
   * @param {string} playerAddress - Player's address
   * @param {string} nullifier - The nullifier
   * @returns {Promise<Object>} Verification result
   */
  async getVerificationResult(contracts, playerAddress, nullifier) {
    if (!contracts?.xpVerifier || !playerAddress || !nullifier) {
      return null;
    }

    try {
      const result = await contracts.xpVerifier.read.getVerificationResult([
        playerAddress,
        nullifier
      ]);
      
      return {
        verified: result[0],
        timestamp: result[1]?.toString()
      };
    } catch (error) {
      console.error('Error getting verification result:', error);
      return null;
    }
  }

  /**
   * Get current XP threshold from contract
   * @param {Object} contracts - Contract instances
   * @returns {Promise<number>} Current threshold
   */
  async getXPThreshold(contracts) {
    if (!contracts?.xpVerifier) {
      return 0;
    }

    try {
      const threshold = await contracts.xpVerifier.read.getThreshold();
      return parseInt(threshold.toString());
    } catch (error) {
      console.error('Error getting XP threshold:', error);
      return 0;
    }
  }

  /**
   * Clear verification queue and proof cache
   */
  clearCache() {
    this.verificationQueue.clear();
    proofCacheService.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      queueSize: this.verificationQueue.size,
      cacheStats: proofCacheService.getStats()
    };
  }
}

// Export singleton instance
export const xpVerificationService = new XPVerificationService();
export default xpVerificationService;