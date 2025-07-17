import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Users, Zap, Trophy, Info, Smartphone } from 'lucide-react';
import { apiFetch } from '../services/useApiService';

const LaunchDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalPlayers: 0,
    totalGames: 0,
    totalXP: 0,
    zkProofSuccessRate: 0,
    badgeTierCounts: {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [isInstallPromptAvailable, setIsInstallPromptAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchDashboardData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  // PWA Install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallPromptAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/dashboard/public-stats');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setCountdown(30);
    fetchDashboardData();
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallPromptAvailable(false);
    }
    
    setDeferredPrompt(null);
  };

  const Tooltip = ({ children, content }) => (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Auto-refresh and Install */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              🎮 HamBaller.xyz Live Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Real-time game statistics and player activity</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* PWA Install Button */}
            {isInstallPromptAvailable && (
              <button
                onClick={handleInstallApp}
                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-sm">Install App</span>
              </button>
            )}

            {/* Auto-refresh controls */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="auto-refresh" className="text-sm text-gray-300">
                  Auto-refresh
                </label>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">
                  {autoRefresh ? `${countdown}s` : 'Refresh'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Last Updated Indicator */}
        {lastUpdated && (
          <div className="text-sm text-gray-400 text-center sm:text-right">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Players"
            value={dashboardData.totalPlayers.toLocaleString()}
            icon={<Users className="w-8 h-8" />}
            color="from-blue-500 to-blue-600"
            tooltip="Unique players who have connected wallets and played the game"
            loading={loading}
          />
          
          <StatsCard
            title="Games Played"
            value={dashboardData.totalGames.toLocaleString()}
            icon={<TrendingUp className="w-8 h-8" />}
            color="from-green-500 to-green-600"
            tooltip="Total number of completed game runs across all players"
            loading={loading}
          />
          
          <StatsCard
            title="Total XP Earned"
            value={dashboardData.totalXP.toLocaleString()}
            icon={<Trophy className="w-8 h-8" />}
            color="from-yellow-500 to-yellow-600"
            tooltip="Combined experience points earned by all players"
            loading={loading}
          />
          
          <StatsCard
            title="ZK Proof Success"
            value={`${(dashboardData.zkProofSuccessRate * 100).toFixed(1)}%`}
            icon={<Zap className="w-8 h-8" />}
            color="from-purple-500 to-purple-600"
            tooltip="Percentage of successfully validated zero-knowledge proofs for game completion"
            loading={loading}
          />
        </div>

        {/* Badge Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-6">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold">Badge Tier Distribution</h2>
            <Tooltip content="Number of players who have achieved each badge tier based on XP thresholds">
              <Info className="w-4 h-4 text-gray-400" />
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(dashboardData.badgeTierCounts).map(([tier, count]) => (
              <BadgeTierCard
                key={tier}
                tier={tier}
                count={count}
                loading={loading}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Tooltip content="Live feed of recent game completions and achievements">
              <Info className="w-4 h-4 text-gray-400" />
            </Tooltip>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-700/50 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🎮</div>
                <div>No recent activity</div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Optimization Notice */}
        <div className="text-center text-sm text-gray-500 sm:hidden">
          <p>💡 Tip: Add this page to your home screen for quick access!</p>
        </div>
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, icon, color, tooltip, loading }) => (
  <div className={`bg-gradient-to-r ${color} p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200`}>
    <div className="flex items-center justify-between mb-4">
      <div className="text-white/80">
        {icon}
      </div>
      <Tooltip content={tooltip}>
        <Info className="w-4 h-4 text-white/60 hover:text-white/80 transition-colors" />
      </Tooltip>
    </div>
    
    <div className="text-white">
      <div className="text-2xl sm:text-3xl font-bold mb-1">
        {loading ? (
          <div className="animate-pulse bg-white/20 h-8 w-20 rounded"></div>
        ) : (
          value
        )}
      </div>
      <div className="text-sm opacity-80">{title}</div>
    </div>
  </div>
);

const BadgeTierCard = ({ tier, count, loading }) => {
  const tierConfig = {
    bronze: { emoji: '🥉', color: 'text-amber-600', bg: 'bg-amber-500/20' },
    silver: { emoji: '🥈', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    gold: { emoji: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    platinum: { emoji: '💎', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    diamond: { emoji: '💎', color: 'text-purple-400', bg: 'bg-purple-500/20' }
  };

  const config = tierConfig[tier] || tierConfig.bronze;

  return (
    <div className={`${config.bg} rounded-lg p-4 text-center border border-gray-600/30`}>
      <div className="text-2xl mb-2">{config.emoji}</div>
      <div className={`text-lg font-bold ${config.color} mb-1`}>
        {loading ? (
          <div className="animate-pulse bg-gray-500/20 h-6 w-12 rounded mx-auto"></div>
        ) : (
          count.toLocaleString()
        )}
      </div>
      <div className="text-xs text-gray-400 capitalize">{tier}</div>
    </div>
  );
};

const ActivityItem = ({ activity }) => (
  <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors duration-200">
    <div className="flex items-center space-x-3">
      <div className="text-xl">{activity.type === 'game_complete' ? '🎮' : activity.type === 'badge_earned' ? '🏆' : '✨'}</div>
      <div>
        <div className="text-sm font-medium text-white">
          {activity.playerAddress?.slice(0, 6)}...{activity.playerAddress?.slice(-4)}
        </div>
        <div className="text-xs text-gray-400">{activity.description}</div>
      </div>
    </div>
    <div className="text-xs text-gray-500">
      {new Date(activity.timestamp).toLocaleTimeString()}
    </div>
  </div>
);

export default LaunchDashboard;