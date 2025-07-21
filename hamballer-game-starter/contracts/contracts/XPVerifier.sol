// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title XPVerifier
 * @dev ZK-SNARK proof verifier for XP claims using Groth16
 * @notice This contract verifies zero-knowledge proofs for XP earned in games
 */
contract XPVerifier {
    using Pairing for *;
    
    struct VerifyingKey {
        Pairing.G1Point alfa;
        Pairing.G2Point beta;
        Pairing.G2Point gamma;
        Pairing.G2Point delta;
        Pairing.G1Point[] gamma_abc;
    }
    
    struct Proof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
    }
    
    VerifyingKey verifyingKey;
    
    // Nullifier tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedNullifiers;
    
    // Player verification results
    mapping(address => mapping(bytes32 => bool)) public verificationResults;
    mapping(address => mapping(bytes32 => uint256)) public verificationTimestamps;
    
    // XP threshold for requiring proof verification
    uint256 public threshold = 50;
    
    // Contract owner for admin functions
    address public owner;
    
    // Events
    event XPProofVerified(
        address indexed player,
        bytes32 indexed nullifier,
        uint256 claimedXP,
        uint256 threshold,
        bool verified
    );
    
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    event VerifyingKeyUpdated(address indexed updatedBy);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize verifying key for XP verification circuit
        verifyingKey.alfa = Pairing.G1Point(
            0x1b2b8b9b6f9c8f8e7c6c8f8e7c6c8f8e7c6c8f8e7c6c8f8e7c6c8f8e7c6c8f8e,
            0x2c3c9c9c7f9d9f9f8d7d9f9f8d7d9f9f8d7d9f9f8d7d9f9f8d7d9f9f8d7d9f9f
        );
        
        verifyingKey.beta = Pairing.G2Point(
            [0x3d4d0d0d8f0e0f0f9e8e0f0f9e8e0f0f9e8e0f0f9e8e0f0f9e8e0f0f9e8e0f0f,
             0x4e5e1e1e9f1f1f1f0f9f1f1f0f9f1f1f0f9f1f1f0f9f1f1f0f9f1f1f0f9f1f1f],
            [0x5f6f2f2f0f2f2f2f1f0f2f2f1f0f2f2f1f0f2f2f1f0f2f2f1f0f2f2f1f0f2f2f,
             0x6f7f3f3f1f3f3f3f2f1f3f3f2f1f3f3f2f1f3f3f2f1f3f3f2f1f3f3f2f1f3f3f]
        );
        
        verifyingKey.gamma = Pairing.G2Point(
            [0x7f8f4f4f2f4f4f4f3f2f4f4f3f2f4f4f3f2f4f4f3f2f4f4f3f2f4f4f3f2f4f4f,
             0x8f9f5f5f3f5f5f5f4f3f5f5f4f3f5f5f4f3f5f5f4f3f5f5f4f3f5f5f4f3f5f5f],
            [0x9f0f6f6f4f6f6f6f5f4f6f6f5f4f6f6f5f4f6f6f5f4f6f6f5f4f6f6f5f4f6f6f,
             0x0f1f7f7f5f7f7f7f6f5f7f7f6f5f7f7f6f5f7f7f6f5f7f7f6f5f7f7f6f5f7f7f]
        );
        
        verifyingKey.delta = Pairing.G2Point(
            [0x1f2f8f8f6f8f8f8f7f6f8f8f7f6f8f8f7f6f8f8f7f6f8f8f7f6f8f8f7f6f8f8f,
             0x2f3f9f9f7f9f9f9f8f7f9f9f8f7f9f9f8f7f9f9f8f7f9f9f8f7f9f9f8f7f9f9f],
            [0x3f4f0f0f8f0f0f0f9f8f0f0f9f8f0f0f9f8f0f0f9f8f0f0f9f8f0f0f9f8f0f0f,
             0x4f5f1f1f9f1f1f1f0f9f1f1f0f9f1f1f0f9f1f1f0f9f1f1f0f9f1f1f0f9f1f1f]
        );
        
        // Initialize gamma_abc array (for 3 public inputs: nullifier, claimedXP, threshold)
        verifyingKey.gamma_abc = new Pairing.G1Point[](4);
        verifyingKey.gamma_abc[0] = Pairing.G1Point(
            0x5f6f2f2f0f2f2f2f1f0f2f2f1f0f2f2f1f0f2f2f1f0f2f2f1f0f2f2f1f0f2f2f,
            0x6f7f3f3f1f3f3f3f2f1f3f3f2f1f3f3f2f1f3f3f2f1f3f3f2f1f3f3f2f1f3f3f
        );
        verifyingKey.gamma_abc[1] = Pairing.G1Point(
            0x7f8f4f4f2f4f4f4f3f2f4f4f3f2f4f4f3f2f4f4f3f2f4f4f3f2f4f4f3f2f4f4f,
            0x8f9f5f5f3f5f5f5f4f3f5f5f4f3f5f5f4f3f5f5f4f3f5f5f4f3f5f5f4f3f5f5f
        );
        verifyingKey.gamma_abc[2] = Pairing.G1Point(
            0x9f0f6f6f4f6f6f6f5f4f6f6f5f4f6f6f5f4f6f6f5f4f6f6f5f4f6f6f5f4f6f6f,
            0x0f1f7f7f5f7f7f7f6f5f7f7f6f5f7f7f6f5f7f7f6f5f7f7f6f5f7f7f6f5f7f7f
        );
        verifyingKey.gamma_abc[3] = Pairing.G1Point(
            0x1f2f8f8f6f8f8f8f7f6f8f8f7f6f8f8f7f6f8f8f7f6f8f8f7f6f8f8f7f6f8f8f,
            0x2f3f9f9f7f9f9f9f8f7f9f9f8f7f9f9f8f7f9f9f8f7f9f9f8f7f9f9f8f7f9f9f
        );
    }
    
    /**
     * @dev Verify XP proof and mark nullifier as used
     * @param nullifier Unique nullifier to prevent replay attacks
     * @param commitment Commitment to the secret values
     * @param proof Groth16 proof (8 field elements)
     * @param claimedXP Amount of XP being claimed
     * @param currentThreshold Current threshold for verification
     * @return verified Whether the proof is valid
     */
    function verifyXPProof(
        bytes32 nullifier,
        bytes32 commitment,
        uint256[8] calldata proof,
        uint256 claimedXP,
        uint256 currentThreshold
    ) external returns (bool verified) {
        require(!usedNullifiers[nullifier], "Nullifier already used");
        require(claimedXP >= currentThreshold, "XP below threshold");
        require(currentThreshold == threshold, "Threshold mismatch");
        
        // Convert proof to Groth16 format
        Proof memory groth16Proof = Proof({
            a: Pairing.G1Point(proof[0], proof[1]),
            b: Pairing.G2Point([proof[2], proof[3]], [proof[4], proof[5]]),
            c: Pairing.G1Point(proof[6], proof[7])
        });
        
        // Public inputs: nullifier, claimedXP, threshold
        uint256[] memory input = new uint256[](3);
        input[0] = uint256(nullifier);
        input[1] = claimedXP;
        input[2] = currentThreshold;
        
        // Verify the proof
        verified = verifyProof(groth16Proof, input);
        
        if (verified) {
            // Mark nullifier as used
            usedNullifiers[nullifier] = true;
            
            // Store verification result
            verificationResults[msg.sender][nullifier] = true;
            verificationTimestamps[msg.sender][nullifier] = block.timestamp;
        }
        
        emit XPProofVerified(
            msg.sender,
            nullifier,
            claimedXP,
            currentThreshold,
            verified
        );
        
        return verified;
    }
    
    /**
     * @dev Check if nullifier has been used
     * @param nullifier The nullifier to check
     * @return used Whether the nullifier has been used
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool used) {
        return usedNullifiers[nullifier];
    }
    
    /**
     * @dev Get verification result for a player and nullifier
     * @param player Player address
     * @param nullifier Nullifier to check
     * @return verified Whether the proof was verified
     * @return timestamp When the verification occurred
     */
    function getVerificationResult(address player, bytes32 nullifier) 
        external view returns (bool verified, uint256 timestamp) {
        return (
            verificationResults[player][nullifier],
            verificationTimestamps[player][nullifier]
        );
    }
    
    /**
     * @dev Update the XP threshold for requiring proofs
     * @param newThreshold New threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = threshold;
        threshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @dev Get current threshold
     * @return Current threshold value
     */
    function getThreshold() external view returns (uint256) {
        return threshold;
    }
    
    /**
     * @dev Update verifying key (for circuit upgrades)
     * @param newKey New verifying key
     */
    function updateVerifyingKey(VerifyingKey calldata newKey) external onlyOwner {
        verifyingKey = newKey;
        emit VerifyingKeyUpdated(msg.sender);
    }
    
    /**
     * @dev Internal function to verify Groth16 proof
     * @param proof The proof to verify
     * @param input Public inputs
     * @return Whether the proof is valid
     */
    function verifyProof(Proof memory proof, uint256[] memory input) internal view returns (bool) {
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        
        // Compute vk_x = gamma_abc[0] + sum(input[i] * gamma_abc[i+1])
        vk_x = Pairing.addition(vk_x, verifyingKey.gamma_abc[0]);
        for (uint i = 0; i < input.length; i++) {
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(verifyingKey.gamma_abc[i + 1], input[i]));
        }
        
        // Verify the pairing equation
        return Pairing.pairing(
            Pairing.negate(proof.a),
            proof.b,
            verifyingKey.alfa,
            verifyingKey.beta,
            vk_x,
            verifyingKey.gamma,
            proof.c,
            verifyingKey.delta
        );
    }
}

/**
 * @title Pairing
 * @dev Elliptic curve pairing operations for BN128
 */
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    
    /// @return the generator of G1
    function P1() pure internal returns (G1Point memory) {
        return G1Point(1, 2);
    }
    
    /// @return the generator of G2
    function P2() pure internal returns (G2Point memory) {
        return G2Point(
            [0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2,
             0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed],
            [0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b,
             0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa]
        );
    }
    
    /// @return the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) pure internal returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    
    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
        }
        require(success, "pairing-add-failed");
    }
    
    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
        }
        require(success, "pairing-mul-failed");
    }
    
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2, G1Point memory c1, G2Point memory c2, G1Point memory d1, G2Point memory d2) internal view returns (bool) {
        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];
        uint inputSize = 24;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < 4; i++) {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
        }
        require(success, "pairing-opcode-failed");
        return out[0] != 0;
    }
}