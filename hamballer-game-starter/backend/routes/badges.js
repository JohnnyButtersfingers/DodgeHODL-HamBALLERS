const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

/**
 * GET /api/badges/:wallet - Get all badges for a specific wallet
 */
router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    // Check if database is available
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Get badge summary for the wallet
    const { data: badgeSummary, error: summaryError } = await db
      .from('xp_badge_summary')
      .select('*')
      .eq('player_address', wallet.toLowerCase())
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw summaryError;
    }

    // Get detailed badge history
    const { data: badgeHistory, error: historyError } = await db
      .from('run_logs')
      .select(`
        id,
        start_time,
        end_time,
        cp_earned,
        dbp_minted,
        duration,
        xp_badge_token_id,
        xp_badge_tx_hash,
        xp_badge_minted_at,
        created_at
      `)
      .eq('player_address', wallet.toLowerCase())
      .eq('status', 'completed')
      .not('xp_badge_token_id', 'is', null)
      .order('xp_badge_minted_at', { ascending: false });

    if (historyError) {
      throw historyError;
    }

    // Calculate badge tier names and descriptions
    const getBadgeInfo = (tokenId) => {
      const badges = {
        0: { name: 'Participation Badge', description: 'Completed a run with 1-24 XP', rarity: 'Common' },
        1: { name: 'Common Badge', description: 'Earned 25-49 XP in a single run', rarity: 'Common' },
        2: { name: 'Rare Badge', description: 'Earned 50-74 XP in a single run', rarity: 'Rare' },
        3: { name: 'Epic Badge', description: 'Earned 75-99 XP in a single run', rarity: 'Epic' },
        4: { name: 'Legendary Badge', description: 'Earned 100+ XP in a single run', rarity: 'Legendary' }
      };
      return badges[tokenId] || { name: 'Unknown Badge', description: 'Unknown badge type', rarity: 'Unknown' };
    };

    // Enrich badge history with metadata
    const enrichedHistory = badgeHistory.map(badge => ({
      ...badge,
      badge_info: getBadgeInfo(badge.xp_badge_token_id),
      estimated_xp: calculateEstimatedXP({
        cpEarned: badge.cp_earned,
        duration: badge.duration,
        bonusThrowUsed: false, // Not stored in this query
        boostsUsed: []
      })
    }));

    // Group badges by type for easy frontend consumption
    const badgesByType = enrichedHistory.reduce((acc, badge) => {
      const tokenId = badge.xp_badge_token_id;
      if (!acc[tokenId]) {
        acc[tokenId] = {
          tokenId,
          ...getBadgeInfo(tokenId),
          count: 0,
          badges: []
        };
      }
      acc[tokenId].count++;
      acc[tokenId].badges.push(badge);
      return acc;
    }, {});

    // Calculate collection statistics
    const collectionStats = {
      totalBadges: badgeHistory.length,
      uniqueTypes: Object.keys(badgesByType).length,
      participationBadges: badgeSummary?.participation_badges || 0,
      commonBadges: badgeSummary?.common_badges || 0,
      rareBadges: badgeSummary?.rare_badges || 0,
      epicBadges: badgeSummary?.epic_badges || 0,
      legendaryBadges: badgeSummary?.legendary_badges || 0,
      firstBadgeEarned: badgeSummary?.first_badge_earned || null,
      latestBadgeEarned: badgeSummary?.latest_badge_earned || null
    };

    // Calculate completion percentage
    const maxBadgesPerType = 10; // Arbitrary cap for percentage calculation
    const completionPercentage = Math.min(
      (collectionStats.totalBadges / (5 * maxBadgesPerType)) * 100,
      100
    );

    res.json({
      success: true,
      wallet: wallet.toLowerCase(),
      summary: badgeSummary || {
        player_address: wallet.toLowerCase(),
        total_badges_earned: 0,
        participation_badges: 0,
        common_badges: 0,
        rare_badges: 0,
        epic_badges: 0,
        legendary_badges: 0,
        first_badge_earned: null,
        latest_badge_earned: null
      },
      collectionStats,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      badgesByType: Object.values(badgesByType),
      recentBadges: enrichedHistory.slice(0, 10), // Last 10 badges
      totalCount: badgeHistory.length
    });

  } catch (error) {
    console.error('❌ Error fetching badges for wallet:', error);
    res.status(500).json({
      error: 'Failed to fetch badge data',
      code: 'BADGE_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/badges/:wallet/claim-status - Get badge claim status for a specific wallet
 */
router.get('/:wallet/claim-status', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    // Check if database is available
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const walletLower = wallet.toLowerCase();

    // Get badge claim status summary
    const { data: claimStatus, error: claimError } = await db
      .from('badge_claim_status')
      .select('*')
      .eq('player_address', walletLower)
      .single();

    if (claimError && claimError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw claimError;
    }

    // Get detailed claim attempts
    const { data: claimAttempts, error: attemptsError } = await db
      .from('badge_claim_attempts')
      .select(`
        id,
        run_id,
        xp_earned,
        season,
        token_id,
        status,
        tx_hash,
        error_message,
        retry_count,
        last_retry_at,
        created_at,
        updated_at
      `)
      .eq('player_address', walletLower)
      .order('created_at', { ascending: false })
      .limit(50); // Last 50 attempts

    if (attemptsError) {
      throw attemptsError;
    }

    // Get run logs with XP but no badge minted (potential missed claims)
    const { data: missedClaims, error: missedError } = await db
      .from('run_logs')
      .select('id, cp_earned, created_at, duration')
      .eq('player_address', walletLower)
      .eq('status', 'completed')
      .is('xp_badge_token_id', null)
      .gte('cp_earned', 25) // Only runs that should have earned XP
      .order('created_at', { ascending: false })
      .limit(10);

    if (missedError) {
      throw missedError;
    }

    // Calculate badge claim statistics
    const stats = {
      totalAttempts: claimAttempts.length,
      pendingAttempts: claimAttempts.filter(a => a.status === 'pending' || a.status === 'minting').length,
      completedAttempts: claimAttempts.filter(a => a.status === 'completed').length,
      failedAttempts: claimAttempts.filter(a => a.status === 'failed').length,
      abandonedAttempts: claimAttempts.filter(a => a.status === 'abandoned').length,
      successRate: claimAttempts.length > 0 ? 
        (claimAttempts.filter(a => a.status === 'completed').length / claimAttempts.length * 100).toFixed(2) + '%' : 
        '0%'
    };

    // Group attempts by status for easy frontend consumption
    const attemptsByStatus = claimAttempts.reduce((acc, attempt) => {
      if (!acc[attempt.status]) {
        acc[attempt.status] = [];
      }
      acc[attempt.status].push(attempt);
      return acc;
    }, {});

    // Get retry queue statistics from the retryQueue module
    const { retryQueue } = require('../retryQueue');
    const queueStats = retryQueue.getStats();

    res.json({
      success: true,
      wallet: walletLower,
      claimStatus: claimStatus || {
        player_address: walletLower,
        total_earned: 0,
        total_pending: 0,
        total_failed: 0,
        last_claim_attempt: null,
        last_successful_claim: null,
        participation_badges: 0,
        common_badges: 0,
        rare_badges: 0,
        epic_badges: 0,
        legendary_badges: 0,
        updated_at: null
      },
      stats,
      attemptsByStatus,
      recentAttempts: claimAttempts.slice(0, 10),
      potentialMissedClaims: missedClaims || [],
      retryQueueStatus: {
        inQueue: queueStats.queueSize || 0,
        processing: queueStats.processing || false,
        initialized: queueStats.initialized || false,
        retryDistribution: queueStats.retryDistribution || {}
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching badge claim status for wallet:', error);
    res.status(500).json({
      error: 'Failed to fetch badge claim status',
      code: 'CLAIM_STATUS_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/badges/manual-mint - Manual badge minting for testing/admin
 */
router.post('/manual-mint', async (req, res) => {
  try {
    const { playerAddress, xpEarned, season, testMode = false } = req.body;

    // Validate input
    if (!playerAddress || !/^0x[a-fA-F0-9]{40}$/.test(playerAddress)) {
      return res.status(400).json({
        error: 'Invalid player address format',
        code: 'INVALID_PLAYER_ADDRESS'
      });
    }

    if (!xpEarned || xpEarned < 1) {
      return res.status(400).json({
        error: 'XP earned must be at least 1',
        code: 'INVALID_XP_AMOUNT'
      });
    }

    const { mintXPBadge, generateBadgeTokenId, isInitialized } = require('../listeners/runCompletedListener');

    // Check if XPBadge system is initialized
    if (!isInitialized()) {
      return res.status(503).json({
        error: 'XPBadge minting system not initialized',
        code: 'XPBADGE_NOT_INITIALIZED',
        details: 'Check XPBADGE_ADDRESS and XPBADGE_MINTER_PRIVATE_KEY environment variables'
      });
    }

    const tokenId = await generateBadgeTokenId(xpEarned);
    const currentSeason = season || 1; // Default to season 1

    console.log(`🎫 Manual badge mint requested: ${playerAddress} (${xpEarned} XP, Token ID: ${tokenId})`);

    if (testMode) {
      // Test mode - don't actually mint, just return what would happen
      res.json({
        success: true,
        testMode: true,
        playerAddress,
        xpEarned,
        tokenId,
        season: currentSeason,
        message: 'Test mode - no actual minting performed'
      });
      return;
    }

    // Perform actual minting
    const result = await mintXPBadge(playerAddress, xpEarned, currentSeason);

    if (result.success) {
      res.json({
        success: true,
        playerAddress,
        xpEarned,
        tokenId: result.tokenId,
        season: currentSeason,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Badge minting failed',
        code: 'MINTING_FAILED',
        details: result.error,
        reason: result.reason
      });
    }

  } catch (error) {
    console.error('❌ Error in manual badge minting:', error);
    res.status(500).json({
      error: 'Manual badge minting failed',
      code: 'MANUAL_MINT_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/badges/retry-queue/stats - Get retry queue statistics
 */
router.get('/retry-queue/stats', async (req, res) => {
  try {
    const { retryQueue } = require('../retryQueue');
    const { eventRecovery } = require('../eventRecovery');
    
    // Get retry queue stats
    const queueStats = retryQueue.getStats();
    
    // Get event recovery stats
    const recoveryStats = await eventRecovery.getStats();
    
    // Get database stats for badge attempts
    let dbStats = {
      totalAttempts: 0,
      pendingAttempts: 0,
      completedAttempts: 0,
      failedAttempts: 0,
      abandonedAttempts: 0
    };
    
    if (db) {
      try {
        const { data: attemptStats, error } = await db
          .from('badge_claim_attempts')
          .select('status')
          .then(result => {
            if (result.error) throw result.error;
            
            const stats = {
              totalAttempts: result.data.length,
              pendingAttempts: result.data.filter(a => a.status === 'pending' || a.status === 'minting').length,
              completedAttempts: result.data.filter(a => a.status === 'completed').length,
              failedAttempts: result.data.filter(a => a.status === 'failed').length,
              abandonedAttempts: result.data.filter(a => a.status === 'abandoned').length
            };
            
            return { data: stats, error: null };
          });
          
        if (!error) {
          dbStats = attemptStats;
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch database stats:', error.message);
      }
    }

    res.json({
      success: true,
      retryQueue: queueStats,
      eventRecovery: recoveryStats,
      database: dbStats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching retry queue stats:', error);
    res.status(500).json({
      error: 'Failed to fetch retry queue statistics',
      code: 'RETRY_QUEUE_STATS_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/badges/pending - Get all active/pending badge mint attempts
 */
router.get('/pending', async (req, res) => {
  try {
    // Check if database is available
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Get pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 100, 100); // Max 100
    const offset = parseInt(req.query.offset) || 0;

    // Get all pending badge claim attempts
    const { data: pendingAttempts, error } = await db
      .from('badge_claim_attempts')
      .select(`
        id,
        player_address,
        run_id,
        xp_earned,
        season,
        token_id,
        status,
        error_message,
        retry_count,
        last_retry_at,
        created_at,
        updated_at
      `)
      .in('status', ['pending', 'minting', 'failed'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await db
      .from('badge_claim_attempts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'minting', 'failed']);

    if (countError) {
      throw countError;
    }

    // Enhance with metadata for better visibility
    const enhancedAttempts = pendingAttempts.map(attempt => ({
      ...attempt,
      badge_metadata: {
        xp_awarded: attempt.xp_earned,
        calculated_token_id: attempt.token_id,
        season_id: attempt.season,
        badge_tier: getBadgeTierName(attempt.token_id)
      },
      retry_metadata: {
        current_retry: attempt.retry_count,
        max_retries: 5,
        next_retry_estimated: attempt.last_retry_at ? 
          calculateNextRetryTime(attempt.retry_count, attempt.last_retry_at) : 
          'immediate',
        time_since_created: Math.floor((new Date() - new Date(attempt.created_at)) / 1000)
      }
    }));

    // Group by status for easy filtering
    const attemptsByStatus = enhancedAttempts.reduce((acc, attempt) => {
      if (!acc[attempt.status]) {
        acc[attempt.status] = [];
      }
      acc[attempt.status].push(attempt);
      return acc;
    }, {});

    res.json({
      success: true,
      pendingAttempts: enhancedAttempts,
      attemptsByStatus,
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0)
      },
      summary: {
        totalPending: enhancedAttempts.length,
        byStatus: {
          pending: enhancedAttempts.filter(a => a.status === 'pending').length,
          minting: enhancedAttempts.filter(a => a.status === 'minting').length,
          failed: enhancedAttempts.filter(a => a.status === 'failed').length
        }
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching pending badge attempts:', error);
    res.status(500).json({
      error: 'Failed to fetch pending badge attempts',
      code: 'PENDING_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * Helper function to get badge tier name from token ID
 */
function getBadgeTierName(tokenId) {
  const tiers = {
    0: 'Participation',
    1: 'Common',
    2: 'Rare', 
    3: 'Epic',
    4: 'Legendary'
  };
  return tiers[tokenId] || 'Unknown';
}

/**
 * Helper function to calculate next retry time
 */
function calculateNextRetryTime(retryCount, lastRetryAt) {
  if (!lastRetryAt) return 'immediate';
  
  const baseDelay = 15000; // 15 seconds
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, retryCount),
    300000 // 5 minutes max
  );
  
  const nextRetryTime = new Date(new Date(lastRetryAt).getTime() + exponentialDelay);
  const now = new Date();
  
  if (nextRetryTime <= now) {
    return 'ready now';
  }
  
  const secondsUntilRetry = Math.ceil((nextRetryTime - now) / 1000);
  return `${secondsUntilRetry}s`;
}

/**
 * POST /api/badges/retry-queue/manual-recovery - Manual event recovery for specific block range
 */
router.post('/retry-queue/manual-recovery', async (req, res) => {
  try {
    const { fromBlock, toBlock } = req.body;
    
    // Validate input
    if (!fromBlock || !toBlock || fromBlock < 0 || toBlock < fromBlock) {
      return res.status(400).json({
        error: 'Invalid block range. fromBlock and toBlock must be valid positive numbers with toBlock >= fromBlock',
        code: 'INVALID_BLOCK_RANGE'
      });
    }
    
    if (toBlock - fromBlock > 10000) {
      return res.status(400).json({
        error: 'Block range too large. Maximum range is 10,000 blocks',
        code: 'BLOCK_RANGE_TOO_LARGE'
      });
    }
    
    const { eventRecovery } = require('../eventRecovery');
    
    if (!eventRecovery.isInitialized) {
      return res.status(503).json({
        error: 'Event recovery system not initialized',
        code: 'EVENT_RECOVERY_NOT_INITIALIZED'
      });
    }
    
    console.log(`🔧 Manual event recovery requested for blocks ${fromBlock} to ${toBlock}`);
    
    const recoveredCount = await eventRecovery.manualRecovery(fromBlock, toBlock);
    
    res.json({
      success: true,
      fromBlock,
      toBlock,
      recoveredEvents: recoveredCount,
      message: `Successfully processed ${recoveredCount} missed events from blocks ${fromBlock} to ${toBlock}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in manual recovery:', error);
    res.status(500).json({
      error: 'Manual recovery failed',
      code: 'MANUAL_RECOVERY_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/badges/stats/global - Global badge statistics
 */
router.get('/stats/global', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Get global badge statistics
    const { data: globalStats, error } = await db
      .from('run_logs')
      .select('xp_badge_token_id, xp_badge_minted_at')
      .not('xp_badge_token_id', 'is', null);

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      totalBadgesMinted: globalStats.length,
      badgesByType: {
        participation: globalStats.filter(b => b.xp_badge_token_id === 0).length,
        common: globalStats.filter(b => b.xp_badge_token_id === 1).length,
        rare: globalStats.filter(b => b.xp_badge_token_id === 2).length,
        epic: globalStats.filter(b => b.xp_badge_token_id === 3).length,
        legendary: globalStats.filter(b => b.xp_badge_token_id === 4).length
      },
      uniqueHolders: await getUniqueHoldersCount(),
      recentMints: globalStats
        .sort((a, b) => new Date(b.xp_badge_minted_at) - new Date(a.xp_badge_minted_at))
        .slice(0, 10)
    };

    res.json({
      success: true,
      stats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching global badge stats:', error);
    res.status(500).json({
      error: 'Failed to fetch global badge statistics',
      code: 'GLOBAL_STATS_ERROR',
      details: error.message
    });
  }
});

/**
 * Helper function to calculate estimated XP (simplified version)
 */
function calculateEstimatedXP(runData) {
  const baseXP = 10;
  const cpMultiplier = Math.floor((runData.cpEarned || 0) / 100);
  const durationBonus = Math.floor((runData.duration || 0) / 30);
  const bonusThrowXP = runData.bonusThrowUsed ? 25 : 0;
  const boostXP = (runData.boostsUsed || []).length * 5;

  return baseXP + cpMultiplier + durationBonus + bonusThrowXP + boostXP;
}

/**
 * Helper function to get unique badge holders count
 */
async function getUniqueHoldersCount() {
  try {
    const { data, error } = await db
      .from('run_logs')
      .select('player_address')
      .not('xp_badge_token_id', 'is', null);

    if (error) throw error;

    const uniqueAddresses = new Set(data.map(row => row.player_address));
    return uniqueAddresses.size;
  } catch (error) {
    console.error('Error getting unique holders count:', error);
    return 0;
  }
}

module.exports = router;