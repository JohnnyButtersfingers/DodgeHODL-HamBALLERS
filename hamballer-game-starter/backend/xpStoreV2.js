const { db } = require('./config/database');

/**
 * Achievement definitions with mock data
 * TODO: Replace with blockchain-based achievement tracking
 */
const ACHIEVEMENT_DEFINITIONS = {
  first_match: {
    id: 'first_match',
    name: 'First Steps',
    description: 'Complete your first match',
    icon: '🎯',
    rarity: 'common',
    category: 'gameplay'
  },
  xp_100: {
    id: 'xp_100',
    name: 'Century Club',
    description: 'Earn 100 XP total',
    icon: '💯',
    rarity: 'common',
    category: 'progression'
  },
  xp_500: {
    id: 'xp_500',
    name: 'XP Warrior',
    description: 'Earn 500 XP total',
    icon: '⚔️',
    rarity: 'uncommon',
    category: 'progression'
  },
  top_5_rank: {
    id: 'top_5_rank',
    name: 'Elite Player',
    description: 'Reach top 5 on leaderboard',
    icon: '👑',
    rarity: 'rare',
    category: 'ranking'
  },
  win_streak_5: {
    id: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 matches in a row',
    icon: '🔥',
    rarity: 'uncommon',
    category: 'gameplay'
  },
  total_wins_10: {
    id: 'total_wins_10',
    name: 'Veteran',
    description: 'Win 10 total matches',
    icon: '🏆',
    rarity: 'uncommon',
    category: 'gameplay'
  },
  perfect_score: {
    id: 'perfect_score',
    name: 'Perfectionist',
    description: 'Achieve maximum score in a run',
    icon: '✨',
    rarity: 'legendary',
    category: 'performance'
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join during beta phase',
    icon: '🚀',
    rarity: 'rare',
    category: 'special'
  }
};

/**
 * Get player achievements based on their stats
 * @param {string} address - Player's Ethereum address
 * @returns {Promise<Array>} Array of earned achievements
 */
async function getPlayerAchievements(address) {
  try {
    // TODO: Replace with actual database queries and blockchain data
    // For now, return mock achievements based on address patterns
    const earnedAchievements = [];
    
    // Mock logic: award achievements based on address characteristics
    // In production, this would query actual player stats and game data
    
    // Everyone gets first match achievement
    earnedAchievements.push({
      ...ACHIEVEMENT_DEFINITIONS.first_match,
      earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      progress: 100
    });
    
    // Award XP achievements based on address
    const addressNum = parseInt(address.slice(-4), 16) % 1000;
    
    if (addressNum > 100) {
      earnedAchievements.push({
        ...ACHIEVEMENT_DEFINITIONS.xp_100,
        earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        progress: 100
      });
    }
    
    if (addressNum > 500) {
      earnedAchievements.push({
        ...ACHIEVEMENT_DEFINITIONS.xp_500,
        earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        progress: 100
      });
    }
    
    // Award special achievements for certain address patterns
    if (addressNum > 800) {
      earnedAchievements.push({
        ...ACHIEVEMENT_DEFINITIONS.top_5_rank,
        earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        progress: 100
      });
    }
    
    if (addressNum > 700) {
      earnedAchievements.push({
        ...ACHIEVEMENT_DEFINITIONS.win_streak_5,
        earnedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        progress: 100
      });
    }
    
    if (addressNum > 600) {
      earnedAchievements.push({
        ...ACHIEVEMENT_DEFINITIONS.total_wins_10,
        earnedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        progress: 100
      });
    }
    
    // Rare achievements for special addresses
    if (addressNum > 950) {
      earnedAchievements.push({
        ...ACHIEVEMENT_DEFINITIONS.perfect_score,
        earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        progress: 100
      });
    }
    
    // Early adopter for all beta users
    earnedAchievements.push({
      ...ACHIEVEMENT_DEFINITIONS.early_adopter,
      earnedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      progress: 100
    });
    
    // Sort by rarity and date earned
    const rarityOrder = { legendary: 4, rare: 3, uncommon: 2, common: 1 };
    earnedAchievements.sort((a, b) => {
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return new Date(b.earnedAt) - new Date(a.earnedAt);
    });
    
    return earnedAchievements;
    
  } catch (error) {
    console.error('Error fetching player achievements:', error);
    // Return basic achievements on error
    return [
      {
        ...ACHIEVEMENT_DEFINITIONS.first_match,
        earnedAt: new Date(),
        progress: 100
      },
      {
        ...ACHIEVEMENT_DEFINITIONS.early_adopter,
        earnedAt: new Date(),
        progress: 100
      }
    ];
  }
}

/**
 * Get all available achievements (earned and unearned)
 * @param {string} address - Player's Ethereum address
 * @returns {Promise<Object>} Object with earned and available achievements
 */
async function getAllAchievements(address) {
  try {
    const earnedAchievements = await getPlayerAchievements(address);
    const earnedIds = new Set(earnedAchievements.map(a => a.id));
    
    const availableAchievements = Object.values(ACHIEVEMENT_DEFINITIONS)
      .filter(achievement => !earnedIds.has(achievement.id))
      .map(achievement => ({
        ...achievement,
        progress: Math.floor(Math.random() * 80), // Mock progress
        isLocked: true
      }));
    
    return {
      earned: earnedAchievements,
      available: availableAchievements,
      total: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
      earnedCount: earnedAchievements.length
    };
  } catch (error) {
    console.error('Error fetching all achievements:', error);
    return {
      earned: [],
      available: Object.values(ACHIEVEMENT_DEFINITIONS),
      total: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
      earnedCount: 0
    };
  }
}

/**
 * Check if player should unlock new achievements based on their current stats
 * TODO: Implement achievement unlock logic
 * @param {string} address - Player's Ethereum address
 * @param {Object} playerStats - Current player statistics
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
async function checkForNewAchievements(address, playerStats) {
  // TODO: Implement logic to check for newly earned achievements
  // This would be called after each game/action to check for unlocks
  return [];
}

module.exports = {
  getPlayerAchievements,
  getAllAchievements,
  checkForNewAchievements,
  ACHIEVEMENT_DEFINITIONS
};