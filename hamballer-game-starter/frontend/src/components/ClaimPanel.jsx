import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import xpVerificationService from '../services/xpVerificationService';
import { useZKToasts } from './ZKErrorToast';
import { zkLogger } from '../services/zkAnalyticsService';

// Badge tier configuration with metadata
const BADGE_TIERS = {
  0: { name: 'Participation', xpRange: [1, 24], emoji: '🥾', color: 'gray', rarity: 'common' },
  1: { name: 'Common', xpRange: [25, 49], emoji: '🥉', color: 'bronze', rarity: 'common' },
  2: { name: 'Rare', xpRange: [50, 74], emoji: '🥈', color: 'blue', rarity: 'rare' },
  3: { name: 'Epic', xpRange: [75, 99], emoji: '🥇', color: 'purple', rarity: 'epic' },
  4: { name: 'Legendary', xpRange: [100, Infinity], emoji: '👑', color: 'yellow', rarity: 'legendary' },
};

// Badge states for UI display
const BADGE_STATES = {
  CLAIMABLE: 'claimable',
  CLAIMING: 'claiming',
  MINTED: 'minted',
  FAILED: 'failed',
  PENDING_RETRY: 'pending_retry',
  SYNCING: 'syncing'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 15000, // 15 seconds
  maxDelay: 300000, // 5 minutes
  backoffMultiplier: 2
};

const ClaimPanel = () => {
  const { address } = useWallet();
  const { contracts } = useContracts();
  const { showNetworkError, showInsufficientGas, showProofTimeout } = useZKToasts();
  
  // State management
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
  const [retryQueue, setRetryQueue] = useState(new Map()); // badgeId -> retry metadata
  const [lastSync, setLastSync] = useState(null);
  
  // Refs for retry timers
  const retryTimers = useRef(new Map());
  const syncInterval = useRef(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      retryTimers.current.forEach(timer => clearTimeout(timer));
      if (syncInterval.current) clearInterval(syncInterval.current);
    };
  }, []);

  // Auto-sync with Supabase every 30 seconds
  useEffect(() => {
    if (address) {
      syncBadgeState();
      syncInterval.current = setInterval(syncBadgeState, 30000);
      
      return () => {
        if (syncInterval.current) clearInterval(syncInterval.current);
      };
    }
  }, [address]);

  // Sync badge state from multiple sources with fallback logic
  const syncBadgeState = useCallback(async () => {
    if (!address) return;
    
    setSyncStatus('syncing');
    
    try {
      // Primary: Try to fetch from XPBadge contract if available
      let contractBadges = [];
      if (contracts?.xpBadge) {
        try {
          contractBadges = await fetchContractBadges(address);
        } catch (error) {
          console.warn('Failed to fetch from contract:', error);
        }
      }

      // Secondary: Fetch from Supabase via API
      const supabaseBadges = await fetchSupabaseBadges(address);
      
      // Merge and deduplicate badges
      const mergedBadges = mergeBadgeSources(contractBadges, supabaseBadges);
      
      // Apply retry queue state
      const badgesWithRetryState = mergedBadges.map(badge => {
        const retryMeta = retryQueue.get(badge.id);
        if (retryMeta) {
          return {
            ...badge,
            state: BADGE_STATES.PENDING_RETRY,
            retryCount: retryMeta.retryCount,
            nextRetryAt: retryMeta.nextRetryAt,
            lastError: retryMeta.lastError
          };
        }
        return badge;
      });

      setBadges(badgesWithRetryState);
      setSyncStatus('synced');
      setLastSync(new Date());
      
    } catch (error) {
      console.error('Badge sync failed:', error);
      setSyncStatus('error');
      
      // Fallback: Use cached data if available
      if (badges.length > 0) {
        console.log('Using cached badge data');
      } else {
        // Last resort: Mock data for development
        setBadges(getMockBadges(address));
      }
    }
  }, [address, contracts, retryQueue, badges]);

  // Fetch badges from XPBadge contract
  const fetchContractBadges = async (walletAddress) => {
    const { xpBadge } = contracts;
    if (!xpBadge) throw new Error('XPBadge contract not available');
    
    // TODO: Implement actual contract calls when ABI is available
    // For now, return empty array
    return [];
  };

  // Fetch badges from Supabase
  const fetchSupabaseBadges = async (walletAddress) => {
    const response = await apiFetch(`/api/badges/claimable/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch badges: ${response.status}`);
    }
    
    const data = await response.json();
    return data.badges || [];
  };

  // Merge badge data from multiple sources
  const mergeBadgeSources = (contractBadges, supabaseBadges) => {
    const badgeMap = new Map();
    
    // Add contract badges (highest priority)
    contractBadges.forEach(badge => {
      badgeMap.set(badge.id, { ...badge, source: 'contract', state: BADGE_STATES.MINTED });
    });
    
    // Add Supabase badges (don't override contract data)
    supabaseBadges.forEach(badge => {
      if (!badgeMap.has(badge.id)) {
        const state = badge.minted ? BADGE_STATES.MINTED : BADGE_STATES.CLAIMABLE;
        badgeMap.set(badge.id, { ...badge, source: 'supabase', state });
      }
    });
    
    return Array.from(badgeMap.values());
  };

  // Claim badge with retry logic
  const claimBadge = async (badge) => {
    if (!address || !badge) return;
    
    // Update badge state
    setBadges(prev => prev.map(b => 
      b.id === badge.id ? { ...b, state: BADGE_STATES.CLAIMING } : b
    ));
    
    try {
      // Generate ZK proof if required
      let verificationData = null;
      if (shouldRequireProof(badge)) {
        verificationData = await generateProof(badge);
      }

      // Submit claim request
      const response = await apiFetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          badgeId: badge.id,
          tokenId: badge.tokenId,
          xpEarned: badge.xpEarned,
          season: badge.season || 1,
          runId: badge.runId,
          verificationData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update badge state to minted
        setBadges(prev => prev.map(b => 
          b.id === badge.id ? { ...b, state: BADGE_STATES.MINTED, txHash: result.txHash } : b
        ));
        
        // Log successful claim
        await zkLogger.logBadgeClaim({
          playerAddress: address,
          badgeId: badge.id,
          tokenId: badge.tokenId,
          xpEarned: badge.xpEarned,
          txHash: result.txHash
        });
        
      } else {
        throw new Error(result.error || 'Claim failed');
      }
      
    } catch (error) {
      console.error('Badge claim failed:', error);
      
      // Handle specific error types
      if (error.message.includes('gas')) {
        showInsufficientGas(error.estimatedGas, error.userBalance);
      } else if (error.message.includes('timeout')) {
        showProofTimeout();
      } else {
        showNetworkError(error);
      }
      
      // Add to retry queue
      addToRetryQueue(badge, error);
    }
  };

  // Add badge to retry queue with exponential backoff
  const addToRetryQueue = (badge, error) => {
    const retryCount = (retryQueue.get(badge.id)?.retryCount || 0) + 1;
    
    if (retryCount > RETRY_CONFIG.maxRetries) {
      // Max retries reached, mark as failed
      setBadges(prev => prev.map(b => 
        b.id === badge.id ? { ...b, state: BADGE_STATES.FAILED, failureReason: error.message } : b
      ));
      return;
    }
    
    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount - 1),
      RETRY_CONFIG.maxDelay
    );
    const nextRetryAt = new Date(Date.now() + delay);
    
    // Update retry queue
    const retryMeta = {
      retryCount,
      nextRetryAt,
      lastError: error.message,
      badge
    };
    
    setRetryQueue(prev => new Map(prev).set(badge.id, retryMeta));
    
    // Schedule retry
    const timer = setTimeout(() => {
      retryBadgeClaim(badge.id);
    }, delay);
    
    retryTimers.current.set(badge.id, timer);
    
    // Update badge state
    setBadges(prev => prev.map(b => 
      b.id === badge.id ? { 
        ...b, 
        state: BADGE_STATES.PENDING_RETRY,
        retryCount,
        nextRetryAt,
        lastError: error.message
      } : b
    ));
  };

  // Retry badge claim
  const retryBadgeClaim = async (badgeId) => {
    const retryMeta = retryQueue.get(badgeId);
    if (!retryMeta) return;
    
    const badge = badges.find(b => b.id === badgeId);
    if (!badge) return;
    
    // Clear retry timer
    const timer = retryTimers.current.get(badgeId);
    if (timer) {
      clearTimeout(timer);
      retryTimers.current.delete(badgeId);
    }
    
    // Attempt claim again
    await claimBadge(badge);
  };

  // Generate ZK proof for high-value badges
  const generateProof = async (badge) => {
    try {
      const proof = await xpVerificationService.generateXPProof(
        address,
        badge.xpEarned,
        badge.runId
      );
      
      await zkLogger.logProofSuccess({
        playerAddress: address,
        claimedXP: badge.xpEarned,
        nullifier: proof.nullifier,
        proofSize: JSON.stringify(proof).length
      });
      
      return proof;
    } catch (error) {
      await zkLogger.logProofFailure({
        playerAddress: address,
        claimedXP: badge.xpEarned,
        error: error.message,
        errorType: classifyProofError(error)
      });
      throw error;
    }
  };

  // Determine if badge requires ZK proof
  const shouldRequireProof = (badge) => {
    return badge.xpEarned >= 50 || badge.tokenId >= 2; // Rare and above
  };

  // Classify proof errors for analytics
  const classifyProofError = (error) => {
    const message = error.message.toLowerCase();
    if (message.includes('nullifier')) return 'nullifier_reuse';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('invalid')) return 'invalid_proof';
    if (message.includes('network')) return 'network_error';
    return 'unknown_error';
  };

  // Get mock badges for development
  const getMockBadges = (walletAddress) => {
    return [
      {
        id: 'mock-1',
        tokenId: 2,
        xpEarned: 65,
        season: 1,
        runId: 'run-mock-1',
        state: BADGE_STATES.CLAIMABLE,
        source: 'mock',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'mock-2',
        tokenId: 1,
        xpEarned: 35,
        season: 1,
        runId: 'run-mock-2',
        state: BADGE_STATES.FAILED,
        source: 'mock',
        failureReason: 'Network timeout',
        retryCount: 3,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  };

  // Manual sync trigger
  const handleManualSync = () => {
    setLoading(true);
    syncBadgeState().finally(() => setLoading(false));
  };

  // Get badge tier info
  const getBadgeTier = (tokenId) => {
    return BADGE_TIERS[tokenId] || BADGE_TIERS[0];
  };

  // Render the claim panel UI
  if (!address) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🎁</div>
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view and claim badges</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sync status */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">🎁 Claim Center</h1>
          <p className="text-gray-400 mt-1">
            Claim your earned XP badges • 
            <span className={`ml-2 text-sm ${
              syncStatus === 'synced' ? 'text-green-400' : 
              syncStatus === 'syncing' ? 'text-yellow-400' : 
              syncStatus === 'error' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {syncStatus === 'synced' ? '✓ Synced' : 
               syncStatus === 'syncing' ? '⟳ Syncing...' : 
               syncStatus === 'error' ? '⚠ Sync Error' : 'Idle'}
            </span>
            {lastSync && (
              <span className="text-gray-500 text-xs ml-2">
                Last sync: {new Date(lastSync).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <button
          onClick={handleManualSync}
          disabled={loading || syncStatus === 'syncing'}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Badge sections */}
      {badges.length === 0 && !loading ? (
        <div className="bg-gray-800/50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-semibold text-white mb-2">No Badges Available</h2>
          <p className="text-gray-400">
            Complete runs to earn XP and unlock badges!
          </p>
        </div>
      ) : (
        <>
          {/* Claimable badges */}
          {badges.filter(b => b.state === BADGE_STATES.CLAIMABLE).length > 0 && (
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">
                  Ready to Claim ({badges.filter(b => b.state === BADGE_STATES.CLAIMABLE).length})
                </h2>
              </div>
              <div className="divide-y divide-gray-700">
                {badges.filter(b => b.state === BADGE_STATES.CLAIMABLE).map(badge => {
                  const tier = getBadgeTier(badge.tokenId);
                  return (
                    <div key={badge.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">{tier.emoji}</div>
                        <div>
                          <div className={`font-semibold text-${tier.color}-400`}>
                            {tier.name} Badge
                          </div>
                          <div className="text-sm text-gray-400">
                            {badge.xpEarned} XP • Run: {badge.runId}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => claimBadge(badge)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
                      >
                        Claim Badge
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Claiming badges */}
          {badges.filter(b => b.state === BADGE_STATES.CLAIMING).length > 0 && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-blue-500/30">
                <h2 className="text-xl font-semibold text-white">
                  Claiming... ({badges.filter(b => b.state === BADGE_STATES.CLAIMING).length})
                </h2>
              </div>
              <div className="divide-y divide-blue-500/30">
                {badges.filter(b => b.state === BADGE_STATES.CLAIMING).map(badge => {
                  const tier = getBadgeTier(badge.tokenId);
                  return (
                    <div key={badge.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl animate-pulse">{tier.emoji}</div>
                        <div>
                          <div className={`font-semibold text-${tier.color}-400`}>
                            {tier.name} Badge
                          </div>
                          <div className="text-sm text-gray-400">
                            {badge.xpEarned} XP • Minting...
                          </div>
                        </div>
                      </div>
                      <div className="text-blue-400">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Retry pending badges */}
          {badges.filter(b => b.state === BADGE_STATES.PENDING_RETRY).length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-yellow-500/30">
                <h2 className="text-xl font-semibold text-white">
                  Pending Retry ({badges.filter(b => b.state === BADGE_STATES.PENDING_RETRY).length})
                </h2>
              </div>
              <div className="divide-y divide-yellow-500/30">
                {badges.filter(b => b.state === BADGE_STATES.PENDING_RETRY).map(badge => {
                  const tier = getBadgeTier(badge.tokenId);
                  const timeUntilRetry = badge.nextRetryAt ? 
                    Math.max(0, new Date(badge.nextRetryAt) - new Date()) : 0;
                  
                  return (
                    <div key={badge.id} className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-4">
                          <div className="text-3xl opacity-75">{tier.emoji}</div>
                          <div>
                            <div className={`font-semibold text-${tier.color}-400`}>
                              {tier.name} Badge
                            </div>
                            <div className="text-sm text-gray-400">
                              {badge.xpEarned} XP • Retry {badge.retryCount}/5
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {timeUntilRetry > 0 ? (
                            <div className="text-sm text-yellow-400">
                              Next retry in {Math.ceil(timeUntilRetry / 1000)}s
                            </div>
                          ) : (
                            <button
                              onClick={() => retryBadgeClaim(badge.id)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded text-sm transition-colors"
                            >
                              Retry Now
                            </button>
                          )}
                        </div>
                      </div>
                      {badge.lastError && (
                        <div className="bg-yellow-900/30 rounded p-2 text-xs text-yellow-300">
                          Error: {badge.lastError}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Failed badges */}
          {badges.filter(b => b.state === BADGE_STATES.FAILED).length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-red-500/30">
                <h2 className="text-xl font-semibold text-white">
                  Failed ({badges.filter(b => b.state === BADGE_STATES.FAILED).length})
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Maximum retry attempts reached
                </p>
              </div>
              <div className="divide-y divide-red-500/30">
                {badges.filter(b => b.state === BADGE_STATES.FAILED).map(badge => {
                  const tier = getBadgeTier(badge.tokenId);
                  return (
                    <div key={badge.id} className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl opacity-30">{tier.emoji}</div>
                        <div className="flex-1">
                          <div className={`font-semibold text-${tier.color}-400 opacity-75`}>
                            {tier.name} Badge
                          </div>
                          <div className="text-sm text-gray-400">
                            {badge.xpEarned} XP • Run: {badge.runId}
                          </div>
                          {badge.failureReason && (
                            <div className="text-xs text-red-400 mt-1">
                              {badge.failureReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Minted badges */}
          {badges.filter(b => b.state === BADGE_STATES.MINTED).length > 0 && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-green-500/30">
                <h2 className="text-xl font-semibold text-white">
                  Successfully Minted ({badges.filter(b => b.state === BADGE_STATES.MINTED).length})
                </h2>
              </div>
              <div className="divide-y divide-green-500/30">
                {badges.filter(b => b.state === BADGE_STATES.MINTED).slice(0, 5).map(badge => {
                  const tier = getBadgeTier(badge.tokenId);
                  return (
                    <div key={badge.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">{tier.emoji}</div>
                        <div>
                          <div className={`font-semibold text-${tier.color}-400`}>
                            {tier.name} Badge
                          </div>
                          <div className="text-sm text-gray-400">
                            {badge.xpEarned} XP • ✓ Minted
                          </div>
                        </div>
                      </div>
                      {badge.txHash && (
                        <a
                          href={`https://explorer.testnet.abs.xyz/tx/${badge.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          View TX →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClaimPanel;