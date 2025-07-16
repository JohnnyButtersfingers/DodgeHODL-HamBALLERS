const express = require('express');
const router = express.Router();
const { achievementsService } = require('../services/achievementsService');
const { xpVerifierService } = require('../services/xpVerifierService');
const { db } = require('../config/database');

/**
 * GET /api/achievements/:wallet - Get player's achievements and progress
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

    // Get player achievements data
    const achievementsData = await achievementsService.getPlayerAchievements(wallet);
    
    res.json({
      success: true,
      wallet: wallet.toLowerCase(),
      achievements: achievementsData.unlocked,
      progress: achievementsData.progress,
      summary: achievementsData.summary,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching player achievements:', error);
    res.status(500).json({
      error: 'Failed to fetch achievements data',
      code: 'ACHIEVEMENTS_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/achievements/types/all - Get all available achievement types
 */
router.get('/types/all', async (req, res) => {
  try {
    // Check if database is available
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const achievementTypes = await achievementsService.getAllAchievementTypes();
    
    // Group by category for easier frontend consumption
    const categorizedAchievements = achievementTypes.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    res.json({
      success: true,
      achievementTypes,
      categorized: categorizedAchievements,
      totalCount: achievementTypes.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching achievement types:', error);
    res.status(500).json({
      error: 'Failed to fetch achievement types',
      code: 'ACHIEVEMENT_TYPES_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/achievements/check/:wallet - Manually trigger achievement check
 */
router.post('/check/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const { runData, badgeData } = req.body;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    if (!achievementsService.initialized) {
      return res.status(503).json({
        error: 'Achievements service not initialized',
        code: 'ACHIEVEMENTS_NOT_INITIALIZED'
      });
    }

    const unlockedAchievements = [];

    // Check run completion achievements if run data provided
    if (runData) {
      const runAchievements = await achievementsService.checkRunCompletionAchievements(wallet, runData);
      unlockedAchievements.push(...runAchievements);
    }

    // Check badge mint achievements if badge data provided
    if (badgeData) {
      const badgeAchievements = await achievementsService.checkBadgeMintAchievements(wallet, badgeData);
      unlockedAchievements.push(...badgeAchievements);
    }

    res.json({
      success: true,
      wallet: wallet.toLowerCase(),
      unlockedAchievements,
      count: unlockedAchievements.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking achievements:', error);
    res.status(500).json({
      error: 'Failed to check achievements',
      code: 'ACHIEVEMENT_CHECK_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/achievements/leaderboard/:category - Get achievement leaderboard
 */
router.get('/leaderboard/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Validate category
    const validCategories = ['gameplay', 'collection', 'social', 'special', 'all'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        code: 'INVALID_CATEGORY',
        validCategories
      });
    }

    // Check if database is available
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Build query based on category
    let query = db
      .from('player_achievements')
      .select(`
        player_address,
        count(*) as achievement_count,
        array_agg(achievement_types.name ORDER BY player_achievements.unlocked_at DESC) as recent_achievements,
        max(player_achievements.unlocked_at) as latest_unlock
      `)
      .leftJoin('achievement_types', 'player_achievements.achievement_type_id', 'achievement_types.id')
      .groupBy('player_address')
      .orderBy('achievement_count', { ascending: false })
      .orderBy('latest_unlock', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category !== 'all') {
      query = query.eq('achievement_types.category', category);
    }

    const { data: leaderboard, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      category,
      leaderboard: leaderboard || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: leaderboard?.length || 0
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching achievement leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch achievement leaderboard',
      code: 'LEADERBOARD_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/achievements/zk-proof/submit - Submit ZK-proof for verification
 */
router.post('/zk-proof/submit', async (req, res) => {
  try {
    const { wallet, proofData } = req.body;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    // Validate proof data
    if (!proofData || typeof proofData !== 'object') {
      return res.status(400).json({
        error: 'Invalid proof data format',
        code: 'INVALID_PROOF_DATA'
      });
    }

    if (!xpVerifierService.initialized) {
      return res.status(503).json({
        error: 'XPVerifier service not initialized',
        code: 'XPVERIFIER_NOT_INITIALIZED'
      });
    }

    console.log(`🔍 ZK-proof submission from ${wallet}`);

    // Submit proof for verification
    const result = await xpVerifierService.submitProofClaim(wallet, proofData);

    if (result.success) {
      res.json({
        success: true,
        wallet: wallet.toLowerCase(),
        verified: result.verified,
        claimId: result.claimId,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        claimId: result.claimId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error submitting ZK-proof:', error);
    res.status(500).json({
      error: 'Failed to submit ZK-proof',
      code: 'ZK_PROOF_SUBMISSION_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/achievements/zk-proof/:wallet - Get ZK-proof verification status
 */
router.get('/zk-proof/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    if (!xpVerifierService.initialized) {
      return res.status(503).json({
        error: 'XPVerifier service not initialized',
        code: 'XPVERIFIER_NOT_INITIALIZED'
      });
    }

    // Get player's verification history
    const verifications = await xpVerifierService.getPlayerVerifications(wallet);

    res.json({
      success: true,
      wallet: wallet.toLowerCase(),
      verifications: verifications.claims,
      summary: verifications.summary,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching ZK-proof status:', error);
    res.status(500).json({
      error: 'Failed to fetch ZK-proof status',
      code: 'ZK_PROOF_STATUS_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/achievements/zk-proof/test - Generate test proof (development only)
 */
router.post('/zk-proof/test', async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Test proof generation not allowed in production',
        code: 'NOT_ALLOWED_IN_PRODUCTION'
      });
    }

    const { wallet, claimedXP = 100 } = req.body;
    
    // Validate wallet address format
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET_ADDRESS'
      });
    }

    if (!xpVerifierService.initialized) {
      return res.status(503).json({
        error: 'XPVerifier service not initialized',
        code: 'XPVERIFIER_NOT_INITIALIZED'
      });
    }

    // Generate test proof
    const testProof = xpVerifierService.generateTestProof(wallet, claimedXP);

    res.json({
      success: true,
      wallet: wallet.toLowerCase(),
      testProof,
      note: 'This is a test proof for development purposes only',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating test proof:', error);
    res.status(500).json({
      error: 'Failed to generate test proof',
      code: 'TEST_PROOF_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/achievements/admin/threshold - Update verification threshold (admin only)
 */
router.post('/admin/threshold', async (req, res) => {
  try {
    // Basic admin check (you might want to implement proper admin authentication)
    const { adminKey, newThreshold } = req.body;
    
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        error: 'Unauthorized - invalid admin key',
        code: 'UNAUTHORIZED'
      });
    }

    if (!newThreshold || typeof newThreshold !== 'number' || newThreshold <= 0) {
      return res.status(400).json({
        error: 'Invalid threshold value',
        code: 'INVALID_THRESHOLD'
      });
    }

    if (!xpVerifierService.initialized) {
      return res.status(503).json({
        error: 'XPVerifier service not initialized',
        code: 'XPVERIFIER_NOT_INITIALIZED'
      });
    }

    console.log(`🔧 Admin threshold update requested: ${newThreshold}`);

    // Update threshold on contract
    const result = await xpVerifierService.updateThreshold(newThreshold);

    res.json({
      success: true,
      newThreshold,
      txHash: result.txHash,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating threshold:', error);
    res.status(500).json({
      error: 'Failed to update threshold',
      code: 'THRESHOLD_UPDATE_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/achievements/stats/system - Get system-wide achievement statistics
 */
router.get('/stats/system', async (req, res) => {
  try {
    // Check if database is available
    if (!db) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Get achievement statistics
    const { data: achievementStats, error: achievementError } = await db
      .from('player_achievements')
      .select(`
        achievement_types.category,
        achievement_types.name,
        count(*) as unlock_count
      `)
      .leftJoin('achievement_types', 'player_achievements.achievement_type_id', 'achievement_types.id')
      .groupBy('achievement_types.category', 'achievement_types.name')
      .orderBy('unlock_count', { ascending: false });

    if (achievementError) throw achievementError;

    // Get ZK-proof statistics
    const zkStats = xpVerifierService.getQueueStats();
    
    // Get total players with achievements
    const { count: totalPlayersWithAchievements, error: countError } = await db
      .from('player_achievements')
      .select('player_address', { count: 'exact' })
      .groupBy('player_address');

    if (countError) throw countError;

    // Get verification statistics
    const { data: verificationStats, error: verificationError } = await db
      .from('zk_proof_claims')
      .select('verification_status')
      .then(result => {
        if (result.error) throw result.error;
        
        const stats = {
          total: result.data.length,
          verified: result.data.filter(c => c.verification_status === 'verified').length,
          pending: result.data.filter(c => c.verification_status === 'pending').length,
          failed: result.data.filter(c => c.verification_status === 'failed').length,
          expired: result.data.filter(c => c.verification_status === 'expired').length
        };
        
        return { data: stats, error: null };
      });

    if (verificationError) throw verificationError;

    res.json({
      success: true,
      achievements: {
        byCategory: achievementStats || [],
        totalPlayersWithAchievements: totalPlayersWithAchievements || 0
      },
      zkProofVerification: {
        queueStatus: zkStats,
        verificationStats: verificationStats || {
          total: 0, verified: 0, pending: 0, failed: 0, expired: 0
        }
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching system stats:', error);
    res.status(500).json({
      error: 'Failed to fetch system statistics',
      code: 'SYSTEM_STATS_ERROR',
      details: error.message
    });
  }
});

module.exports = router;