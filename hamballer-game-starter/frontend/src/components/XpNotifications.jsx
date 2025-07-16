import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXp } from '../contexts/XpContext';

const XpNotifications = () => {
  const { recentXpGains, level } = useXp();
  const [levelUpNotification, setLevelUpNotification] = useState(null);

  useEffect(() => {
    // Listen for level up events
    const handleLevelUp = (event) => {
      const { newLevel, previousLevel } = event.detail;
      setLevelUpNotification({
        newLevel,
        previousLevel,
        id: Date.now()
      });

      // Clear level up notification after 4 seconds
      setTimeout(() => {
        setLevelUpNotification(null);
      }, 4000);
    };

    window.addEventListener('playerLevelUp', handleLevelUp);
    return () => {
      window.removeEventListener('playerLevelUp', handleLevelUp);
    };
  }, []);

  const getSourceIcon = (source) => {
    switch (source) {
      case 'achievement': return '🏆';
      case 'lootpack': return '📦';
      case 'run_completion': return '🏃';
      case 'badge_claim': return '🏅';
      case 'daily_bonus': return '📅';
      default: return '⚡';
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'achievement': return 'from-yellow-400 to-orange-500';
      case 'lootpack': return 'from-purple-400 to-pink-500';
      case 'run_completion': return 'from-green-400 to-blue-500';
      case 'badge_claim': return 'from-blue-400 to-purple-500';
      case 'daily_bonus': return 'from-orange-400 to-red-500';
      default: return 'from-blue-400 to-purple-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {/* Level Up Notification */}
      <AnimatePresence>
        {levelUpNotification && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 20
              }
            }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 shadow-2xl min-w-[300px]"
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
              className="text-center"
            >
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-xl font-bold text-white mb-1">LEVEL UP!</h3>
              <div className="text-white">
                Level {levelUpNotification.previousLevel} → Level {levelUpNotification.newLevel}
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="w-full h-1 bg-white/30 rounded-full mt-3 overflow-hidden"
              >
                <div className="h-full bg-white rounded-full" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP Gain Notifications */}
      <AnimatePresence>
        {recentXpGains.map((gain) => (
          <motion.div
            key={gain.id}
            initial={{ x: 100, opacity: 0, scale: 0.8 }}
            animate={{ 
              x: 0, 
              opacity: 1, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
              }
            }}
            exit={{ 
              x: 100, 
              opacity: 0, 
              scale: 0.8,
              transition: { duration: 0.3 }
            }}
            className={`bg-gradient-to-r ${getSourceColor(gain.source)} rounded-lg p-4 shadow-lg min-w-[200px] backdrop-blur-sm`}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut"
                }}
                className="text-2xl"
              >
                {getSourceIcon(gain.source)}
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 0.8,
                      ease: "easeInOut"
                    }}
                    className="text-white font-bold text-lg"
                  >
                    +{gain.amount}
                  </motion.span>
                  <span className="text-white/90 text-sm">XP</span>
                </div>
                
                <div className="text-white/70 text-xs capitalize">
                  {gain.source.replace('_', ' ')}
                </div>
              </div>

              {/* Sparkling Animation */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.5, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="text-white text-xl"
              >
                ✨
              </motion.div>
            </div>

            {/* Progress Bar Animation */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="w-full h-1 bg-white/30 rounded-full mt-3 overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="h-full bg-white rounded-full"
              />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default XpNotifications;