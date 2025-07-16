import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';

const BADGE_TYPES = [
  { id: 0, name: 'Participation', xpRange: '1-24 XP', emoji: '🥾', color: 'text-gray-400' },
  { id: 1, name: 'Common', xpRange: '25-49 XP', emoji: '🥉', color: 'text-bronze-400' },
  { id: 2, name: 'Rare', xpRange: '50-74 XP', emoji: '🥈', color: 'text-blue-400' },
  { id: 3, name: 'Epic', xpRange: '75-99 XP', emoji: '🥇', color: 'text-purple-400' },
  { id: 4, name: 'Legendary', xpRange: '100+ XP', emoji: '👑', color: 'text-yellow-400' },
];

const ClaimBadge = () => {
  const { address } = useWallet();
  const { contracts } = useContracts();
  const [unclaimedBadges, setUnclaimedBadges] = useState([]);
  const [failedBadges, setFailedBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState({});
  const [retrying, setRetrying] = useState({});

  useEffect(() => {
    if (address) {
      fetchBadgeStatus();
    }
  }, [address]);

  const fetchBadgeStatus = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const response = await apiFetch(`/api/badges/status/${address}`);
      if (response.ok) {
        const data = await response.json();
        setUnclaimedBadges(data.unclaimed || []);
        setFailedBadges(data.failed || []);
      }
    } catch (error) {
      console.error('Error fetching badge status:', error);
      // Mock data for development
      setUnclaimedBadges([
        {
          id: 'run-123',
          tokenId: 2,
          xpEarned: 65,
          season: 1,
          runId: 'run-123',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]);
      setFailedBadges([
        {
          id: 'run-456',
          tokenId: 1,
          xpEarned: 35,
          season: 1,
          runId: 'run-456',
          status: 'failed',
          failureReason: 'Network timeout',
          retryCount: 2,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const claimBadge = async (badge) => {
    if (!address || !contracts?.hodlManager) return;

    setClaiming(prev => ({ ...prev, [badge.id]: true }));
    
    try {
      const response = await apiFetch('/api/badges/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: address,
          tokenId: badge.tokenId,
          xpEarned: badge.xpEarned,
          season: badge.season,
          runId: badge.runId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove from unclaimed badges
          setUnclaimedBadges(prev => prev.filter(b => b.id !== badge.id));
          // Show success message
          console.log('Badge claimed successfully:', result.txHash);
        } else {
          throw new Error(result.error || 'Failed to claim badge');
        }
      } else {
        throw new Error('Failed to claim badge');
      }
    } catch (error) {
      console.error('Error claiming badge:', error);
      // Move to failed badges if not already there
      if (!failedBadges.find(b => b.id === badge.id)) {
        setFailedBadges(prev => [...prev, {
          ...badge,
          status: 'failed',
          failureReason: error.message,
          retryCount: (badge.retryCount || 0) + 1
        }]);
      }
      setUnclaimedBadges(prev => prev.filter(b => b.id !== badge.id));
    } finally {
      setClaiming(prev => ({ ...prev, [badge.id]: false }));
    }
  };

  const retryBadgeClaim = async (badge) => {
    if (!address || badge.retryCount >= 5) return;

    setRetrying(prev => ({ ...prev, [badge.id]: true }));
    
    try {
      const response = await apiFetch('/api/badges/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: address,
          badgeId: badge.id,
          tokenId: badge.tokenId,
          xpEarned: badge.xpEarned,
          season: badge.season,
          runId: badge.runId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove from failed badges
          setFailedBadges(prev => prev.filter(b => b.id !== badge.id));
          console.log('Badge retry successful:', result.txHash);
        } else {
          throw new Error(result.error || 'Retry failed');
        }
      } else {
        throw new Error('Retry request failed');
      }
    } catch (error) {
      console.error('Error retrying badge claim:', error);
      // Update retry count
      setFailedBadges(prev => prev.map(b => 
        b.id === badge.id 
          ? { ...b, retryCount: (b.retryCount || 0) + 1, failureReason: error.message }
          : b
      ));
    } finally {
      setRetrying(prev => ({ ...prev, [badge.id]: false }));
    }
  };

  const abandonBadge = (badgeId) => {
    setFailedBadges(prev => prev.filter(b => b.id !== badgeId));
  };

  const getBadgeType = (tokenId) => {
    return BADGE_TYPES.find(type => type.id === tokenId) || BADGE_TYPES[0];
  };

  const getTimeSince = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (!address) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view and claim badges</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">🏆 Badge Center</h1>
          <p className="text-gray-400 mt-1">Claim and manage your XP badges</p>
        </div>
        
        <button
          onClick={fetchBadgeStatus}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Badge Types Reference */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Badge Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {BADGE_TYPES.map(type => (
            <div key={type.id} className="text-center">
              <div className="text-2xl mb-2">{type.emoji}</div>
              <div className={`font-semibold ${type.color}`}>{type.name}</div>
              <div className="text-sm text-gray-400">{type.xpRange}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Unclaimed Badges */}
      {unclaimedBadges.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              🎁 Unclaimed Badges ({unclaimedBadges.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              These badges are ready to be claimed to your wallet
            </p>
          </div>
          
          <div className="divide-y divide-gray-700">
            {unclaimedBadges.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              return (
                <div key={badge.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{badgeType.emoji}</div>
                    <div>
                      <div className={`font-semibold ${badgeType.color}`}>
                        {badgeType.name} Badge
                      </div>
                      <div className="text-sm text-gray-400">
                        {badge.xpEarned} XP earned • {getTimeSince(badge.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Run: {badge.runId} • Season {badge.season}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => claimBadge(badge)}
                    disabled={claiming[badge.id]}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    {claiming[badge.id] ? 'Claiming...' : 'Claim Badge'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Badges */}
      {failedBadges.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-red-500/30">
            <h2 className="text-xl font-semibold text-white">
              ⚠️ Failed Badges ({failedBadges.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              These badges failed to mint and can be retried
            </p>
          </div>
          
          <div className="divide-y divide-red-500/30">
            {failedBadges.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              const canRetry = (badge.retryCount || 0) < 5;
              
              return (
                <div key={badge.id} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl opacity-50">{badgeType.emoji}</div>
                      <div>
                        <div className={`font-semibold ${badgeType.color}`}>
                          {badgeType.name} Badge
                        </div>
                        <div className="text-sm text-gray-400">
                          {badge.xpEarned} XP earned • {getTimeSince(badge.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Run: {badge.runId} • Season {badge.season}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {canRetry && (
                        <button
                          onClick={() => retryBadgeClaim(badge)}
                          disabled={retrying[badge.id]}
                          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-black px-3 py-1 rounded text-sm transition-colors"
                        >
                          {retrying[badge.id] ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => abandonBadge(badge.id)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Abandon
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-red-900/30 rounded p-3">
                    <div className="text-sm text-red-400 mb-1">
                      <strong>Error:</strong> {badge.failureReason || 'Unknown error'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Retry attempts: {badge.retryCount || 0}/5
                      {!canRetry && ' (Max retries reached)'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Badges State */}
      {!loading && unclaimedBadges.length === 0 && failedBadges.length === 0 && (
        <div className="bg-gray-800/50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-semibold text-white mb-2">No Badges to Claim</h2>
          <p className="text-gray-400">
            Complete runs to earn XP and unlock badges!
          </p>
        </div>
      )}
    </div>
  );
};

export default ClaimBadge;