import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { useXp } from '../contexts/XpContext';
import { useWebSocket } from '../services/useWebSocketService';
import { apiFetch } from '../services/useApiService';

const ACHIEVEMENT_TYPES = {
  MILESTONE: {
    icon: '🎯',
    color: 'bg-blue-500',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-400'
  },
  STREAK: {
    icon: '🔥',
    color: 'bg-orange-500',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-400'
  },
  UNIQUE: {
    icon: '⭐',
    color: 'bg-purple-500',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-400'
  },
  BADGE: {
    icon: '🏆',
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-400'
  }
};

const ACHIEVEMENT_DEFINITIONS = [
  // Milestone Achievements
  { id: 'first_run', type: 'MILESTONE', title: 'First Steps', description: 'Complete your first run', xpReward: 50, unlockCondition: { runs: 1 } },
  { id: 'veteran_runner', type: 'MILESTONE', title: 'Veteran Runner', description: 'Complete 100 runs', xpReward: 500, unlockCondition: { runs: 100 } },
  { id: 'xp_collector', type: 'MILESTONE', title: 'XP Collector', description: 'Earn 1,000 total XP', xpReward: 200, unlockCondition: { totalXp: 1000 } },
  { id: 'high_roller', type: 'MILESTONE', title: 'High Roller', description: 'Earn 10,000 DBP in a single run', xpReward: 1000, unlockCondition: { singleRunDbp: 10000 } },
  
  // Streak Achievements
  { id: 'win_streak_5', type: 'STREAK', title: 'Hot Streak', description: 'Win 5 runs in a row', xpReward: 300, unlockCondition: { winStreak: 5 } },
  { id: 'win_streak_10', type: 'STREAK', title: 'Unstoppable', description: 'Win 10 runs in a row', xpReward: 750, unlockCondition: { winStreak: 10 } },
  { id: 'daily_streak_7', type: 'STREAK', title: 'Weekly Warrior', description: 'Play for 7 days straight', xpReward: 500, unlockCondition: { dailyStreak: 7 } },
  
  // Unique Achievements
  { id: 'perfect_run', type: 'UNIQUE', title: 'Perfect Run', description: 'Complete a run without taking damage', xpReward: 1000, unlockCondition: { perfectRun: true } },
  { id: 'speed_demon', type: 'UNIQUE', title: 'Speed Demon', description: 'Complete a run in under 30 seconds', xpReward: 750, unlockCondition: { fastRun: 30 } },
  { id: 'hodl_master', type: 'UNIQUE', title: 'HODL Master', description: 'Hold through 5 consecutive price drops', xpReward: 500, unlockCondition: { hodlDrops: 5 } },
  
  // Badge Achievements
  { id: 'badge_collector', type: 'BADGE', title: 'Badge Collector', description: 'Earn your first badge', xpReward: 100, unlockCondition: { badges: 1 } },
  { id: 'legendary_hunter', type: 'BADGE', title: 'Legendary Hunter', description: 'Earn a Legendary badge', xpReward: 2000, unlockCondition: { legendaryBadges: 1 } },
];

const AchievementsPanel = () => {
  const { address } = useWallet();
  const { xp, addXp } = useXp();
  const { connected: wsConnected, sendMessage } = useWebSocket();
  const [achievements, setAchievements] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [newUnlocks, setNewUnlocks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unlocked, locked

  useEffect(() => {
    if (address) {
      fetchAchievements();
      
      // Subscribe to achievement updates via WebSocket
      if (wsConnected) {
        sendMessage({ 
          type: 'subscribe', 
          channel: 'achievements',
          playerAddress: address 
        });
      }
    }
  }, [address, wsConnected]);

  useEffect(() => {
    // Check for new achievements when stats change
    checkForNewAchievements();
    
    // Also check server-side for achievements
    if (address && Object.keys(playerStats).length > 0) {
      checkForNewAchievementsFromServer();
    }
  }, [playerStats, xp]);

  // Listen for WebSocket achievement updates
  useEffect(() => {
    const handleAchievementUpdate = (event) => {
      const { type, data } = event.detail || {};
      
      if (type === 'achievement_unlocked' && data?.playerAddress === address) {
        const achievementDef = ACHIEVEMENT_DEFINITIONS.find(a => a.id === data.achievementId);
        if (achievementDef) {
          setNewUnlocks([achievementDef]);
          setTimeout(() => {
            fetchAchievements(); // Refresh achievements
          }, 3000);
        }
      } else if (type === 'stats_updated' && data?.playerAddress === address) {
        setPlayerStats(prev => ({ ...prev, ...data.stats }));
      }
    };

    // Listen for WebSocket messages forwarded as custom events
    window.addEventListener('websocket_message', handleAchievementUpdate);
    
    return () => {
      window.removeEventListener('websocket_message', handleAchievementUpdate);
    };
  }, [address]);

  // Periodic check for achievements every 30 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      if (Object.keys(playerStats).length > 0) {
        checkForNewAchievementsFromServer();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [address, playerStats]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const [achievementsResponse, statsResponse] = await Promise.all([
        apiFetch(`/api/achievements/${address}`),
        apiFetch(`/api/player/stats/${address}`)
      ]);

      if (achievementsResponse.ok) {
        const data = await achievementsResponse.json();
        setAchievements(data.achievements || []);
      } else {
        console.warn('Achievements API not available, using mock data');
        setAchievements([
          { id: 'first_run', unlockedAt: new Date().toISOString(), claimed: true },
          { id: 'win_streak_5', unlockedAt: new Date(Date.now() - 86400000).toISOString(), claimed: false },
          { id: 'badge_collector', unlockedAt: null, claimed: false }
        ]);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setPlayerStats(statsData.stats || {});
      } else {
        console.warn('Player stats API not available, using mock data');
        setPlayerStats({
          totalRuns: 25,
          totalXp: 2500,
          winStreak: 3,
          currentStreak: 3,
          maxWinStreak: 7,
          totalBadges: 3,
          legendaryBadges: 1,
          perfectRuns: 2,
          fastestRun: 28
        });
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      // Fallback to mock data on error
      setAchievements([
        { id: 'first_run', unlockedAt: new Date().toISOString(), claimed: true },
        { id: 'win_streak_5', unlockedAt: new Date(Date.now() - 86400000).toISOString(), claimed: false },
        { id: 'badge_collector', unlockedAt: null, claimed: false }
      ]);
      setPlayerStats({
        totalRuns: 25,
        totalXp: 2500,
        winStreak: 3,
        currentStreak: 3,
        maxWinStreak: 7,
        totalBadges: 3,
        legendaryBadges: 1,
        perfectRuns: 2,
        fastestRun: 28
      });
    } finally {
      setLoading(false);
    }
  };

  const checkForNewAchievementsFromServer = async () => {
    try {
      const response = await apiFetch(`/api/achievements/check/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStats: playerStats })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newAchievements && data.newAchievements.length > 0) {
          setNewUnlocks(data.newAchievements);
          setTimeout(() => {
            fetchAchievements(); // Refresh all data
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error checking for new achievements:', error);
    }
  };

  const checkForNewAchievements = () => {
    const newlyUnlocked = [];
    
    ACHIEVEMENT_DEFINITIONS.forEach(achievementDef => {
      const existing = achievements.find(a => a.id === achievementDef.id);
      
      // If not already unlocked, check conditions
      if (!existing?.unlockedAt && checkAchievementCondition(achievementDef, playerStats)) {
        newlyUnlocked.push(achievementDef);
      }
    });

    if (newlyUnlocked.length > 0) {
      setNewUnlocks(newlyUnlocked);
      // Auto-unlock after showing animation
      setTimeout(() => {
        unlockAchievements(newlyUnlocked);
      }, 3000);
    }
  };

  const checkAchievementCondition = (achievementDef, stats) => {
    const { unlockCondition } = achievementDef;
    
    if (unlockCondition.runs && stats.totalRuns >= unlockCondition.runs) return true;
    if (unlockCondition.totalXp && stats.totalXp >= unlockCondition.totalXp) return true;
    if (unlockCondition.winStreak && stats.maxWinStreak >= unlockCondition.winStreak) return true;
    if (unlockCondition.badges && stats.totalBadges >= unlockCondition.badges) return true;
    if (unlockCondition.legendaryBadges && stats.legendaryBadges >= unlockCondition.legendaryBadges) return true;
    if (unlockCondition.perfectRun && stats.perfectRuns >= 1) return true;
    if (unlockCondition.fastRun && stats.fastestRun <= unlockCondition.fastRun) return true;
    
    return false;
  };

  const unlockAchievements = async (newAchievements) => {
    try {
      for (const achievement of newAchievements) {
        await apiFetch('/api/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerAddress: address,
            achievementId: achievement.id
          })
        });
      }
      fetchAchievements(); // Refresh
    } catch (error) {
      console.error('Error unlocking achievements:', error);
    }
    setNewUnlocks([]);
  };

  const claimAchievement = async (achievementId) => {
    try {
      const response = await apiFetch('/api/achievements/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          achievementId
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Trigger XP notification
        const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
        if (achievement) {
          addXp(achievement.xpReward, 'achievement');
        }
        
        fetchAchievements(); // Refresh
      }
    } catch (error) {
      console.error('Error claiming achievement:', error);
    }
  };

  const getAchievementProgress = (achievementDef) => {
    const { unlockCondition } = achievementDef;
    
    if (unlockCondition.runs) {
      return Math.min((playerStats.totalRuns || 0) / unlockCondition.runs, 1);
    }
    if (unlockCondition.totalXp) {
      return Math.min((playerStats.totalXp || 0) / unlockCondition.totalXp, 1);
    }
    if (unlockCondition.winStreak) {
      return Math.min((playerStats.maxWinStreak || 0) / unlockCondition.winStreak, 1);
    }
    
    return 0;
  };

  const getFilteredAchievements = () => {
    const enrichedAchievements = ACHIEVEMENT_DEFINITIONS.map(def => {
      const userProgress = achievements.find(a => a.id === def.id);
      return {
        ...def,
        ...userProgress,
        progress: getAchievementProgress(def),
        isUnlocked: !!userProgress?.unlockedAt,
        isClaimed: !!userProgress?.claimed
      };
    });

    switch (filter) {
      case 'unlocked':
        return enrichedAchievements.filter(a => a.isUnlocked);
      case 'locked':
        return enrichedAchievements.filter(a => !a.isUnlocked);
      default:
        return enrichedAchievements;
    }
  };

  const getTotalProgress = () => {
    const total = ACHIEVEMENT_DEFINITIONS.length;
    const unlocked = achievements.filter(a => a.unlockedAt).length;
    return { unlocked, total, percentage: (unlocked / total) * 100 };
  };

  if (!address) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view your achievements</p>
      </div>
    );
  }

  const totalProgress = getTotalProgress();

  return (
    <div className="space-y-6">
      {/* New Achievement Unlocks Modal */}
      <AnimatePresence>
        {newUnlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {newUnlocks.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0, 
                  opacity: 1,
                  transition: { 
                    delay: index * 0.3,
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }
                }}
                className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-6 max-w-md mx-auto text-center shadow-2xl"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Achievement Unlocked!</h2>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-3xl">{ACHIEVEMENT_TYPES[achievement.type].icon}</span>
                  <h3 className="text-xl font-semibold text-white">{achievement.title}</h3>
                </div>
                <p className="text-white/90 mb-4">{achievement.description}</p>
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="text-white font-medium">+{achievement.xpReward} XP</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">🏆 Achievements</h1>
          <p className="text-gray-400 mt-1">Track your progress and unlock rewards</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAchievements}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Overall Progress</h3>
          <span className="text-sm text-gray-400">
            {totalProgress.unlocked}/{totalProgress.total} achievements
          </span>
        </div>
        
        <div className="w-full bg-gray-600 rounded-full h-3 mb-4">
          <motion.div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress.percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(ACHIEVEMENT_TYPES).map(([type, config]) => {
            const typeCount = getFilteredAchievements().filter(a => a.type === type && a.isUnlocked).length;
            const totalType = ACHIEVEMENT_DEFINITIONS.filter(a => a.type === type).length;
            
            return (
              <div key={type} className="text-center">
                <div className="text-2xl mb-1">{config.icon}</div>
                <div className={`font-bold ${config.textColor}`}>{typeCount}/{totalType}</div>
                <div className="text-xs text-gray-400 capitalize">{type.toLowerCase()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'unlocked', label: 'Unlocked' },
          { key: 'locked', label: 'Locked' }
        ].map(filterOption => (
          <button
            key={filterOption.key}
            onClick={() => setFilter(filterOption.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterOption.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {getFilteredAchievements().map((achievement, index) => {
          const typeConfig = ACHIEVEMENT_TYPES[achievement.type];
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-gray-800/50 rounded-lg p-6 border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                achievement.isUnlocked 
                  ? `${typeConfig.borderColor} shadow-lg` 
                  : 'border-gray-600 opacity-60'
              }`}
              onClick={() => setSelectedAchievement(achievement)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Achievement Icon */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-full ${typeConfig.color} flex items-center justify-center text-2xl`}>
                  {typeConfig.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${achievement.isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                    {achievement.title}
                  </h3>
                  <p className="text-sm text-gray-400">{achievement.description}</p>
                </div>
              </div>

              {/* Progress Bar (for locked achievements) */}
              {!achievement.isUnlocked && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(achievement.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <motion.div 
                      className={`h-2 rounded-full ${typeConfig.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${achievement.progress * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Reward */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400">⚡</span>
                  <span className="text-sm font-medium text-white">+{achievement.xpReward} XP</span>
                </div>
                
                {achievement.isUnlocked && (
                  <div className="flex items-center space-x-2">
                    {achievement.isClaimed ? (
                      <span className="text-green-400 text-sm">✓ Claimed</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          claimAchievement(achievement.id);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Unlock timestamp */}
              {achievement.isUnlocked && (
                <div className="absolute top-3 right-3">
                  <span className="text-xs text-gray-400">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full ${ACHIEVEMENT_TYPES[selectedAchievement.type].color} flex items-center justify-center text-3xl mb-4`}>
                  {ACHIEVEMENT_TYPES[selectedAchievement.type].icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{selectedAchievement.title}</h3>
                <p className="text-gray-400 mb-4">{selectedAchievement.description}</p>
                
                {selectedAchievement.isUnlocked ? (
                  <div className="space-y-2">
                    <div className="text-green-400">✓ Unlocked!</div>
                    <div className="text-sm text-gray-400">
                      {new Date(selectedAchievement.unlockedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-gray-400">Progress: {Math.round(selectedAchievement.progress * 100)}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${ACHIEVEMENT_TYPES[selectedAchievement.type].color}`}
                        style={{ width: `${selectedAchievement.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-yellow-400">⚡</span>
                    <span className="text-white font-medium">Reward: +{selectedAchievement.xpReward} XP</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementsPanel;