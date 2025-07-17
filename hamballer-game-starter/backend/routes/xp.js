const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/xp/:wallet - Get XP and stats for a wallet
router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }
    // Query player_stats for this wallet
    const stats = await db.getPlayerStats(wallet);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No stats found for this wallet'
      });
    }
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching XP for wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch XP',
      message: error.message
    });
  }
});

module.exports = router; 