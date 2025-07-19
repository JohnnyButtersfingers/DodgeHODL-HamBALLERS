const nullifierService = require('./services/nullifierService');
const crypto = require('crypto');

describe('NullifierService', () => {
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595ed6966';
    const validXPAmount = 50;
    const validSeason = 1;
    const validSecret = crypto.randomBytes(32).toString('hex');

    describe('generateNullifier', () => {
        it('should generate a valid nullifier for valid inputs', () => {
            const result = nullifierService.generateNullifier(
                validAddress,
                validXPAmount,
                validSeason,
                validSecret
            );

            expect(result).toHaveProperty('nullifier');
            expect(result).toHaveProperty('commitment');
            expect(result).toHaveProperty('components');
            expect(result).toHaveProperty('nullifierHash');

            // Validate nullifier is a string number
            expect(typeof result.nullifier).toBe('string');
            expect(BigInt(result.nullifier)).toBeGreaterThan(0n);

            // Validate components
            expect(result.components.address).toBe(validAddress.toLowerCase().replace('0x', ''));
            expect(result.components.xp).toBe(validXPAmount.toString());
            expect(result.components.season).toBe(validSeason.toString());
            expect(result.components).toHaveProperty('timestamp');
            expect(result.components).toHaveProperty('nonce');
        });

        it('should generate different nullifiers for same inputs with different timestamps', async () => {
            const result1 = nullifierService.generateNullifier(
                validAddress,
                validXPAmount,
                validSeason,
                validSecret
            );

            // Wait a bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            const result2 = nullifierService.generateNullifier(
                validAddress,
                validXPAmount,
                validSeason,
                validSecret
            );

            expect(result1.nullifier).not.toBe(result2.nullifier);
            expect(result1.commitment).not.toBe(result2.commitment);
        });

        it('should reject invalid address', () => {
            expect(() => {
                nullifierService.generateNullifier(
                    'invalid-address',
                    validXPAmount,
                    validSeason,
                    validSecret
                );
            }).toThrow('Invalid player address');
        });

        it('should reject zero XP amount', () => {
            expect(() => {
                nullifierService.generateNullifier(
                    validAddress,
                    0,
                    validSeason,
                    validSecret
                );
            }).toThrow('Invalid XP amount');
        });

        it('should reject XP amount over 1000', () => {
            expect(() => {
                nullifierService.generateNullifier(
                    validAddress,
                    1001,
                    validSeason,
                    validSecret
                );
            }).toThrow('Invalid XP amount');
        });

        it('should reject short secret', () => {
            expect(() => {
                nullifierService.generateNullifier(
                    validAddress,
                    validXPAmount,
                    validSeason,
                    'short-secret'
                );
            }).toThrow('Invalid secret');
        });
    });

    describe('verifyNullifierFormat', () => {
        it('should accept valid nullifier', () => {
            const validNullifier = '12345678901234567890';
            expect(nullifierService.verifyNullifierFormat(validNullifier)).toBe(true);
        });

        it('should reject nullifier larger than field size', () => {
            const largeNullifier = '21888242871839275222246405745257275088548364400416034343698204186575808495618';
            expect(nullifierService.verifyNullifierFormat(largeNullifier)).toBe(false);
        });

        it('should reject zero nullifier', () => {
            expect(nullifierService.verifyNullifierFormat('0')).toBe(false);
        });

        it('should reject non-numeric nullifier', () => {
            expect(nullifierService.verifyNullifierFormat('not-a-number')).toBe(false);
        });
    });

    describe('generateProofInputs', () => {
        it('should generate correct proof inputs', () => {
            const nullifierData = nullifierService.generateNullifier(
                validAddress,
                validXPAmount,
                validSeason,
                validSecret
            );

            const proofInputs = nullifierService.generateProofInputs(
                nullifierData,
                validAddress
            );

            expect(Array.isArray(proofInputs)).toBe(true);
            expect(proofInputs.length).toBe(4);
            expect(proofInputs[0]).toBe(nullifierData.nullifier);
            expect(proofInputs[1]).toBe(validXPAmount.toString());
            expect(proofInputs[3]).toBe(validSeason.toString());

            // Validate address is converted to BigInt string
            const addressBigInt = BigInt(validAddress);
            expect(proofInputs[2]).toBe(addressBigInt.toString());
        });
    });

    describe('generatePlayerSecret', () => {
        const masterSecret = 'master-secret-key-for-testing';

        it('should generate deterministic secrets', () => {
            const secret1 = nullifierService.generatePlayerSecret(validAddress, masterSecret);
            const secret2 = nullifierService.generatePlayerSecret(validAddress, masterSecret);

            expect(secret1).toBe(secret2);
            expect(secret1.length).toBe(64); // 32 bytes hex = 64 chars
        });

        it('should generate different secrets for different addresses', () => {
            const address2 = '0x2B5634C42055806a59e9107ED44D43c426E58258';
            
            const secret1 = nullifierService.generatePlayerSecret(validAddress, masterSecret);
            const secret2 = nullifierService.generatePlayerSecret(address2, masterSecret);

            expect(secret1).not.toBe(secret2);
        });

        it('should normalize address case', () => {
            const upperAddress = validAddress.toUpperCase();
            const lowerAddress = validAddress.toLowerCase();

            const secret1 = nullifierService.generatePlayerSecret(upperAddress, masterSecret);
            const secret2 = nullifierService.generatePlayerSecret(lowerAddress, masterSecret);

            expect(secret1).toBe(secret2);
        });
    });

    describe('createStorageKey', () => {
        it('should create consistent storage keys', () => {
            const nullifier = '12345678901234567890';
            
            const key1 = nullifierService.createStorageKey(nullifier);
            const key2 = nullifierService.createStorageKey(nullifier);

            expect(key1).toBe(key2);
            expect(key1.length).toBe(16);
        });

        it('should create different keys for different nullifiers', () => {
            const nullifier1 = '12345678901234567890';
            const nullifier2 = '98765432109876543210';

            const key1 = nullifierService.createStorageKey(nullifier1);
            const key2 = nullifierService.createStorageKey(nullifier2);

            expect(key1).not.toBe(key2);
        });
    });

    describe('validateProofInputs', () => {
        it('should validate correct proof inputs', () => {
            const inputs = [
                '12345678901234567890', // nullifier
                '50',                   // xp
                BigInt(validAddress).toString(), // address as BigInt string
                '1'                     // season
            ];

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(true);
            expect(result.parsed).toEqual({
                nullifier: inputs[0],
                xp: 50,
                playerAddress: validAddress.toLowerCase(),
                season: 1
            });
        });

        it('should reject invalid array length', () => {
            const inputs = ['12345', '50', '1']; // Missing one element

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid inputs array');
        });

        it('should reject invalid nullifier', () => {
            const inputs = [
                '0', // Invalid nullifier (zero)
                '50',
                BigInt(validAddress).toString(),
                '1'
            ];

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid nullifier format');
        });

        it('should reject invalid XP amount', () => {
            const inputs = [
                '12345678901234567890',
                '0', // Invalid XP (zero)
                BigInt(validAddress).toString(),
                '1'
            ];

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid XP amount');
        });

        it('should reject XP over limit', () => {
            const inputs = [
                '12345678901234567890',
                '1001', // Over limit
                BigInt(validAddress).toString(),
                '1'
            ];

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid XP amount');
        });

        it('should reject invalid address', () => {
            const inputs = [
                '12345678901234567890',
                '50',
                '0', // Invalid address
                '1'
            ];

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid player address');
        });

        it('should reject invalid season', () => {
            const inputs = [
                '12345678901234567890',
                '50',
                BigInt(validAddress).toString(),
                '0' // Invalid season
            ];

            const result = nullifierService.validateProofInputs(inputs);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid season');
        });
    });

    describe('Field element conversion', () => {
        it('should convert hash to field element within range', () => {
            const nullifierData = nullifierService.generateNullifier(
                validAddress,
                validXPAmount,
                validSeason,
                validSecret
            );

            const nullifierBigInt = BigInt(nullifierData.nullifier);
            const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

            expect(nullifierBigInt).toBeGreaterThan(0n);
            expect(nullifierBigInt).toBeLessThan(fieldSize);
        });
    });
});