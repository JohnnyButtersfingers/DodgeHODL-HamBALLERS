// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title XPVerifierSimple
 * @dev Simplified ZK-SNARK proof verifier for XP claims
 * @notice This contract verifies zero-knowledge proofs for XP earned in games
 */
contract XPVerifierSimple {
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
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
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
        
        // For testing purposes, we'll accept any properly formatted proof
        // In production, this would use actual pairing operations
        verified = verifyProofData(proof, claimedXP, currentThreshold);
        
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
     * @dev Simplified proof verification for testing
     * @param proof The proof array
     * @param claimedXP Amount of XP claimed
     * @param currentThreshold Current threshold
     * @return Whether the proof is valid
     */
    function verifyProofData(
        uint256[8] calldata proof,
        uint256 claimedXP,
        uint256 currentThreshold
    ) internal pure returns (bool) {
        // Simple validation - check that proof elements are non-zero
        // and XP is above threshold
        for (uint i = 0; i < 8; i++) {
            if (proof[i] == 0) {
                return false;
            }
        }
        
        // Additional validation logic can be added here
        return claimedXP >= currentThreshold;
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
     * @dev Emergency function to mark a nullifier as used (admin only)
     * @param nullifier The nullifier to mark as used
     */
    function markNullifierUsed(bytes32 nullifier) external onlyOwner {
        usedNullifiers[nullifier] = true;
    }
    
    /**
     * @dev Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}