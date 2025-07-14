import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Crown, Medal, Star, User, RefreshCw, Search, 
  ChevronLeft, ChevronRight, Filter, TrendingUp 
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';

const Leaderboard = () => {
  const { address } = useWallet();
  
  // State management
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [stats, setStats] = useState({});
  
  // Pagination & filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minXp: '',
    maxXp: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // WebSocket connection
  const [wsConnection, setWsConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(true);

  // WebSocket setup
  useEffect(() => {
    if (!liveUpdates) return;

    const wsUrl = `ws://localhost:3001/socket`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔌 Connected to leaderboard WebSocket');
      setIsConnected(true);
      setWsConnection(ws);
      
      // Subscribe to leaderboard updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['leaderboard', 'xp']
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'leaderboard_update') {
          console.log('📊 Received leaderboard update:', message);
          
          // Refresh data on real-time updates
          fetchLeaderboard(false); // Don't show loading spinner for live updates
          
          if (address && message.data.address === address) {
            fetchUserRank();
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from leaderboard WebSocket');
      setIsConnected(false);
      setWsConnection(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [liveUpdates, address]);

  // Fetch leaderboard data with pagination and filters
  const fetchLeaderboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (filters.minXp) {
        params.append('minXp', filters.minXp);
      }
      
      if (filters.maxXp) {
        params.append('maxXp', filters.maxXp);
      }

      const response = await apiFetch(`/api/leaderboard?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaderboardData(data.data || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotalCount(data.pagination?.totalCount || 0);
        } else {
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError(error.message);
      setLeaderboardData([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filters]);

  // Fetch leaderboard stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch('/api/leaderboard/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch user rank
  const fetchUserRank = useCallback(async () => {
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
  }, [address]);

  // Effects
  useEffect(() => {
    fetchLeaderboard();
    fetchStats();
  }, [fetchLeaderboard, fetchStats]);

  useEffect(() => {
    if (address) {
      fetchUserRank();
    }
  }, [fetchUserRank]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchLeaderboard();
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchLeaderboard();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({ minXp: '', maxXp: '' });
    setSearchTerm('');
    setCurrentPage(1);
    fetchLeaderboard();
    setShowFilters(false);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
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
      <div className="max-w-6xl mx-auto p-6">
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Unable to Load Leaderboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => fetchLeaderboard()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header with Live Status */}
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
        
        {/* Live status and controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-400">
              {isConnected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
          
          <button
            onClick={() => setLiveUpdates(!liveUpdates)}
            className={`text-sm px-3 py-1 rounded ${
              liveUpdates ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
            }`}
          >
            {liveUpdates ? 'Live Mode' : 'Static Mode'}
          </button>
          
          <button
            onClick={() => fetchLeaderboard()}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Search and Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by address (0x...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </form>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white hover:bg-gray-600/50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-700/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum XP
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={filters.minXp}
                  onChange={(e) => handleFilterChange('minXp', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum XP
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={filters.maxXp}
                  onChange={(e) => handleFilterChange('maxXp', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={applyFilters}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* User Rank Card (if connected) */}
      {address && userRank && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
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
          
          {/* Context (players above/below) */}
          {userRank.context && (
            <div className="mt-4 pt-4 border-t border-blue-500/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {userRank.context.above && (
                  <div>
                    <span className="text-gray-400">Player above:</span>
                    <div className="text-white">
                      {formatAddress(userRank.context.above.address)} ({userRank.context.above.xp} XP)
                    </div>
                  </div>
                )}
                {userRank.context.below && (
                  <div>
                    <span className="text-gray-400">Player below:</span>
                    <div className="text-white">
                      {formatAddress(userRank.context.below.address)} ({userRank.context.below.xp} XP)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-3xl font-bold text-white">{totalCount.toLocaleString()}</div>
          <div className="text-gray-400 font-medium">
            {searchTerm || filters.minXp || filters.maxXp ? 'Filtered Players' : 'Total Players'}
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <div className="text-3xl font-bold text-yellow-400">
            {stats.totalXP?.toLocaleString() || '0'}
          </div>
          <div className="text-gray-400 font-medium">Total XP</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-3xl font-bold text-green-400">
            {stats.highestXP?.toLocaleString() || '0'}
          </div>
          <div className="text-gray-400 font-medium">Highest XP</div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📈</div>
          <div className="text-3xl font-bold text-purple-400">
            {stats.averageXP?.toLocaleString() || '0'}
          </div>
          <div className="text-gray-400 font-medium">Average XP</div>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Top Players</h2>
              <p className="text-gray-400 mt-1">
                Page {currentPage} of {totalPages} • {totalCount.toLocaleString()} total players
              </p>
            </div>
            
            {isConnected && (
              <div className="flex items-center gap-2 text-green-400">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Live Updates</span>
              </div>
            )}
          </div>
        </div>

        {leaderboardData.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm || filters.minXp || filters.maxXp ? 'No Players Found' : 'No Players Yet'}
            </h3>
            <p className="text-gray-400">
              {searchTerm || filters.minXp || filters.maxXp 
                ? 'Try adjusting your search or filters'
                : 'Be the first to earn XP and claim the top spot!'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {leaderboardData.map((player, index) => {
              const isUser = isCurrentUser(player.address);
              
              return (
                <motion.div
                  key={player.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`p-6 transition-all duration-200 ${getRankStyle(player.globalRank)} ${
                    isUser ? 'ring-2 ring-blue-500/50' : ''
                  } ${player.globalRank <= 3 ? 'shadow-lg' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12">
                        {getRankIcon(player.globalRank)}
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
                          {player.globalRank <= 3 && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              player.globalRank === 1 ? 'bg-yellow-400/20 text-yellow-400' :
                              player.globalRank === 2 ? 'bg-gray-300/20 text-gray-300' :
                              'bg-amber-600/20 text-amber-600'
                            }`}>
                              {player.globalRank === 1 ? 'GOLD' : player.globalRank === 2 ? 'SILVER' : 'BRONZE'}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Global Rank #{player.globalRank}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        player.globalRank === 1 ? 'text-yellow-400' :
                        player.globalRank === 2 ? 'text-gray-300' :
                        player.globalRank === 3 ? 'text-amber-600' :
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

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="text-center text-gray-400 text-sm"
      >
        <p>
          {isConnected ? 'Leaderboard updates in real-time.' : 'Connect to see live updates.'} 
          {' '}Play more games to earn XP and climb the ranks!
        </p>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
