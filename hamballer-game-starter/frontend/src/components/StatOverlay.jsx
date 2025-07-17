import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { useXp } from '../contexts/XpContext';

const StatOverlay = ({ stats }) => {
  const { address } = useWallet();
  const { contracts, getPlayerStats } = useContracts();
  const { xp: contextXp } = useXp();
  const [contractStats, setContractStats] = useState(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  // Fetch real-time contract stats
  useEffect(() => {
    const fetchContractStats = async () => {
      if (!address || !contracts?.hodlManager || !getPlayerStats) return;
      
      setIsLoadingContract(true);
      try {
        const contractData = await getPlayerStats(address);
        setContractStats(contractData);
      } catch (error) {
        console.error('Error fetching contract stats:', error);
      } finally {
        setIsLoadingContract(false);
      }
    };

    fetchContractStats();
    
    // Refresh contract stats every 30 seconds
    const interval = setInterval(fetchContractStats, 30000);
    return () => clearInterval(interval);
  }, [address, contracts, getPlayerStats]);

  // Merge stats from multiple sources (backend API, contract, context)
  const mergedStats = React.useMemo(() => {
    const baseStats = stats || {};
    const contractData = contractStats || {};
    
    return {
      level: contractData.level || baseStats.level || 1,
      currentXp: Math.max(
        contractData.currentXp || 0,
        baseStats.currentXp || 0,
        contextXp || 0
      ),
      totalRuns: contractData.totalRuns || baseStats.totalRuns || 0,
      successfulRuns: contractData.successfulRuns || baseStats.successfulRuns || 0,
      totalDbpEarned: contractData.totalDbpEarned || baseStats.totalDbpEarned || 0,
      bestScore: baseStats.bestScore || 0,
      averageScore: baseStats.averageScore || 0,
      hodlSuccesses: baseStats.hodlSuccesses || 0,
      hodlAttempts: baseStats.hodlAttempts || 0,
      xpToNext: baseStats.xpToNext || 100,
    };
  }, [stats, contractStats, contextXp]);

  if (!stats && !contractStats && !isLoadingContract) {
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
    { label: 'Level', value: mergedStats.level || 1, color: 'text-blue-400', icon: '⭐' },
    { label: 'XP', value: `${mergedStats.currentXp || 0}/${mergedStats.xpToNext || 100}`, color: 'text-purple-400', icon: '🚀' },
    { label: 'Total Runs', value: mergedStats.totalRuns || 0, color: 'text-green-400', icon: '🏃' },
    { label: 'Win Rate', value: `${((mergedStats.successfulRuns || 0) / Math.max(mergedStats.totalRuns || 1, 1) * 100).toFixed(1)}%`, color: 'text-yellow-400', icon: '🎯' },
    { label: 'Best Score', value: mergedStats.bestScore || 0, color: 'text-orange-400', icon: '🏆' },
    { label: 'Total DBP', value: (mergedStats.totalDbpEarned || 0).toFixed(2), color: 'text-green-400', icon: '💰' },
    { label: 'Avg Points', value: (mergedStats.averageScore || 0).toFixed(1), color: 'text-cyan-400', icon: '📊' },
    { label: 'HODL Success', value: `${mergedStats.hodlSuccesses || 0}/${mergedStats.hodlAttempts || 0}`, color: 'text-indigo-400', icon: '💎' },
  ];

  // Calculate XP progress percentage
  const xpProgress = mergedStats.xpToNext > 0 ? (mergedStats.currentXp / mergedStats.xpToNext) * 100 : 0;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Player Stats</h3>
        <div className="text-xs text-gray-400 space-y-1">
          {address && (
            <div>{address.slice(0, 6)}...{address.slice(-4)}</div>
          )}
          <div className="flex items-center space-x-2">
            {contractStats && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                Contract
              </span>
            )}
            {isLoadingContract && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1 animate-pulse"></div>
                Loading...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">Level {mergedStats.level || 1}</span>
          <span className="text-purple-400">{mergedStats.currentXp || 0} / {mergedStats.xpToNext || 100} XP</span>
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