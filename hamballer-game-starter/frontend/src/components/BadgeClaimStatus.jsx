import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/useApiService';
import { useWallet } from '../contexts/WalletContext';

const BadgeClaimStatus = ({ runId, onClaimSuccess }) => {
  const { address } = useWallet();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  // Badge type mapping with visual styles
  const BADGE_TYPES = [
    { id: 0, name: 'Participation', xpRange: '1-24 XP', emoji: '🥾', color: 'text-gray-400', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500' },
    { id: 1, name: 'Common', xpRange: '25-49 XP', emoji: '🥉', color: 'text-bronze-400', bgColor: 'bg-bronze-500/20', borderColor: 'border-bronze-500' },
    { id: 2, name: 'Rare', xpRange: '50-74 XP', emoji: '🥈', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500' },
    { id: 3, name: 'Epic', xpRange: '75-99 XP', emoji: '🥇', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500' },
    { id: 4, name: 'Legendary', xpRange: '100+ XP', emoji: '👑', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500' },
  ];

  useEffect(() => {
    if (address) {
      checkBadgeStatus();
      // Poll for status updates every 5 seconds if pending
      const interval = setInterval(() => {
        if (status?.status === 'pending') {
          checkBadgeStatus();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [address, runId]);

  const checkBadgeStatus = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/badges/check/${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to check badge status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error checking badge status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      setError(null);

      const response = await apiFetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerAddress: address,
          runId: status.runId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim badge');
      }

      const result = await response.json();
      
      // Update status to pending
      setStatus({
        ...status,
        status: 'pending',
        message: 'Badge claim is being processed'
      });

      if (onClaimSuccess) {
        onClaimSuccess(result);
      }
    } catch (err) {
      console.error('Error claiming badge:', err);
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleRetry = async () => {
    if (status?.canRetry) {
      await handleClaim();
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="mt-4 p-4 bg-red-900/20 rounded-lg border border-red-500">
        <p className="text-red-400 text-sm">Error checking badge status: {error}</p>
        <button
          onClick={checkBadgeStatus}
          className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status || status.status === 'not_eligible') {
    return null;
  }

  const badgeType = status.tokenId !== undefined ? BADGE_TYPES[status.tokenId] : BADGE_TYPES[0];

  // Render different UI states
  switch (status.status) {
    case 'eligible':
      return (
        <div className={`mt-4 p-4 ${badgeType.bgColor} rounded-lg border ${badgeType.borderColor} transition-all`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-lg font-semibold ${badgeType.color} flex items-center gap-2`}>
                <span className="text-2xl">{badgeType.emoji}</span>
                {badgeType.name} Badge Available!
              </h4>
              <p className="text-gray-400 text-sm mt-1">
                {status.xpEarned} XP earned • {badgeType.xpRange}
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                claiming 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : `bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white`
              }`}
            >
              {claiming ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Claiming...
                </span>
              ) : 'Claim Badge'}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>
      );

    case 'pending':
      return (
        <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500 transition-all">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="absolute inset-0 flex items-center justify-center text-lg">{badgeType.emoji}</span>
            </div>
            <div className="flex-1">
              <h4 className="text-blue-400 font-semibold">Badge Claim Processing</h4>
              <p className="text-gray-400 text-sm">
                Your {badgeType.name} badge ({status.xpEarned} XP) is being minted...
              </p>
            </div>
          </div>
          <div className="mt-3 bg-blue-500/10 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-400 h-full w-1/2 animate-pulse"></div>
          </div>
        </div>
      );

    case 'failure':
      return (
        <div className="mt-4 p-4 bg-red-900/20 rounded-lg border border-red-500 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Badge Claim Failed
              </h4>
              <p className="text-gray-400 text-sm mt-1">
                {badgeType.name} badge ({status.xpEarned} XP) • {status.error || 'Unknown error'}
              </p>
              {status.retryCount > 0 && (
                <p className="text-gray-500 text-xs mt-1">
                  Retry attempts: {status.retryCount}/5
                </p>
              )}
            </div>
            {status.canRetry && (
              <button
                onClick={handleRetry}
                disabled={claiming}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  claiming 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500'
                }`}
              >
                {claiming ? 'Retrying...' : 'Retry Claim'}
              </button>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default BadgeClaimStatus;