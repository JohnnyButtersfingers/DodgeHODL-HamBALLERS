import React, { useState, useEffect } from 'react';
import { zkLogger } from '../services/zkAnalyticsService';
import { apiFetch } from '../services/useApiService';

const RecentClaims = ({ limit = 50, autoRefresh = true, refreshInterval = 30000 }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, success, failure, nullifier_reuse
  const [timeframe, setTimeframe] = useState('1h');
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState('unknown');

  useEffect(() => {
    fetchRecentClaims();
    
    if (autoRefresh) {
      const interval = setInterval(fetchRecentClaims, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [filter, timeframe, autoRefresh, refreshInterval]);

  const fetchRecentClaims = async () => {
    setLoading(true);
    try {
      // Get claims from ZK analytics
      const [zkAttempts, badgeAttempts] = await Promise.all([
        zkLogger.getRecentAttempts(limit),
        fetchBadgeAttempts()
      ]);

      // Combine and sort by timestamp
      const combinedClaims = [
        ...zkAttempts.map(attempt => ({
          ...attempt,
          source: 'zk_analytics',
          category: 'proof_verification'
        })),
        ...badgeAttempts.map(attempt => ({
          ...attempt,
          source: 'backend_api',
          category: 'badge_claim'
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply filters
      const filteredClaims = applyFilters(combinedClaims);
      setClaims(filteredClaims);

      // Check Supabase sync status
      await checkSupabaseStatus();
      
    } catch (error) {
      console.error('Error fetching recent claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBadgeAttempts = async () => {
    try {
      const response = await apiFetch(`/api/badges/recent-attempts?limit=${limit}&timeframe=${timeframe}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching badge attempts:', error);
      return [];
    }
  };

  const checkSupabaseStatus = async () => {
    try {
      const response = await apiFetch('/api/supabase/sync-status');
      if (response.ok) {
        const status = await response.json();
        setSupabaseStatus(status.connected ? 'connected' : 'disconnected');
      } else {
        setSupabaseStatus('error');
      }
    } catch (error) {
      setSupabaseStatus('error');
    }
  };

  const syncToSupabase = async () => {
    try {
      const response = await apiFetch('/api/supabase/sync-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          claims: claims.slice(0, 100), // Sync last 100 claims
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setSupabaseStatus('synced');
        console.log('Claims synced to Supabase successfully');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
      setSupabaseStatus('error');
    }
  };

  const applyFilters = (claims) => {
    return claims.filter(claim => {
      if (filter === 'all') return true;
      if (filter === 'success') return claim.type === 'proof_success' || claim.status === 'success';
      if (filter === 'failure') return claim.type === 'proof_failure' || claim.status === 'failed';
      if (filter === 'nullifier_reuse') return claim.type === 'nullifier_reuse';
      return true;
    });
  };

  const getClaimIcon = (claim) => {
    switch (claim.type || claim.status) {
      case 'proof_success':
      case 'success':
        return '✅';
      case 'proof_failure':
      case 'failed':
        return '❌';
      case 'nullifier_reuse':
        return '🔄';
      case 'proof_attempt':
        return '🔐';
      default:
        return '❓';
    }
  };

  const getClaimColor = (claim) => {
    switch (claim.type || claim.status) {
      case 'proof_success':
      case 'success':
        return 'text-green-400';
      case 'proof_failure':
      case 'failed':
        return 'text-red-400';
      case 'nullifier_reuse':
        return 'text-orange-400';
      case 'proof_attempt':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSupabaseStatusColor = () => {
    switch (supabaseStatus) {
      case 'connected':
      case 'synced':
        return 'text-green-400';
      case 'disconnected':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSupabaseStatusIcon = () => {
    switch (supabaseStatus) {
      case 'connected':
        return '🟢';
      case 'synced':
        return '✅';
      case 'disconnected':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-white">Loading recent claims...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">📋 Recent Claims & Proof Attempts</h3>
          <p className="text-gray-400 text-sm mt-1">Real-time monitoring of ZK proof submissions and badge claims</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Supabase Status */}
          <div className="flex items-center space-x-2">
            <span className={getSupabaseStatusColor()}>
              {getSupabaseStatusIcon()} Supabase
            </span>
            {supabaseStatus === 'connected' && (
              <button
                onClick={syncToSupabase}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                Sync Now
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchRecentClaims}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-gray-400 text-sm">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
          >
            <option value="all">All Claims</option>
            <option value="success">Successful</option>
            <option value="failure">Failed</option>
            <option value="nullifier_reuse">Nullifier Reuse</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-gray-400 text-sm">Timeframe:</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        <div className="text-gray-400 text-sm flex items-center">
          Total: {claims.length} claims
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {claims.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No recent claims found for the selected filters
          </div>
        ) : (
          claims.map((claim, index) => (
            <div
              key={claim.id || index}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
              onClick={() => setExpandedClaim(expandedClaim === index ? null : index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getClaimIcon(claim)}</span>
                  <div>
                    <div className={`font-medium ${getClaimColor(claim)}`}>
                      {claim.type || claim.status || 'Unknown Type'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Player: {formatAddress(claim.playerAddress)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-white font-medium">
                    {claim.claimedXP || claim.xpEarned || 0} XP
                  </div>
                  <div className="text-gray-400 text-xs">
                    {formatTimestamp(claim.timestamp)}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedClaim === index && (
                <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Source:</span>
                      <span className="ml-2 text-white">{claim.source}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <span className="ml-2 text-white">{claim.category}</span>
                    </div>
                    {claim.nullifier && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Nullifier:</span>
                        <span className="ml-2 text-white font-mono text-xs">{claim.nullifier}</span>
                      </div>
                    )}
                    {claim.reason && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Reason:</span>
                        <span className="ml-2 text-red-400">{claim.reason}</span>
                      </div>
                    )}
                    {claim.transactionHash && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Transaction:</span>
                        <a
                          href={`https://explorer.testnet.abs.xyz/tx/${claim.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-400 hover:text-blue-300 font-mono text-xs"
                        >
                          {claim.transactionHash}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-400">
              {claims.filter(c => c.type === 'proof_success' || c.status === 'success').length}
            </div>
            <div className="text-gray-400 text-xs">Successful</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-400">
              {claims.filter(c => c.type === 'proof_failure' || c.status === 'failed').length}
            </div>
            <div className="text-gray-400 text-xs">Failed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-400">
              {claims.filter(c => c.type === 'nullifier_reuse').length}
            </div>
            <div className="text-gray-400 text-xs">Nullifier Reuse</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">
              {claims.filter(c => c.type === 'proof_attempt').length}
            </div>
            <div className="text-gray-400 text-xs">Attempts</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentClaims;