import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import { zkLogger } from '../services/zkAnalyticsService';

const LaunchDashboard = () => {
  const { address } = useWallet();
  const { contracts, getPlayerStats, getPlayerBadges } = useContracts();
  
  const [dashboardData, setDashboardData] = useState({
    walletStats: {},
    badgeUnlocks: {},
    proofStats: {
      totalAttempts: 0,
      successRate: 0,
      failureRate: 0,
      nullifierReuses: 0
    },
    contractStatus: {},
    recentActivity: [],
    qaStatus: null
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedWallet, setSelectedWallet] = useState(address);

  // Test wallets for monitoring (from environment)
  const testWallets = [
    { name: 'Test Wallet 1', address: process.env.REACT_APP_TEST_WALLET_1 },
    { name: 'Test Wallet 2', address: process.env.REACT_APP_TEST_WALLET_2 },
    { name: 'Test Wallet 3', address: process.env.REACT_APP_TEST_WALLET_3 },
    { name: 'Connected Wallet', address: address }
  ].filter(wallet => wallet.address);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up refresh interval
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [selectedWallet, refreshInterval]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWalletStats(),
        fetchBadgeUnlocks(),
        fetchProofStats(),
        fetchContractStatus(),
        fetchRecentActivity(),
        fetchQAStatus()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletStats = async () => {
    const walletStats = {};
    
    for (const wallet of testWallets) {
      if (!wallet.address) continue;
      
      try {
        // Get contract stats
        const contractStats = await getPlayerStats(wallet.address);
        
        // Get backend stats
        const backendResponse = await apiFetch(`/api/dashboard/player/${wallet.address}`);
        const backendStats = backendResponse.ok ? await backendResponse.json() : {};
        
        walletStats[wallet.address] = {
          name: wallet.name,
          contractXp: contractStats?.currentXp || 0,
          contractLevel: contractStats?.level || 1,
          totalRuns: contractStats?.totalRuns || 0,
          successfulRuns: contractStats?.successfulRuns || 0,
          totalDbp: contractStats?.totalDbpEarned || 0,
          backendXp: backendStats.totalXp || 0,
          lastActivity: backendStats.lastSeen || null
        };
      } catch (error) {
        console.error(`Error fetching stats for ${wallet.address}:`, error);
        walletStats[wallet.address] = {
          name: wallet.name,
          error: error.message
        };
      }
    }
    
    setDashboardData(prev => ({ ...prev, walletStats }));
  };

  const fetchBadgeUnlocks = async () => {
    const badgeUnlocks = {};
    
    for (const wallet of testWallets) {
      if (!wallet.address) continue;
      
      try {
        // Get badge balances from contract
        const badges = await getPlayerBadges(wallet.address);
        
        // Get backend badge data
        const response = await apiFetch(`/api/badges/status/${wallet.address}`);
        const backendBadges = response.ok ? await response.json() : {};
        
        badgeUnlocks[wallet.address] = {
          contractBadges: badges || [],
          pendingClaims: backendBadges.unclaimed || [],
          failedClaims: backendBadges.failed || [],
          totalBadges: (badges || []).length
        };
      } catch (error) {
        console.error(`Error fetching badges for ${wallet.address}:`, error);
        badgeUnlocks[wallet.address] = { error: error.message };
      }
    }
    
    setDashboardData(prev => ({ ...prev, badgeUnlocks }));
  };

  const fetchProofStats = async () => {
    try {
      // Get ZK analytics data
      const analytics = await zkLogger.getAnalytics('24h');
      
      setDashboardData(prev => ({
        ...prev,
        proofStats: {
          totalAttempts: analytics.totals.attempts || 0,
          successfulProofs: analytics.totals.successes || 0,
          failedProofs: analytics.totals.failures || 0,
          nullifierReuses: analytics.totals.nullifierReuses || 0,
          successRate: parseFloat(analytics.rates.successRate) || 0,
          failureRate: parseFloat(analytics.rates.failureRate) || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching proof stats:', error);
    }
  };

  const fetchContractStatus = async () => {
    const contractAddresses = {
      DBPToken: process.env.REACT_APP_DBP_TOKEN_ADDRESS,
      HODLManager: process.env.REACT_APP_HODL_MANAGER_ADDRESS,
      XPBadge: process.env.REACT_APP_XPBADGE_ADDRESS,
      XPVerifier: process.env.REACT_APP_XPVERIFIER_ADDRESS
    };
    
    const contractStatus = {};
    
    for (const [name, address] of Object.entries(contractAddresses)) {
      if (!address) {
        contractStatus[name] = { status: 'not_deployed', address: null };
        continue;
      }
      
      try {
        // Check if contract is accessible
        const contract = contracts[name.toLowerCase()];
        if (contract) {
          // Try a simple read call
          await contract.read[name === 'DBPToken' ? 'totalSupply' : name === 'XPBadge' ? 'uri' : 'getCurrentPrice']?.();
          contractStatus[name] = { 
            status: 'verified', 
            address,
            explorerUrl: `https://explorer.testnet.abs.xyz/address/${address}`
          };
        } else {
          contractStatus[name] = { status: 'not_connected', address };
        }
      } catch (error) {
        contractStatus[name] = { 
          status: 'error', 
          address, 
          error: error.message 
        };
      }
    }
    
    setDashboardData(prev => ({ ...prev, contractStatus }));
  };

  const fetchRecentActivity = async () => {
    try {
      // Get recent activity from multiple sources
      const [proofLogs, badgeActivity] = await Promise.all([
        zkLogger.getAnalytics('1h'),
        apiFetch('/api/badges/recent').then(r => r.ok ? r.json() : { recent: [] })
      ]);
      
      const recentActivity = [
        ...proofLogs.patterns?.playerActivity ? Object.entries(proofLogs.patterns.playerActivity).map(([address, data]) => ({
          type: 'proof_activity',
          address,
          data,
          timestamp: new Date().toISOString()
        })) : [],
        ...(badgeActivity.recent || []).map(badge => ({
          type: 'badge_minted',
          address: badge.playerAddress,
          data: badge,
          timestamp: badge.mintedAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
      
      setDashboardData(prev => ({ ...prev, recentActivity }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchQAStatus = async () => {
    try {
      // Try to load the latest QA report
      const response = await fetch('/qa-suite-report-latest.json').catch(() => null);
      if (response?.ok) {
        const qaStatus = await response.json();
        setDashboardData(prev => ({ ...prev, qaStatus }));
      }
    } catch (error) {
      console.error('Error fetching QA status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      verified: 'text-green-400',
      not_deployed: 'text-gray-400',
      not_connected: 'text-yellow-400',
      error: 'text-red-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      verified: '✅',
      not_deployed: '⚫',
      not_connected: '🟡',
      error: '❌'
    };
    return icons[status] || '❓';
  };

  if (loading && Object.keys(dashboardData.walletStats).length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-white">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">🚀 Launch Dashboard</h1>
              <p className="text-gray-400 mt-2">HamBaller.xyz - Internal QA & Status Monitor</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value={10000}>10s refresh</option>
                <option value={30000}>30s refresh</option>
                <option value={60000}>1m refresh</option>
                <option value={300000}>5m refresh</option>
              </select>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* QA Status Overview */}
        {dashboardData.qaStatus && (
          <div className="mb-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📊 QA Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">
                  {dashboardData.qaStatus.summary?.successRate || 0}%
                </div>
                <div className="text-gray-300 text-sm">Success Rate</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">
                  {dashboardData.qaStatus.summary?.completed || 0}
                </div>
                <div className="text-gray-300 text-sm">Modules Passed</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-400">
                  {dashboardData.qaStatus.summary?.failed || 0}
                </div>
                <div className="text-gray-300 text-sm">Modules Failed</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-400">
                  {new Date(dashboardData.qaStatus.generated).toLocaleTimeString()}
                </div>
                <div className="text-gray-300 text-sm">Last Run</div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Stats Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">👛 Wallet XP Totals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(dashboardData.walletStats).map(([address, stats]) => (
              <div key={address} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">{stats.name}</h3>
                  {stats.error ? (
                    <span className="text-red-400">❌</span>
                  ) : (
                    <span className="text-green-400">✅</span>
                  )}
                </div>
                
                {stats.error ? (
                  <div className="text-red-400 text-sm">{stats.error}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contract XP:</span>
                      <span className="text-purple-400 font-medium">{stats.contractXp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Level:</span>
                      <span className="text-yellow-400 font-medium">{stats.contractLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Runs:</span>
                      <span className="text-blue-400 font-medium">{stats.totalRuns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="text-green-400 font-medium">
                        {stats.totalRuns > 0 ? ((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">DBP Earned:</span>
                      <span className="text-green-400 font-medium">{parseFloat(stats.totalDbp || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-xs text-gray-500 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badge Unlocks */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">🏆 Badge Unlocks (Live View)</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm">
                    <th className="text-left py-2">Wallet</th>
                    <th className="text-left py-2">Contract Badges</th>
                    <th className="text-left py-2">Pending Claims</th>
                    <th className="text-left py-2">Failed Claims</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dashboardData.badgeUnlocks).map(([address, badges]) => (
                    <tr key={address} className="border-t border-gray-700">
                      <td className="py-3">
                        <div className="text-white font-medium">
                          {dashboardData.walletStats[address]?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-green-400 font-medium">
                          {badges.totalBadges || 0}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-yellow-400 font-medium">
                          {badges.pendingClaims?.length || 0}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-red-400 font-medium">
                          {badges.failedClaims?.length || 0}
                        </span>
                      </td>
                      <td className="py-3">
                        {badges.error ? (
                          <span className="text-red-400">❌ Error</span>
                        ) : (
                          <span className="text-green-400">✅ Live</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Proof Submission Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">🔐 Proof Submission Stats (24h)</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {dashboardData.proofStats.totalAttempts}
              </div>
              <div className="text-gray-400">Total Attempts</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {dashboardData.proofStats.successRate.toFixed(1)}%
              </div>
              <div className="text-gray-400">Success Rate</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {dashboardData.proofStats.failureRate.toFixed(1)}%
              </div>
              <div className="text-gray-400">Failure Rate</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {dashboardData.proofStats.nullifierReuses}
              </div>
              <div className="text-gray-400">Nullifier Reuses</div>
            </div>
          </div>
        </div>

        {/* Contract Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">📄 Contract Status</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dashboardData.contractStatus).map(([name, status]) => (
                <div key={name} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <div className="text-white font-medium">{name}</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {status.address ? `${status.address.slice(0, 8)}...${status.address.slice(-6)}` : 'Not deployed'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`${getStatusColor(status.status)} flex items-center`}>
                      <span className="mr-2">{getStatusIcon(status.status)}</span>
                      <span className="capitalize">{status.status.replace('_', ' ')}</span>
                    </div>
                    {status.explorerUrl && (
                      <a
                        href={status.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        View on Explorer
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">📊 Recent Activity</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="space-y-3">
              {dashboardData.recentActivity.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No recent activity</div>
              ) : (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {activity.type === 'proof_activity' ? '🔐' : '🏆'}
                      </span>
                      <div>
                        <div className="text-white font-medium">
                          {activity.type === 'proof_activity' ? 'Proof Activity' : 'Badge Minted'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {activity.address.slice(0, 8)}...{activity.address.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>🚀 HamBaller.xyz Launch Dashboard - Internal Use Only</p>
          <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default LaunchDashboard;