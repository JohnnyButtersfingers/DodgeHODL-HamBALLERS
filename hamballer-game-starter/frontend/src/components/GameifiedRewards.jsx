import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, TrendingUp, Star, Award } from 'lucide-react';

// Sparkle Animation Component
export const SparkleEffect = ({ isActive, children }) => {
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    if (isActive) {
      const newSparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setSparkles(newSparkles);

      const timer = setTimeout(() => setSparkles([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute pointer-events-none"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
            }}
            initial={{ scale: 0, rotate: 0, opacity: 1 }}
            animate={{
              scale: [0, sparkle.scale, 0],
              rotate: [0, 180, 360],
              opacity: [0, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              delay: sparkle.delay,
              ease: "easeOut",
            }}
          >
            <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// XP Streak Animation
export const XPStreakAnimation = ({ streak, isVisible, onComplete }) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 shadow-2xl"
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: -50 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
        >
          <div className="text-center">
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              🔥
            </motion.div>
            <motion.h2
              className="text-2xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {streak} Game Streak!
            </motion.h2>
            <motion.p
              className="text-purple-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              You're on fire! Keep it up!
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Leaderboard Rank Jump Animation
export const LeaderboardJumpAnimation = ({ rankChange, isVisible, onComplete }) => {
  if (!isVisible || !rankChange) return null;

  const isPositive = rankChange > 0;
  const sign = isPositive ? '+' : '';
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const bgColor = isPositive ? 'bg-green-500' : 'bg-red-500';

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className="fixed top-1/4 right-8 z-50 pointer-events-none"
        initial={{ opacity: 0, x: 50, scale: 0 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
      >
        <div className={`${bgColor} rounded-full p-4 shadow-lg`}>
          <div className="flex items-center space-x-2 text-white">
            <TrendingUp className="w-6 h-6" />
            <div className="text-right">
              <div className={`text-2xl font-bold ${color}`}>
                {sign}{Math.abs(rankChange)}
              </div>
              <div className="text-xs opacity-80">
                {isPositive ? 'Rank Up!' : 'Rank Down'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Badge Unlock Animation
export const BadgeUnlockAnimation = ({ badge, isVisible, onComplete }) => {
  if (!isVisible || !badge) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onComplete}
      >
        <motion.div
          className="bg-gradient-to-b from-yellow-400 to-orange-500 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
          initial={{ scale: 0, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0, rotateY: 180 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
        >
          {/* Background sparkles */}
          <div className="absolute inset-0">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 1,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2,
                }}
              >
                <Star className="w-2 h-2 text-white" fill="currentColor" />
              </motion.div>
            ))}
          </div>

          <div className="relative z-10 text-center">
            <motion.div
              className="text-8xl mb-6"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              {badge.emoji}
            </motion.div>

            <motion.h2
              className="text-3xl font-bold text-white mb-2 drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {badge.tier} Badge Unlocked!
            </motion.h2>

            <motion.p
              className="text-yellow-100 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {badge.description}
            </motion.p>

            <motion.div
              className="flex items-center justify-center space-x-2 text-white/80"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Trophy className="w-5 h-5" />
              <span>{badge.xp} XP Earned</span>
            </motion.div>

            <motion.button
              className="mt-6 bg-white text-orange-500 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              onClick={onComplete}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue Playing!
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// XP Gain Animation
export const XPGainAnimation = ({ xpGained, isVisible, onComplete }) => {
  if (!isVisible || !xpGained) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className="fixed top-20 right-8 z-40 pointer-events-none"
        initial={{ opacity: 0, x: 50, scale: 0 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
      >
        <div className="bg-blue-500 text-white rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-300" />
            <span className="font-bold">+{xpGained} XP</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Combo Multiplier Animation
export const ComboMultiplierAnimation = ({ multiplier, isVisible, onComplete }) => {
  if (!isVisible || !multiplier || multiplier <= 1) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className="fixed top-1/3 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
        initial={{ opacity: 0, scale: 0, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0, y: -50 }}
        transition={{ type: "spring", damping: 12, stiffness: 400 }}
      >
        <motion.div
          className="bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-2xl p-6 shadow-2xl"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{ 
            duration: 0.8,
            repeat: 2,
          }}
        >
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {multiplier}x COMBO!
            </div>
            <div className="text-pink-100 text-sm">
              Multiplier Active
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Achievement Toast
export const AchievementToast = ({ achievement, isVisible, onComplete }) => {
  if (!isVisible || !achievement) return null;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className="fixed bottom-8 right-8 z-40 max-w-sm"
        initial={{ opacity: 0, x: 300, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.8 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <Award className="w-6 h-6 text-yellow-300 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">{achievement.title}</h4>
              <p className="text-emerald-100 text-sm">{achievement.description}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for managing gamified rewards
export const useGameifiedRewards = () => {
  const [activeRewards, setActiveRewards] = useState({
    xpStreak: null,
    rankJump: null,
    badgeUnlock: null,
    xpGain: null,
    comboMultiplier: null,
    achievement: null,
    sparkle: false,
  });

  const triggerReward = (type, data) => {
    setActiveRewards(prev => ({
      ...prev,
      [type]: data,
    }));

    // Auto-clear after timeout for some rewards
    const timeouts = {
      xpGain: 2000,
      comboMultiplier: 3000,
      achievement: 4000,
      sparkle: 2000,
    };

    if (timeouts[type]) {
      setTimeout(() => {
        clearReward(type);
      }, timeouts[type]);
    }
  };

  const clearReward = (type) => {
    setActiveRewards(prev => ({
      ...prev,
      [type]: type === 'sparkle' ? false : null,
    }));
  };

  return {
    activeRewards,
    triggerReward,
    clearReward,
  };
};

// Main GameifiedRewards component
export const GameifiedRewards = ({ rewards, onRewardComplete }) => {
  return (
    <>
      <XPStreakAnimation
        streak={rewards.xpStreak}
        isVisible={!!rewards.xpStreak}
        onComplete={() => onRewardComplete('xpStreak')}
      />
      
      <LeaderboardJumpAnimation
        rankChange={rewards.rankJump}
        isVisible={!!rewards.rankJump}
        onComplete={() => onRewardComplete('rankJump')}
      />
      
      <BadgeUnlockAnimation
        badge={rewards.badgeUnlock}
        isVisible={!!rewards.badgeUnlock}
        onComplete={() => onRewardComplete('badgeUnlock')}
      />
      
      <XPGainAnimation
        xpGained={rewards.xpGain}
        isVisible={!!rewards.xpGain}
        onComplete={() => onRewardComplete('xpGain')}
      />
      
      <ComboMultiplierAnimation
        multiplier={rewards.comboMultiplier}
        isVisible={!!rewards.comboMultiplier}
        onComplete={() => onRewardComplete('comboMultiplier')}
      />
      
      <AchievementToast
        achievement={rewards.achievement}
        isVisible={!!rewards.achievement}
        onComplete={() => onRewardComplete('achievement')}
      />
    </>
  );
};

export default GameifiedRewards;