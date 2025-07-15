import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { useWebSocket } from '../services/useWebSocketService';
import { apiFetch } from '../services/useApiService';
import AchievementsPanel from './AchievementsPanel';

const PlayerProfile = ({ address: propAddress }) => {
  const { address: walletAddress } = useWallet();
  const { connected: wsConnected, liveXP, liveStats } = useWebSocket();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Use prop address if provided, otherwise use wallet address
  const playerAddress = propAddress || walletAddress;
  const isOwnProfile = playerAddress === walletAddress;

  useEffect(() => {
    if (playerAddress) {
      fetchPlayerData();
    }
  }, [playerAddress]);

  // Update data when live stats come in
  useEffect(() => {
    if (liveStats && playerData && liveStats.address === playerAddress) {
      setPlayerData(prev => ({
        ...prev,
        ...liveStats
      }));
    }
  }, [liveStats, playerData, playerAddress]);

  const fetchPlayerData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch(`/api/dashboard/${playerAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        setPlayerData(data);
      } else {
        throw new Error('Failed to fetch player data');
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
      setError(error.message);
      
      // Mock player data for development
      setPlayerData({
        address: playerAddress,
        playerStats: {
          totalRuns: 25,
          completedRuns: 18,
          totalCPEarned: 2500,
          totalDBPEarned: 125.5,
          bestRunCP: 450,
          longestRunTime: 1200,
          currentStreak: 3,
          bestStreak: 7
        },
        balance: {
          dbp: 125.5,
          boosts: { 1: 2, 2: 1, 3: 0, 4: 1, 5: 0 }
        },
        rank: 15,
        level: 8,
        winRate: 72.0,
        recentRuns: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4 }
    }
  };

  if (!playerAddress) {
    return (
      <motion.div 
        className="text-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-gray-400 mb-4">
          <div className="text-4xl mb-4">👤</div>
          <div>No player address provided</div>
          <div className="text-sm mt-2">Connect your wallet or provide a player address</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        variants={cardVariants}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {isOwnProfile ? 'Your Profile' : 'Player Profile'}
            </h1>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="font-mono text-sm">{formatAddress(playerAddress)}</span>
              {wsConnected && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-md text-sm transition-all duration-200 ${
              activeTab === 'achievements'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Achievements
          </button>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm"
          >
            ⚠️ {error} - Showing mock data for development
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading ? (
        <motion.div
          className="flex items-center justify-center py-12"
          variants={cardVariants}
        >
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-gray-400">Loading player profile...</span>
        </motion.div>
      ) : (
        <>
          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Player Stats Grid */}
                <motion.div 
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                  variants={cardVariants}
                >
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm">Rank</div>
                    <div className="text-2xl font-bold text-white">
                      #{playerData?.rank || '—'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm">Level</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {playerData?.level || 1}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm">Total DBP</div>
                    <div className="text-2xl font-bold text-green-400">
                      {playerData?.playerStats?.totalDBPEarned?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                    <div className="text-gray-400 text-sm">Win Rate</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {playerData?.winRate?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                </motion.div>

                {/* Detailed Stats */}
                <motion.div 
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
                  variants={cardVariants}
                >
                  {/* Game Statistics */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      🎮 Game Statistics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Runs</span>
                        <span className="text-white font-medium">
                          {playerData?.playerStats?.totalRuns || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Completed Runs</span>
                        <span className="text-white font-medium">
                          {playerData?.playerStats?.completedRuns || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best Score</span>
                        <span className="text-white font-medium">
                          {formatNumber(playerData?.playerStats?.bestRunCP || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Longest Run</span>
                        <span className="text-white font-medium">
                          {formatTime(playerData?.playerStats?.longestRunTime || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Streak</span>
                        <span className="text-orange-400 font-medium">
                          {playerData?.playerStats?.currentStreak || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best Streak</span>
                        <span className="text-orange-400 font-medium">
                          {playerData?.playerStats?.bestStreak || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Earnings & Assets */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      💰 Earnings & Assets
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">DBP Balance</span>
                        <span className="text-green-400 font-medium">
                          {playerData?.balance?.dbp?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total CP Earned</span>
                        <span className="text-white font-medium">
                          {formatNumber(playerData?.playerStats?.totalCPEarned || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total DBP Earned</span>
                        <span className="text-green-400 font-medium">
                          {playerData?.playerStats?.totalDBPEarned?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      
                      {/* Boost Inventory */}
                      <div className="pt-2 border-t border-gray-600">
                        <div className="text-gray-400 text-sm mb-2">Boost Inventory</div>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map(boostId => (
                            <div key={boostId} className="text-center">
                              <div className="w-8 h-8 bg-gray-700 rounded border text-xs flex items-center justify-center text-gray-300">
                                {playerData?.balance?.boosts?.[boostId] || 0}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">B{boostId}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AchievementsPanel playerAddress={playerAddress} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

export default PlayerProfile;