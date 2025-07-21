const express = require('express');
const router = express.Router();
const { zkProofGenerator } = require('../services/zkProofGenerator');
const { xpVerifierService } = require('../services/xpVerifierService');

/**
 * @route POST /api/xp/generate-proof
 * @desc Generate ZK proof for XP claim
 * @access Public (should be authenticated in production)
 */
router.post('/generate-proof', async (req, res) => {
  try {
    const { playerAddress, xpClaimed, runId, timestamp } = req.body;

    // Validate required fields
    if (!playerAddress || !xpClaimed || !runId) {
      return res.status(400).json({
        error: 'Missing required fields: playerAddress, xpClaimed, runId'
      });
    }

    // Validate player address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(playerAddress)) {
      return res.status(400).json({
        error: 'Invalid player address format'
      });
    }

    // Validate XP amount
    if (typeof xpClaimed !== 'number' || xpClaimed <= 0) {
      return res.status(400).json({
        error: 'Invalid XP amount - must be a positive number'
      });
    }

    console.log(`🔐 Generating ZK proof for ${playerAddress}: ${xpClaimed} XP`);

    // Get current threshold
    const threshold = 50; // Could be fetched from contract or config

    try {
      // Generate the ZK proof
      const proofData = await zkProofGenerator.generateProof(
        playerAddress,
        xpClaimed,
        runId,
        threshold
      );

      // Log successful proof generation
      console.log(`✅ ZK proof generated successfully for ${playerAddress}`);

      res.json({
        success: true,
        ...proofData,
        timestamp: timestamp || Date.now(),
        generatedAt: new Date().toISOString()
      });

    } catch (proofError) {
      console.error('❌ ZK proof generation failed:', proofError.message);
      
      // Return appropriate error based on failure type
      if (proofError.message.includes('threshold')) {
        return res.status(400).json({
          error: 'XP amount below verification threshold',
          threshold,
          claimedXP: xpClaimed
        });
      }

      if (proofError.message.includes('nullifier')) {
        return res.status(409).json({
          error: 'Proof already generated for this claim (nullifier conflict)',
          code: 'NULLIFIER_CONFLICT'
        });
      }

      // Generic proof generation error
      return res.status(500).json({
        error: 'Failed to generate ZK proof',
        message: proofError.message,
        code: 'PROOF_GENERATION_FAILED'
      });
    }

  } catch (error) {
    console.error('❌ API error in /generate-proof:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @route POST /api/xp/verify-proof
 * @desc Verify a ZK proof locally (for testing)
 * @access Public
 */
router.post('/verify-proof', async (req, res) => {
  try {
    const { proofData } = req.body;

    if (!proofData) {
      return res.status(400).json({
        error: 'Missing proof data'
      });
    }

    console.log('🔍 Verifying ZK proof locally...');

    // Verify the proof structure
    const isValid = await zkProofGenerator.verifyProof(proofData);

    res.json({
      success: true,
      verified: isValid,
      proofData: {
        nullifier: proofData.nullifier,
        claimedXP: proofData.claimedXP,
        threshold: proofData.threshold,
        isTestProof: proofData.isTestProof || false
      },
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Proof verification error:', error.message);
    res.status(500).json({
      error: 'Proof verification failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/xp/proof-status
 * @desc Get ZK proof generator status
 * @access Public
 */
router.get('/proof-status', (req, res) => {
  try {
    const status = zkProofGenerator.getStatus();
    const xpVerifierStatus = xpVerifierService.getQueueStats();

    res.json({
      success: true,
      zkProofGenerator: status,
      xpVerifier: xpVerifierStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting proof status:', error.message);
    res.status(500).json({
      error: 'Failed to get proof status',
      message: error.message
    });
  }
});

/**
 * @route POST /api/xp/test-proof
 * @desc Generate a test proof for development
 * @access Public (development only)
 */
router.post('/test-proof', (req, res) => {
  try {
    const { playerAddress, xpClaimed, runId } = req.body;

    if (!playerAddress || !xpClaimed) {
      return res.status(400).json({
        error: 'Missing required fields: playerAddress, xpClaimed'
      });
    }

    console.log(`🧪 Generating test proof for ${playerAddress}: ${xpClaimed} XP`);

    const testProof = xpVerifierService.generateTestProof(
      playerAddress,
      xpClaimed,
      runId || 'test-run-' + Date.now()
    );

    res.json({
      success: true,
      ...testProof,
      isTestProof: true,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test proof generation error:', error.message);
    res.status(500).json({
      error: 'Test proof generation failed',
      message: error.message
    });
  }
});

module.exports = router;