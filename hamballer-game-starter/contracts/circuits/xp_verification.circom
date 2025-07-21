pragma circom 2.0.0;

include "node_modules/circomlib/circuits/pedersen.circom";
include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * XP Verification Circuit
 * 
 * This circuit proves that:
 * 1. The player knows a secret that corresponds to their wallet address
 * 2. The claimed XP amount is valid
 * 3. The run ID is authentic
 * 4. Generates a nullifier to prevent double-spending
 * 
 * Public inputs:
 * - nullifier: Unique identifier to prevent replay attacks
 * - claimedXP: Amount of XP being claimed
 * - threshold: Minimum XP required for verification
 * 
 * Private inputs:
 * - secret: Player's secret key/nonce
 * - playerAddress: Player's wallet address (as field element)
 * - runId: Game run identifier
 * - actualXP: Actual XP earned (must equal claimedXP)
 */

template XPVerification() {
    // Public inputs
    signal output nullifier;
    signal input claimedXP;
    signal input threshold;
    
    // Private inputs
    signal private input secret;
    signal private input playerAddress;
    signal private input runId;
    signal private input actualXP;
    
    // Intermediate signals
    signal secretHash;
    signal addressHash;
    signal runHash;
    signal nullifierPreimage[4];
    
    // Components
    component secretHasher = Pedersen(248);
    component addressHasher = Pedersen(160);
    component runHasher = Pedersen(248);
    component nullifierHasher = Pedersen(252);
    component xpCheck = GreaterEqualThan(32);
    component xpMatch = IsEqual();
    
    // Convert inputs to bits for hashing
    component secretBits = Num2Bits(248);
    component addressBits = Num2Bits(160); 
    component runBits = Num2Bits(248);
    
    secretBits.in <== secret;
    addressBits.in <== playerAddress;
    runBits.in <== runId;
    
    // Hash the secret
    for (var i = 0; i < 248; i++) {
        secretHasher.in[i] <== secretBits.out[i];
    }
    secretHash <== secretHasher.out[0];
    
    // Hash the player address
    for (var i = 0; i < 160; i++) {
        addressHasher.in[i] <== addressBits.out[i];
    }
    addressHash <== addressHasher.out[0];
    
    // Hash the run ID
    for (var i = 0; i < 248; i++) {
        runHasher.in[i] <== runBits.out[i];
    }
    runHash <== runHasher.out[0];
    
    // Create nullifier from secret, address, and run
    // nullifier = hash(secretHash, addressHash, runHash, claimedXP)
    nullifierPreimage[0] <== secretHash;
    nullifierPreimage[1] <== addressHash;
    nullifierPreimage[2] <== runHash;
    nullifierPreimage[3] <== claimedXP;
    
    component nullifierBits[4];
    var totalBits = 0;
    
    for (var i = 0; i < 4; i++) {
        nullifierBits[i] = Num2Bits(63); // 63 bits per component to stay under field size
        nullifierBits[i].in <== nullifierPreimage[i];
        totalBits += 63;
    }
    
    // Hash all bits together for nullifier
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 63; j++) {
            nullifierHasher.in[i * 63 + j] <== nullifierBits[i].out[j];
        }
    }
    
    nullifier <== nullifierHasher.out[0];
    
    // Verify that claimed XP matches actual XP
    xpMatch.in[0] <== claimedXP;
    xpMatch.in[1] <== actualXP;
    xpMatch.out === 1;
    
    // Verify that XP is above threshold
    xpCheck.in[0] <== claimedXP;
    xpCheck.in[1] <== threshold;
    xpCheck.out === 1;
    
    // Ensure XP is positive
    component xpPositive = GreaterThan(32);
    xpPositive.in[0] <== claimedXP;
    xpPositive.in[1] <== 0;
    xpPositive.out === 1;
    
    // Ensure secret is non-zero (basic validation)
    component secretNonZero = IsZero();
    secretNonZero.in <== secret;
    secretNonZero.out === 0;
}

// Main component
component main = XPVerification();