import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Eye, RotateCcw, Clock, Zap, XCircle } from 'lucide-react';
import { apiFetch } from '../services/useApiService';
import { useWebSocket } from '../services/useWebSocketService.jsx';

const ZKFailureMonitor = () => {
  const [failures, setFailures] = useState([]);
  const [stats, setStats] = useState({
    failuresLast10Min: 0,
    failuresLast1Hour: 0,
    totalFailures: 0,
    commonFailureReasons: []
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    fetchFailures();
    fetchStats();

    // Subscribe to real-time ZK failure events
    const handleZKFailure = (data) => {
      if (data.type === 'zk_proof_failure') {
        setFailures(prev => [data.failure, ...prev.slice(0, 9)]); // Keep latest 10
        updateStats(data.failure);
      }
    };

    subscribe('zk_failures', handleZKFailure);

    return () => {
      unsubscribe('zk_failures', handleZKFailure);
    };
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchFailures();
      fetchStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchFailures = async () => {
    try {
      const response = await apiFetch('/api/dev/zk-failures?limit=10');
      if (response.ok) {
        const data = await response.json();
        setFailures(data.failures || []);
      }
    } catch (error) {
      console.error('Error fetching ZK failures:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/dev/zk-failure-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching ZK failure stats:', error);
    }
  };

  const updateStats = (newFailure) => {
    setStats(prev => ({
      ...prev,
      failuresLast10Min: prev.failuresLast10Min + 1,
      totalFailures: prev.totalFailures + 1
    }));
  };

  const handleRetryProof = async (failureId, proofData) => {
    try {
      const response = await apiFetch('/api/dev/retry-zk-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureId, proofData })
      });

      if (response.ok) {
        // Update the failure status in the list
        setFailures(prev => prev.map(failure => 
          failure.id === failureId 
            ? { ...failure, retryAttempted: true, retryTimestamp: new Date() }
            : failure
        ));
      }
    } catch (error) {
      console.error('Error retrying ZK proof:', error);
    }
  };

  const handleViewProofSource = (failure) => {
    // Open modal or navigate to detailed view
    console.log('Viewing proof source for:', failure);
    // This could open a modal with the full proof data
  };

  const getFailureReasonColor = (reason) => {
    const colorMap = {
      'invalid_proof': 'text-red-400',
      'reused_nullifier': 'text-orange-400',
      'gas_error': 'text-yellow-400',
      'timeout': 'text-blue-400',
      'network_error': 'text-purple-400',
      'unknown': 'text-gray-400'
    };
    return colorMap[reason] || 'text-gray-400';
  };

  const getFailureReasonIcon = (reason) => {
    const iconMap = {
      'invalid_proof': <XCircle className="w-4 h-4" />,
      'reused_nullifier': <RotateCcw className="w-4 h-4" />,
      'gas_error': <Zap className="w-4 h-4" />,
      'timeout': <Clock className="w-4 h-4" />,
      'network_error': <AlertTriangle className="w-4 h-4" />,
      'unknown': <AlertTriangle className="w-4 h-4" />
    };
    return iconMap[reason] || <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span>ZK Proof Failure Monitor</span>
          </h2>
          <p className="text-gray-400 mt-1">Real-time monitoring of failed zero-knowledge proof attempts</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-refresh-zk"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="auto-refresh-zk" className="text-sm text-gray-300">
              Auto-refresh
            </label>
          </div>

          <button
            onClick={() => { fetchFailures(); fetchStats(); }}
            disabled={loading}
            className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Last 10 Minutes"
          value={stats.failuresLast10Min}
          icon={<Clock className="w-6 h-6" />}
          color="bg-red-500"
          urgent={stats.failuresLast10Min > 5}
        />
        <StatCard
          title="Last Hour"
          value={stats.failuresLast1Hour}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="bg-orange-500"
          urgent={stats.failuresLast1Hour > 20}
        />
        <StatCard
          title="Total Failures"
          value={stats.totalFailures}
          icon={<XCircle className="w-6 h-6" />}
          color="bg-gray-500"
        />
        <StatCard
          title="Success Rate"
          value={`${((1 - (stats.totalFailures / Math.max(stats.totalAttempts || 1, 1))) * 100).toFixed(1)}%`}
          icon={<Zap className="w-6 h-6" />}
          color="bg-green-500"
          urgent={(1 - (stats.totalFailures / Math.max(stats.totalAttempts || 1, 1))) < 0.9}
        />
      </div>

      {/* Common Failure Reasons */}
      {stats.commonFailureReasons && stats.commonFailureReasons.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span>Common Failure Reasons</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.commonFailureReasons.map((reason, index) => (
              <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={getFailureReasonColor(reason.type)}>
                    {getFailureReasonIcon(reason.type)}
                  </div>
                  <span className="text-white font-medium capitalize">
                    {reason.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {reason.count}
                </div>
                <div className="text-xs text-gray-400">
                  {((reason.count / stats.totalFailures) * 100).toFixed(1)}% of failures
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Failures List */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <XCircle className="w-5 h-5 text-red-400" />
          <span>Recent Failures</span>
          <span className="text-sm text-gray-400 font-normal">
            (Last 10 attempts)
          </span>
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-700/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : failures.length > 0 ? (
          <div className="space-y-4">
            {failures.map((failure, index) => (
              <FailureItem
                key={failure.id || index}
                failure={failure}
                onRetry={handleRetryProof}
                onViewSource={handleViewProofSource}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-lg mb-2">No recent failures</div>
            <div className="text-sm">All ZK proofs are validating successfully!</div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, urgent = false }) => (
  <div className={`${color} p-4 rounded-lg ${urgent ? 'ring-2 ring-red-400 ring-opacity-50' : ''}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="text-white/80">
        {icon}
      </div>
      {urgent && (
        <AlertTriangle className="w-4 h-4 text-yellow-300 animate-pulse" />
      )}
    </div>
    <div className="text-2xl font-bold text-white mb-1">
      {value}
    </div>
    <div className="text-sm text-white/80">
      {title}
    </div>
  </div>
);

const FailureItem = ({ failure, onRetry, onViewSource }) => {
  const timeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30 hover:border-gray-500/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2">
              <div className={`${failure.reason ? getFailureReasonColor(failure.reason) : 'text-red-400'}`}>
                {failure.reason ? getFailureReasonIcon(failure.reason) : <XCircle className="w-4 h-4" />}
              </div>
              <span className="font-medium text-white">
                {failure.playerAddress?.slice(0, 6)}...{failure.playerAddress?.slice(-4)}
              </span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">
              Game #{failure.gameId?.slice(0, 8)}
            </span>
            <span className="text-xs text-gray-500">
              {timeAgo(failure.timestamp)}
            </span>
          </div>

          <div className="text-sm text-gray-300 mb-2">
            <span className="font-medium">Reason:</span> {' '}
            <span className={failure.reason ? getFailureReasonColor(failure.reason) : 'text-red-400'}>
              {failure.reason ? failure.reason.replace('_', ' ') : 'Unknown error'}
            </span>
          </div>

          {failure.errorMessage && (
            <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded font-mono">
              {failure.errorMessage}
            </div>
          )}

          {failure.retryAttempted && (
            <div className="text-xs text-green-400 mt-2 flex items-center space-x-1">
              <RotateCcw className="w-3 h-3" />
              <span>Retry attempted at {new Date(failure.retryTimestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onViewSource(failure)}
            className="flex items-center space-x-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1 rounded text-xs transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>View</span>
          </button>

          {failure.canRetry && !failure.retryAttempted && (
            <button
              onClick={() => onRetry(failure.id, failure.proofData)}
              className="flex items-center space-x-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 rounded text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const getFailureReasonColor = (reason) => {
  const colorMap = {
    'invalid_proof': 'text-red-400',
    'reused_nullifier': 'text-orange-400', 
    'gas_error': 'text-yellow-400',
    'timeout': 'text-blue-400',
    'network_error': 'text-purple-400',
    'unknown': 'text-gray-400'
  };
  return colorMap[reason] || 'text-gray-400';
};

const getFailureReasonIcon = (reason) => {
  const iconMap = {
    'invalid_proof': <XCircle className="w-4 h-4" />,
    'reused_nullifier': <RotateCcw className="w-4 h-4" />,
    'gas_error': <Zap className="w-4 h-4" />,
    'timeout': <Clock className="w-4 h-4" />,
    'network_error': <AlertTriangle className="w-4 h-4" />,
    'unknown': <AlertTriangle className="w-4 h-4" />
  };
  return iconMap[reason] || <AlertTriangle className="w-4 h-4" />;
};

export default ZKFailureMonitor;