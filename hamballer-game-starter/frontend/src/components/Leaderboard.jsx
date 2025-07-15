import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { useWebSocket } from '../services/useWebSocketService';
import { apiFetch } from '../services/useApiService';

const Leaderboard = () => {
  const { address } = useWallet();
  const { connected: wsConnected, liveStats } = useWebSocket();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('total_dbp'); // total_dbp, best_score, total_runs, win_rate
  const [timeframe, setTimeframe] = useState('all'); // 24h, 7d, 30d, all
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [category, timeframe]);

  // Update leaderboard when live stats come in
  useEffect(() => {
    if (liveStats && leaderboardData.length > 0) {
      setLeaderboardData(prev => prev.map(player => 
        player.address === liveStats.address 
          ? { ...player, ...liveStats }
          : player
      ));
    }
  }, [liveStats, leaderboardData.length]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/dashboard/leaderboard?category=${category}&timeframe=${timeframe}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data.leaderboard || []);
      } else {
        throw new Error('Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError(error.message);
      // Mock data for development
      setLeaderboardData([
        { address: '0x1234...5678', totalDbpEarned: 1250.75, bestScore: 8750, totalRuns: 45, winRate: 82.2, level: 12 },
        { address: '0x2345...6789', totalDbpEarned: 980.50, bestScore: 7890, totalRuns: 38, winRate: 78.9, level: 10 },
        { address: '0x3456...7890', totalDbpEarned: 875.25, bestScore: 7234, totalRuns: 42, winRate: 71.4, level: 9 },
        { address: '0x4567...8901', totalDbpEarned: 650.00, bestScore: 6890, totalRuns: 35, winRate: 68.6, level: 8 },
        { address: '0x5678...9012', totalDbpEarned: 520.75, bestScore: 6123, totalRuns: 28, winRate: 75.0, level: 7 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'total_dbp': return 'Total DBP Earned';
      case 'best_score': return 'Best Score';
      case 'total_runs': return 'Total Runs';
      case 'win_rate': return 'Win Rate';
      default: return 'Unknown';
    }
  };

  const getCategoryValue = (player, cat) => {
    switch (cat) {
      case 'total_dbp': return `${player.totalDbpEarned?.toFixed(2) || '0.00'} DBP`;
      case 'best_score': return player.bestScore?.toLocaleString() || '0';
      case 'total_runs': return player.totalRuns || 0;
      case 'win_rate': return `${player.winRate?.toFixed(1) || '0.0'}%`;
      default: return '—';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const isCurrentUser = (playerAddress) => {
    return address && playerAddress.toLowerCase() === address.toLowerCase();
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

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className="space-y-4 sm:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header with WebSocket Status */}
      <motion.div 
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        variants={itemVariants}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">🏆 Leaderboard</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              wsConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-400">
              {wsConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-gray-700/80 backdrop-blur-sm text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-400 focus:outline-none transition-all duration-200 hover:bg-gray-600/80"
          >
            <option value="total_dbp">Total DBP Earned</option>
            <option value="best_score">Best Score</option>
            <option value="total_runs">Total Runs</option>
            <option value="win_rate">Win Rate</option>
          </select>

          {/* Timeframe Filter */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-700/80 backdrop-blur-sm text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-400 focus:outline-none transition-all duration-200 hover:bg-gray-600/80"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <motion.button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              'Refresh'
            )}
          </motion.button>
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

      {/* Leaderboard Stats */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        variants={itemVariants}
      >
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 text-center border border-gray-700/50"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="text-2xl sm:text-3xl mb-2">👥</div>
          <motion.div 
            className="text-xl sm:text-2xl font-bold text-white"
            key={leaderboardData.length}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {leaderboardData.length}
          </motion.div>
          <div className="text-gray-400 text-sm">Active Players</div>
        </motion.div>
        
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 text-center border border-gray-700/50"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="text-2xl sm:text-3xl mb-2">💰</div>
          <motion.div 
            className="text-xl sm:text-2xl font-bold text-green-400"
            key={leaderboardData.reduce((sum, p) => sum + (p.totalDbpEarned || 0), 0)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {leaderboardData.reduce((sum, p) => sum + (p.totalDbpEarned || 0), 0).toFixed(2)}
          </motion.div>
          <div className="text-gray-400 text-sm">Total DBP Distributed</div>
        </motion.div>
        
        <motion.div 
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 text-center border border-gray-700/50 sm:col-span-2 lg:col-span-1"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="text-2xl sm:text-3xl mb-2">🏃</div>
          <motion.div 
            className="text-xl sm:text-2xl font-bold text-blue-400"
            key={leaderboardData.reduce((sum, p) => sum + (p.totalRuns || 0), 0)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {leaderboardData.reduce((sum, p) => sum + (p.totalRuns || 0), 0)}
          </motion.div>
          <div className="text-gray-400 text-sm">Total Runs</div>
        </motion.div>
      </motion.div>

      {/* Leaderboard Table */}
      <motion.div 
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700/50"
        variants={itemVariants}
      >
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Top Players - {getCategoryLabel(category)}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Showing {timeframe === 'all' ? 'all-time' : timeframe} rankings
            {wsConnected && <span className="text-green-400 ml-2">• Live updates</span>}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 sm:py-12 text-gray-400"
            >
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
              Loading leaderboard...
            </motion.div>
          ) : leaderboardData.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 sm:py-12 text-gray-400"
            >
              <div className="text-3xl sm:text-4xl mb-4">🏆</div>
              <div>No players found for the selected timeframe</div>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-x-auto"
            >
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr className="text-gray-300 text-xs sm:text-sm">
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6">Rank</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6">Player</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 hidden sm:table-cell">Level</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6">{getCategoryLabel(category)}</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 hidden md:table-cell">Total DBP</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 hidden lg:table-cell">Runs</th>
                    <th className="text-left py-3 sm:py-4 px-4 sm:px-6 hidden lg:table-cell">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <AnimatePresence>
                    {leaderboardData.map((player, index) => {
                      const rank = index + 1;
                      const isUser = isCurrentUser(player.address);
                      
                      return (
                        <motion.tr 
                          key={player.address}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className={`transition-all duration-200 ${
                            isUser 
                              ? 'bg-blue-500/10 border-l-4 border-blue-500' 
                              : 'hover:bg-gray-700/30'
                          }`}
                          whileHover={{ scale: 1.01 }}
                        >
                          <td className="py-3 sm:py-4 px-4 sm:px-6">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg sm:text-2xl">
                                {getRankIcon(rank)}
                              </span>
                              {isUser && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-3 sm:py-4 px-4 sm:px-6">
                            <div className="font-mono text-white text-sm">
                              {player.address.slice(0, 6)}...{player.address.slice(-4)}
                            </div>
                          </td>
                          
                          <td className="py-3 sm:py-4 px-4 sm:px-6 hidden sm:table-cell">
                            <div className="flex items-center space-x-2">
                              <span className="text-yellow-400 font-bold">
                                {player.level || 1}
                              </span>
                              <span className="text-yellow-400">⭐</span>
                            </div>
                          </td>
                          
                          <td className="py-3 sm:py-4 px-4 sm:px-6">
                            <span className="text-white font-semibold text-sm">
                              {getCategoryValue(player, category)}
                            </span>
                          </td>
                          
                          <td className="py-3 sm:py-4 px-4 sm:px-6 hidden md:table-cell">
                            <span className="text-green-400 font-medium text-sm">
                              {player.totalDbpEarned?.toFixed(2) || '0.00'}
                            </span>
                          </td>
                          
                          <td className="py-3 sm:py-4 px-4 sm:px-6 hidden lg:table-cell">
                            <span className="text-blue-400 text-sm">
                              {player.totalRuns || 0}
                            </span>
                          </td>
                          
                          <td className="py-3 sm:py-4 px-4 sm:px-6 hidden lg:table-cell">
                            <div className="flex items-center space-x-2">
                              <span className="text-white text-sm">
                                {player.winRate?.toFixed(1) || '0.0'}%
                              </span>
                              <div className="w-12 sm:w-16 bg-gray-600 rounded-full h-2">
                                <motion.div 
                                  className="bg-green-400 h-2 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(player.winRate || 0, 100)}%` }}
                                  transition={{ duration: 0.6, delay: index * 0.1 }}
                                ></motion.div>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Your Rank Section */}
      <AnimatePresence>
        {address && !leaderboardData.some(p => isCurrentUser(p.address)) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Your Ranking</h3>
            <p className="text-gray-300 text-sm">
              You're not in the top {leaderboardData.length} for this category and timeframe. 
              Keep playing to climb the leaderboard!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Leaderboard;
