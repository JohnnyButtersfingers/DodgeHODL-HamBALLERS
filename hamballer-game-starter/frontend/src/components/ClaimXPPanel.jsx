import React, { useState, useEffect } from 'react';
import { useXp } from '../contexts/XpContext';
import { useWallet } from '../contexts/WalletContext';

const ClaimXPPanel = ({ className = '' }) => {
  const { isConnected } = useWallet();
  const { currentXp, totalXp, level, nextLevelXp, recentGains } = useXp();
  const [animatingXp, setAnimatingXp] = useState(0);
  const [showRecentGain, setShowRecentGain] = useState(false);

  // Calculate XP progress percentage
  const progressPercentage = nextLevelXp > 0 ? (currentXp / nextLevelXp) * 100 : 100;

  // Animate XP counter
  useEffect(() => {
    if (currentXp > animatingXp) {
      const increment = Math.ceil((currentXp - animatingXp) / 20);
      const timer = setTimeout(() => {
        setAnimatingXp(prev => Math.min(prev + increment, currentXp));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentXp, animatingXp]);

  // Show recent XP gains
  useEffect(() => {
    if (recentGains.length > 0) {
      setShowRecentGain(true);
      const timer = setTimeout(() => setShowRecentGain(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentGains]);

  const badges = [
    { 
      name: 'First Steps', 
      description: 'Complete your first game',
      icon: '🏃',
      requirement: 100,
      color: 'fresh-green',
      unlocked: totalXp >= 100
    },
    {
      name: 'HODL Master',
      description: 'Execute 10 successful HODLs',
      icon: '💎',
      requirement: 500,
      color: 'arcade-blue',
      unlocked: totalXp >= 500
    },
    {
      name: 'Market Navigator',
      description: 'Survive 25 volatile sessions',
      icon: '⚡',
      requirement: 1000,
      color: 'neon-yellow',
      unlocked: totalXp >= 1000
    },
    {
      name: 'Elite Trader',
      description: 'Reach Level 10',
      icon: '👑',
      requirement: 2500,
      color: 'purple-80s',
      unlocked: totalXp >= 2500
    }
  ];

  if (!isConnected) {
    return (
      <div className={`panel-dark rounded-2xl p-6 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h3 className="text-logo font-bold text-cloud-white">
            Connect Wallet
          </h3>
          <p className="text-body text-gray-400">
            Connect your wallet to start earning XP and unlocking badges
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`panel-dark rounded-2xl shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-soft-grey/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-logo font-bold text-cloud-white">
              XP Progress
            </h3>
            <p className="text-label text-gray-400">
              Level {level} • {animatingXp} / {nextLevelXp} XP
            </p>
          </div>
          <div className="text-4xl animate-bounce-gentle">⚡</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-body text-cloud-white font-semibold">
              Level {level}
            </span>
            <span className="text-body text-cloud-white font-semibold">
              Level {level + 1}
            </span>
          </div>
          
          <div className="xp-bar-bg">
            <div 
              className="xp-bar h-3 relative overflow-hidden"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-arcade-blue to-fresh-green opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>

          <div className="flex justify-between text-label text-gray-400">
            <span>{animatingXp} XP</span>
            <span>{nextLevelXp} XP</span>
          </div>
        </div>

        {/* Recent XP Gains */}
        {showRecentGain && recentGains.length > 0 && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <div className="bg-fresh-green/20 border border-fresh-green/50 rounded-2xl p-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🎉</div>
                <div>
                  <p className="text-body font-semibold text-fresh-green">
                    +{recentGains[recentGains.length - 1]} XP Earned!
                  </p>
                  <p className="text-label text-gray-300">
                    Great gameplay streak
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-arcade-blue/10 rounded-2xl border border-arcade-blue/30">
            <div className="text-2xl font-bold text-arcade-blue">
              {totalXp.toLocaleString()}
            </div>
            <div className="text-label text-gray-400">Total XP</div>
          </div>
          <div className="text-center p-4 bg-neon-yellow/10 rounded-2xl border border-neon-yellow/30">
            <div className="text-2xl font-bold text-neon-yellow">
              {level}
            </div>
            <div className="text-label text-gray-400">Current Level</div>
          </div>
        </div>
      </div>

      {/* Badge Progress */}
      <div className="p-6 border-t border-soft-grey/20">
        <h4 className="text-logo font-bold text-cloud-white mb-4">
          Achievement Badges
        </h4>
        
        <div className="space-y-3">
          {badges.map((badge, index) => (
            <div 
              key={badge.name}
              className={`flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 ${
                badge.unlocked 
                  ? `bg-${badge.color}/20 border border-${badge.color}/50 shadow-glow` 
                  : 'bg-soft-grey/10 border border-soft-grey/20'
              }`}
            >
              <div className={`text-3xl ${badge.unlocked ? '' : 'opacity-50'}`}>
                {badge.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h5 className={`text-body font-semibold ${
                    badge.unlocked ? `text-${badge.color}` : 'text-gray-400'
                  }`}>
                    {badge.name}
                  </h5>
                  {badge.unlocked && (
                    <div className="badge-success">Unlocked!</div>
                  )}
                </div>
                
                <p className="text-label text-gray-400 mt-1">
                  {badge.description}
                </p>
                
                {!badge.unlocked && (
                  <div className="mt-2">
                    <div className="flex justify-between text-label text-gray-400 mb-1">
                      <span>{totalXp} / {badge.requirement} XP</span>
                      <span>{Math.round((totalXp / badge.requirement) * 100)}%</span>
                    </div>
                    <div className="xp-bar-bg h-2">
                      <div 
                        className={`bg-${badge.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min((totalXp / badge.requirement) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Next Badge Preview */}
        <div className="mt-6 p-4 bg-retro-black/50 rounded-2xl border border-soft-grey/20">
          <div className="text-center">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-body text-cloud-white font-semibold">
              Keep playing to unlock more badges!
            </p>
            <p className="text-label text-gray-400">
              New achievements coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimXPPanel;