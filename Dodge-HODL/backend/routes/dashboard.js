const express = require('express');
const router = express.Router();
const { db, contracts } = require('../config/database');

// GET /api/dashboard/:address - Get player dashboard data
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Get comprehensive player data
    const [
      playerStats,
      currentRun,
      recentRuns,
      dbpBalance,
      globalStats
    ] = await Promise.all([
      contracts.getPlayerStats(address),
      contracts.getCurrentRun(address),
      db.getRunLogs(address, 10),
      contracts.getPlayerBalance(address),
      contracts.getGlobalStats()
    ]);

    // Get boost balances for all boost types
    const boostBalances = {};
    for (let i = 1; i <= 5; i++) {
      const balance = await contracts.getBoostBalance(address, i);
      boostBalances[i] = balance;
    }

    // Calculate additional metrics
    const totalEarnings = recentRuns.reduce((sum, run) => sum + (run.dbp_minted || 0), 0);
    const winRate = playerStats?.totalRuns > 0 
      ? ((playerStats.completedRuns / playerStats.totalRuns) * 100).toFixed(1)
      : '0.0';

    // Calculate rank (simplified - in production you'd want more efficient ranking)
    const leaderboard = await db.getLeaderboard('cp_earned', 1000);
    const playerRank = leaderboard.findIndex(entry => 
      entry.player_address.toLowerCase() === address.toLowerCase()
    ) + 1;

    res.json({
      success: true,
      data: {
        playerAddress: address,
        stats: {
          ...playerStats,
          winRate: parseFloat(winRate),
          rank: playerRank || 'Unranked',
          totalEarnings
        },
        balances: {
          dbp: dbpBalance || '0',
          boosts: boostBalances
        },
        currentRun,
        recentRuns,
        globalStats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

// GET /api/dashboard/leaderboard/:type - Get leaderboard by type
router.get('/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // Validate leaderboard type
    const validTypes = ['cp_earned', 'dbp_minted', 'duration', 'created_at'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid leaderboard type',
        validTypes
      });
    }

    // Get leaderboard data
    const leaderboard = await db.getLeaderboard(type, limit + offset);
    const paginatedLeaderboard = leaderboard.slice(offset, offset + limit);

    // Get global stats for context
    const globalStats = await contracts.getGlobalStats();

    // Add rank numbers
    const rankedLeaderboard = paginatedLeaderboard.map((entry, index) => ({
      ...entry,
      rank: offset + index + 1
    }));

    res.json({
      success: true,
      data: {
        leaderboard: rankedLeaderboard,
        pagination: {
          page,
          limit,
          total: leaderboard.length,
          hasMore: leaderboard.length > offset + limit
        },
        type,
        globalStats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
});

// GET /api/dashboard/stats/global - Get global game statistics
router.get('/stats/global', async (req, res) => {
  try {
    // Get global blockchain stats
    const globalStats = await contracts.getGlobalStats();

    // Get database analytics
    const [
      totalPlayers,
      recentRuns,
      topPerformers,
      averageStats
    ] = await Promise.all([
      db.supabase.from('run_logs').select('player_address', { count: 'exact', head: true }),
      db.getRunLogs(null, 100), // Recent 100 runs
      db.getLeaderboard('cp_earned', 10),
      db.supabase.from('run_logs').select('cp_earned, duration, dbp_minted').eq('status', 'completed')
    ]);

    // Calculate averages
    const completedRuns = averageStats.data || [];
    const avgCP = completedRuns.length > 0 
      ? (completedRuns.reduce((sum, run) => sum + run.cp_earned, 0) / completedRuns.length).toFixed(1)
      : 0;
    const avgDuration = completedRuns.length > 0 
      ? (completedRuns.reduce((sum, run) => sum + run.duration, 0) / completedRuns.length).toFixed(1)
      : 0;

    // Calculate activity in last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = recentRuns.filter(run => new Date(run.created_at) > last24h);

    res.json({
      success: true,
      data: {
        blockchain: globalStats,
        analytics: {
          totalPlayers: totalPlayers.count || 0,
          activePlayers24h: new Set(recentActivity.map(r => r.player_address)).size,
          averageCP: parseFloat(avgCP),
          averageDuration: parseFloat(avgDuration),
          runsLast24h: recentActivity.length,
          successRate: completedRuns.length > 0 
            ? ((recentActivity.filter(r => r.status === 'completed').length / recentActivity.length) * 100).toFixed(1)
            : 0
        },
        topPerformers: topPerformers.slice(0, 5),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching global stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global statistics',
      message: error.message
    });
  }
});

// GET /api/dashboard/replays/recent - Get recent replay data
router.get('/replays/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Get recent replays
    const replays = await db.getRecentReplays(limit);

    // Add metadata for each replay
    const enhancedReplays = replays.map(replay => ({
      ...replay,
      duration_formatted: `${Math.floor(replay.duration / 60)}:${(replay.duration % 60).toString().padStart(2, '0')}`,
      cp_per_second: replay.duration > 0 ? (replay.cp_earned / replay.duration).toFixed(2) : '0.00'
    }));

    res.json({
      success: true,
      data: {
        replays: enhancedReplays,
        total: replays.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching recent replays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent replays',
      message: error.message
    });
  }
});

// GET /api/dashboard/replay/:runId - Get specific replay data
router.get('/replay/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    // Get replay data
    const replay = await db.getReplay(runId);

    if (!replay) {
      return res.status(404).json({
        success: false,
        error: 'Replay not found'
      });
    }

    res.json({
      success: true,
      data: {
        replay,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching replay:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch replay',
      message: error.message
    });
  }
});

module.exports = router;