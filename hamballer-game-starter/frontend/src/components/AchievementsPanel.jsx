import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AchievementsPanel = ({ playerAddress }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredAchievement, setHoveredAchievement] = useState(null);

  useEffect(() => {
    if (playerAddress) {
      fetchAchievements();
    }
  }, [playerAddress]);

  const fetchAchievements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/player/${playerAddress}/achievements`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch achievements: ${response.status}`);
      }
      
      const data = await response.json();
      setAchievements(data.data.achievements || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setError(error.message);
      
      // Mock achievements for development
      setAchievements([
        {
          id: 'first_match',
          name: 'First Steps',
          description: 'Complete your first match',
          icon: '🎯',
          rarity: 'common',
          category: 'gameplay',
          earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          progress: 100
        },
        {
          id: 'xp_100',
          name: 'Century Club',
          description: 'Earn 100 XP total',
          icon: '💯',
          rarity: 'common',
          category: 'progression',
          earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          progress: 100
        },
        {
          id: 'win_streak_5',
          name: 'Hot Streak',
          description: 'Win 5 matches in a row',
          icon: '🔥',
          rarity: 'uncommon',
          category: 'gameplay',
          earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          progress: 100
        },
        {
          id: 'top_5_rank',
          name: 'Elite Player',
          description: 'Reach top 5 on leaderboard',
          icon: '👑',
          rarity: 'rare',
          category: 'ranking',
          earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          progress: 100
        },
        {
          id: 'early_adopter',
          name: 'Early Adopter',
          description: 'Join during beta phase',
          icon: '🚀',
          rarity: 'rare',
          category: 'special',
          earnedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          progress: 100
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getRarityStyles = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          bg: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500',
          border: 'border-yellow-400',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
          text: 'text-yellow-100'
        };
      case 'rare':
        return {
          bg: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600',
          border: 'border-purple-400',
          glow: 'shadow-[0_0_15px_rgba(147,51,234,0.4)]',
          text: 'text-purple-100'
        };
      case 'uncommon':
        return {
          bg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600',
          border: 'border-blue-400',
          glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
          text: 'text-blue-100'
        };
      case 'common':
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700',
          border: 'border-gray-400',
          glow: 'shadow-[0_0_8px_rgba(107,114,128,0.2)]',
          text: 'text-gray-100'
        };
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const earnedDate = new Date(date);
    const diffTime = Math.abs(now - earnedDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4 }
    },
    hover: {
      scale: 1.05,
      y: -5,
      transition: { duration: 0.2 }
    }
  };

  if (!playerAddress) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 text-center">
        <div className="text-gray-400">Connect wallet to view achievements</div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-gray-700/50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
          🏆 Achievements
          {achievements.length > 0 && (
            <span className="text-sm bg-blue-500 text-white px-2 py-1 rounded-full">
              {achievements.length}
            </span>
          )}
        </h3>
        
        {/* TODO: Add progress indicator for future features */}
        <div className="text-xs text-gray-400">
          {/* Progress: {achievements.length}/8 */}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-gray-400">Loading achievements...</span>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <div className="text-red-400 text-sm mb-2">⚠️ {error}</div>
          <div className="text-gray-400 text-xs">Showing mock data for development</div>
        </div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">🎯</div>
          <div>No achievements yet</div>
          <div className="text-sm mt-1">Start playing to earn your first badge!</div>
        </div>
      ) : null}

      {/* Achievement Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        <AnimatePresence>
          {achievements.slice(0, 6).map((achievement) => {
            const styles = getRarityStyles(achievement.rarity);
            
            return (
              <motion.div
                key={achievement.id}
                variants={badgeVariants}
                whileHover="hover"
                className="relative"
                onMouseEnter={() => setHoveredAchievement(achievement)}
                onMouseLeave={() => setHoveredAchievement(null)}
              >
                <div
                  className={`
                    relative w-full aspect-square rounded-lg p-3 cursor-pointer
                    ${styles.bg} ${styles.border} ${styles.glow}
                    border-2 transition-all duration-300
                    flex flex-col items-center justify-center text-center
                  `}
                >
                  {/* Achievement Icon */}
                  <div className="text-2xl sm:text-3xl mb-1">
                    {achievement.icon}
                  </div>
                  
                  {/* Achievement Name (abbreviated on small screens) */}
                  <div className={`text-xs font-semibold ${styles.text} leading-tight`}>
                    <div className="sm:hidden">
                      {achievement.name.length > 8 
                        ? achievement.name.substring(0, 8) + '...'
                        : achievement.name
                      }
                    </div>
                    <div className="hidden sm:block">
                      {achievement.name}
                    </div>
                  </div>
                  
                  {/* Rarity indicator */}
                  <div className="absolute top-1 right-1">
                    <div className={`w-2 h-2 rounded-full ${
                      achievement.rarity === 'legendary' ? 'bg-yellow-300' :
                      achievement.rarity === 'rare' ? 'bg-purple-300' :
                      achievement.rarity === 'uncommon' ? 'bg-blue-300' :
                      'bg-gray-300'
                    }`} />
                  </div>
                  
                  {/* Earned date indicator */}
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-xs opacity-75 bg-black/20 rounded px-1 py-0.5">
                      {formatDate(achievement.earnedAt)}
                    </div>
                  </div>
                </div>

                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredAchievement?.id === achievement.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64"
                    >
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
                        <div className="font-semibold text-white mb-1">
                          {achievement.name}
                        </div>
                        <div className="text-sm text-gray-300 mb-2">
                          {achievement.description}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={`
                            px-2 py-1 rounded capitalize
                            ${achievement.rarity === 'legendary' ? 'bg-yellow-900 text-yellow-200' :
                              achievement.rarity === 'rare' ? 'bg-purple-900 text-purple-200' :
                              achievement.rarity === 'uncommon' ? 'bg-blue-900 text-blue-200' :
                              'bg-gray-700 text-gray-200'
                            }
                          `}>
                            {achievement.rarity}
                          </span>
                          <span className="text-gray-400">
                            {formatDate(achievement.earnedAt)}
                          </span>
                        </div>
                      </div>
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more achievements link if there are more than 6 */}
      {achievements.length > 6 && (
        <div className="mt-4 text-center">
          <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            View all {achievements.length} achievements →
          </button>
        </div>
      )}

      {/* TODO: Future features */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        {/* TODO: Add progress bars for achievements in progress */}
        {/* TODO: Add unlock animations when new achievements are earned */}
        {/* TODO: Add blockchain verification links */}
        {/* TODO: Add achievement sharing functionality */}
      </div>
    </motion.div>
  );
};

export default AchievementsPanel;