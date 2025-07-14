import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Star, User, RefreshCw } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';

const Leaderboard = () => {
  const { address } = useWallet();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    if (address) {
      fetchUserRank();
    }
  }, [address]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/leaderboard');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaderboardData(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError(error.message);
      // Set empty array instead of mock data to show proper error state
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRank = async () => {
    if (!address) return;
    
    try {
      const response = await apiFetch(`/api/leaderboard/rank/${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserRank(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
      setUserRank(null);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Trophy className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-xl font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400/20 via-yellow-300/10 to-yellow-400/20 border-yellow-400/30 shadow-yellow-400/20';
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 via-gray-200/10 to-gray-300/20 border-gray-300/30 shadow-gray-300/20';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20 border-amber-600/30 shadow-amber-600/20';
      default:
        return 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/30';
    }
  };

  const isCurrentUser = (playerAddress) => {
    return address && playerAddress.toLowerCase() === address.toLowerCase();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <RefreshCw className="w-12 h-12 text-blue-400" />
          </motion.div>
          <h2 className="text-2xl font-semibold text-white mt-4">Loading Leaderboard...</h2>
          <p className="text-gray-400 mt-2">Fetching the latest XP rankings</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Unable to Load Leaderboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-400" />
          XP Leaderboard
        </h1>
        <p className="text-gray-400 text-lg">
          Top players ranked by experience points
        </p>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="mt-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* User Rank Card (if connected) */}
      {address && userRank && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 rounded-full p-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Your Rank</h3>
                <p className="text-blue-300">{formatAddress(address)}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">#{userRank.rank}</div>
              <div className="text-blue-300">{userRank.xp} XP</div>
              {userRank.isTopFive && (
                <div className="text-yellow-400 text-sm font-medium">
                  <Star className="w-4 h-4 inline mr-1" />
                  Top 5!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-3xl font-bold text-white">{leaderboardData.length}</div>
          <div className="text-gray-400 font-medium">Active Players</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <div className="text-3xl font-bold text-yellow-400">
            {leaderboardData.reduce((sum, p) => sum + p.xp, 0).toLocaleString()}
          </div>
          <div className="text-gray-400 font-medium">Total XP</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-3xl font-bold text-green-400">
            {leaderboardData.length > 0 ? leaderboardData[0].xp.toLocaleString() : '0'}
          </div>
          <div className="text-gray-400 font-medium">Highest XP</div>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-2xl font-semibold text-white">Top Players</h2>
          <p className="text-gray-400 mt-1">
            Showing top {leaderboardData.length} players by XP
          </p>
        </div>

        {leaderboardData.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Players Yet</h3>
            <p className="text-gray-400">Be the first to earn XP and claim the top spot!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {leaderboardData.map((player, index) => {
              const rank = index + 1;
              const isUser = isCurrentUser(player.address);
              
              return (
                <motion.div
                  key={player.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`p-6 transition-all duration-200 ${getRankStyle(rank)} ${
                    isUser ? 'ring-2 ring-blue-500/50' : ''
                  } ${rank <= 3 ? 'shadow-lg' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12">
                        {getRankIcon(rank)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-white">
                            {formatAddress(player.address)}
                          </span>
                          {isUser && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Rank #{rank}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        rank === 1 ? 'text-yellow-400' :
                        rank === 2 ? 'text-gray-300' :
                        rank === 3 ? 'text-amber-600' :
                        'text-white'
                      }`}>
                        {player.xp.toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-sm font-medium">XP</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center text-gray-400 text-sm"
      >
        <p>Leaderboard updates in real-time. Play more games to earn XP and climb the ranks!</p>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
