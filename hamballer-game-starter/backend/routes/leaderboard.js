const express = require('express');
const router = express.Router();
const { getXpLeaderboard, getPlayerXPAndRank } = require('../utils/xpStore');

// TODO: Replace local JSON store with database queries or blockchain contract calls
// Options for future implementation:
// 1. Supabase queries: SELECT address, xp FROM player_stats ORDER BY xp DESC LIMIT 5
// 2. Contract calls: hodlManager.getTopPlayers() or similar view function
// 3. Hybrid approach: Contract events -> Database cache -> API responses

// GET /api/leaderboard - Get top 5 users by XP
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching leaderboard data from XP store');

    // Get all players from the XP store (already sorted by XP descending)
    const allPlayers = await getXpLeaderboard();
    
    // TODO: Add pagination support for larger datasets
    // TODO: Add filtering options (e.g., by XP range, recent activity)
    const leaderboard = allPlayers.slice(0, 5); // Limit to top 5 for now

    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString(),
      count: leaderboard.length,
      source: 'local_xp_store' // TODO: Change to 'database' or 'contract' when migrated
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data',
      message: error.message
    });
  }
});

// GET /api/leaderboard/rank/:address - Get specific user's rank (bonus endpoint)
router.get('/rank/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Get user's rank and XP from the store
    const userRank = await getPlayerXPAndRank(address);

    if (!userRank) {
      return res.status(404).json({
        success: false,
        error: 'User not found in leaderboard'
      });
    }

    res.json({
      success: true,
      data: userRank,
      timestamp: new Date().toISOString(),
      source: 'local_xp_store' // TODO: Change to 'database' or 'contract' when migrated
    });

  } catch (error) {
    console.error('❌ Error fetching user rank:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user rank',
      message: error.message
    });
  }
});

module.exports = router;