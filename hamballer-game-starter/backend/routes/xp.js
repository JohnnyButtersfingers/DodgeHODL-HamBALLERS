const express = require('express');
const router = express.Router();

const { xpVerifierService } = require('../services/xpVerifierService');

// POST /api/xp/generate-proof
router.post('/generate-proof', async (req, res) => {
  try {
    const { playerAddress, xpClaimed, runId } = req.body;

    if (!playerAddress || !xpClaimed || !runId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // For Phase 9 we leverage the backend service utility – if not initialized we still return a test proof
    let proof;
    if (xpVerifierService?.initialized) {
      // Replace with real ZK proof generator when available
      proof = xpVerifierService.generateTestProof(playerAddress, xpClaimed);
    } else {
      proof = xpVerifierService.generateTestProof(playerAddress, xpClaimed);
    }

    return res.json(proof);
  } catch (error) {
    console.error('❌ /generate-proof failed:', error.message);
    if (error.cause) console.error('   Cause:', error.cause.message);
    return res.status(500).json({ error: 'Failed to generate proof' });
  }
});

module.exports = router;