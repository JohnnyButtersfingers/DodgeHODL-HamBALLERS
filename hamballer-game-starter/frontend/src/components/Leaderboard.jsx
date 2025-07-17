import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import { motion, AnimatePresence } from 'framer-motion';

const Leaderboard = () => {
  const { address } = useWallet();
  const { getPlayerStats, getCurrentPrice } = useContracts();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('total_dbp'); // total_dbp, best_score, total_runs, win_rate
  const [timeframe, setTimeframe] = useState('all'); // 24h, 7d, 30d, all
  const [currentPrice, setCurrentPrice] = useState('0');
  const [userStats, setUserStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchContractData();
  }, [category, timeframe]);

  // Fetch contract data
  const fetchContractData = useCallback(async () => {
    try {
      // Fetch current price
      const price = await getCurrentPrice();
      setCurrentPrice(price);

      // Fetch user stats if connected
      if (address) {
        const stats = await getPlayerStats(address);
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  }, [getCurrentPrice, getPlayerStats, address]);

  // Auto-refresh contract data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchContractData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchContractData]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(
        `/api/dashboard/leaderboard?category=${category}&timeframe=${timeframe}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data.leaderboard || []);
      } else {
        // Enhanced mock data with contract integration
        const mockData = [
          { address: '0x1234...5678', totalDbpEarned: 1250.75, bestScore: 8750, totalRuns: 45, winRate: 82.2, level: 12 },
          { address: '0x2345...6789', totalDbpEarned: 980.50, bestScore: 7890, totalRuns: 38, winRate: 78.9, level: 10 },
          { address: '0x3456...7890', totalDbpEarned: 875.25, bestScore: 7234, totalRuns: 42, winRate: 71.4, level: 9 },
          { address: '0x4567...8901', totalDbpEarned: 650.00, bestScore: 6890, totalRuns: 35, winRate: 68.6, level: 8 },
          { address: '0x5678...9012', totalDbpEarned: 520.75, bestScore: 6123, totalRuns: 28, winRate: 75.0, level: 7 },
        ];

        // Add user data if connected and not already in leaderboard
        if (address && userStats && !mockData.some(p => isCurrentUser(p.address))) {
          const userWinRate = userStats.totalRuns > 0 
            ? (parseInt(userStats.successfulRuns) / parseInt(userStats.totalRuns)) * 100 
            : 0;
          
          mockData.push({
            address: address,
            totalDbpEarned: parseFloat(userStats.totalDbpEarned) / 1e18,
            bestScore: 0, // Would need additional contract call
            totalRuns: parseInt(userStats.totalRuns),
            winRate: userWinRate,
            level: parseInt(userStats.level)
          });
        }

        setLeaderboardData(mockData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">🏆 Leaderboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
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
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Live Price Ticker */}
      <motion.div 
        className="bg-gradient-to-r from-blue-500/20 to-green-500/20 border border-blue-500/30 rounded-lg p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">📈</div>
            <div>
              <div className="text-sm text-gray-400">Current DBP Price</div>
              <div className="text-xl font-bold text-white">
                ${(parseFloat(currentPrice) / 1e18).toFixed(6)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Last Updated</div>
            <div className="text-sm text-white">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Leaderboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          className="bg-gray-800/50 rounded-lg p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-white">{leaderboardData.length}</div>
          <div className="text-gray-400">Active Players</div>
        </motion.div>
        
        <motion.div 
          className="bg-gray-800/50 rounded-lg p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-green-400">
            {leaderboardData.reduce((sum, p) => sum + (p.totalDbpEarned || 0), 0).toFixed(2)}
          </div>
          <div className="text-gray-400">Total DBP Distributed</div>
        </motion.div>
        
        <motion.div 
          className="bg-gray-800/50 rounded-lg p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="text-3xl mb-2">🏃</div>
          <div className="text-2xl font-bold text-blue-400">
            {leaderboardData.reduce((sum, p) => sum + (p.totalRuns || 0), 0)}
          </div>
          <div className="text-gray-400">Total Runs</div>
        </motion.div>

        <motion.div 
          className="bg-gray-800/50 rounded-lg p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-yellow-400">
            {userStats ? parseInt(userStats.level) : '—'}
          </div>
          <div className="text-gray-400">Your Level</div>
        </motion.div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Top Players - {getCategoryLabel(category)}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Showing {timeframe === 'all' ? 'all-time' : timeframe} rankings
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading leaderboard...
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-4">🏆</div>
            <div>No players found for the selected timeframe</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr className="text-gray-300 text-sm">
                  <th className="text-left py-4 px-6">Rank</th>
                  <th className="text-left py-4 px-6">Player</th>
                  <th className="text-left py-4 px-6">Level</th>
                  <th className="text-left py-4 px-6">{getCategoryLabel(category)}</th>
                  <th className="text-left py-4 px-6">Total DBP</th>
                  <th className="text-left py-4 px-6">Runs</th>
                  <th className="text-left py-4 px-6">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboardData.map((player, index) => {
                  const rank = index + 1;
                  const isUser = isCurrentUser(player.address);
                  
                  return (
                    <tr 
                      key={player.address}
                      className={`transition-colors ${
                        isUser 
                          ? 'bg-blue-500/10 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">
                            {getRankIcon(rank)}
                          </span>
                          {isUser && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="font-mono text-white">
                          {player.address.slice(0, 6)}...{player.address.slice(-4)}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-400 font-bold">
                            {player.level || 1}
                          </span>
                          <span className="text-yellow-400">⭐</span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <span className="text-white font-semibold">
                          {getCategoryValue(player, category)}
                        </span>
                      </td>
                      
                      <td className="py-4 px-6">
                        <span className="text-green-400 font-medium">
                          {player.totalDbpEarned?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      
                      <td className="py-4 px-6">
                        <span className="text-blue-400">
                          {player.totalRuns || 0}
                        </span>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-white">
                            {player.winRate?.toFixed(1) || '0.0'}%
                          </span>
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-green-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(player.winRate || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Your Rank Section */}
      {address && !leaderboardData.some(p => isCurrentUser(p.address)) && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Your Ranking</h3>
          <p className="text-gray-300">
            You're not in the top {leaderboardData.length} for this category and timeframe. 
            Keep playing to climb the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
