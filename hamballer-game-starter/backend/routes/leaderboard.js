const express = require('express');
const router = express.Router();
const { getXpLeaderboard, getPlayerXPAndRank, updatePlayerXP } = require('../utils/xpStoreV2');

// TODO: Replace local JSON store with database queries or blockchain contract calls
// Options for future implementation:
// 1. Supabase queries: SELECT address, xp FROM player_stats ORDER BY xp DESC LIMIT ? OFFSET ?
// 2. Contract calls: hodlManager.getTopPlayers() or similar view function
// 3. Hybrid approach: Contract events -> Database cache -> API responses

// WebSocket broadcasting utility
function broadcastLeaderboardUpdate(type, data) {
  if (!global.wsClients) return;

  const message = JSON.stringify({
    type: 'leaderboard_update',
    updateType: type,
    data,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  global.wsClients.forEach(client => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        if (!client.subscriptions || 
            client.subscriptions.includes('leaderboard') || 
            client.subscriptions.includes('all')) {
          client.send(message);
          sentCount++;
        }
      }
    } catch (error) {
      console.error('❌ Leaderboard broadcast error:', error);
    }
  });

  console.log(`📊 Leaderboard update broadcast to ${sentCount} clients`);
}

// GET /api/leaderboard - Get paginated leaderboard with optional search/filter
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching leaderboard data from XP store');

    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 per page
    const search = req.query.search || '';
    const minXp = parseInt(req.query.minXp) || 0;
    const maxXp = parseInt(req.query.maxXp) || Infinity;

    // Get all players from the XP store (sorted by XP descending)
    const allPlayers = await getXpLeaderboard();
    
    // Apply search filter (if provided)
    let filteredPlayers = allPlayers;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredPlayers = allPlayers.filter(player => 
        player.address.toLowerCase().includes(searchLower)
      );
    }

    // Apply XP range filter
    filteredPlayers = filteredPlayers.filter(player => 
      player.xp >= minXp && player.xp <= maxXp
    );

    // Calculate pagination
    const totalCount = filteredPlayers.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const paginatedPlayers = filteredPlayers.slice(offset, offset + limit);

    // Add rank information to each player
    const playersWithRank = paginatedPlayers.map((player, index) => ({
      ...player,
      rank: offset + index + 1,
      globalRank: allPlayers.findIndex(p => p.address === player.address) + 1
    }));

    res.json({
      success: true,
      data: playersWithRank,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        minXp,
        maxXp: maxXp === Infinity ? null : maxXp
      },
      timestamp: new Date().toISOString(),
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

// GET /api/leaderboard/top/:count - Get top N players (backwards compatibility)
router.get('/top/:count', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 5, 50); // Max 50 players
    console.log(`📊 Fetching top ${count} players`);

    const allPlayers = await getXpLeaderboard();
    const topPlayers = allPlayers.slice(0, count).map((player, index) => ({
      ...player,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: topPlayers,
      count: topPlayers.length,
      timestamp: new Date().toISOString(),
      source: 'local_xp_store'
    });

  } catch (error) {
    console.error('❌ Error fetching top players:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top players',
      message: error.message
    });
  }
});

// GET /api/leaderboard/rank/:address - Get specific user's rank (enhanced)
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

    // Get additional context (players around this user)
    const allPlayers = await getXpLeaderboard();
    const userIndex = allPlayers.findIndex(p => 
      p.address.toLowerCase() === address.toLowerCase()
    );

    const context = {
      above: userIndex > 0 ? allPlayers[userIndex - 1] : null,
      below: userIndex < allPlayers.length - 1 ? allPlayers[userIndex + 1] : null
    };

    res.json({
      success: true,
      data: {
        ...userRank,
        context
      },
      timestamp: new Date().toISOString(),
      source: 'local_xp_store'
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

// POST /api/leaderboard/update - Update player XP (with WebSocket broadcast)
router.post('/update', async (req, res) => {
  try {
    const { address, xp } = req.body;

    // Validate input
    if (!address || typeof xp !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: address and xp (number) are required'
      });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Update XP in store
    await updatePlayerXP(address, xp);

    // Get updated player rank
    const updatedRank = await getPlayerXPAndRank(address);

    // Broadcast update to WebSocket clients
    broadcastLeaderboardUpdate('xp_update', {
      address,
      xp,
      rank: updatedRank?.rank,
      isTopFive: updatedRank?.isTopFive
    });

    res.json({
      success: true,
      message: 'XP updated successfully',
      data: updatedRank,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating XP:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update XP',
      message: error.message
    });
  }
});

// GET /api/leaderboard/stats - Get leaderboard statistics
router.get('/stats', async (req, res) => {
  try {
    const allPlayers = await getXpLeaderboard();
    
    const stats = {
      totalPlayers: allPlayers.length,
      totalXP: allPlayers.reduce((sum, player) => sum + player.xp, 0),
      averageXP: allPlayers.length > 0 ? 
        Math.round(allPlayers.reduce((sum, player) => sum + player.xp, 0) / allPlayers.length) : 0,
      highestXP: allPlayers.length > 0 ? allPlayers[0].xp : 0,
      lowestXP: allPlayers.length > 0 ? allPlayers[allPlayers.length - 1].xp : 0,
      topTenThreshold: allPlayers.length >= 10 ? allPlayers[9].xp : 0
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
      source: 'local_xp_store'
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard statistics',
      message: error.message
    });
  }
});

// WebSocket endpoint for testing broadcasts
router.post('/broadcast-test', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    broadcastLeaderboardUpdate(type || 'test', data || { message: 'Test broadcast' });
    
    res.json({
      success: true,
      message: 'Broadcast sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send broadcast',
      message: error.message
    });
  }
});

module.exports = router;