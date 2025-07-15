import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Users, Trophy, Star, TrendingUp, 
  RefreshCw, AlertCircle, ChevronRight, Crown,
  Medal, Award, Target, Zap, Eye, ArrowRight
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';
import { useWebSocket } from '../services/useWebSocketService';
import PlayerProfile from './PlayerProfile';

const PlayerBrowser = () => {
  const { address } = useWallet();
  const { connected: wsConnected } = useWebSocket();
  
  // State management
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [recentPlayers, setRecentPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [view, setView] = useState('browser'); // 'browser' or 'profile'

  // Fetch top players for suggestions
  const fetchTopPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/leaderboard?limit=10&page=1');
      
      if (response.success) {
        setTopPlayers(response.data.leaderboard);
      } else {
        setError('Failed to load top players');
      }
    } catch (error) {
      console.error('Error fetching top players:', error);
      setError('Failed to load top players');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search for a specific player
  const searchPlayer = useCallback(async () => {
    if (!searchAddress) return;
    
    // Validate address format
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(searchAddress)) {
      setSearchError('Please enter a valid Ethereum address');
      return;
    }
    
    try {
      setSearchError(null);
      setSelectedPlayer(searchAddress);
      setView('profile');
      
      // Add to recent players (avoid duplicates)
      setRecentPlayers(prev => {
        const filtered = prev.filter(addr => addr.toLowerCase() !== searchAddress.toLowerCase());
        return [searchAddress, ...filtered].slice(0, 5); // Keep last 5
      });
      
    } catch (error) {
      console.error('Error searching player:', error);
      setSearchError('Failed to search for player');
    }
  }, [searchAddress]);

  // Select a player from suggestions
  const selectPlayer = useCallback((playerAddress) => {
    setSelectedPlayer(playerAddress);
    setView('profile');
    
    // Add to recent players
    setRecentPlayers(prev => {
      const filtered = prev.filter(addr => addr.toLowerCase() !== playerAddress.toLowerCase());
      return [playerAddress, ...filtered].slice(0, 5);
    });
  }, []);

  // Go back to browser view
  const backToBrowser = useCallback(() => {
    setView('browser');
    setSelectedPlayer(null);
    setSearchAddress('');
    setSearchError(null);
  }, []);

  // Initial load
  useEffect(() => {
    fetchTopPlayers();
  }, [fetchTopPlayers]);

  // Handle search on Enter key
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      searchPlayer();
    }
  }, [searchPlayer]);

  // Format address for display
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get rank styling
  const getRankStyling = (rank) => {
    if (rank === 1) {
      return { icon: Crown, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    } else if (rank === 2) {
      return { icon: Medal, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    } else if (rank === 3) {
      return { icon: Award, color: 'text-amber-600', bgColor: 'bg-amber-600/20' };
    } else if (rank <= 10) {
      return { icon: Star, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    } else {
      return { icon: Target, color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    }
  };

  // Player card component
  const PlayerCard = ({ player, source = 'leaderboard' }) => {
    const styling = getRankStyling(player.rank || 0);
    const RankIcon = styling.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 cursor-pointer hover:border-blue-500/30 transition-all duration-200"
        onClick={() => selectPlayer(player.address)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${styling.bgColor}`}>
              <RankIcon className={`h-4 w-4 ${styling.color}`} />
            </div>
            <div>
              <p className="text-white font-medium">{formatAddress(player.address)}</p>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                {player.rank && <span>Rank #{player.rank}</span>}
                {player.rank && <span>•</span>}
                <span>{player.xp?.toLocaleString() || '0'} XP</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-gray-400" />
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </motion.div>
    );
  };

  if (view === 'profile' && selectedPlayer) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={backToBrowser}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50 rounded-lg transition-colors"
          >
            <ArrowRight className="h-4 w-4 text-gray-400 rotate-180" />
            <span className="text-gray-400">Back to Player Browser</span>
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>Viewing: {formatAddress(selectedPlayer)}</span>
          </div>
        </div>

        {/* Player Profile */}
        <PlayerProfile playerAddress={selectedPlayer} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Users className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Player Browser</h2>
            <p className="text-sm text-gray-400">Explore player profiles and leaderboard rankings</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm text-gray-400">
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Search Section */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Search Player by Address
        </label>
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter wallet address (0x...)"
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
          <button
            onClick={searchPlayer}
            disabled={!searchAddress}
            className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
        
        {searchError && (
          <div className="mt-2 flex items-center space-x-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{searchError}</span>
          </div>
        )}
      </div>

      {/* Recent Players */}
      {recentPlayers.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Recently Viewed</h3>
          <div className="space-y-3">
            {recentPlayers.map((playerAddr, index) => (
              <PlayerCard 
                key={playerAddr} 
                player={{ address: playerAddr }} 
                source="recent"
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Players */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Top Players</h3>
          <button
            onClick={fetchTopPlayers}
            disabled={loading}
            className="p-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading top players...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTopPlayers}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && topPlayers.length > 0 && (
          <div className="space-y-3">
            {topPlayers.map((player, index) => (
              <PlayerCard 
                key={player.address} 
                player={{
                  ...player,
                  rank: index + 1
                }} 
                source="leaderboard"
              />
            ))}
          </div>
        )}

        {!loading && !error && topPlayers.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No players found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerBrowser;