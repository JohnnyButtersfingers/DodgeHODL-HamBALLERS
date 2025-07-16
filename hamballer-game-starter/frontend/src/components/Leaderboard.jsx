import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useWebSocket } from '../services/useWebSocketService';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';

const BADGE_TYPES = [
  { id: 0, name: 'Participation', emoji: '🥾', color: 'text-gray-400' },
  { id: 1, name: 'Common', emoji: '🥉', color: 'text-bronze-400' },
  { id: 2, name: 'Rare', emoji: '🥈', color: 'text-blue-400' },
  { id: 3, name: 'Epic', emoji: '🥇', color: 'text-purple-400' },
  { id: 4, name: 'Legendary', emoji: '👑', color: 'text-yellow-400' },
];

const Leaderboard = () => {
  const { address } = useWallet();
  const { connected: wsConnected, liveStats } = useWebSocket();
  const { contracts, getPlayerStats } = useContracts();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [playerBadges, setPlayerBadges] = useState({});
  const [contractXpData, setContractXpData] = useState({});
  const [loading, setLoading] = useState(false);
  const [wsFailure, setWsFailure] = useState(false);
  const [category, setCategory] = useState('total_dbp'); // total_dbp, best_score, total_runs, win_rate, contract_xp
  const [timeframe, setTimeframe] = useState('all'); // 24h, 7d, 30d, all
  const pollingInterval = useRef(null);
  const lastWsUpdate = useRef(Date.now());

  useEffect(() => {
    fetchLeaderboard();
  }, [category, timeframe]);

  // WebSocket monitoring and fallback polling
  useEffect(() => {
    const monitorWebSocket = () => {
      if (wsConnected) {
        lastWsUpdate.current = Date.now();
        setWsFailure(false);
        // Clear polling if WebSocket is working
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      } else {
        // Check if WebSocket has been down for more than 10 seconds
        const timeSinceLastUpdate = Date.now() - lastWsUpdate.current;
        if (timeSinceLastUpdate > 10000 && !wsFailure) {
          setWsFailure(true);
          startFallbackPolling();
        }
      }
    };

    const interval = setInterval(monitorWebSocket, 5000);
    return () => clearInterval(interval);
  }, [wsConnected, wsFailure]);

  // Update when WebSocket receives live stats
  useEffect(() => {
    if (liveStats && wsConnected) {
      lastWsUpdate.current = Date.now();
      // Update leaderboard with live stats if needed
      fetchLeaderboard();
    }
  }, [liveStats, wsConnected]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const startFallbackPolling = () => {
    if (pollingInterval.current) return; // Already polling
    
    console.warn('WebSocket failed, starting fallback polling');
    pollingInterval.current = setInterval(() => {
      fetchLeaderboard();
    }, 30000); // Poll every 30 seconds
  };

  const stopFallbackPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch Supabase leaderboard data
      const response = await apiFetch(
        `/api/dashboard/leaderboard?category=${category}&timeframe=${timeframe}`
      );
      
      let leaderboard = [];
      if (response.ok) {
        const data = await response.json();
        leaderboard = data.leaderboard || [];
      } else {
        // Mock data for development
        leaderboard = [
          { address: '0x1234...5678', totalDbpEarned: 1250.75, bestScore: 8750, totalRuns: 45, winRate: 82.2, level: 12 },
          { address: '0x2345...6789', totalDbpEarned: 980.50, bestScore: 7890, totalRuns: 38, winRate: 78.9, level: 10 },
          { address: '0x3456...7890', totalDbpEarned: 875.25, bestScore: 7234, totalRuns: 42, winRate: 71.4, level: 9 },
          { address: '0x4567...8901', totalDbpEarned: 650.00, bestScore: 6890, totalRuns: 35, winRate: 68.6, level: 8 },
          { address: '0x5678...9012', totalDbpEarned: 520.75, bestScore: 6123, totalRuns: 28, winRate: 75.0, level: 7 },
        ];
      }

      // Fetch contract XP data for all players in parallel
      await Promise.all([
        fetchContractXpData(leaderboard),
        fetchPlayerBadges(leaderboard)
      ]);

      // Merge Supabase and contract data
      const mergedData = leaderboard.map(player => ({
        ...player,
        contractXp: contractXpData[player.address] || 0,
        totalXp: (player.totalXp || 0) + (contractXpData[player.address] || 0),
        badges: playerBadges[player.address] || []
      }));

      setLeaderboardData(mergedData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractXpData = async (players) => {
    if (!contracts?.hodlManager) return;

    try {
      const xpPromises = players.map(async (player) => {
        try {
          const stats = await getPlayerStats(player.address);
          return {
            address: player.address,
            xp: stats?.currentXp ? parseInt(stats.currentXp) : 0
          };
        } catch (error) {
          console.error(`Error fetching XP for ${player.address}:`, error);
          return { address: player.address, xp: 0 };
        }
      });

      const xpResults = await Promise.all(xpPromises);
      const xpData = {};
      xpResults.forEach(result => {
        xpData[result.address] = result.xp;
      });

      setContractXpData(xpData);
    } catch (error) {
      console.error('Error fetching contract XP data:', error);
    }
  };

  const fetchPlayerBadges = async (players) => {
    try {
      const addresses = players.map(p => p.address);
      const response = await apiFetch('/api/badges/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses })
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerBadges(data.badges || {});
      } else {
        // Mock badge data for development
        const mockBadges = {};
        players.forEach((player, index) => {
          mockBadges[player.address] = [
            { tokenId: Math.min(index, 4), count: Math.floor(Math.random() * 5) + 1 }
          ].filter(badge => badge.count > 0);
        });
        setPlayerBadges(mockBadges);
      }
    } catch (error) {
      console.error('Error fetching player badges:', error);
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'total_dbp': return 'Total DBP Earned';
      case 'best_score': return 'Best Score';
      case 'total_runs': return 'Total Runs';
      case 'win_rate': return 'Win Rate';
      case 'contract_xp': return 'Contract XP';
      case 'total_xp': return 'Total XP';
      default: return 'Unknown';
    }
  };

  const getCategoryValue = (player, cat) => {
    switch (cat) {
      case 'total_dbp': return `${player.totalDbpEarned?.toFixed(2) || '0.00'} DBP`;
      case 'best_score': return player.bestScore?.toLocaleString() || '0';
      case 'total_runs': return player.totalRuns || 0;
      case 'win_rate': return `${player.winRate?.toFixed(1) || '0.0'}%`;
      case 'contract_xp': return `${player.contractXp?.toLocaleString() || '0'} XP`;
      case 'total_xp': return `${player.totalXp?.toLocaleString() || '0'} XP`;
      default: return '—';
    }
  };

  const renderPlayerBadges = (badges) => {
    if (!badges || badges.length === 0) return null;

    return (
      <div className="flex items-center space-x-1 mt-1">
        {badges.slice(0, 3).map((badge, index) => {
          const badgeType = BADGE_TYPES.find(t => t.id === badge.tokenId) || BADGE_TYPES[0];
          return (
            <div key={index} className="relative group">
              <span className="text-sm" title={`${badgeType.name} Badge x${badge.count}`}>
                {badgeType.emoji}
              </span>
              {badge.count > 1 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                  {badge.count}
                </span>
              )}
            </div>
          );
        })}
        {badges.length > 3 && (
          <span className="text-xs text-gray-400">+{badges.length - 3}</span>
        )}
      </div>
    );
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
        <div>
          <h1 className="text-3xl font-bold text-white">🏆 Leaderboard</h1>
          {/* Connection Status */}
          <div className="flex items-center space-x-2 mt-1">
            {wsConnected ? (
              <div className="flex items-center space-x-1 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            ) : wsFailure ? (
              <div className="flex items-center space-x-1 text-yellow-400 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>Polling Mode</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Connecting...</span>
              </div>
            )}
          </div>
        </div>
        
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
            <option value="contract_xp">Contract XP</option>
            <option value="total_xp">Total XP</option>
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

      {/* Leaderboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-white">{leaderboardData.length}</div>
          <div className="text-gray-400">Active Players</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className="text-2xl font-bold text-green-400">
            {leaderboardData.reduce((sum, p) => sum + (p.totalDbpEarned || 0), 0).toFixed(2)}
          </div>
          <div className="text-gray-400">Total DBP Distributed</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">⚡</div>
          <div className="text-2xl font-bold text-purple-400">
            {leaderboardData.reduce((sum, p) => sum + (p.contractXp || 0), 0).toLocaleString()}
          </div>
          <div className="text-gray-400">Contract XP</div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🏃</div>
          <div className="text-2xl font-bold text-blue-400">
            {leaderboardData.reduce((sum, p) => sum + (p.totalRuns || 0), 0)}
          </div>
          <div className="text-gray-400">Total Runs</div>
        </div>
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
                  <th className="text-left py-4 px-6">Contract XP</th>
                  <th className="text-left py-4 px-6">Total XP</th>
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
                        <div>
                          <div className="font-mono text-white">
                            {player.address.slice(0, 6)}...{player.address.slice(-4)}
                          </div>
                          {renderPlayerBadges(player.badges)}
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
                        <div className="flex items-center space-x-1">
                          <span className="text-purple-400">
                            {player.contractXp?.toLocaleString() || '0'}
                          </span>
                          {player.contractXp > 0 && (
                            <span className="text-xs text-purple-300">⚡</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-1">
                          <span className="text-blue-300 font-medium">
                            {player.totalXp?.toLocaleString() || '0'}
                          </span>
                          <span className="text-xs text-blue-200">XP</span>
                        </div>
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
