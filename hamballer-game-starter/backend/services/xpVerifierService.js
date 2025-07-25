const { ethers } = require('ethers');
const { db } = require('../config/database');

// XPVerifier contract ABI
const XPVERIFIER_ABI = [
  'function verifyXPProof(bytes32 nullifier, bytes32 commitment, uint256[8] calldata proof, uint256 claimedXP, uint256 threshold) external returns (bool)',
  'function isNullifierUsed(bytes32 nullifier) external view returns (bool)',
  'function getVerificationResult(address player, bytes32 nullifier) external view returns (bool verified, uint256 timestamp)',
  'function updateThreshold(uint256 newThreshold) external',
  'function getThreshold() external view returns (uint256)',
  'event XPProofVerified(address indexed player, bytes32 indexed nullifier, uint256 claimedXP, uint256 threshold, bool verified)',
  'event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold)'
];

// ZK-SNARK proof structure
const PROOF_FIELDS = [
  'pi_a',  // Public input A
  'pi_b',  // Public input B  
  'pi_c',  // Public input C
  'protocol',
  'curve'
];

class XPVerifierService {
  constructor() {
    this.provider = null;
    this.xpVerifierContract = null;
    this.signer = null;
    this.initialized = false;
    this.proofQueue = new Map(); // Pending verifications
  }

  /**
   * Initialize the XPVerifier service
   */
  async initialize() {
    try {
      const rpcUrl = process.env.ABSTRACT_RPC_URL || 'https://api.testnet.abs.xyz';
      const xpVerifierAddress = process.env.XPVERIFIER_ADDRESS;
      const privateKey = process.env.XPVERIFIER_PRIVATE_KEY;

      if (!rpcUrl || !xpVerifierAddress || !privateKey) {
        console.warn('⚠️ XPVerifierService: Missing configuration - ZK-proof verification disabled');
        return false;
      }

      // Initialize provider with fallback RPC
      try {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
      } catch (providerError) {
        console.warn(`⚠️ Primary RPC failed, trying fallback: ${providerError.message}`);
        this.provider = new ethers.JsonRpcProvider('https://rpc.abstract.xyz');
      }
      
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.xpVerifierContract = new ethers.Contract(xpVerifierAddress, XPVERIFIER_ABI, this.signer);

      // Test contract connection with timeout
      const currentThreshold = await Promise.race([
        this.xpVerifierContract.getThreshold(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Contract call timeout')), 10000))
      ]);
      
      this.initialized = true;
      console.log('✅ XPVerifierService initialized');
      console.log(`📍 XPVerifier Contract: ${xpVerifierAddress}`);
      console.log(`🔑 Verifier Address: ${this.signer.address}`);
      console.log(`🎯 Current Threshold: ${currentThreshold.toString()}`);

      return true;
    } catch (error) {
      console.error('❌ XPVerifierService initialization failed:', error.message);
      console.error('Stack trace:', error.stack);
      console.error('Error cause:', error.cause);
      return false;
    }
  }

  /**
   * Submit a ZK-proof claim for verification
   */
  async submitProofClaim(playerAddress, proofData) {
    if (!this.initialized) {
      throw new Error('XPVerifierService not initialized');
    }

    try {
      console.log(`🔍 Submitting ZK-proof claim for ${playerAddress}`);
      
      // Validate proof data structure
      const validatedProof = this.validateProofData(proofData);
      
      // Check if nullifier has already been used
      const nullifierUsed = await this.isNullifierUsed(validatedProof.nullifier);
      if (nullifierUsed) {
        throw new Error('Nullifier already used - replay attack prevented');
      }

      // Store claim in database as pending
      const claimId = await this.storePendingClaim(playerAddress, validatedProof);
      
      // Add to processing queue
      this.proofQueue.set(claimId, {
        playerAddress,
        proofData: validatedProof,
        timestamp: new Date()
      });

      // Process the claim
      const result = await this.processProofClaim(claimId, playerAddress, validatedProof);
      
      // Remove from queue
      this.proofQueue.delete(claimId);
      
      return result;

    } catch (error) {
      console.error('❌ Error submitting proof claim:', error.message);
      throw error;
    }
  }

  /**
   * Validate ZK-proof data structure
   */
  validateProofData(proofData) {
    const { nullifier, commitment, proof, claimedXP, threshold } = proofData;

    // Validate required fields
    if (!nullifier || !commitment || !proof || !claimedXP || !threshold) {
      throw new Error('Missing required proof data fields');
    }

    // Validate nullifier format (should be 32-byte hash)
    if (!/^0x[a-fA-F0-9]{64}$/.test(nullifier)) {
      throw new Error('Invalid nullifier format');
    }

    // Validate commitment format
    if (!/^0x[a-fA-F0-9]{64}$/.test(commitment)) {
      throw new Error('Invalid commitment format');
    }

    // Validate proof array (should be 8 elements for ZK-SNARK)
    if (!Array.isArray(proof) || proof.length !== 8) {
      throw new Error('Invalid proof format - expected array of 8 elements');
    }

    // Validate numeric values
    if (typeof claimedXP !== 'number' || claimedXP <= 0) {
      throw new Error('Invalid claimedXP value');
    }

    if (typeof threshold !== 'number' || threshold <= 0) {
      throw new Error('Invalid threshold value');
    }

    return {
      nullifier,
      commitment,
      proof: proof.map(p => BigInt(p)), // Convert to BigInt for contract call
      claimedXP,
      threshold
    };
  }

  /**
   * Check if nullifier has been used (replay prevention)
   */
  async isNullifierUsed(nullifier) {
    try {
      // Check on-chain first
      const onchainUsed = await this.xpVerifierContract.isNullifierUsed(nullifier);
      if (onchainUsed) return true;

      // Check in our database for pending/verified claims
      const { data: existingClaim, error } = await db
        .from('zk_proof_claims')
        .select('id')
        .eq('nullifier', nullifier)
        .in('verification_status', ['pending', 'verified'])
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!existingClaim;

    } catch (error) {
      console.error('❌ Error checking nullifier usage:', error.message);
      return false;
    }
  }

  /**
   * Store pending claim in database
   */
  async storePendingClaim(playerAddress, proofData) {
    const { nullifier, commitment, proof, claimedXP, threshold } = proofData;

    try {
      const { data: claim, error } = await db
        .from('zk_proof_claims')
        .insert({
          player_address: playerAddress.toLowerCase(),
          nullifier,
          commitment,
          proof_data: {
            proof: proof.map(p => p.toString()), // Store as strings
            protocol: 'groth16',
            curve: 'bn128'
          },
          claimed_xp: claimedXP,
          threshold_met: threshold,
          verification_status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour expiry
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`📝 Stored pending claim ${claim.id} for ${playerAddress}`);
      return claim.id;

    } catch (error) {
      console.error('❌ Error storing pending claim:', error.message);
      throw error;
    }
  }

  /**
   * Process a ZK-proof claim by calling the contract
   */
  async processProofClaim(claimId, playerAddress, proofData) {
    try {
      console.log(`🔍 Processing ZK-proof claim ${claimId} for ${playerAddress}`);

      // Update status to processing
      await this.updateClaimStatus(claimId, 'pending', 'Processing proof verification');

      // Get current gas price with timeout
      const gasPrice = await Promise.race([
        this.provider.getFeeData(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Gas price fetch timeout')), 10000))
      ]);
      
      // Estimate gas for the verification call with timeout
      const gasEstimate = await Promise.race([
        this.xpVerifierContract.verifyXPProof.estimateGas(
          proofData.nullifier,
          proofData.commitment,
          proofData.proof,
          proofData.claimedXP,
          proofData.threshold
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Gas estimation timeout')), 15000))
      ]);

      console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);

      // Call the verification contract with timeout
      const tx = await Promise.race([
        this.xpVerifierContract.verifyXPProof(
          proofData.nullifier,
          proofData.commitment,
          proofData.proof,
          proofData.claimedXP,
          proofData.threshold,
          {
            gasLimit: gasEstimate + BigInt(100000), // Add buffer
            gasPrice: gasPrice.gasPrice
          }
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction submission timeout')), 30000))
      ]);

      console.log(`⏳ ZK-proof verification transaction sent: ${tx.hash}`);

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(2), // Wait for 2 confirmations
        new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000))
      ]);
      
      if (receipt.status === 1) {
        // Parse verification result from event logs
        const verificationResult = await this.parseVerificationResult(receipt, proofData.nullifier);
        
        if (verificationResult.verified) {
          await this.updateClaimStatus(claimId, 'verified', null, tx.hash);
          console.log(`✅ ZK-proof verified successfully for ${playerAddress}`);
          
          return {
            success: true,
            verified: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            claimId
          };
        } else {
          await this.updateClaimStatus(claimId, 'failed', 'Proof verification failed', tx.hash);
          console.log(`❌ ZK-proof verification failed for ${playerAddress}`);
          
          return {
            success: true,
            verified: false,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            claimId
          };
        }
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error(`❌ ZK-proof verification failed for ${playerAddress}:`, error.message);
      console.error('Stack trace:', error.stack);
      console.error('Error cause:', error.cause);
      
      // Check for specific error types
      let errorDetails = error.message;
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
        errorDetails = `Network error: ${error.message} - Check RPC connection`;
      } else if (error.code === 'CALL_EXCEPTION') {
        errorDetails = `Contract call failed: ${error.message} - Check contract state`;
      } else if (error.message.includes('timeout')) {
        errorDetails = `Operation timed out: ${error.message} - RPC may be slow`;
      }
      
      await this.updateClaimStatus(claimId, 'failed', errorDetails);
      
      return {
        success: false,
        error: errorDetails,
        errorCode: error.code,
        claimId
      };
    }
  }

  /**
   * Parse verification result from transaction receipt
   */
  async parseVerificationResult(receipt, nullifier) {
    try {
      // Find the XPProofVerified event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.xpVerifierContract.interface.parseLog(log);
          return parsed.name === 'XPProofVerified' && parsed.args.nullifier === nullifier;
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.xpVerifierContract.interface.parseLog(event);
        return {
          verified: parsed.args.verified,
          player: parsed.args.player,
          nullifier: parsed.args.nullifier,
          claimedXP: parsed.args.claimedXP.toString(),
          threshold: parsed.args.threshold.toString()
        };
      }

      // Fallback: query contract state
      const result = await this.xpVerifierContract.getVerificationResult(
        this.signer.address,
        nullifier
      );

      return {
        verified: result.verified,
        timestamp: result.timestamp.toString()
      };

    } catch (error) {
      console.error('❌ Error parsing verification result:', error.message);
      return { verified: false };
    }
  }

  /**
   * Update claim status in database
   */
  async updateClaimStatus(claimId, status, errorMessage = null, txHash = null) {
    try {
      const updateData = {
        verification_status: status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      if (txHash) {
        updateData.verification_tx_hash = txHash;
      }

      if (status === 'verified') {
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await db
        .from('zk_proof_claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

    } catch (error) {
      console.error('❌ Error updating claim status:', error.message);
    }
  }

  /**
   * Get verification status for a player's claims
   */
  async getPlayerVerifications(playerAddress) {
    try {
      const { data: claims, error } = await db
        .from('zk_proof_claims')
        .select('*')
        .eq('player_address', playerAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        claims: claims || [],
        summary: {
          total: claims?.length || 0,
          verified: claims?.filter(c => c.verification_status === 'verified').length || 0,
          pending: claims?.filter(c => c.verification_status === 'pending').length || 0,
          failed: claims?.filter(c => c.verification_status === 'failed').length || 0
        }
      };

    } catch (error) {
      console.error('❌ Error getting player verifications:', error.message);
      return {
        claims: [],
        summary: { total: 0, verified: 0, pending: 0, failed: 0 }
      };
    }
  }

  /**
   * Clean up expired claims
   */
  async cleanupExpiredClaims() {
    try {
      const { data: expiredClaims, error } = await db
        .from('zk_proof_claims')
        .update({
          verification_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('verification_status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) throw error;

      if (expiredClaims && expiredClaims.length > 0) {
        console.log(`🧹 Cleaned up ${expiredClaims.length} expired ZK-proof claims`);
      }

      return expiredClaims?.length || 0;

    } catch (error) {
      console.error('❌ Error cleaning up expired claims:', error.message);
      return 0;
    }
  }

  /**
   * Get verification queue statistics
   */
  getQueueStats() {
    return {
      pendingVerifications: this.proofQueue.size,
      initialized: this.initialized,
      contractAddress: process.env.XPVERIFIER_ADDRESS,
      verifierAddress: this.signer?.address
    };
  }

  /**
   * Update verification threshold (admin function)
   */
  async updateThreshold(newThreshold) {
    if (!this.initialized) {
      throw new Error('XPVerifierService not initialized');
    }

    try {
      console.log(`🎯 Updating verification threshold to ${newThreshold}`);

      const tx = await this.xpVerifierContract.updateThreshold(newThreshold);
      console.log(`⏳ Threshold update transaction sent: ${tx.hash}`);

      const receipt = await tx.wait(2);
      
      if (receipt.status === 1) {
        console.log(`✅ Verification threshold updated to ${newThreshold}`);
        return {
          success: true,
          txHash: tx.hash,
          newThreshold
        };
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('❌ Error updating threshold:', error.message);
      throw error;
    }
  }

  /**
   * Generate a test proof (for development/testing)
   */
  generateTestProof(playerAddress, claimedXP) {
    // This would be replaced with actual ZK-proof generation in production
    const nullifier = ethers.randomBytes(32);
    const commitment = ethers.keccak256(ethers.toUtf8Bytes(`${playerAddress}-${claimedXP}-${Date.now()}`));
    
    // Mock proof array (8 elements for groth16)
    const proof = Array.from({ length: 8 }, () => 
      ethers.getBigInt(ethers.randomBytes(32))
    );

    return {
      nullifier: ethers.hexlify(nullifier),
      commitment,
      proof,
      claimedXP,
      threshold: 100 // Default threshold
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('🛑 XPVerifierService: Shutting down');
    this.proofQueue.clear();
  }
}

// Create singleton instance
const xpVerifierService = new XPVerifierService();

module.exports = {
  xpVerifierService,
  XPVerifierService
};