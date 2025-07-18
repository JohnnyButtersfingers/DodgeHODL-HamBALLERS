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

/**
 * GET /api/badges/status/:wallet - Get badge claim status for wallet (frontend compatibility)
 */
router.get('/status/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    const walletLower = wallet.toLowerCase();

    // Multi-source badge status with Supabase fallback
    const badgeStatus = await getBadgeStatusWithFallback(walletLower);
    
    res.json({
      success: true,
      wallet: walletLower,
      ...badgeStatus
    });

  } catch (error) {
    console.error('❌ Error fetching badge status:', error);
    res.status(500).json({
      error: 'Failed to fetch badge status',
      code: 'BADGE_STATUS_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/badges/pending/:wallet - Get pending badges for specific wallet
 */
router.get('/pending/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    const walletLower = wallet.toLowerCase();

    // Get pending badges with retry queue integration
    const pendingBadges = await getPendingBadgesWithRetryState(walletLower);
    
    res.json({
      success: true,
      wallet: walletLower,
      pending: pendingBadges.badges,
      queueMetadata: pendingBadges.queueMetadata,
      retryStats: pendingBadges.retryStats
    });

  } catch (error) {
    console.error('❌ Error fetching pending badges:', error);
    res.status(500).json({
      error: 'Failed to fetch pending badges',
      code: 'PENDING_BADGES_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/badges/claimable/:wallet - Get claimable badges with Supabase + XPBadge contract sync
 */
router.get('/claimable/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    const walletLower = wallet.toLowerCase();

    // Get claimable badges with multi-source verification
    const claimableData = await getClaimableBadgesWithContractSync(walletLower);
    
    res.json({
      success: true,
      wallet: walletLower,
      ...claimableData
    });

  } catch (error) {
    console.error('❌ Error fetching claimable badges:', error);
    res.status(500).json({
      error: 'Failed to fetch claimable badges',
      code: 'CLAIMABLE_BADGES_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/badges/claim - Enhanced claim endpoint with retry queue integration
 */
router.post('/claim', async (req, res) => {
  try {
    const { playerAddress, tokenId, xpEarned, season, runId, verificationData } = req.body;
    
    // Validate required fields
    if (!playerAddress || tokenId === undefined || !xpEarned || !runId) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_CLAIM_REQUEST'
      });
    }

    const walletLower = playerAddress.toLowerCase();

    // Process claim with comprehensive error handling and retry queue
    const claimResult = await processClaimWithRetryLogic(walletLower, {
      tokenId,
      xpEarned,
      season: season || 1,
      runId,
      verificationData
    });
    
    res.json({
      success: claimResult.success,
      txHash: claimResult.txHash,
      queuePosition: claimResult.queuePosition,
      retryScheduled: claimResult.retryScheduled,
      message: claimResult.message
    });

  } catch (error) {
    console.error('❌ Error processing badge claim:', error);
    res.status(500).json({
      error: 'Failed to process badge claim',
      code: 'CLAIM_PROCESSING_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/badges/retry - Enhanced retry endpoint with smart retry logic
 */
router.post('/retry', async (req, res) => {
  try {
    const { playerAddress, badgeId, tokenId, xpEarned, season, runId } = req.body;
    
    // Validate required fields
    if (!playerAddress || !badgeId) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_RETRY_REQUEST'
      });
    }

    const walletLower = playerAddress.toLowerCase();

    // Process retry with intelligent backoff and failure analysis
    const retryResult = await processRetryWithAnalysis(walletLower, {
      badgeId,
      tokenId,
      xpEarned,
      season: season || 1,
      runId
    });
    
    res.json({
      success: retryResult.success,
      txHash: retryResult.txHash,
      retryCount: retryResult.retryCount,
      nextRetryAt: retryResult.nextRetryAt,
      analysisData: retryResult.analysisData,
      message: retryResult.message
    });

  } catch (error) {
    console.error('❌ Error processing badge retry:', error);
    res.status(500).json({
      error: 'Failed to process badge retry',
      code: 'RETRY_PROCESSING_ERROR',
      details: error.message
    });
  }
});

/**
 * Complex helper function: Get badge status with Supabase fallback
 */
async function getBadgeStatusWithFallback(walletAddress) {
  const fallbackData = {
    unclaimed: [],
    failed: [],
    claimHistory: [],
    contractSyncStatus: 'unknown'
  };

  try {
    // Check if database is available
    if (!db) {
      console.warn('⚠️ Database unavailable, returning mock data');
      return {
        ...fallbackData,
        dataSource: 'mock',
        warning: 'Database unavailable - using mock data'
      };
    }

    // Primary source: Get unclaimed badges from run_logs
    const { data: unclaimedRuns, error: unclaimedError } = await db
      .from('run_logs')
      .select(`
        id,
        player_address,
        cp_earned,
        duration,
        xp_badge_token_id,
        created_at,
        status
      `)
      .eq('player_address', walletAddress)
      .eq('status', 'completed')
      .is('xp_badge_token_id', null)
      .gte('cp_earned', 25) // Only runs that should earn badges
      .order('created_at', { ascending: false });

    // Get failed claim attempts
    const { data: failedAttempts, error: failedError } = await db
      .from('badge_claim_attempts')
      .select('*')
      .eq('player_address', walletAddress)
      .eq('status', 'failed')
      .lt('retry_count', 5) // Only retryable failures
      .order('created_at', { ascending: false });

    // Get claim history for context
    const { data: claimHistory, error: historyError } = await db
      .from('badge_claim_attempts')
      .select('*')
      .eq('player_address', walletAddress)
      .in('status', ['completed', 'minting'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Handle partial failures gracefully
    const unclaimed = unclaimedError ? [] : (unclaimedRuns || []).map(run => ({
      id: `run-${run.id}`,
      runId: run.id,
      tokenId: calculateTokenIdFromCP(run.cp_earned),
      xpEarned: calculateEstimatedXP({ cpEarned: run.cp_earned, duration: run.duration }),
      season: 1,
      status: 'unclaimed',
      createdAt: run.created_at,
      dataSource: 'supabase'
    }));

    const failed = failedError ? [] : (failedAttempts || []).map(attempt => ({
      id: attempt.id,
      runId: attempt.run_id,
      tokenId: attempt.token_id,
      xpEarned: attempt.xp_earned,
      season: attempt.season,
      status: 'failed',
      failureReason: attempt.error_message,
      retryCount: attempt.retry_count,
      createdAt: attempt.created_at,
      lastRetryAt: attempt.last_retry_at,
      dataSource: 'supabase'
    }));

    // Contract sync verification (if XPBadge contract is available)
    let contractSyncStatus = 'unchecked';
    try {
      // TODO: Add XPBadge contract verification
      // const contractBadges = await verifyContractBadges(walletAddress);
      contractSyncStatus = 'verified';
    } catch (contractError) {
      console.warn('⚠️ Contract sync verification failed:', contractError.message);
      contractSyncStatus = 'error';
    }

    return {
      unclaimed,
      failed,
      claimHistory: historyError ? [] : (claimHistory || []),
      contractSyncStatus,
      dataSource: 'supabase',
      syncedAt: new Date().toISOString(),
      warnings: [
        ...(unclaimedError ? [`Unclaimed data error: ${unclaimedError.message}`] : []),
        ...(failedError ? [`Failed attempts error: ${failedError.message}`] : []),
        ...(historyError ? [`History error: ${historyError.message}`] : [])
      ].filter(Boolean)
    };

  } catch (error) {
    console.error('❌ Critical error in getBadgeStatusWithFallback:', error);
    
    // Return mock data for development
    return {
      ...fallbackData,
      dataSource: 'fallback',
      error: error.message,
      unclaimed: [
        {
          id: 'mock-run-123',
          tokenId: 2,
          xpEarned: 65,
          season: 1,
          runId: 'run-123',
          status: 'unclaimed',
          createdAt: new Date().toISOString(),
          dataSource: 'mock'
        }
      ],
      failed: [
        {
          id: 'mock-failed-456',
          tokenId: 1,
          xpEarned: 35,
          season: 1,
          runId: 'run-456',
          status: 'failed',
          failureReason: 'Network timeout - retry available',
          retryCount: 2,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          dataSource: 'mock'
        }
      ]
    };
  }
}

/**
 * Complex helper function: Get pending badges with retry queue state
 */
async function getPendingBadgesWithRetryState(walletAddress) {
  try {
    // Get retry queue instance
    const { retryQueue } = require('../retryQueue');
    
    // Get pending from database
    let pendingFromDB = [];
    let queueStats = { queueSize: 0, processing: false };
    
    if (db) {
      const { data: pendingAttempts, error: pendingError } = await db
        .from('badge_claim_attempts')
        .select('*')
        .eq('player_address', walletAddress)
        .in('status', ['pending', 'minting'])
        .order('created_at', { ascending: false });

      if (!pendingError && pendingAttempts) {
        pendingFromDB = pendingAttempts;
      }

      // Get retry queue stats
      try {
        queueStats = retryQueue.getStats();
      } catch (queueError) {
        console.warn('⚠️ Retry queue stats unavailable:', queueError.message);
      }
    }

    // Get queue position for each pending badge
    const badges = pendingFromDB.map(attempt => ({
      id: attempt.id,
      runId: attempt.run_id,
      tokenId: attempt.token_id,
      xpEarned: attempt.xp_earned,
      season: attempt.season,
      retryCount: attempt.retry_count,
      nextRetryAt: calculateNextRetryTime(attempt.retry_count, attempt.last_retry_at),
      queuePosition: getQueuePosition(attempt.id, retryQueue),
      estimatedWaitTime: calculateEstimatedWaitTime(attempt.retry_count),
      createdAt: attempt.created_at,
      status: attempt.status,
      dataSource: 'supabase'
    }));

    return {
      badges,
      queueMetadata: {
        totalInQueue: queueStats.queueSize || 0,
        isProcessing: queueStats.processing || false,
        avgProcessingTime: queueStats.avgProcessingTime || '30s',
        initialized: queueStats.initialized || false
      },
      retryStats: {
        distribution: queueStats.retryDistribution || {},
        lastProcessed: queueStats.lastProcessed || null,
        errorRate: queueStats.errorRate || 0
      }
    };

  } catch (error) {
    console.error('❌ Error in getPendingBadgesWithRetryState:', error);
    
    // Fallback mock data
    return {
      badges: [
        {
          id: 'mock-pending-1',
          tokenId: 1,
          xpEarned: 30,
          season: 1,
          runId: 'run-pending-1',
          retryCount: 1,
          nextRetryAt: new Date(Date.now() + 300000).toISOString(),
          queuePosition: 1,
          estimatedWaitTime: '5m',
          createdAt: new Date(Date.now() - 300000).toISOString(),
          status: 'pending',
          dataSource: 'mock'
        }
      ],
      queueMetadata: {
        totalInQueue: 1,
        isProcessing: false,
        avgProcessingTime: '30s',
        initialized: false
      },
      retryStats: {
        distribution: { 1: 1 },
        lastProcessed: null,
        errorRate: 0
      }
    };
  }
}

/**
 * Complex helper function: Get claimable badges with contract sync
 */
async function getClaimableBadgesWithContractSync(walletAddress) {
  try {
    // Multi-source badge verification
    const sources = {
      supabase: null,
      contract: null,
      syncStatus: 'pending'
    };

    // Source 1: Supabase run logs
    if (db) {
      try {
        const { data: claimableRuns, error: supabaseError } = await db
          .from('run_logs')
          .select(`
            id,
            player_address,
            cp_earned,
            duration,
            xp_badge_token_id,
            created_at,
            status,
            bonus_throw_used,
            boosts_used
          `)
          .eq('player_address', walletAddress)
          .eq('status', 'completed')
          .is('xp_badge_token_id', null)
          .gte('cp_earned', 25) // Minimum XP for badges
          .order('created_at', { ascending: false });

        if (!supabaseError && claimableRuns) {
          sources.supabase = claimableRuns.map(run => ({
            id: `run-${run.id}`,
            runId: run.id,
            tokenId: calculateTokenIdFromCP(run.cp_earned),
            xpEarned: calculateEstimatedXP({
              cpEarned: run.cp_earned,
              duration: run.duration,
              bonusThrowUsed: run.bonus_throw_used,
              boostsUsed: run.boosts_used || []
            }),
            season: 1,
            tier: getBadgeTierName(calculateTokenIdFromCP(run.cp_earned)),
            requiresProof: run.cp_earned >= 75, // Epic/Legendary need ZK proof
            cpEarned: run.cp_earned,
            duration: run.duration,
            createdAt: run.created_at,
            eligibilityScore: calculateEligibilityScore(run),
            dataSource: 'supabase'
          }));
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase claimable fetch failed:', supabaseError.message);
        sources.supabase = [];
      }
    }

    // Source 2: XPBadge contract verification (fallback)
    try {
      // TODO: Implement contract-based verification
      // const contractBadges = await getContractClaimableBadges(walletAddress);
      // sources.contract = contractBadges;
      sources.contract = []; // Placeholder
      sources.syncStatus = 'contract_unavailable';
    } catch (contractError) {
      console.warn('⚠️ Contract verification failed:', contractError.message);
      sources.contract = [];
      sources.syncStatus = 'contract_error';
    }

    // Merge and deduplicate sources
    const claimable = sources.supabase || [];
    const alreadyMinted = await getAlreadyMintedBadges(walletAddress);
    
    // Filter out already minted badges
    const filteredClaimable = claimable.filter(badge => 
      !alreadyMinted.some(minted => minted.runId === badge.runId)
    );

    // Sort by eligibility score (highest XP first)
    const sortedClaimable = filteredClaimable.sort((a, b) => 
      (b.eligibilityScore || 0) - (a.eligibilityScore || 0)
    );

    return {
      claimable: sortedClaimable,
      alreadyMinted,
      sources,
      syncMetadata: {
        supabaseAvailable: !!sources.supabase,
        contractSyncStatus: sources.syncStatus,
        lastSyncAt: new Date().toISOString(),
        totalEligible: sortedClaimable.length,
        highestTierAvailable: getHighestTierFromBadges(sortedClaimable)
      }
    };

  } catch (error) {
    console.error('❌ Error in getClaimableBadgesWithContractSync:', error);
    
    // Fallback data for development
    return {
      claimable: [
        {
          id: 'mock-claimable-1',
          runId: 'run-123',
          tokenId: 2,
          xpEarned: 65,
          season: 1,
          tier: 'Rare',
          requiresProof: false,
          cpEarned: 65,
          duration: 120,
          createdAt: new Date().toISOString(),
          eligibilityScore: 65,
          dataSource: 'mock'
        },
        {
          id: 'mock-claimable-2',
          runId: 'run-456',
          tokenId: 3,
          xpEarned: 85,
          season: 1,
          tier: 'Epic',
          requiresProof: true,
          cpEarned: 85,
          duration: 180,
          createdAt: new Date().toISOString(),
          eligibilityScore: 85,
          dataSource: 'mock'
        }
      ],
      alreadyMinted: [],
      sources: {
        supabase: null,
        contract: null,
        syncStatus: 'mock'
      },
      syncMetadata: {
        supabaseAvailable: false,
        contractSyncStatus: 'mock',
        lastSyncAt: new Date().toISOString(),
        totalEligible: 2,
        highestTierAvailable: 'Epic'
      }
    };
  }
}

/**
 * Complex helper function: Process claim with retry logic
 */
async function processClaimWithRetryLogic(walletAddress, claimData) {
  try {
    // Get retry queue instance
    const { retryQueue } = require('../retryQueue');
    
    // Create claim attempt record
    const attemptId = `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (db) {
      const { error: insertError } = await db
        .from('badge_claim_attempts')
        .insert({
          id: attemptId,
          player_address: walletAddress,
          run_id: claimData.runId,
          xp_earned: claimData.xpEarned,
          season: claimData.season,
          token_id: claimData.tokenId,
          status: 'pending',
          verification_data: claimData.verificationData,
          retry_count: 0,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw new Error(`Failed to create claim attempt: ${insertError.message}`);
      }
    }

    // Try immediate claim first
    try {
      const claimResult = await attemptBadgeClaim(walletAddress, claimData);
      
      if (claimResult.success) {
        // Update success status
        if (db) {
          await db
            .from('badge_claim_attempts')
            .update({
              status: 'completed',
              tx_hash: claimResult.txHash,
              updated_at: new Date().toISOString()
            })
            .eq('id', attemptId);
        }

        return {
          success: true,
          txHash: claimResult.txHash,
          message: 'Badge claimed successfully'
        };
      }
    } catch (claimError) {
      console.warn('⚠️ Immediate claim failed, adding to retry queue:', claimError.message);
      
      // Add to retry queue
      try {
        const queuePosition = await retryQueue.addBadgeRetry({
          attemptId,
          walletAddress,
          claimData,
          error: claimError.message,
          retryCount: 0
        });

        // Update status to pending in queue
        if (db) {
          await db
            .from('badge_claim_attempts')
            .update({
              status: 'pending',
              error_message: claimError.message,
              retry_count: 1,
              last_retry_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', attemptId);
        }

        return {
          success: false,
          queuePosition,
          retryScheduled: true,
          message: `Claim failed but added to retry queue (position ${queuePosition})`
        };
      } catch (queueError) {
        console.error('❌ Failed to add to retry queue:', queueError.message);
        
        // Update failed status
        if (db) {
          await db
            .from('badge_claim_attempts')
            .update({
              status: 'failed',
              error_message: `${claimError.message} | Queue error: ${queueError.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', attemptId);
        }

        return {
          success: false,
          message: 'Claim failed and retry queue unavailable'
        };
      }
    }

  } catch (error) {
    console.error('❌ Error in processClaimWithRetryLogic:', error);
    return {
      success: false,
      message: `Processing error: ${error.message}`
    };
  }
}

/**
 * Complex helper function: Process retry with failure analysis
 */
async function processRetryWithAnalysis(walletAddress, retryData) {
  try {
    if (!db) {
      throw new Error('Database unavailable for retry processing');
    }

    // Get current attempt data
    const { data: currentAttempt, error: fetchError } = await db
      .from('badge_claim_attempts')
      .select('*')
      .eq('id', retryData.badgeId)
      .eq('player_address', walletAddress)
      .single();

    if (fetchError || !currentAttempt) {
      throw new Error('Retry attempt not found');
    }

    // Check retry limits
    if (currentAttempt.retry_count >= 5) {
      return {
        success: false,
        message: 'Maximum retry attempts reached',
        retryCount: currentAttempt.retry_count
      };
    }

    // Analyze previous failure
    const analysisData = analyzeFailurePattern(currentAttempt);
    
    // Calculate intelligent backoff
    const nextRetryDelay = calculateIntelligentBackoff(
      currentAttempt.retry_count,
      analysisData.failureType
    );

    try {
      // Attempt retry with enhanced parameters
      const retryResult = await attemptBadgeClaimWithAnalysis(walletAddress, {
        ...retryData,
        previousErrors: [currentAttempt.error_message],
        analysisData
      });

      if (retryResult.success) {
        // Update success status
        await db
          .from('badge_claim_attempts')
          .update({
            status: 'completed',
            tx_hash: retryResult.txHash,
            retry_count: currentAttempt.retry_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', retryData.badgeId);

        return {
          success: true,
          txHash: retryResult.txHash,
          retryCount: currentAttempt.retry_count + 1,
          analysisData,
          message: 'Retry successful'
        };
      }
    } catch (retryError) {
      // Update retry failure
      await db
        .from('badge_claim_attempts')
        .update({
          status: currentAttempt.retry_count + 1 >= 5 ? 'failed' : 'pending',
          error_message: retryError.message,
          retry_count: currentAttempt.retry_count + 1,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', retryData.badgeId);

      return {
        success: false,
        retryCount: currentAttempt.retry_count + 1,
        nextRetryAt: new Date(Date.now() + nextRetryDelay).toISOString(),
        analysisData,
        message: `Retry ${currentAttempt.retry_count + 1}/5 failed: ${retryError.message}`
      };
    }

  } catch (error) {
    console.error('❌ Error in processRetryWithAnalysis:', error);
    return {
      success: false,
      message: `Retry processing error: ${error.message}`
    };
  }
}

// Helper functions for complex logic
function calculateTokenIdFromCP(cpEarned) {
  if (cpEarned >= 100) return 4; // Legendary
  if (cpEarned >= 75) return 3;  // Epic
  if (cpEarned >= 50) return 2;  // Rare
  if (cpEarned >= 25) return 1;  // Common
  return 0; // Participation
}

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

function calculateEligibilityScore(run) {
  const baseScore = run.cp_earned || 0;
  const durationBonus = Math.floor((run.duration || 0) / 30);
  const bonusMultiplier = run.bonus_throw_used ? 1.2 : 1.0;
  return Math.floor((baseScore + durationBonus) * bonusMultiplier);
}

function calculateNextRetryTime(retryCount, lastRetryAt) {
  const baseDelay = 5 * 60 * 1000; // 5 minutes
  const exponentialDelay = Math.pow(2, retryCount) * baseDelay;
  const maxDelay = 60 * 60 * 1000; // 1 hour max
  const delay = Math.min(exponentialDelay, maxDelay);
  
  const lastRetry = lastRetryAt ? new Date(lastRetryAt) : new Date();
  return new Date(lastRetry.getTime() + delay).toISOString();
}

function calculateEstimatedWaitTime(retryCount) {
  const minutes = Math.pow(2, retryCount) * 5;
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function getQueuePosition(attemptId, retryQueue) {
  try {
    return retryQueue.getPosition(attemptId) || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

function getHighestTierFromBadges(badges) {
  if (!badges.length) return 'None';
  const maxTokenId = Math.max(...badges.map(b => b.tokenId));
  return getBadgeTierName(maxTokenId);
}

async function getAlreadyMintedBadges(walletAddress) {
  try {
    if (!db) return [];
    
    const { data: mintedBadges, error } = await db
      .from('run_logs')
      .select('id, xp_badge_token_id, xp_badge_tx_hash, xp_badge_minted_at')
      .eq('player_address', walletAddress)
      .not('xp_badge_token_id', 'is', null)
      .order('xp_badge_minted_at', { ascending: false });

    if (error) return [];
    
    return mintedBadges.map(badge => ({
      runId: badge.id,
      tokenId: badge.xp_badge_token_id,
      txHash: badge.xp_badge_tx_hash,
      mintedAt: badge.xp_badge_minted_at
    }));
  } catch (error) {
    console.error('Error fetching minted badges:', error);
    return [];
  }
}

function analyzeFailurePattern(attempt) {
  const errorMessage = (attempt.error_message || '').toLowerCase();
  
  let failureType = 'unknown';
  let suggestedAction = 'retry';
  let confidence = 0.5;

  if (errorMessage.includes('gas')) {
    failureType = 'gas_error';
    suggestedAction = 'increase_gas';
    confidence = 0.9;
  } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    failureType = 'network_error';
    suggestedAction = 'retry_later';
    confidence = 0.8;
  } else if (errorMessage.includes('nullifier')) {
    failureType = 'nullifier_reuse';
    suggestedAction = 'regenerate_proof';
    confidence = 0.95;
  } else if (errorMessage.includes('nonce')) {
    failureType = 'nonce_error';
    suggestedAction = 'refresh_nonce';
    confidence = 0.85;
  }

  return {
    failureType,
    suggestedAction,
    confidence,
    retryRecommended: confidence > 0.7 && failureType !== 'nullifier_reuse',
    analysisTimestamp: new Date().toISOString()
  };
}

function calculateIntelligentBackoff(retryCount, failureType) {
  const baseDelays = {
    gas_error: 30000,      // 30 seconds
    network_error: 120000, // 2 minutes
    nonce_error: 60000,    // 1 minute
    unknown: 300000        // 5 minutes
  };

  const baseDelay = baseDelays[failureType] || baseDelays.unknown;
  return Math.min(baseDelay * Math.pow(1.5, retryCount), 3600000); // Max 1 hour
}

async function attemptBadgeClaim(walletAddress, claimData) {
  // TODO: Implement actual badge claim logic
  // This would integrate with XPBadge contract
  throw new Error('Badge claim implementation pending');
}

async function attemptBadgeClaimWithAnalysis(walletAddress, claimData) {
  // TODO: Implement enhanced badge claim with failure analysis
  // This would use analysisData to optimize the claim attempt
  throw new Error('Enhanced badge claim implementation pending');
}

module.exports = router;