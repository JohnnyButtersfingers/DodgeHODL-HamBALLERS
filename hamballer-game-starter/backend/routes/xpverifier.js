const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const nullifierService = require('../services/nullifierService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Initialize XPVerifier contract
let xpVerifierContract;
let provider;

const initializeContract = () => {
    if (!process.env.XPVERIFIER_ADDRESS) {
        console.warn('XPVerifier contract address not configured');
        return;
    }

    provider = new ethers.providers.JsonRpcProvider(process.env.ABSTRACT_RPC_URL);
    
    const xpVerifierABI = [
        "function verifyProof(uint[2] a, uint[2][2] b, uint[2] c, uint[4] input) returns (bool)",
        "function isNullifierUsed(uint256 nullifier) view returns (bool)",
        "function isClaimVerified(address player, uint256 nullifier) view returns (bool)",
        "function currentSeason() view returns (uint256)"
    ];

    xpVerifierContract = new ethers.Contract(
        process.env.XPVERIFIER_ADDRESS,
        xpVerifierABI,
        provider
    );
};

// Initialize on startup
initializeContract();

/**
 * @route POST /api/xpverifier/generate-nullifier
 * @desc Generate a nullifier for ZK-proof claim
 * @body { playerAddress, xpAmount, season }
 */
router.post('/generate-nullifier', async (req, res) => {
    try {
        const { playerAddress, xpAmount, season } = req.body;

        // Validate inputs
        if (!ethers.utils.isAddress(playerAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid player address'
            });
        }

        if (!xpAmount || xpAmount <= 0 || xpAmount > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Invalid XP amount (must be 1-1000)'
            });
        }

        // Generate player secret (in production, this should be managed securely)
        const masterSecret = process.env.ZK_MASTER_SECRET || 'default-master-secret-change-in-production';
        const playerSecret = nullifierService.generatePlayerSecret(playerAddress, masterSecret);

        // Generate nullifier
        const nullifierData = nullifierService.generateNullifier(
            playerAddress,
            xpAmount,
            season || 1,
            playerSecret
        );

        // Store nullifier commitment in database for future reference
        const { error: dbError } = await supabase
            .from('zk_proof_claims')
            .insert({
                player_address: playerAddress.toLowerCase(),
                nullifier_key: nullifierService.createStorageKey(nullifierData.nullifier),
                commitment: nullifierData.commitment,
                xp_amount: xpAmount,
                season: season || 1,
                created_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Error storing nullifier commitment:', dbError);
        }

        res.json({
            success: true,
            data: {
                nullifier: nullifierData.nullifier,
                commitment: nullifierData.commitment,
                proofInputs: nullifierService.generateProofInputs(nullifierData, playerAddress)
            }
        });

    } catch (error) {
        console.error('Error generating nullifier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate nullifier'
        });
    }
});

/**
 * @route POST /api/xpverifier/verify-proof
 * @desc Verify a ZK-SNARK proof on-chain
 * @body { proof: { a, b, c }, publicInputs }
 */
router.post('/verify-proof', async (req, res) => {
    try {
        const { proof, publicInputs } = req.body;

        // Validate contract availability
        if (!xpVerifierContract) {
            return res.status(503).json({
                success: false,
                error: 'XPVerifier contract not available'
            });
        }

        // Validate proof structure
        if (!proof || !proof.a || !proof.b || !proof.c) {
            return res.status(400).json({
                success: false,
                error: 'Invalid proof structure'
            });
        }

        // Validate public inputs
        const validation = nullifierService.validateProofInputs(publicInputs);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        // Check if nullifier already used
        const nullifier = publicInputs[0];
        const isUsed = await xpVerifierContract.isNullifierUsed(nullifier);
        
        if (isUsed) {
            return res.status(400).json({
                success: false,
                error: 'Nullifier already used'
            });
        }

        // Prepare transaction
        const signer = new ethers.Wallet(
            process.env.XPVERIFIER_PRIVATE_KEY || process.env.XPBADGE_MINTER_PRIVATE_KEY,
            provider
        );

        const contractWithSigner = xpVerifierContract.connect(signer);

        // Call verifyProof
        const tx = await contractWithSigner.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            publicInputs
        );

        // Wait for confirmation
        const receipt = await tx.wait(2); // Wait for 2 confirmations

        // Check if verification succeeded
        const verified = receipt.status === 1;

        if (verified) {
            // Update database with verification status
            const { error: dbError } = await supabase
                .from('zk_proof_claims')
                .update({
                    verified: true,
                    verified_at: new Date().toISOString(),
                    tx_hash: receipt.transactionHash
                })
                .eq('nullifier_key', nullifierService.createStorageKey(nullifier));

            if (dbError) {
                console.error('Error updating verification status:', dbError);
            }
        }

        res.json({
            success: verified,
            data: {
                verified,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                playerAddress: validation.parsed.playerAddress,
                xpAmount: validation.parsed.xp
            }
        });

    } catch (error) {
        console.error('Error verifying proof:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify proof'
        });
    }
});

/**
 * @route GET /api/xpverifier/check-nullifier/:nullifier
 * @desc Check if a nullifier has been used
 */
router.get('/check-nullifier/:nullifier', async (req, res) => {
    try {
        const { nullifier } = req.params;

        if (!xpVerifierContract) {
            return res.status(503).json({
                success: false,
                error: 'XPVerifier contract not available'
            });
        }

        // Validate nullifier format
        if (!nullifierService.verifyNullifierFormat(nullifier)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid nullifier format'
            });
        }

        const isUsed = await xpVerifierContract.isNullifierUsed(nullifier);

        res.json({
            success: true,
            data: {
                nullifier,
                isUsed
            }
        });

    } catch (error) {
        console.error('Error checking nullifier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check nullifier'
        });
    }
});

/**
 * @route GET /api/xpverifier/player-claims/:address
 * @desc Get all ZK-proof claims for a player
 */
router.get('/player-claims/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address'
            });
        }

        const { data: claims, error } = await supabase
            .from('zk_proof_claims')
            .select('*')
            .eq('player_address', address.toLowerCase())
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                address,
                claims: claims || [],
                totalClaims: claims ? claims.length : 0,
                verifiedClaims: claims ? claims.filter(c => c.verified).length : 0
            }
        });

    } catch (error) {
        console.error('Error fetching player claims:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player claims'
        });
    }
});

/**
 * @route GET /api/xpverifier/current-season
 * @desc Get current season from contract
 */
router.get('/current-season', async (req, res) => {
    try {
        if (!xpVerifierContract) {
            return res.status(503).json({
                success: false,
                error: 'XPVerifier contract not available'
            });
        }

        const currentSeason = await xpVerifierContract.currentSeason();

        res.json({
            success: true,
            data: {
                currentSeason: currentSeason.toNumber()
            }
        });

    } catch (error) {
        console.error('Error fetching current season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current season'
        });
    }
});

/**
 * @route POST /api/xpverifier/simulate-proof
 * @desc Simulate proof generation (for testing)
 */
router.post('/simulate-proof', async (req, res) => {
    try {
        const { playerAddress, xpAmount, season } = req.body;

        // This is a simulated proof for testing
        // In production, this would be generated by a ZK circuit
        const simulatedProof = {
            a: [
                "0x1234567890123456789012345678901234567890123456789012345678901234",
                "0x2345678901234567890123456789012345678901234567890123456789012345"
            ],
            b: [
                [
                    "0x3456789012345678901234567890123456789012345678901234567890123456",
                    "0x4567890123456789012345678901234567890123456789012345678901234567"
                ],
                [
                    "0x5678901234567890123456789012345678901234567890123456789012345678",
                    "0x6789012345678901234567890123456789012345678901234567890123456789"
                ]
            ],
            c: [
                "0x7890123456789012345678901234567890123456789012345678901234567890",
                "0x8901234567890123456789012345678901234567890123456789012345678901"
            ]
        };

        res.json({
            success: true,
            data: {
                proof: simulatedProof,
                note: 'This is a simulated proof for testing. In production, use a real ZK circuit.'
            }
        });

    } catch (error) {
        console.error('Error simulating proof:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to simulate proof'
        });
    }
});

module.exports = router;