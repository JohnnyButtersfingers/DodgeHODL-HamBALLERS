import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Trophy, Crown, Medal, Star, 
  RefreshCw, Search, AlertCircle, CheckCircle,
  Heart, MessageCircle, TrendingUp, Award
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';
import { useWebSocket } from '../services/useWebSocketService';

const FriendLeaderboard = () => {
  const { address } = useWallet();
  const { connected: wsConnected } = useWebSocket();
  
  // State management
  const [friendsData, setFriendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [newFriendAddress, setNewFriendAddress] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendMessage, setAddFriendMessage] = useState('');

  // Fetch friend leaderboard data
  const fetchFriendLeaderboard = useCallback(async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch(`/api/friends/leaderboard?wallet=${address}`);
      
      if (response.success) {
        setFriendsData(response.data.friends);
        console.log(`👥 Loaded ${response.data.friends.length} friends`);
      } else {
        setError(response.message || 'Failed to load friend leaderboard');
      }
    } catch (error) {
      console.error('Error fetching friend leaderboard:', error);
      setError('Failed to load friend leaderboard');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Refresh friend leaderboard
  const refreshFriendLeaderboard = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await fetchFriendLeaderboard();
    setRefreshing(false);
  }, [fetchFriendLeaderboard, refreshing]);

  // Add friend function
  const addFriend = useCallback(async () => {
    if (!address || !newFriendAddress || addingFriend) return;
    
    // Basic validation
    if (!newFriendAddress.startsWith('0x') || newFriendAddress.length !== 42) {
      setAddFriendMessage('Please enter a valid Ethereum address');
      return;
    }
    
    if (newFriendAddress.toLowerCase() === address.toLowerCase()) {
      setAddFriendMessage('You cannot add yourself as a friend');
      return;
    }
    
    try {
      setAddingFriend(true);
      setAddFriendMessage('');
      
      const response = await apiFetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: address,
          friend: newFriendAddress
        })
      });
      
      if (response.success) {
        setAddFriendMessage('Friend added successfully!');
        setNewFriendAddress('');
        setShowAddFriend(false);
        // Refresh the friend leaderboard
        await fetchFriendLeaderboard();
      } else {
        setAddFriendMessage(response.message || 'Failed to add friend');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      setAddFriendMessage('Failed to add friend');
    } finally {
      setAddingFriend(false);
    }
  }, [address, newFriendAddress, addingFriend, fetchFriendLeaderboard]);

  // Initial load
  useEffect(() => {
    fetchFriendLeaderboard();
  }, [fetchFriendLeaderboard]);

  // Get rank styling
  const getRankStyling = (rank) => {
    switch (rank) {
      case 1:
        return {
          icon: Crown,
          iconColor: 'text-yellow-400',
          bgColor: 'bg-gradient-to-r from-yellow-400/10 to-yellow-600/10',
          borderColor: 'border-yellow-400/30'
        };
      case 2:
        return {
          icon: Medal,
          iconColor: 'text-gray-400',
          bgColor: 'bg-gradient-to-r from-gray-400/10 to-gray-600/10',
          borderColor: 'border-gray-400/30'
        };
      case 3:
        return {
          icon: Award,
          iconColor: 'text-amber-600',
          bgColor: 'bg-gradient-to-r from-amber-600/10 to-amber-800/10',
          borderColor: 'border-amber-600/30'
        };
      default:
        return {
          icon: Star,
          iconColor: 'text-blue-400',
          bgColor: 'bg-gradient-to-r from-blue-400/10 to-blue-600/10',
          borderColor: 'border-blue-400/30'
        };
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!address) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Connect your wallet to view and manage your friends leaderboard</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Friends Leaderboard</h2>
            <p className="text-sm text-gray-400">
              {friendsData.length > 0 ? `${friendsData.length} friends` : 'No friends yet'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* WebSocket Connection Status */}
          <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          
          {/* Add Friend Button */}
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 font-medium">Add Friend</span>
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={refreshFriendLeaderboard}
            disabled={refreshing}
            className="p-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add Friend Form */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
          >
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Friend's Wallet Address
                </label>
                <input
                  type="text"
                  value={newFriendAddress}
                  onChange={(e) => setNewFriendAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <button
                onClick={addFriend}
                disabled={addingFriend || !newFriendAddress}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {addingFriend ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>Add</span>
              </button>
            </div>
            {addFriendMessage && (
              <p className={`mt-2 text-sm flex items-center space-x-2 ${
                addFriendMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'
              }`}>
                {addFriendMessage.includes('successfully') ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{addFriendMessage}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading friends leaderboard...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchFriendLeaderboard}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Friends List */}
      {!loading && !error && friendsData.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Friends Yet</h3>
          <p className="text-gray-400 mb-4">
            Add your first friend to start competing on the leaderboard!
          </p>
          <button
            onClick={() => setShowAddFriend(true)}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 font-medium"
          >
            Add Friend
          </button>
        </div>
      )}

      {/* Friends Leaderboard */}
      {!loading && !error && friendsData.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {friendsData.map((friend, index) => {
              const styling = getRankStyling(friend.rank);
              const RankIcon = styling.icon;
              
              return (
                <motion.div
                  key={friend.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-lg border ${styling.bgColor} ${styling.borderColor}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <RankIcon className={`h-5 w-5 ${styling.iconColor}`} />
                      <span className="text-lg font-bold text-white">#{friend.rank}</span>
                    </div>
                    
                    <div>
                      <p className="font-medium text-white">{formatAddress(friend.address)}</p>
                      <p className="text-sm text-gray-400">
                        {friend.lastUpdated && `Last active: ${new Date(friend.lastUpdated).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{friend.xp.toLocaleString()}</p>
                      <p className="text-sm text-gray-400">XP</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default FriendLeaderboard;