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