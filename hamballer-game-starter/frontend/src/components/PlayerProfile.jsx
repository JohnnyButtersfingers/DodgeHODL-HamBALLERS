import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Trophy, Star, TrendingUp, Calendar,
  Award, Target, Zap, Activity, History,
  RefreshCw, AlertCircle, ExternalLink,
  Copy, Check, BarChart3, Users
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';
import { useWebSocket } from '../services/useWebSocketService';

const PlayerProfile = ({ playerAddress, isOwnProfile = false }) => {
  const { address: connectedAddress } = useWallet();
  const { connected: wsConnected } = useWebSocket();
  
  // Use provided address or connected wallet address
  const targetAddress = playerAddress || connectedAddress;
  const isOwn = isOwnProfile || (!playerAddress && connectedAddress);
  
  // State management
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  // Fetch player profile data
  const fetchPlayerProfile = useCallback(async () => {
    if (!targetAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch(`/api/player/${targetAddress}`);
      
      if (response.success) {
        setProfile(response.data);
        console.log(`👤 Loaded profile for ${targetAddress}:`, response.data);
      } else {
        setError(response.message || 'Failed to load player profile');
      }
    } catch (error) {
      console.error('Error fetching player profile:', error);
      setError('Failed to load player profile');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  // Refresh player profile
  const refreshProfile = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await fetchPlayerProfile();
    setRefreshing(false);
  }, [fetchPlayerProfile, refreshing]);

  // Copy address to clipboard
  const copyAddress = useCallback(async () => {
    if (!targetAddress) return;
    
    try {
      await navigator.clipboard.writeText(targetAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }, [targetAddress]);

  // Initial load
  useEffect(() => {
    fetchPlayerProfile();
  }, [fetchPlayerProfile]);

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  // Get rank styling
  const getRankStyling = (rank) => {
    if (!rank) return { color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    
    if (rank === 1) {
      return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: Trophy };
    } else if (rank <= 5) {
      return { color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Star };
    } else if (rank <= 10) {
      return { color: 'text-green-400', bgColor: 'bg-green-500/20', icon: Award };
    } else {
      return { color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: Target };
    }
  };

  if (!targetAddress) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-8 text-center">
        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Player Selected</h3>
        <p className="text-gray-400">Connect your wallet or provide a player address to view profile</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isOwn ? 'Your Profile' : 'Player Profile'}
              </h2>
              <p className="text-sm text-gray-400">
                {profile && !loading ? `Rank #${profile.profile.rank} of ${formatNumber(profile.profile.totalPlayers)}` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* WebSocket Status */}
            <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            
            {/* Refresh Button */}
            <button
              onClick={refreshProfile}
              disabled={refreshing || loading}
              className="p-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading player profile...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPlayerProfile}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Profile Content */}
        {!loading && !error && profile && (
          <div className="space-y-6">
            {/* Basic Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player Identity */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Player Identity</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono">{formatAddress(profile.profile.address)}</span>
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                      >
                        {addressCopied ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {profile.profile.joinedAt && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Joined</label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-white">
                          {new Date(profile.profile.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Last Activity</label>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-white">
                        {profile.profile.lastUpdated 
                          ? new Date(profile.profile.lastUpdated).toLocaleDateString()
                          : 'No recent activity'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank & XP */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Rank & Experience</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Current Rank</label>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const rankStyle = getRankStyling(profile.profile.rank);
                        const RankIcon = rankStyle.icon;
                        return (
                          <>
                            <div className={`p-2 rounded-lg ${rankStyle.bgColor}`}>
                              <RankIcon className={`h-5 w-5 ${rankStyle.color}`} />
                            </div>
                            <span className={`text-2xl font-bold ${rankStyle.color}`}>
                              #{profile.profile.rank}
                            </span>
                            <span className="text-gray-400">
                              of {formatNumber(profile.profile.totalPlayers)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Current XP</label>
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <span className="text-2xl font-bold text-white">
                        {formatNumber(profile.profile.xp)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Lifetime XP</label>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      <span className="text-xl font-bold text-green-400">
                        {formatNumber(profile.profile.lifetimeXP)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {formatNumber(profile.statistics.totalTransactions)}
                  </p>
                  <p className="text-sm text-gray-400">XP Transactions</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {formatNumber(profile.statistics.averageXPPerTransaction)}
                  </p>
                  <p className="text-sm text-gray-400">Avg XP per Transaction</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatNumber(profile.statistics.bestTransaction)}
                  </p>
                  <p className="text-sm text-gray-400">Best Single Transaction</p>
                </div>
              </div>
            </div>

            {/* TODO: XP History Chart */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">XP History Chart</h3>
                <div className="text-sm text-gray-400">TODO: Chart Implementation</div>
              </div>
              
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg font-medium">XP Progression Chart</p>
                  <p className="text-gray-500 text-sm mt-2">
                    TODO: Integrate Chart.js visualization
                  </p>
                  <p className="text-gray-500 text-sm">
                    Will show {profile.history?.length || 0} data points
                  </p>
                </div>
              </div>
            </div>

            {/* TODO: Match History */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Match History</h3>
                <div className="text-sm text-gray-400">TODO: Game Integration</div>
              </div>
              
              <div className="space-y-3">
                {/* Placeholder match entries */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600/50">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <History className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Match #{i} - TODO</p>
                        <p className="text-sm text-gray-400">Placeholder for game data</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Score</p>
                      <p className="text-white font-bold">TODO</p>
                    </div>
                  </div>
                ))}
                
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Match history will be integrated with game system</p>
                </div>
              </div>
            </div>

            {/* Recent XP History */}
            {profile.history && profile.history.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Recent XP Activity ({profile.history.length} total)
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {profile.history.slice(0, 10).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Zap className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">+{formatNumber(entry.amount)} XP</p>
                          <p className="text-sm text-gray-400">
                            {new Date(entry.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {entry.transactionHash && (
                        <button className="p-1 hover:bg-gray-600/50 rounded transition-colors">
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;