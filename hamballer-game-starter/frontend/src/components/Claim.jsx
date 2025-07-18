import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import { Link } from 'react-router-dom';

const BADGE_TYPES = [
  { id: 0, name: 'Participation', xpRange: '1-24 XP', emoji: '🥾', color: 'text-gray-400' },
  { id: 1, name: 'Common', xpRange: '25-49 XP', emoji: '🥉', color: 'text-bronze-400' },
  { id: 2, name: 'Rare', xpRange: '50-74 XP', emoji: '🥈', color: 'text-blue-400' },
  { id: 3, name: 'Epic', xpRange: '75-99 XP', emoji: '🥇', color: 'text-purple-400' },
  { id: 4, name: 'Legendary', xpRange: '100+ XP', emoji: '👑', color: 'text-yellow-400' },
];

const Claim = () => {
  const { address } = useWallet();
  const { contracts } = useContracts();
  const [badgeBalances, setBadgeBalances] = useState({});
  const [claimableRuns, setClaimableRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (address && contracts.xpBadge) {
      loadBadgeData();
    }
  }, [address, contracts.xpBadge]);

  const loadBadgeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBadgeBalances(),
        loadClaimableRuns()
      ]);
    } catch (error) {
      console.error('Error loading badge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBadgeBalances = async () => {
    if (!contracts.xpBadge || !address) return;

    try {
      // Load balances for all badge types
      const tokenIds = BADGE_TYPES.map(badge => badge.id);
      const addresses = Array(tokenIds.length).fill(address);
      
      const balances = await contracts.xpBadge.read.balanceOfBatch([addresses, tokenIds]);
      
      const balanceMap = {};
      tokenIds.forEach((tokenId, index) => {
        balanceMap[tokenId] = Number(balances[index]);
      });
      
      setBadgeBalances(balanceMap);
    } catch (error) {
      console.error('Error loading badge balances:', error);
      // Mock data for development
      setBadgeBalances({
        0: 2,
        1: 1,
        2: 0,
        3: 0,
        4: 0
      });
    }
  };

  const loadClaimableRuns = async () => {
    if (!address) return;

    try {
      const response = await apiFetch(`/api/badges/claimable/${address}`);
      if (response.ok) {
        const data = await response.json();
        setClaimableRuns(data.claimable || []);
      }
    } catch (error) {
      console.error('Error loading claimable runs:', error);
      // Mock data for development
      setClaimableRuns([
        {
          runId: 'run-123',
          xpEarned: 65,
          tokenId: 2,
          earnedAt: new Date().toISOString(),
          status: 'claimable'
        },
        {
          runId: 'run-124',
          xpEarned: 85,
          tokenId: 3,
          earnedAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'claimable'
        }
      ]);
    }
  };

  const checkMissingBadges = async () => {
    if (!address) return;

    setChecking(true);
    try {
      const response = await apiFetch(`/api/badges/check/${address}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Badge check result:', data);
        // Refresh data after check
        await loadBadgeData();
      }
    } catch (error) {
      console.error('Error checking missing badges:', error);
    } finally {
      setChecking(false);
    }
  };

  if (!address) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to view and claim your XP badges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">XP Badge Collection</h1>
          <p className="text-gray-400">View your earned badges and claim new ones</p>
        </div>
        <button
          onClick={checkMissingBadges}
          disabled={checking}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {checking ? 'Checking...' : 'Check for Missing Badges'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-gray-400 mt-4">Loading badge data...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Badge Collection Overview */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Badge Collection</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {BADGE_TYPES.map(badge => {
                const balance = badgeBalances[badge.id] || 0;
                return (
                  <div key={badge.id} className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">{badge.emoji}</div>
                    <h3 className={`font-medium ${badge.color}`}>{badge.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">{badge.xpRange}</p>
                    <div className="text-lg font-bold text-white">
                      {balance} <span className="text-sm text-gray-400">owned</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Claimable Badges */}
          {claimableRuns.length > 0 && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-400 mb-4">
                🎉 Badges Ready to Claim ({claimableRuns.length})
              </h2>
              <div className="space-y-3">
                {claimableRuns.map(run => {
                  const badgeType = BADGE_TYPES.find(b => b.id === run.tokenId) || BADGE_TYPES[0];
                  return (
                    <div key={run.runId} className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{badgeType.emoji}</div>
                        <div>
                          <h3 className={`font-medium ${badgeType.color}`}>{badgeType.name} Badge</h3>
                          <p className="text-sm text-gray-400">
                            Run {run.runId} • {run.xpEarned} XP • {new Date(run.earnedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-green-400 font-medium">Ready to Claim!</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-sm text-green-300">
                💡 These badges will be automatically minted to your wallet soon. Check back later!
              </div>
            </div>
          )}

          {/* No Claimable Badges */}
          {claimableRuns.length === 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🎮</div>
              <h2 className="text-xl font-semibold text-white mb-2">No Badges to Claim</h2>
              <p className="text-gray-400 mb-4">
                Complete runs to earn XP badges based on your performance!
              </p>
              <Link
                to="/"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start Playing
              </Link>
            </div>
          )}

          {/* TODO: Add badge history section */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Badge History</h2>
            <p className="text-gray-400">
              TODO: Display detailed badge claiming history and transaction details
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Claim;