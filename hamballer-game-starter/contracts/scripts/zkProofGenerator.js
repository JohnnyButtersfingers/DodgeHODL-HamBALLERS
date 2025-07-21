const { ethers } = require("ethers");
const snarkjs = require("snarkjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ZK Circuit paths
const CIRCUIT_PATHS = {
  wasm: path.join(__dirname, "../circuits/xp_verifier.wasm"),
  zkey: path.join(__dirname, "../circuits/xp_verifier_0001.zkey"),
  vkey: path.join(__dirname, "../circuits/verification_key.json")
};

// Nullifier salt for preventing replays
const NULLIFIER_SALT = process.env.NULLIFIER_SALT || "XP_VERIFIER_ABSTRACT_2024";

/**
 * Generate a unique nullifier to prevent replay attacks
 * @param {string} userAddress - User's wallet address
 * @param {string} salt - Additional salt for uniqueness
 * @returns {string} Nullifier hash
 */
function generateNullifier(userAddress, salt = NULLIFIER_SALT) {
  // Create deterministic nullifier: hash(userAddress + salt)
  const nullifierInput = `${userAddress.toLowerCase()}${salt}`;
  const nullifierHash = ethers.keccak256(ethers.toUtf8Bytes(nullifierInput));
  
  console.log("🔐 Generated nullifier for:", userAddress);
  console.log("   Nullifier hash:", nullifierHash);
  
  return nullifierHash;
}

/**
 * Generate ZK proof for XP verification
 * @param {Object} params - Proof parameters
 * @param {string} params.userAddress - User's wallet address
 * @param {string} params.xpAmount - User's XP amount
 * @param {string} params.threshold - Minimum XP threshold
 * @param {string} params.timestamp - Current timestamp
 * @returns {Object} Proof data with nullifier
 */
async function generateXPProof(params) {
  const { userAddress, xpAmount, threshold, timestamp } = params;
  
  console.log("🎯 Generating ZK proof for XP verification");
  console.log("   User:", userAddress);
  console.log("   XP Amount:", xpAmount);
  console.log("   Threshold:", threshold);
  console.log("   Timestamp:", timestamp);
  
  try {
    // Validate inputs
    if (!userAddress || !ethers.isAddress(userAddress)) {
      throw new Error("Invalid user address");
    }
    
    const xpBigInt = BigInt(xpAmount);
    const thresholdBigInt = BigInt(threshold);
    
    if (xpBigInt < thresholdBigInt) {
      throw new Error(`Insufficient XP: ${xpAmount} < ${threshold}`);
    }
    
    // Generate unique nullifier
    const nullifier = generateNullifier(userAddress);
    const nullifierBigInt = BigInt(nullifier);
    
    // Check if circuit files exist
    if (!fs.existsSync(CIRCUIT_PATHS.wasm)) {
      console.warn("⚠️ Circuit WASM file not found. Using mock proof for development.");
      return generateMockProof(userAddress, xpAmount, nullifier);
    }
    
    // Prepare circuit inputs
    const circuitInputs = {
      // Public inputs
      userAddress: BigInt(userAddress),
      threshold: thresholdBigInt,
      nullifier: nullifierBigInt,
      
      // Private inputs
      xpAmount: xpBigInt,
      timestamp: BigInt(timestamp),
      
      // Additional security parameters
      nonce: BigInt(crypto.randomBytes(32).toString('hex'), 16)
    };
    
    console.log("⏳ Generating proof with snarkjs...");
    const startTime = Date.now();
    
    // Generate the proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      CIRCUIT_PATHS.wasm,
      CIRCUIT_PATHS.zkey
    );
    
    const proofTime = Date.now() - startTime;
    console.log(`✅ Proof generated in ${proofTime}ms`);
    
    // Verify the proof locally
    const vKey = JSON.parse(fs.readFileSync(CIRCUIT_PATHS.vkey));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    
    if (!verified) {
      throw new Error("Proof verification failed locally");
    }
    
    console.log("✅ Proof verified locally");
    
    // Format proof for smart contract
    const solidityProof = formatProofForSolidity(proof);
    
    return {
      proof: solidityProof,
      publicSignals,
      nullifier,
      metadata: {
        userAddress,
        xpAmount,
        threshold,
        timestamp,
        generatedAt: Date.now(),
        proofTime
      }
    };
    
  } catch (error) {
    console.error("❌ Proof generation failed:", error.message);
    throw error;
  }
}

/**
 * Format proof for Solidity verifier
 * @param {Object} proof - snarkjs proof object
 * @returns {Object} Formatted proof
 */
function formatProofForSolidity(proof) {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
    c: [proof.pi_c[0], proof.pi_c[1]]
  };
}

/**
 * Generate mock proof for development/testing
 * @param {string} userAddress - User's wallet address
 * @param {string} xpAmount - XP amount
 * @param {string} nullifier - Nullifier hash
 * @returns {Object} Mock proof data
 */
function generateMockProof(userAddress, xpAmount, nullifier) {
  console.log("🔧 Generating mock proof for development");
  
  // Generate deterministic mock values based on inputs
  const mockHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes32"],
      [userAddress, xpAmount, nullifier]
    )
  );
  
  const mockProof = {
    a: [mockHash.slice(0, 66), "0x" + mockHash.slice(2, 66).replace(/[0-9]/g, '1')],
    b: [
      [mockHash.slice(0, 66).replace(/[a-f]/g, '2'), mockHash.slice(0, 66).replace(/[a-f]/g, '3')],
      [mockHash.slice(0, 66).replace(/[a-f]/g, '4'), mockHash.slice(0, 66).replace(/[a-f]/g, '5')]
    ],
    c: [mockHash.slice(0, 66).replace(/[a-f]/g, '6'), mockHash.slice(0, 66).replace(/[a-f]/g, '7')]
  };
  
  return {
    proof: mockProof,
    publicSignals: [userAddress, xpAmount, nullifier],
    nullifier,
    metadata: {
      userAddress,
      xpAmount,
      threshold: "100",
      timestamp: Date.now().toString(),
      generatedAt: Date.now(),
      proofTime: 100,
      isMock: true
    }
  };
}

/**
 * Validate nullifier hasn't been used
 * @param {Object} provider - Ethers provider
 * @param {string} contractAddress - XPVerifier contract address
 * @param {string} nullifier - Nullifier to check
 * @returns {boolean} True if nullifier is valid (not used)
 */
async function validateNullifier(provider, contractAddress, nullifier) {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ["function isNullifierUsed(bytes32) view returns (bool)"],
      provider
    );
    
    const isUsed = await contract.isNullifierUsed(nullifier);
    console.log(`🔍 Nullifier ${isUsed ? 'already used' : 'is valid'}`);
    
    return !isUsed;
  } catch (error) {
    console.error("❌ Nullifier validation failed:", error.message);
    return false;
  }
}

/**
 * Estimate gas for proof verification
 * @param {Object} provider - Ethers provider
 * @param {string} contractAddress - XPVerifier contract address
 * @param {Object} proofData - Proof data
 * @returns {Object} Gas estimation
 */
async function estimateVerificationGas(provider, contractAddress, proofData) {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ["function verifyXPProof(uint256[2],uint256[2][2],uint256[2],uint256[3]) returns (bool)"],
      provider
    );
    
    const gasEstimate = await contract.estimateGas.verifyXPProof(
      proofData.proof.a,
      proofData.proof.b,
      proofData.proof.c,
      proofData.publicSignals
    );
    
    const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
    
    console.log(`⛽ Gas estimation:`);
    console.log(`   Estimated: ${gasEstimate.toString()}`);
    console.log(`   With buffer: ${gasLimit.toString()}`);
    console.log(`   Target: < 320,000`);
    
    if (gasLimit > 320000n) {
      console.warn("⚠️ Gas usage exceeds target of 320k!");
    }
    
    return {
      estimated: gasEstimate.toString(),
      limit: gasLimit.toString(),
      exceedsTarget: gasLimit > 320000n
    };
  } catch (error) {
    console.error("❌ Gas estimation failed:", error.message);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log("Usage: node zkProofGenerator.js <userAddress> <xpAmount> <threshold>");
    console.log("Example: node zkProofGenerator.js 0x123... 1000 100");
    process.exit(1);
  }
  
  const [userAddress, xpAmount, threshold] = args;
  
  generateXPProof({
    userAddress,
    xpAmount,
    threshold,
    timestamp: Date.now().toString()
  })
    .then(result => {
      console.log("\n📋 Proof Result:");
      console.log(JSON.stringify(result, null, 2));
      
      // Save to file
      const outputFile = `proof-${userAddress.slice(0, 8)}-${Date.now()}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Proof saved to: ${outputFile}`);
    })
    .catch(error => {
      console.error("\n❌ Error:", error.message);
      process.exit(1);
    });
}

module.exports = {
  generateXPProof,
  generateNullifier,
  validateNullifier,
  estimateVerificationGas,
  formatProofForSolidity,
  generateMockProof
};