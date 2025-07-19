const crypto = require('crypto');
const { ethers } = require('ethers');

/**
 * Nullifier Service for ZK-Proof Generation
 * Implements explicit nullifier hashing for preventing proof replay attacks
 */
class NullifierService {
    constructor() {
        // Prime field for BN254 curve (used in Groth16)
        this.FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    }

    /**
     * Generate a nullifier from player data
     * @param {string} playerAddress - Player's Ethereum address
     * @param {number} xpAmount - Amount of XP to claim
     * @param {number} season - Current season
     * @param {string} secret - Player's secret (should be stored securely)
     * @returns {Object} Nullifier and hash components
     */
    generateNullifier(playerAddress, xpAmount, season, secret) {
        // Validate inputs
        if (!ethers.utils.isAddress(playerAddress)) {
            throw new Error('Invalid player address');
        }
        if (xpAmount <= 0 || xpAmount > 1000) {
            throw new Error('Invalid XP amount');
        }
        if (!secret || secret.length < 32) {
            throw new Error('Invalid secret');
        }

        // Normalize address (remove 0x prefix and lowercase)
        const normalizedAddress = playerAddress.toLowerCase().replace('0x', '');

        // Create commitment components
        const components = {
            address: normalizedAddress,
            xp: xpAmount.toString(),
            season: season.toString(),
            timestamp: Date.now().toString(),
            nonce: crypto.randomBytes(16).toString('hex')
        };

        // Hash commitment = H(address || xp || season || timestamp || nonce)
        const commitment = this._hashComponents([
            components.address,
            components.xp,
            components.season,
            components.timestamp,
            components.nonce
        ]);

        // Generate nullifier = H(commitment || secret)
        const nullifierPreimage = commitment + secret;
        const nullifierHash = this._poseidonHash(nullifierPreimage);

        // Convert to field element
        const nullifier = this._toFieldElement(nullifierHash);

        return {
            nullifier: nullifier.toString(),
            commitment: commitment,
            components: components,
            nullifierHash: nullifierHash
        };
    }

    /**
     * Verify nullifier format and range
     * @param {string} nullifier - Nullifier to verify
     * @returns {boolean} Whether nullifier is valid
     */
    verifyNullifierFormat(nullifier) {
        try {
            const nullifierBigInt = BigInt(nullifier);
            return nullifierBigInt > 0n && nullifierBigInt < this.FIELD_SIZE;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate proof inputs for ZK circuit
     * @param {Object} nullifierData - Data from generateNullifier
     * @param {string} playerAddress - Player's address
     * @returns {Array} Public inputs for proof generation
     */
    generateProofInputs(nullifierData, playerAddress) {
        const addressBigInt = BigInt(playerAddress);
        
        return [
            nullifierData.nullifier,
            nullifierData.components.xp,
            addressBigInt.toString(),
            nullifierData.components.season
        ];
    }

    /**
     * Hash multiple components using SHA256
     * @param {Array} components - Array of strings to hash
     * @returns {string} Hex string of hash
     */
    _hashComponents(components) {
        const concatenated = components.join('|');
        return crypto
            .createHash('sha256')
            .update(concatenated)
            .digest('hex');
    }

    /**
     * Poseidon hash implementation (simplified version)
     * In production, use a proper Poseidon hash library
     * @param {string} input - Input to hash
     * @returns {string} Hash output
     */
    _poseidonHash(input) {
        // This is a placeholder - in production, use circomlib's Poseidon
        // For now, we'll use double SHA256 as a stand-in
        const firstHash = crypto
            .createHash('sha256')
            .update(input)
            .digest();
        
        const secondHash = crypto
            .createHash('sha256')
            .update(firstHash)
            .digest('hex');
        
        return secondHash;
    }

    /**
     * Convert hash to field element (mod FIELD_SIZE)
     * @param {string} hash - Hex string hash
     * @returns {BigInt} Field element
     */
    _toFieldElement(hash) {
        const hashBigInt = BigInt('0x' + hash);
        return hashBigInt % this.FIELD_SIZE;
    }

    /**
     * Generate a deterministic secret for a player
     * WARNING: This is for demo purposes - in production, use secure key management
     * @param {string} playerAddress - Player's address
     * @param {string} masterSecret - Master secret (from env)
     * @returns {string} Player-specific secret
     */
    generatePlayerSecret(playerAddress, masterSecret) {
        const normalizedAddress = playerAddress.toLowerCase();
        return crypto
            .createHmac('sha256', masterSecret)
            .update(normalizedAddress)
            .digest('hex');
    }

    /**
     * Create nullifier storage key for database
     * @param {string} nullifier - Nullifier value
     * @returns {string} Storage key
     */
    createStorageKey(nullifier) {
        // Create a shorter key for database storage
        const hash = crypto
            .createHash('sha256')
            .update(nullifier)
            .digest('hex');
        
        return hash.substring(0, 16); // Use first 16 chars
    }

    /**
     * Validate proof inputs match expected format
     * @param {Array} inputs - Proof inputs array
     * @returns {Object} Validation result
     */
    validateProofInputs(inputs) {
        if (!Array.isArray(inputs) || inputs.length !== 4) {
            return {
                valid: false,
                error: 'Invalid inputs array'
            };
        }

        const [nullifier, xp, playerAddress, season] = inputs;

        // Validate nullifier
        if (!this.verifyNullifierFormat(nullifier)) {
            return {
                valid: false,
                error: 'Invalid nullifier format'
            };
        }

        // Validate XP
        const xpNum = parseInt(xp);
        if (isNaN(xpNum) || xpNum <= 0 || xpNum > 1000) {
            return {
                valid: false,
                error: 'Invalid XP amount'
            };
        }

        // Validate address (as BigInt)
        try {
            const addrBigInt = BigInt(playerAddress);
            if (addrBigInt <= 0n) {
                return {
                    valid: false,
                    error: 'Invalid player address'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid player address format'
            };
        }

        // Validate season
        const seasonNum = parseInt(season);
        if (isNaN(seasonNum) || seasonNum <= 0) {
            return {
                valid: false,
                error: 'Invalid season'
            };
        }

        return {
            valid: true,
            parsed: {
                nullifier,
                xp: xpNum,
                playerAddress: '0x' + BigInt(playerAddress).toString(16).padStart(40, '0'),
                season: seasonNum
            }
        };
    }
}

// Export singleton instance
module.exports = new NullifierService();