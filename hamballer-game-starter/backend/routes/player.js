const express = require('express');
const router = express.Router();
const { getPlayerAchievements, getAllAchievements } = require('../xpStoreV2');

// GET /api/player/:address/achievements - Get player achievements
router.get('/:address/achievements', async (req, res) => {
  try {
    const { address } = req.params;
    const { include_available } = req.query;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    let achievementsData;
    
    if (include_available === 'true') {
      // Return both earned and available achievements
      achievementsData = await getAllAchievements(address);
    } else {
      // Return only earned achievements (default behavior)
      const earnedAchievements = await getPlayerAchievements(address);
      achievementsData = {
        achievements: earnedAchievements,
        earnedCount: earnedAchievements.length
      };
    }

    res.json({
      success: true,
      data: achievementsData,
      player: address,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching player achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player achievements',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/player/:address/achievements/summary - Get achievement summary stats
router.get('/:address/achievements/summary', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    const allAchievements = await getAllAchievements(address);
    const earnedAchievements = allAchievements.earned || [];

    // Calculate summary statistics
    const summary = {
      total: allAchievements.total,
      earned: allAchievements.earnedCount,
      completion: ((allAchievements.earnedCount / allAchievements.total) * 100).toFixed(1),
      byRarity: {
        legendary: earnedAchievements.filter(a => a.rarity === 'legendary').length,
        rare: earnedAchievements.filter(a => a.rarity === 'rare').length,
        uncommon: earnedAchievements.filter(a => a.rarity === 'uncommon').length,
        common: earnedAchievements.filter(a => a.rarity === 'common').length
      },
      byCategory: {
        gameplay: earnedAchievements.filter(a => a.category === 'gameplay').length,
        progression: earnedAchievements.filter(a => a.category === 'progression').length,
        ranking: earnedAchievements.filter(a => a.category === 'ranking').length,
        performance: earnedAchievements.filter(a => a.category === 'performance').length,
        special: earnedAchievements.filter(a => a.category === 'special').length
      },
      recentlyEarned: earnedAchievements
        .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
        .slice(0, 3) // Last 3 achievements
    };

    res.json({
      success: true,
      data: summary,
      player: address,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching achievement summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievement summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;