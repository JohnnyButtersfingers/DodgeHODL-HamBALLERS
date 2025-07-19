// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title XPVerifier
 * @dev Verifies zero-knowledge proofs for XP (Experience Points) claims
 */
contract XPVerifier is AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    
    // Verification threshold (minimum XP required for verification)
    uint256 public threshold;
    
    // Mapping to track used nullifiers to prevent double-spending
    mapping(bytes32 => bool) public isNullifierUsed;
    
    // Mapping to store verification results
    mapping(address => mapping(bytes32 => VerificationResult)) public verificationResults;
    
    struct VerificationResult {
        bool verified;
        uint256 claimedXP;
        uint256 timestamp;
        uint256 threshold;
    }
    
    event XPProofVerified(
        address indexed player, 
        bytes32 indexed nullifier, 
        uint256 claimedXP, 
        uint256 threshold, 
        bool verified
    );
    
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    constructor(uint256 _threshold) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        threshold = _threshold;
    }
    
    /**
     * @dev Verify XP proof using zero-knowledge proof
     * @param nullifier Unique nullifier to prevent double-spending
     * @param commitment Commitment value for the proof
     * @param proof ZK proof array (8 elements for groth16)
     * @param claimedXP Amount of XP being claimed
     * @param _threshold Minimum threshold for verification
     */
    function verifyXPProof(
        bytes32 nullifier,
        bytes32 commitment,
        uint256[8] calldata proof,
        uint256 claimedXP,
        uint256 _threshold
    ) external nonReentrant returns (bool) {
        require(!isNullifierUsed[nullifier], "XPVerifier: Nullifier already used");
        require(claimedXP >= _threshold, "XPVerifier: Claimed XP below threshold");
        require(_threshold >= threshold, "XPVerifier: Threshold too low");
        
        // Mark nullifier as used
        isNullifierUsed[nullifier] = true;
        
        // For now, we'll simulate proof verification
        // In a real implementation, this would use a ZK proof library
        bool verified = _verifyProof(nullifier, commitment, proof, claimedXP);
        
        // Store verification result
        verificationResults[msg.sender][nullifier] = VerificationResult({
            verified: verified,
            claimedXP: claimedXP,
            timestamp: block.timestamp,
            threshold: _threshold
        });
        
        emit XPProofVerified(msg.sender, nullifier, claimedXP, _threshold, verified);
        
        return verified;
    }
    
    /**
     * @dev Internal function to verify the ZK proof
     * @param nullifier Nullifier for the proof
     * @param commitment Commitment value
     * @param proof The ZK proof
     * @param claimedXP Claimed XP amount
     */
    function _verifyProof(
        bytes32 nullifier,
        bytes32 commitment,
        uint256[8] calldata proof,
        uint256 claimedXP
    ) internal pure returns (bool) {
        // Simplified verification logic for demo purposes
        // In production, this would use a proper ZK verification library
        
        // Basic sanity checks
        if (nullifier == bytes32(0) || commitment == bytes32(0)) {
            return false;
        }
        
        // Check if proof array has valid values
        for (uint i = 0; i < 8; i++) {
            if (proof[i] == 0) {
                return false;
            }
        }
        
        // Simulate verification based on nullifier and commitment
        uint256 hash = uint256(keccak256(abi.encodePacked(nullifier, commitment, claimedXP)));
        
        // Return true if hash meets certain criteria (simulated proof verification)
        return (hash % 100) < 90; // 90% success rate for demo
    }
    
    /**
     * @dev Get verification result for a player and nullifier
     */
    function getVerificationResult(
        address player,
        bytes32 nullifier
    ) external view returns (VerificationResult memory) {
        return verificationResults[player][nullifier];
    }
    
    /**
     * @dev Get current threshold
     */
    function getThreshold() external view returns (uint256) {
        return threshold;
    }
    
    /**
     * @dev Update verification threshold (admin only)
     */
    function updateThreshold(uint256 _newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldThreshold = threshold;
        threshold = _newThreshold;
        emit ThresholdUpdated(oldThreshold, _newThreshold);
    }
    
    /**
     * @dev Grant verifier role to an address
     */
    function grantVerifierRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, account);
    }
    
    /**
     * @dev Revoke verifier role from an address
     */
    function revokeVerifierRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, account);
    }
}