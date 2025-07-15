const express = require('express');
const router = express.Router();
const { getPlayerXPHistory, getPlayerXPAndRank } = require('../utils/xpStore');
const { getPlayerProfile, getPlayerRank } = require('../utils/xpStoreV2');

// TODO: Connect XP history to smart contract event logs
// Future implementation: Fetch history directly from blockchain events

/**
 * GET /api/player/:address
 * Get comprehensive player profile including lifetime XP, current rank, and XP history
 * Phase 6: Player Profiles
 * Path params:
 *   - address: The wallet address to get profile for
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address parameter
    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address',
        message: 'Please provide a wallet address in the URL path'
      });
    }

    // Validate address format (basic Ethereum address validation)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        message: 'Address must be a valid Ethereum address (0x followed by 40 hex characters)'
      });
    }

    console.log(`👤 Getting player profile for address: ${address}`);

    // Get comprehensive player profile
    const profile = await getPlayerProfile(address);

    if (!profile) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'No data found for the provided address',
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: true,
      data: {
        profile: {
          address: profile.address,
          xp: profile.xp,
          rank: profile.rank,
          isTopFive: profile.isTopFive,
          lifetimeXP: profile.lifetimeXP,
          totalPlayers: profile.totalPlayers,
          joinedAt: profile.joinedAt,
          lastUpdated: profile.lastUpdated
        },
        statistics: profile.statistics,
        history: profile.history,
        // TODO: Add match history when game data is integrated
        matchHistory: []
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
    console.log(`✅ Returned player profile for ${address}: Rank #${profile.rank} with ${profile.xp} XP`);

  } catch (error) {
    console.error(`❌ Error getting player profile for ${req.params.address}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve player profile',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/player/history
 * Get XP history for a specific player
 * Query params:
 *   - address: The wallet address to get history for
 */
router.get('/history', async (req, res) => {
  try {
    const { address } = req.query;

    // Validate address parameter
    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address',
        message: 'Please provide a wallet address as query parameter'
      });
    }

    // Validate address format (basic Ethereum address validation)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        message: 'Address must be a valid Ethereum address (0x followed by 40 hex characters)'
      });
    }

    console.log(`📈 Getting XP history for address: ${address}`);

    // Get player history
    const history = await getPlayerXPHistory(address);

    if (history === null) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'No XP data found for the provided address',
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      success: true,
      data: {
        address: address,
        history: history,
        totalEntries: history.length,
        totalXPGained: history.reduce((sum, entry) => sum + entry.amount, 0)
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
    console.log(`✅ Returned XP history for ${address}: ${history.length} entries`);

  } catch (error) {
    console.error(`❌ Error getting XP history for ${req.query.address}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve XP history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/player/stats
 * Get comprehensive player stats including current XP, rank, and recent history
 * Query params:
 *   - address: The wallet address to get stats for
 */
router.get('/stats', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address',
        message: 'Please provide a wallet address as query parameter'
      });
    }

    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(address)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        message: 'Address must be a valid Ethereum address'
      });
    }

    console.log(`📊 Getting comprehensive stats for address: ${address}`);

    // Get player rank and history in parallel
    const [playerData, history] = await Promise.all([
      getPlayerXPAndRank(address),
      getPlayerXPHistory(address)
    ]);

    if (!playerData) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'No data found for the provided address',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate additional stats
    const recentHistory = (history || []).slice(-7); // Last 7 entries
    const totalXPGained = (history || []).reduce((sum, entry) => sum + entry.amount, 0);
    const averageXPPerGain = history && history.length > 0 ? 
      Math.round(totalXPGained / history.length) : 0;

    const response = {
      success: true,
      data: {
        address: playerData.address,
        currentXP: playerData.xp,
        rank: playerData.rank,
        isTopFive: playerData.isTopFive,
        lastUpdated: playerData.lastUpdated,
        stats: {
          totalXPGained,
          totalHistoryEntries: (history || []).length,
          averageXPPerGain,
          recentActivity: recentHistory
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
    console.log(`✅ Returned comprehensive stats for ${address}`);

  } catch (error) {
    console.error(`❌ Error getting player stats for ${req.query.address}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve player stats',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;