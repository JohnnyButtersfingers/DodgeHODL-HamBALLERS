import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';
import { useGameState } from '../hooks/useGameState';
import XPProgressGraph from './XPProgressGraph';
import { GameifiedRewards, useGameifiedRewards, SparkleEffect } from './GameifiedRewards';

const Dashboard = () => {
  const { address, isConnected } = useWallet();
  const { playerStats } = useGameState();
  const [runHistory, setRunHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('7d'); // 24h, 7d, 30d, all
  const { activeRewards, triggerReward, clearReward } = useGameifiedRewards();

  useEffect(() => {
    if (isConnected && address) {
      fetchRunHistory();
    }
  }, [isConnected, address, timeFilter]);

  const fetchRunHistory = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const response = await apiFetch(`/api/dashboard/history/${address}?period=${timeFilter}`);
      
      if (response.ok) {
        const data = await response.json();
        setRunHistory(data.runs || []);
      }
    } catch (error) {
      console.error('Error fetching run history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Demo function to trigger gamified rewards
  const triggerDemoRewards = () => {
    // Trigger different rewards with a delay
    setTimeout(() => triggerReward('xpGain', 150), 500);
    setTimeout(() => triggerReward('comboMultiplier', 3), 1000);
    setTimeout(() => triggerReward('rankJump', 5), 1500);
    setTimeout(() => triggerReward('achievement', { 
      title: 'Daily Player!', 
      description: 'You played for 5 days in a row!' 
    }), 2000);
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
        <p className="text-gray-400">Connect your wallet to view your stats and history.</p>
      </div>
    );
  }

  return (
    <>
      {/* Gamified Rewards */}
      <GameifiedRewards
        rewards={activeRewards}
        onRewardComplete={clearReward}
      />
      
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Runs"
          value={playerStats?.totalRuns || 0}
          icon="🏃"
          color="bg-blue-500"
          subtitle={`${playerStats?.runsToday || 0} today`}
        />
        <StatsCard
          title="Win Rate"
          value={`${((playerStats?.successfulRuns || 0) / Math.max(playerStats?.totalRuns || 1, 1) * 100).toFixed(1)}%`}
          icon="🎯"
          color="bg-green-500"
          subtitle={`${playerStats?.successfulRuns || 0} wins`}
        />
        <StatsCard
          title="Total DBP Earned"
          value={(playerStats?.totalDbpEarned || 0).toFixed(2)}
          icon="💰"
          color="bg-yellow-500"
          subtitle="All time earnings"
        />
        <StatsCard
          title="Best Score"
          value={playerStats?.bestScore || 0}
          icon="🏆"
          color="bg-purple-500"
          subtitle="Personal record"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Progress Chart */}
        <XPProgressGraph showInDashboard={true} />

        {/* HODL vs CLIMB Analysis */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">HODL vs CLIMB Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded">
              <div className="flex items-center space-x-2">
                <span>💎</span>
                <span className="text-gray-300">HODL Success Rate</span>
              </div>
              <div className="text-green-400 font-medium">
                {playerStats?.hodlSuccesses || 0}/{playerStats?.hodlAttempts || 0}
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded">
              <div className="flex items-center space-x-2">
                <span>🧗</span>
                <span className="text-gray-300">CLIMB Success Rate</span>
              </div>
              <div className="text-blue-400 font-medium">
                {(playerStats?.totalRuns || 0) - (playerStats?.hodlAttempts || 0)}/{playerStats?.totalRuns || 0}
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded">
              <div className="flex items-center space-x-2">
                <span>📊</span>
                <span className="text-gray-300">Average DBP per Run</span>
              </div>
              <div className="text-yellow-400 font-medium">
                {((playerStats?.totalDbpEarned || 0) / Math.max(playerStats?.totalRuns || 1, 1)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Runs</h3>
          <div className="flex space-x-2">
            <button
              onClick={fetchRunHistory}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={triggerDemoRewards}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              🎉 Demo Rewards
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading run history...
          </div>
        ) : runHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <div>No runs found for the selected period</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700">
                <tr className="text-gray-400">
                  <th className="text-left py-3">Run ID</th>
                  <th className="text-left py-3">Date</th>
                  <th className="text-left py-3">Score</th>
                  <th className="text-left py-3">Decision</th>
                  <th className="text-left py-3">DBP Earned</th>
                  <th className="text-left py-3">XP</th>
                  <th className="text-left py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {runHistory.map((run) => (
                  <tr key={run.runId} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 text-white font-mono">
                      #{run.runId.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-gray-300">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-white font-medium">
                      {run.finalScore || 0}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        run.hodlDecision 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {run.hodlDecision ? '💎 HODL' : '🧗 CLIMB'}
                      </span>
                    </td>
                    <td className="py-3 text-green-400 font-medium">
                      {run.dbpEarned?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-3 text-blue-400 font-medium">
                      +{run.xpGained || 0}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        run.success 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {run.success ? '✅ Success' : '❌ Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

const StatsCard = ({ title, value, icon, color, subtitle }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm mb-2">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  );
};

export default Dashboard;
