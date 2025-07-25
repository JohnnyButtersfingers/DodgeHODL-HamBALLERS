const { ethers } = require('ethers');
const { db } = require('./config/database');
const { xpVerifierService } = require('./services/xpVerifierService');
const { achievementsService } = require('./services/achievementsService');

// Import Thirdweb service
let thirdwebService;
try {
  thirdwebService = require('./services/thirdwebService');
} catch (error) {
  console.warn('⚠️ Thirdweb service not available for retry queue:', error.message);
  thirdwebService = null;
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 15000, // 15 seconds (matches frontend polling cadence)
  maxDelay: 300000, // 5 minutes
  backoffMultiplier: 2,
  jitterRange: 0.1 // ±10% random jitter
};

// XPBadge contract ABI
const XPBADGE_ABI = [
  'function mintBadge(address player, uint256 tokenId, uint256 xp, uint256 season) external',
  'function getCurrentSeason() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xp, uint256 season)'
];

class RetryQueue {
  constructor() {
    this.queue = new Map(); // In-memory queue: attemptId -> attempt
    this.processing = false;
    this.provider = null;
    this.xpBadgeContract = null;
    this.signer = null;
    this.isInitialized = false;
    
    // Bind methods to preserve context
    this.processQueue = this.processQueue.bind(this);
    this.mintBadge = this.mintBadge.bind(this);
  }

  /**
   * Initialize the retry queue with blockchain connection
   */
  async initialize() {
    try {
      const rpcUrl = process.env.ABSTRACT_RPC_URL;
      const xpBadgeAddress = process.env.XPBADGE_ADDRESS;
      const privateKey = process.env.XPBADGE_MINTER_PRIVATE_KEY;

      if (!rpcUrl || !xpBadgeAddress || !privateKey) {
        console.warn('⚠️ RetryQueue: Missing blockchain configuration - limited functionality');
        return false;
      }

      // Initialize provider and signer
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.xpBadgeContract = new ethers.Contract(xpBadgeAddress, XPBADGE_ABI, this.signer);

      // Verify minting permissions
      const minterRole = await this.xpBadgeContract.MINTER_ROLE();
      const hasMinterRole = await this.xpBadgeContract.hasRole(minterRole, this.signer.address);
      
      if (!hasMinterRole) {
        console.error('❌ RetryQueue: Signer does not have MINTER_ROLE');
        return false;
      }

      this.isInitialized = true;
      console.log('✅ RetryQueue initialized');
      console.log(`🎫 XPBadge Contract: ${xpBadgeAddress}`);
      console.log(`🔑 Minter Address: ${this.signer.address}`);

      // Load pending attempts from database
      await this.loadPendingAttempts();
      
      // Start processing queue
      this.startProcessing();

      return true;
    } catch (error) {
      console.error('❌ RetryQueue initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Load pending badge claim attempts from Supabase on startup
   */
  async loadPendingAttempts() {
    if (!db) {
      console.warn('⚠️ RetryQueue: Database not available - cannot load pending attempts');
      return;
    }

    try {
      const { data: pendingAttempts, error } = await db
        .from('badge_claim_attempts')
        .select('*')
        .in('status', ['pending', 'failed'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      let loadedCount = 0;
      for (const attempt of pendingAttempts || []) {
        // Only load attempts that haven't exceeded max retries
        if (attempt.retry_count < RETRY_CONFIG.maxRetries) {
          this.queue.set(attempt.id, {
            id: attempt.id,
            playerAddress: attempt.player_address,
            runId: attempt.run_id,
            xpEarned: attempt.xp_earned,
            season: attempt.season,
            tokenId: attempt.token_id,
            retryCount: attempt.retry_count,
            lastRetryAt: attempt.last_retry_at ? new Date(attempt.last_retry_at) : null,
            createdAt: new Date(attempt.created_at)
          });
          loadedCount++;
        } else {
          // Mark as abandoned if max retries exceeded
          await this.markAttemptAbandoned(attempt.id, 'Max retries exceeded');
        }
      }

      console.log(`📋 RetryQueue: Loaded ${loadedCount} pending badge claim attempts`);
    } catch (error) {
      console.error('❌ RetryQueue: Failed to load pending attempts:', error.message);
    }
  }

  /**
   * Add a new badge claim attempt to the queue
   */
  async addAttempt(playerAddress, runId, xpEarned, season, options = {}) {
    try {
      const tokenId = this.calculateTokenId(xpEarned);
      const requiresZKProof = this.shouldRequireZKProof(xpEarned, tokenId);
      
      // Create attempt record in database
      const { data: attempt, error } = await db
        .from('badge_claim_attempts')
        .insert({
          player_address: playerAddress.toLowerCase(),
          run_id: runId,
          xp_earned: xpEarned,
          season: season,
          token_id: tokenId,
          status: requiresZKProof ? 'pending_verification' : 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Add to in-memory queue
      this.queue.set(attempt.id, {
        id: attempt.id,
        playerAddress: playerAddress.toLowerCase(),
        runId: runId,
        xpEarned: xpEarned,
        season: season,
        tokenId: tokenId,
        retryCount: 0,
        lastRetryAt: null,
        createdAt: new Date(attempt.created_at),
        requiresZKProof,
        zkProofData: options.zkProofData || null
      });

      console.log(`📋 RetryQueue: Added badge claim attempt for ${playerAddress}`);
      console.log(`   └─ Badge Metadata: ${xpEarned} XP → TokenId ${tokenId} (Season ${season})`);
      console.log(`   └─ ZK-Proof Required: ${requiresZKProof ? 'Yes' : 'No'}`);
      console.log(`   └─ Attempt ID: ${attempt.id}`);
      
      // Start processing if not already running
      if (!this.processing) {
        this.startProcessing();
      }

      return attempt.id;
    } catch (error) {
      console.error('❌ RetryQueue: Failed to add attempt:', error.message);
      return null;
    }
  }

  /**
   * Determine if ZK-proof verification is required for a badge claim
   */
  shouldRequireZKProof(xpEarned, tokenId) {
    // Require ZK-proof for high-value claims
    // Epic (75+ XP) and Legendary (100+ XP) badges require verification
    return xpEarned >= 75 || tokenId >= 3;
  }

  /**
   * Calculate badge token ID based on XP earned
   */
  calculateTokenId(xpEarned) {
    if (xpEarned >= 100) return 4; // Legendary Badge
    if (xpEarned >= 75) return 3;  // Epic Badge
    if (xpEarned >= 50) return 2;  // Rare Badge
    if (xpEarned >= 25) return 1;  // Common Badge
    return 0; // Participation Badge
  }

  /**
   * Start processing the queue with periodic retries
   */
  startProcessing() {
    if (this.processing) return;
    
    this.processing = true;
    console.log('🔄 RetryQueue: Starting queue processing');
    
    // Process immediately, then set up periodic processing
    this.processQueue();
    
    // Process queue every 30 seconds
    this.processingInterval = setInterval(this.processQueue, 30000);
  }

  /**
   * Stop processing the queue
   */
  stopProcessing() {
    this.processing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('🛑 RetryQueue: Stopped queue processing');
  }

  /**
   * Process all queued badge minting attempts
   */
  async processQueue() {
    if (!this.isInitialized || this.queue.size === 0) return;

    console.log(`🔄 RetryQueue: Processing ${this.queue.size} attempts`);

    const attempts = Array.from(this.queue.values());
    
    for (const attempt of attempts) {
      try {
        // Check if enough time has passed since last retry
        if (attempt.lastRetryAt) {
          const delay = this.calculateRetryDelay(attempt.retryCount);
          const nextRetryTime = new Date(attempt.lastRetryAt.getTime() + delay);
          
          if (new Date() < nextRetryTime) {
            continue; // Skip this attempt, not ready for retry yet
          }
        }

        // Check if ZK-proof verification is required and not yet completed
        if (attempt.requiresZKProof && !attempt.zkProofVerified) {
          if (!attempt.zkProofData) {
            console.warn(`⚠️ RetryQueue: ZK-proof required but not provided for ${attempt.playerAddress}`);
            await this.updateAttemptStatus(attempt.id, 'pending_verification', 'ZK-proof required for high-value claim');
            continue; // Skip this attempt until proof is provided
          }
          
          // Verify ZK-proof first
          const verificationResult = await this.verifyZKProof(attempt);
          if (!verificationResult.success) {
            console.warn(`⚠️ RetryQueue: ZK-proof verification failed for ${attempt.playerAddress}: ${verificationResult.error}`);
            await this.updateAttemptStatus(attempt.id, 'failed', `ZK-proof verification failed: ${verificationResult.error}`);
            continue;
          }
          
          // Mark as verified and continue to minting
          attempt.zkProofVerified = true;
          console.log(`✅ RetryQueue: ZK-proof verified for ${attempt.playerAddress}`);
        }

        // Update status to 'minting'
        await this.updateAttemptStatus(attempt.id, 'minting');
        
        // Attempt to mint the badge
        const result = await this.mintBadge(attempt);
        
        if (result.success) {
          // Success - update database and remove from queue
          await this.markAttemptCompleted(attempt.id, result.txHash);
          this.queue.delete(attempt.id);
          console.log(`✅ RetryQueue: Successfully minted badge for ${attempt.playerAddress}`);
          console.log(`   └─ Badge: ${attempt.xpEarned} XP → TokenId ${attempt.tokenId} (Season ${attempt.season})`);
          console.log(`   └─ Contract TX: ${result.txHash}`);
          console.log(`   └─ Block: ${result.blockNumber}, Gas: ${result.gasUsed}`);
          
          // Check for badge-related achievements after successful minting
          if (achievementsService.initialized) {
            try {
              await achievementsService.checkBadgeMintAchievements(attempt.playerAddress, {
                tokenId: attempt.tokenId,
                xpEarned: attempt.xpEarned,
                season: attempt.season,
                txHash: result.txHash
              });
            } catch (achievementError) {
              console.error('❌ Error checking badge achievements:', achievementError.message);
              // Don't fail the badge minting process due to achievement errors
            }
          }
        } else {
          // Failed - increment retry count and update status
          attempt.retryCount++;
          attempt.lastRetryAt = new Date();
          
          if (attempt.retryCount >= RETRY_CONFIG.maxRetries) {
            // Max retries exceeded - abandon attempt
            await this.markAttemptAbandoned(attempt.id, result.error);
            this.queue.delete(attempt.id);
            console.warn(`⚠️ RetryQueue: Abandoned badge mint for ${attempt.playerAddress} after ${RETRY_CONFIG.maxRetries} retries`);
            console.warn(`   └─ Badge: ${attempt.xpEarned} XP → TokenId ${attempt.tokenId} (Season ${attempt.season})`);
            console.warn(`   └─ Final Error: ${result.error}`);
          } else {
            // Mark for retry
            await this.markAttemptFailed(attempt.id, result.error, attempt.retryCount);
            const nextRetryDelay = Math.round(this.calculateRetryDelay(attempt.retryCount) / 1000);
            console.warn(`⚠️ RetryQueue: Badge mint failed for ${attempt.playerAddress}, retry ${attempt.retryCount}/${RETRY_CONFIG.maxRetries}`);
            console.warn(`   └─ Badge: ${attempt.xpEarned} XP → TokenId ${attempt.tokenId} (Season ${attempt.season})`);
            console.warn(`   └─ Error: ${result.error}`);
            console.warn(`   └─ Next retry in ~${nextRetryDelay}s`);
          }
        }

        // Small delay between attempts to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('❌ RetryQueue: Error processing attempt:', error.message);
      }
    }
  }

  /**
   * Verify ZK-proof for high-value badge claims
   */
  async verifyZKProof(attempt) {
    try {
      if (!xpVerifierService.initialized) {
        return {
          success: false,
          error: 'XPVerifier service not initialized'
        };
      }

      console.log(`🔍 RetryQueue: Verifying ZK-proof for ${attempt.playerAddress} (${attempt.xpEarned} XP)`);

      // Submit proof for verification
      const verificationResult = await xpVerifierService.submitProofClaim(
        attempt.playerAddress,
        attempt.zkProofData
      );

      if (verificationResult.success && verificationResult.verified) {
        console.log(`✅ RetryQueue: ZK-proof verified for ${attempt.playerAddress}`);
        return {
          success: true,
          txHash: verificationResult.txHash,
          claimId: verificationResult.claimId
        };
      } else {
        return {
          success: false,
          error: verificationResult.error || 'Proof verification failed'
        };
      }

    } catch (error) {
      console.error(`❌ RetryQueue: ZK-proof verification error for ${attempt.playerAddress}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mint XPBadge NFT for a player
   */
  async mintBadge(attempt) {
    try {
      console.log(`🎫 RetryQueue: Minting badge for ${attempt.playerAddress}`);
      console.log(`   └─ Badge: ${attempt.xpEarned} XP → TokenId ${attempt.tokenId} (Season ${attempt.season})`);
      console.log(`   └─ Attempt: ${attempt.retryCount + 1}/${RETRY_CONFIG.maxRetries + 1}`);

      // Use Thirdweb if available, otherwise fallback to ethers
      if (thirdwebService && thirdwebService.isInitialized()) {
        console.log('   Using Thirdweb service for minting...');
        
        const result = await thirdwebService.mintBadge(
          attempt.playerAddress, 
          attempt.tokenId, 
          attempt.xpEarned, 
          attempt.season
        );
        
        console.log(`✅ RetryQueue: Badge minted via Thirdweb: ${result.transactionHash}`);
        return {
          success: true,
          txHash: result.transactionHash,
          tokenId: result.tokenId
        };
      } else {
        console.log('   Using fallback ethers for minting...');
        
        // Fallback to ethers implementation
        if (!this.xpBadgeContract) {
          throw new Error('XPBadge contract not available');
        }

        // Check gas price and estimate gas
        const gasPrice = await this.provider.getFeeData();
        const gasEstimate = await this.xpBadgeContract.mintBadge.estimateGas(
          attempt.playerAddress,
          attempt.tokenId,
          attempt.xpEarned,
          attempt.season
        );

        // Execute the minting transaction
        const tx = await this.xpBadgeContract.mintBadge(
          attempt.playerAddress,
          attempt.tokenId,
          attempt.xpEarned,
          attempt.season,
          {
            gasLimit: gasEstimate + BigInt(50000), // Add buffer
            gasPrice: gasPrice.gasPrice
          }
        );

        console.log(`⏳ RetryQueue: Badge mint transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait(2); // Wait for 2 confirmations
        
        if (receipt.status === 1) {
          return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
          };
        } else {
          throw new Error('Transaction failed');
        }
      }

    } catch (error) {
      console.error(`❌ RetryQueue: Badge mint failed for ${attempt.playerAddress}:`, error.message);
      if (error.cause) {
        console.error('   Cause:', error.cause);
      }
      
      return {
        success: false,
        error: error.message,
        code: error.code,
        reason: error.reason
      };
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateRetryDelay(retryCount) {
    const baseDelay = RETRY_CONFIG.baseDelay;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
      RETRY_CONFIG.maxDelay
    );
    
    // Add random jitter to prevent thundering herd
    const jitter = exponentialDelay * RETRY_CONFIG.jitterRange * (Math.random() * 2 - 1);
    
    return Math.max(1000, exponentialDelay + jitter); // Minimum 1 second delay
  }

  /**
   * Update attempt status in database
   */
  async updateAttemptStatus(attemptId, status) {
    if (!db) return;

    try {
      const { error } = await db
        .from('badge_claim_attempts')
        .update({ 
          status: status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', attemptId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ RetryQueue: Failed to update attempt status:', error.message);
    }
  }

  /**
   * Mark attempt as completed
   */
  async markAttemptCompleted(attemptId, txHash) {
    if (!db) return;

    try {
      const { error } = await db
        .from('badge_claim_attempts')
        .update({
          status: 'completed',
          tx_hash: txHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ RetryQueue: Failed to mark attempt completed:', error.message);
    }
  }

  /**
   * Mark attempt as failed (for retry)
   */
  async markAttemptFailed(attemptId, errorMessage, retryCount) {
    if (!db) return;

    try {
      const { error } = await db
        .from('badge_claim_attempts')
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: retryCount,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ RetryQueue: Failed to mark attempt failed:', error.message);
    }
  }

  /**
   * Mark attempt as abandoned (max retries exceeded)
   */
  async markAttemptAbandoned(attemptId, errorMessage) {
    if (!db) return;

    try {
      const { error } = await db
        .from('badge_claim_attempts')
        .update({
          status: 'abandoned',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ RetryQueue: Failed to mark attempt abandoned:', error.message);
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const stats = {
      queueSize: this.queue.size,
      processing: this.processing,
      initialized: this.isInitialized
    };

    if (this.queue.size > 0) {
      const attempts = Array.from(this.queue.values());
      stats.retryDistribution = {};
      
      attempts.forEach(attempt => {
        const key = `retry_${attempt.retryCount}`;
        stats.retryDistribution[key] = (stats.retryDistribution[key] || 0) + 1;
      });
    }

    return stats;
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    this.stopProcessing();
    console.log('🛑 RetryQueue: Shutdown complete');
  }
}

// Create singleton instance
const retryQueue = new RetryQueue();

module.exports = {
  retryQueue,
  RetryQueue
};