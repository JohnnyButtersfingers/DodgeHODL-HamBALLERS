/**
 * ZK-SNARK Utilities for Frontend
 * Provides client-side proof verification and validation
 */

/**
 * Validate proof data structure
 * @param {Object} proofData - The proof data to validate
 * @returns {boolean} Whether the proof data is valid
 */
export function validateProofStructure(proofData) {
  if (!proofData || typeof proofData !== 'object') {
    return false;
  }

  const requiredFields = ['nullifier', 'commitment', 'proof', 'claimedXP', 'threshold'];
  
  // Check all required fields exist
  for (const field of requiredFields) {
    if (!(field in proofData)) {
      console.warn(`ZK proof validation failed: missing field '${field}'`);
      return false;
    }
  }

  // Validate nullifier format (32-byte hex string)
  if (typeof proofData.nullifier !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(proofData.nullifier)) {
    console.warn('ZK proof validation failed: invalid nullifier format');
    return false;
  }

  // Validate commitment format (32-byte hex string)
  if (typeof proofData.commitment !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(proofData.commitment)) {
    console.warn('ZK proof validation failed: invalid commitment format');
    return false;
  }

  // Validate proof array (should be 8 elements for Groth16)
  if (!Array.isArray(proofData.proof) || proofData.proof.length !== 8) {
    console.warn('ZK proof validation failed: proof must be array of 8 elements');
    return false;
  }

  // Validate each proof element is a valid hex string
  for (let i = 0; i < proofData.proof.length; i++) {
    const element = proofData.proof[i];
    if (typeof element !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(element)) {
      console.warn(`ZK proof validation failed: invalid proof element at index ${i}`);
      return false;
    }
  }

  // Validate numeric fields
  if (typeof proofData.claimedXP !== 'number' || proofData.claimedXP <= 0) {
    console.warn('ZK proof validation failed: invalid claimedXP');
    return false;
  }

  if (typeof proofData.threshold !== 'number' || proofData.threshold <= 0) {
    console.warn('ZK proof validation failed: invalid threshold');
    return false;
  }

  return true;
}

/**
 * Convert proof data to format expected by smart contract
 * @param {Object} proofData - The proof data to convert
 * @returns {Object} Formatted proof data for contract interaction
 */
export function formatProofForContract(proofData) {
  if (!validateProofStructure(proofData)) {
    throw new Error('Invalid proof structure');
  }

  return {
    nullifier: proofData.nullifier,
    commitment: proofData.commitment,
    proof: proofData.proof.map(element => {
      // Ensure proper BigInt conversion for contract
      return BigInt(element).toString();
    }),
    claimedXP: proofData.claimedXP,
    threshold: proofData.threshold
  };
}

/**
 * Estimate gas for proof verification
 * @param {Object} proofData - The proof data
 * @returns {number} Estimated gas units
 */
export function estimateVerificationGas(proofData) {
  // Base gas for proof verification (approximate)
  let baseGas = 300000; // ~300k gas for Groth16 verification
  
  // Add extra gas for nullifier checks and storage
  baseGas += 50000;
  
  // Add buffer for safety
  return Math.floor(baseGas * 1.2);
}

/**
 * Generate a unique verification key for tracking
 * @param {string} playerAddress - Player's wallet address
 * @param {string} runId - Game run identifier
 * @param {number} claimedXP - XP amount
 * @returns {string} Unique verification key
 */
export function generateVerificationKey(playerAddress, runId, claimedXP) {
  const combined = `${playerAddress.toLowerCase()}-${runId}-${claimedXP}`;
  // Simple hash for tracking (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `verification_${Math.abs(hash).toString(16)}`;
}

/**
 * Check if XP amount requires ZK proof verification
 * @param {number} xpAmount - XP amount to check
 * @param {number} threshold - Current verification threshold
 * @returns {boolean} Whether proof is required
 */
export function requiresZKProof(xpAmount, threshold = 50) {
  return xpAmount >= threshold;
}

/**
 * Classify proof error for better UX
 * @param {Error} error - The error that occurred
 * @returns {string} Error classification
 */
export function classifyProofError(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('nullifier')) {
    return 'NULLIFIER_CONFLICT';
  }
  
  if (message.includes('threshold')) {
    return 'BELOW_THRESHOLD';
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return 'NETWORK_ERROR';
  }
  
  if (message.includes('timeout')) {
    return 'TIMEOUT_ERROR';
  }
  
  if (message.includes('gas') || message.includes('funds')) {
    return 'GAS_ERROR';
  }
  
  if (message.includes('proof') && message.includes('invalid')) {
    return 'INVALID_PROOF';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Get user-friendly error message
 * @param {string} errorType - Error classification
 * @returns {string} User-friendly error message
 */
export function getProofErrorMessage(errorType) {
  const messages = {
    NULLIFIER_CONFLICT: 'This XP claim has already been processed. You cannot claim the same XP twice.',
    BELOW_THRESHOLD: 'XP amount is below the verification threshold. No proof verification required.',
    NETWORK_ERROR: 'Network connection error. Please check your internet connection and try again.',
    TIMEOUT_ERROR: 'Proof generation timed out. The server may be busy, please try again.',
    GAS_ERROR: 'Insufficient gas or funds for transaction. Please ensure you have enough ETH for gas fees.',
    INVALID_PROOF: 'Generated proof is invalid. This may be a temporary issue, please try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred during proof generation. Please try again.'
  };
  
  return messages[errorType] || messages.UNKNOWN_ERROR;
}

/**
 * Create proof verification analytics event
 * @param {Object} proofData - The proof data
 * @param {string} eventType - Type of event (attempt, success, failure)
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Analytics event object
 */
export function createProofAnalyticsEvent(proofData, eventType, metadata = {}) {
  return {
    event: `zk_proof_${eventType}`,
    timestamp: new Date().toISOString(),
    data: {
      nullifier: proofData?.nullifier,
      claimedXP: proofData?.claimedXP,
      threshold: proofData?.threshold,
      isTestProof: proofData?.isTestProof || false,
      ...metadata
    }
  };
}

/**
 * Validate circuit parameters
 * @param {Object} params - Circuit parameters
 * @returns {boolean} Whether parameters are valid
 */
export function validateCircuitParams(params) {
  const requiredParams = ['secret', 'playerAddress', 'runId', 'actualXP', 'claimedXP', 'threshold'];
  
  return requiredParams.every(param => {
    if (!(param in params)) {
      console.warn(`Circuit validation failed: missing parameter '${param}'`);
      return false;
    }
    return true;
  });
}

/**
 * Generate proof metadata for display
 * @param {Object} proofData - The proof data
 * @returns {Object} Display metadata
 */
export function generateProofMetadata(proofData) {
  return {
    nullifierShort: proofData.nullifier ? `${proofData.nullifier.slice(0, 10)}...${proofData.nullifier.slice(-8)}` : 'N/A',
    commitmentShort: proofData.commitment ? `${proofData.commitment.slice(0, 10)}...${proofData.commitment.slice(-8)}` : 'N/A',
    proofSize: proofData.proof ? JSON.stringify(proofData.proof).length : 0,
    estimatedGas: estimateVerificationGas(proofData),
    requiresVerification: requiresZKProof(proofData.claimedXP, proofData.threshold),
    isTestProof: proofData.isTestProof || false
  };
}