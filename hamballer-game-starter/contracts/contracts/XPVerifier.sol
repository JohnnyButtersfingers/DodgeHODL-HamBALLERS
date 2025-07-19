// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title XPVerifier
 * @dev ZK-SNARK proof verification contract for HamBaller XP claims
 * @notice Verifies zero-knowledge proofs for high-value XP badge claims
 */
contract XPVerifier is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ZK-proof verification parameters
    uint256 public constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    
    // Nullifier tracking to prevent proof replay
    mapping(uint256 => bool) public nullifierUsed;
    
    // Verification status tracking
    mapping(address => mapping(uint256 => bool)) public verifiedClaims;
    
    // Events
    event ProofVerified(
        address indexed player,
        uint256 indexed nullifier,
        uint256 xpAmount,
        uint256 season,
        uint256 timestamp
    );
    
    event ProofRejected(
        address indexed player,
        uint256 indexed nullifier,
        string reason
    );
    
    event VerificationParametersUpdated(
        address updatedBy,
        uint256 timestamp
    );
    
    // Verification key points (example values - replace with actual circuit output)
    struct VerifyingKey {
        uint256[2] alpha;
        uint256[2][2] beta;
        uint256[2][2] gamma;
        uint256[2][2] delta;
        uint256[][] ic;
    }
    
    VerifyingKey public verifyingKey;
    
    // Season management
    uint256 public currentSeason = 1;
    mapping(uint256 => bool) public seasonActive;
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        seasonActive[currentSeason] = true;
        
        // Initialize with example verification key (replace with actual)
        _initializeVerifyingKey();
    }
    
    /**
     * @dev Verifies a ZK-SNARK proof for XP claim
     * @param a Proof element a
     * @param b Proof element b
     * @param c Proof element c
     * @param input Public inputs [nullifier, xpAmount, playerAddress, season]
     * @return bool Whether the proof is valid
     */
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) public nonReentrant whenNotPaused returns (bool) {
        uint256 nullifier = input[0];
        uint256 xpAmount = input[1];
        address player = address(uint160(input[2]));
        uint256 season = input[3];
        
        // Validate inputs
        require(player != address(0), "Invalid player address");
        require(season == currentSeason, "Invalid season");
        require(seasonActive[season], "Season not active");
        require(!nullifierUsed[nullifier], "Nullifier already used");
        require(xpAmount > 0 && xpAmount <= 1000, "Invalid XP amount");
        
        // Verify the proof
        bool valid = _verifyingProof(a, b, c, input);
        
        if (valid) {
            // Mark nullifier as used
            nullifierUsed[nullifier] = true;
            
            // Record verification
            verifiedClaims[player][nullifier] = true;
            
            emit ProofVerified(
                player,
                nullifier,
                xpAmount,
                season,
                block.timestamp
            );
            
            return true;
        } else {
            emit ProofRejected(player, nullifier, "Invalid proof");
            return false;
        }
    }
    
    /**
     * @dev Internal proof verification using Groth16
     */
    function _verifyingProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) internal view returns (bool) {
        // Groth16 verification logic
        // This is a simplified version - implement full pairing check
        
        // Check if proof elements are in valid range
        if (a[0] >= PRIME_Q || a[1] >= PRIME_Q) return false;
        if (b[0][0] >= PRIME_Q || b[0][1] >= PRIME_Q || 
            b[1][0] >= PRIME_Q || b[1][1] >= PRIME_Q) return false;
        if (c[0] >= PRIME_Q || c[1] >= PRIME_Q) return false;
        
        // Verify public inputs are in valid range
        for (uint i = 0; i < input.length; i++) {
            if (input[i] >= SNARK_SCALAR_FIELD) return false;
        }
        
        // Actual pairing check would go here
        // For now, return true for valid range inputs (replace with actual verification)
        return true;
    }
    
    /**
     * @dev Check if a nullifier has been used
     */
    function isNullifierUsed(uint256 nullifier) public view returns (bool) {
        return nullifierUsed[nullifier];
    }
    
    /**
     * @dev Check if a claim has been verified
     */
    function isClaimVerified(address player, uint256 nullifier) public view returns (bool) {
        return verifiedClaims[player][nullifier];
    }
    
    /**
     * @dev Update season (admin only)
     */
    function updateSeason(uint256 newSeason) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newSeason > currentSeason, "New season must be greater");
        seasonActive[currentSeason] = false;
        currentSeason = newSeason;
        seasonActive[currentSeason] = true;
    }
    
    /**
     * @dev Update verifying key (admin only)
     */
    function updateVerifyingKey(
        uint256[2] memory alpha,
        uint256[2][2] memory beta,
        uint256[2][2] memory gamma,
        uint256[2][2] memory delta,
        uint256[][] memory ic
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        verifyingKey.alpha = alpha;
        verifyingKey.beta = beta;
        verifyingKey.gamma = gamma;
        verifyingKey.delta = delta;
        delete verifyingKey.ic;
        for (uint i = 0; i < ic.length; i++) {
            verifyingKey.ic.push(ic[i]);
        }
        
        emit VerificationParametersUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Initialize verifying key with example values
     */
    function _initializeVerifyingKey() private {
        // Example values - replace with actual circuit verification key
        verifyingKey.alpha = [1, 2];
        verifyingKey.beta = [[3, 4], [5, 6]];
        verifyingKey.gamma = [[7, 8], [9, 10]];
        verifyingKey.delta = [[11, 12], [13, 14]];
        
        // Initialize IC array
        uint256[] memory ic0 = new uint256[](2);
        ic0[0] = 15;
        ic0[1] = 16;
        verifyingKey.ic.push(ic0);
    }
    
    /**
     * @dev Pause contract (emergency use)
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}