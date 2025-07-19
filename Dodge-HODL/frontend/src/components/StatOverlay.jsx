import React from 'react';
import { useAccount } from 'wagmi';

const StatOverlay = ({ stats }) => {
  const { address } = useAccount();

  if (!stats) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Player Stats</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="bg-gray-700/50 rounded w-20 h-4"></div>
              <div className="bg-gray-700/50 rounded w-12 h-4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statItems = [
    { label: 'Level', value: stats.level || 1, color: 'text-blue-400', icon: '⭐' },
    { label: 'XP', value: `${stats.currentXp || 0}/${stats.xpToNext || 100}`, color: 'text-purple-400', icon: '🚀' },
    { label: 'Total Runs', value: stats.totalRuns || 0, color: 'text-green-400', icon: '🏃' },
    { label: 'Win Rate', value: `${((stats.successfulRuns || 0) / Math.max(stats.totalRuns || 1, 1) * 100).toFixed(1)}%`, color: 'text-yellow-400', icon: '🎯' },
    { label: 'Best Score', value: stats.bestScore || 0, color: 'text-orange-400', icon: '🏆' },
    { label: 'Total DBP', value: (stats.totalDbpEarned || 0).toFixed(2), color: 'text-green-400', icon: '💰' },
    { label: 'Avg Points', value: (stats.averageScore || 0).toFixed(1), color: 'text-cyan-400', icon: '📊' },
    { label: 'HODL Success', value: `${stats.hodlSuccesses || 0}/${stats.hodlAttempts || 0}`, color: 'text-indigo-400', icon: '💎' },
  ];

  // Calculate XP progress percentage
  const xpProgress = stats.xpToNext > 0 ? (stats.currentXp / stats.xpToNext) * 100 : 0;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Player Stats</h3>
        <div className="text-xs text-gray-400">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">Level {stats.level || 1}</span>
          <span className="text-purple-400">{stats.currentXp || 0} / {stats.xpToNext || 100} XP</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        {statItems.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm">{item.icon}</span>
              <span className="text-sm text-gray-300">{item.label}</span>
            </div>
            <span className={`text-sm font-medium ${item.color}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm py-2 px-3 rounded transition-colors">
            View History
          </button>
          <button className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm py-2 px-3 rounded transition-colors">
            Claim Rewards
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatOverlay;