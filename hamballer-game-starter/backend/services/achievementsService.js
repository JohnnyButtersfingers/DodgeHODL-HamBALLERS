const { db } = require('../config/database');
const EventEmitter = require('events');

class AchievementsService extends EventEmitter {
  constructor() {
    super();
    this.achievementTypes = new Map(); // Cache achievement types
    this.initialized = false;
  }

  /**
   * Initialize the achievements service
   */
  async initialize() {
    try {
      if (!db) {
        console.warn('⚠️ AchievementsService: Database not available - limited functionality');
        return false;
      }

      // Add better error handling for fetch issues
      try {
        await this.loadAchievementTypes();
        this.initialized = true;
        
        console.log('✅ AchievementsService initialized');
        console.log(`📋 Loaded ${this.achievementTypes.size} achievement types`);
        
        return true;
      } catch (dbError) {
        console.error('❌ AchievementsService database error:', dbError.message);
        if (dbError.cause) {
          console.error('   Cause:', dbError.cause.message);
        }
        console.error('   Stack:', dbError.stack);
        console.error('   Fetch error details:', {
          message: dbError.message,
          cause: dbError.cause?.message,
          stack: dbError.stack?.split('\n').slice(0, 5).join('\n')
        });
        console.warn('⚠️ AchievementsService: Using mock mode - limited functionality');
        this.initialized = false;
        return false;
      }
    } catch (error) {
      console.error('❌ AchievementsService initialization failed:', error.message);
      if (error.cause) {
        console.error('   Cause:', error.cause.message);
      }
      return false;
    }
  }

  /**
   * Load all achievement types into memory cache
   */
  async loadAchievementTypes() {
    const { data: achievementTypes, error } = await db
      .from('achievement_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    this.achievementTypes.clear();
    achievementTypes.forEach(type => {
      this.achievementTypes.set(type.id, type);
    });

    console.log(`📋 Loaded ${achievementTypes.length} achievement types`);
  }

  /**
   * Check for achievement unlocks after a run completion
   */
  async checkRunCompletionAchievements(playerAddress, runData) {
    if (!this.initialized) return;

    try {
      console.log(`🏆 Checking achievements for ${playerAddress} after run completion`);
      
      // Get player statistics for achievement checking
      const playerStats = await this.getPlayerStats(playerAddress);
      const unlockedAchievements = [];

      // Check each achievement type
      for (const [typeId, achievementType] of this.achievementTypes) {
        if (await this.hasPlayerUnlocked(playerAddress, typeId)) {
          continue; // Already unlocked
        }

        if (await this.checkAchievementRequirements(achievementType, playerStats, runData)) {
          const unlocked = await this.unlockAchievement(playerAddress, typeId, {
            trigger: 'run_completion',
            runData: runData
          });
          
          if (unlocked) {
            unlockedAchievements.push({
              ...achievementType,
              unlocked_at: new Date().toISOString()
            });
          }
        } else {
          // Update progress for incremental achievements
          await this.updateAchievementProgress(playerAddress, achievementType, playerStats, runData);
        }
      }

      // Emit WebSocket events for unlocked achievements
      if (unlockedAchievements.length > 0) {
        console.log(`🎉 ${playerAddress} unlocked ${unlockedAchievements.length} achievements!`);
        this.emitAchievementUnlocked(playerAddress, unlockedAchievements);
      }

      return unlockedAchievements;

    } catch (error) {
      console.error('❌ Error checking run completion achievements:', error.message);
      return [];
    }
  }

  /**
   * Check for achievement unlocks after a badge is minted
   */
  async checkBadgeMintAchievements(playerAddress, badgeData) {
    if (!this.initialized) return;

    try {
      console.log(`🏆 Checking badge achievements for ${playerAddress} (TokenId: ${badgeData.tokenId})`);
      
      const playerStats = await this.getPlayerStats(playerAddress);
      const badgeStats = await this.getBadgeStats(playerAddress);
      const unlockedAchievements = [];

      // Check badge-related achievements
      for (const [typeId, achievementType] of this.achievementTypes) {
        if (achievementType.category !== 'collection') continue;
        if (await this.hasPlayerUnlocked(playerAddress, typeId)) continue;

        if (await this.checkBadgeAchievementRequirements(achievementType, badgeStats, badgeData)) {
          const unlocked = await this.unlockAchievement(playerAddress, typeId, {
            trigger: 'badge_mint',
            badgeData: badgeData
          });
          
          if (unlocked) {
            unlockedAchievements.push({
              ...achievementType,
              unlocked_at: new Date().toISOString()
            });
          }
        }
      }

      if (unlockedAchievements.length > 0) {
        console.log(`🎉 ${playerAddress} unlocked ${unlockedAchievements.length} badge achievements!`);
        this.emitAchievementUnlocked(playerAddress, unlockedAchievements);
      }

      return unlockedAchievements;

    } catch (error) {
      console.error('❌ Error checking badge mint achievements:', error.message);
      return [];
    }
  }

  /**
   * Check if achievement requirements are met
   */
  async checkAchievementRequirements(achievementType, playerStats, runData) {
    const requirements = achievementType.requirements;

    // Run-based achievements
    if (requirements.runs_completed) {
      if (playerStats.totalRuns < requirements.runs_completed) return false;
    }

    if (requirements.min_xp_single_run && runData) {
      const estimatedXP = this.calculateXPFromRun(runData);
      if (estimatedXP < requirements.min_xp_single_run) return false;
    }

    if (requirements.min_duration && runData) {
      if (runData.duration < requirements.min_duration) return false;
    }

    if (requirements.max_duration && runData) {
      if (runData.duration > requirements.max_duration) return false;
    }

    if (requirements.runs_no_bonus) {
      const noBonus = await this.getRunsWithoutBonus(playerStats.playerAddress);
      if (noBonus < requirements.runs_no_bonus) return false;
    }

    // Time-based achievements
    if (requirements.night_run && runData) {
      const hour = new Date().getHours();
      if (hour < 0 || hour >= 6) return false; // Between midnight and 6 AM
    }

    // Special achievements
    if (requirements.runs_on_day_7) {
      const daysSinceFirstRun = await this.getDaysSinceFirstRun(playerStats.playerAddress);
      if (daysSinceFirstRun !== 7 || playerStats.totalRuns !== requirements.runs_on_day_7) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check badge-specific achievement requirements
   */
  async checkBadgeAchievementRequirements(achievementType, badgeStats, badgeData) {
    const requirements = achievementType.requirements;

    if (requirements.badges_earned) {
      if (badgeStats.totalBadges < requirements.badges_earned) return false;
    }

    if (requirements.legendary_badges) {
      if (badgeStats.legendaryBadges < requirements.legendary_badges) return false;
    }

    if (requirements.badge_types_collected) {
      const uniqueTypes = new Set();
      if (badgeStats.participationBadges > 0) uniqueTypes.add(0);
      if (badgeStats.commonBadges > 0) uniqueTypes.add(1);
      if (badgeStats.rareBadges > 0) uniqueTypes.add(2);
      if (badgeStats.epicBadges > 0) uniqueTypes.add(3);
      if (badgeStats.legendaryBadges > 0) uniqueTypes.add(4);
      
      if (uniqueTypes.size < requirements.badge_types_collected) return false;
    }

    return true;
  }

  /**
   * Unlock an achievement for a player
   */
  async unlockAchievement(playerAddress, achievementTypeId, metadata = {}) {
    try {
      const { data: achievement, error } = await db
        .from('player_achievements')
        .insert({
          player_address: playerAddress.toLowerCase(),
          achievement_type_id: achievementTypeId,
          metadata: metadata,
          notified: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`ℹ️ Achievement ${achievementTypeId} already unlocked for ${playerAddress}`);
          return false;
        }
        throw error;
      }

      const achievementType = this.achievementTypes.get(achievementTypeId);
      console.log(`🏆 Achievement unlocked: ${achievementType?.name} for ${playerAddress}`);

      return achievement;

    } catch (error) {
      console.error('❌ Error unlocking achievement:', error.message);
      return false;
    }
  }

  /**
   * Update progress for incremental achievements
   */
  async updateAchievementProgress(playerAddress, achievementType, playerStats, runData) {
    try {
      const requirements = achievementType.requirements;
      let currentProgress = 0;
      let targetProgress = 0;

      // Calculate progress based on requirement type
      if (requirements.runs_completed) {
        currentProgress = playerStats.totalRuns;
        targetProgress = requirements.runs_completed;
      } else if (requirements.badges_earned) {
        const badgeStats = await this.getBadgeStats(playerAddress);
        currentProgress = badgeStats.totalBadges;
        targetProgress = requirements.badges_earned;
      } else {
        return; // Not a progress-trackable achievement
      }

      // Update or insert progress record
      const { error } = await db
        .from('achievement_progress')
        .upsert({
          player_address: playerAddress.toLowerCase(),
          achievement_type_id: achievementType.id,
          current_progress: currentProgress,
          target_progress: targetProgress,
          progress_data: {
            percentage: Math.min((currentProgress / targetProgress) * 100, 100),
            last_run: runData?.id
          },
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'player_address,achievement_type_id'
        });

      if (error) throw error;

    } catch (error) {
      console.error('❌ Error updating achievement progress:', error.message);
    }
  }

  /**
   * Check if player has already unlocked an achievement
   */
  async hasPlayerUnlocked(playerAddress, achievementTypeId) {
    try {
      const { data, error } = await db
        .from('player_achievements')
        .select('id')
        .eq('player_address', playerAddress.toLowerCase())
        .eq('achievement_type_id', achievementTypeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;

    } catch (error) {
      console.error('❌ Error checking achievement status:', error.message);
      return false;
    }
  }

  /**
   * Get player statistics for achievement checking
   */
  async getPlayerStats(playerAddress) {
    try {
      const { data: stats, error } = await db
        .from('player_stats')
        .select('*')
        .eq('player_address', playerAddress.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return stats || {
        playerAddress: playerAddress.toLowerCase(),
        totalRuns: 0,
        completedRuns: 0,
        totalCPEarned: 0,
        totalDBPEarned: 0,
        bestRunCP: 0,
        longestRunTime: 0,
        currentStreak: 0,
        bestStreak: 0
      };

    } catch (error) {
      console.error('❌ Error getting player stats:', error.message);
      return {};
    }
  }

  /**
   * Get badge statistics for a player
   */
  async getBadgeStats(playerAddress) {
    try {
      const { data: stats, error } = await db
        .from('badge_claim_status')
        .select('*')
        .eq('player_address', playerAddress.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        totalBadges: stats?.total_earned || 0,
        participationBadges: stats?.participation_badges || 0,
        commonBadges: stats?.common_badges || 0,
        rareBadges: stats?.rare_badges || 0,
        epicBadges: stats?.epic_badges || 0,
        legendaryBadges: stats?.legendary_badges || 0
      };

    } catch (error) {
      console.error('❌ Error getting badge stats:', error.message);
      return {};
    }
  }

  /**
   * Get count of runs without bonus throws
   */
  async getRunsWithoutBonus(playerAddress) {
    try {
      const { count, error } = await db
        .from('run_logs')
        .select('*', { count: 'exact', head: true })
        .eq('player_address', playerAddress.toLowerCase())
        .eq('bonus_throw_used', false)
        .eq('status', 'completed');

      if (error) throw error;
      return count || 0;

    } catch (error) {
      console.error('❌ Error getting runs without bonus:', error.message);
      return 0;
    }
  }

  /**
   * Get days since first run for a player
   */
  async getDaysSinceFirstRun(playerAddress) {
    try {
      const { data: firstRun, error } = await db
        .from('run_logs')
        .select('created_at')
        .eq('player_address', playerAddress.toLowerCase())
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!firstRun) return 0;

      const firstRunDate = new Date(firstRun.created_at);
      const today = new Date();
      const diffTime = Math.abs(today - firstRunDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;

    } catch (error) {
      console.error('❌ Error getting days since first run:', error.message);
      return 0;
    }
  }

  /**
   * Calculate estimated XP from run data
   */
  calculateXPFromRun(runData) {
    const baseXP = 10;
    const cpMultiplier = Math.floor((runData.cpEarned || 0) / 100);
    const durationBonus = Math.floor((runData.duration || 0) / 30);
    const bonusThrowXP = runData.bonusThrowUsed ? 25 : 0;
    const boostXP = (runData.boostsUsed || []).length * 5;

    return baseXP + cpMultiplier + durationBonus + bonusThrowXP + boostXP;
  }

  /**
   * Emit achievement unlocked event via WebSocket
   */
  emitAchievementUnlocked(playerAddress, achievements) {
    try {
      const eventData = {
        type: 'achievement_unlocked',
        player: playerAddress,
        achievements: achievements,
        timestamp: new Date().toISOString()
      };

      // Emit to WebSocket clients
      if (global.wsClients) {
        const message = JSON.stringify(eventData);
        global.wsClients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
          }
        });
        
        console.log(`📡 Broadcasted achievement unlock to ${global.wsClients.size} WebSocket clients`);
      }

      // Also emit as internal event
      this.emit('achievement_unlocked', eventData);

    } catch (error) {
      console.error('❌ Error emitting achievement unlock event:', error.message);
    }
  }

  /**
   * Get player's achievements and progress
   */
  async getPlayerAchievements(playerAddress) {
    try {
      // Get unlocked achievements
      const { data: unlockedAchievements, error: unlockedError } = await db
        .from('player_achievements')
        .select(`
          *,
          achievement_types (*)
        `)
        .eq('player_address', playerAddress.toLowerCase())
        .order('unlocked_at', { ascending: false });

      if (unlockedError) throw unlockedError;

      // Get progress for non-unlocked achievements
      const { data: progressData, error: progressError } = await db
        .from('achievement_progress')
        .select(`
          *,
          achievement_types (*)
        `)
        .eq('player_address', playerAddress.toLowerCase());

      if (progressError) throw progressError;

      // Get achievement summary with timeout
      const summaryPromise = db
        .rpc('get_player_achievement_summary', { player_addr: playerAddress.toLowerCase() });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC call timeout after 30s')), 30000)
      );
      
      const { data: summary, error: summaryError } = await Promise.race([
        summaryPromise,
        timeoutPromise
      ]);

      if (summaryError) {
        console.error('RPC error details:', {
          message: summaryError.message,
          code: summaryError.code,
          details: summaryError.details,
          cause: summaryError.cause
        });
        throw summaryError;
      }

      return {
        unlocked: unlockedAchievements || [],
        progress: progressData || [],
        summary: summary[0] || {
          total_achievements: 0,
          achievements_by_category: {},
          recent_achievements: [],
          completion_percentage: 0
        }
      };

    } catch (error) {
      console.error('❌ Error getting player achievements:', error.message);
      return {
        unlocked: [],
        progress: [],
        summary: {
          total_achievements: 0,
          achievements_by_category: {},
          recent_achievements: [],
          completion_percentage: 0
        }
      };
    }
  }

  /**
   * Get all achievement types (for frontend display)
   */
  async getAllAchievementTypes() {
    try {
      const { data: achievementTypes, error } = await db
        .from('achievement_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return achievementTypes || [];

    } catch (error) {
      console.error('❌ Error getting achievement types:', error.message);
      return [];
    }
  }
}

// Create singleton instance
const achievementsService = new AchievementsService();

module.exports = {
  achievementsService,
  AchievementsService
};