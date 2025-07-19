import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import xpVerificationService from '../services/xpVerificationService';
import { CheckCircle, AlertCircle, Loader2, Package } from 'lucide-react';

const BADGE_TIERS = [
  { id: 0, name: 'Participation', emoji: '🥾', color: 'gray' },
  { id: 1, name: 'Common', emoji: '🥉', color: 'bronze' },
  { id: 2, name: 'Rare', emoji: '🥈', color: 'blue' },
  { id: 3, name: 'Epic', emoji: '🥇', color: 'purple' },
  { id: 4, name: 'Legendary', emoji: '👑', color: 'yellow' }
];

const BatchBadgeClaim = ({ onComplete }) => {
  const { address } = useWallet();
  const { contracts } = useContracts();
  const [unclaimedBadges, setUnclaimedBadges] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState(new Set());
  const [claimStatus, setClaimStatus] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Fetch unclaimed badges
  useEffect(() => {
    if (address) {
      fetchUnclaimedBadges();
    }
  }, [address]);

  const fetchUnclaimedBadges = async () => {
    try {
      const response = await apiFetch(`/api/badges/unclaimed/${address}`);
      if (response.ok) {
        const data = await response.json();
        setUnclaimedBadges(data.unclaimed || []);
      }
    } catch (error) {
      console.error('Error fetching unclaimed badges:', error);
    }
  };

  // Toggle badge selection
  const toggleBadgeSelection = useCallback((badgeId) => {
    setSelectedBadges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(badgeId)) {
        newSet.delete(badgeId);
      } else {
        newSet.add(badgeId);
      }
      return newSet;
    });
  }, []);

  // Select all badges
  const selectAll = useCallback(() => {
    setSelectedBadges(new Set(unclaimedBadges.map(b => b.id)));
  }, [unclaimedBadges]);

  // Process batch claim
  const processBatchClaim = async () => {
    if (selectedBadges.size === 0) return;

    setIsProcessing(true);
    setBatchProgress({ current: 0, total: selectedBadges.size });

    const selectedBadgesList = unclaimedBadges.filter(b => selectedBadges.has(b.id));
    const results = {};

    // Process badges in parallel batches (max 3 at a time to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < selectedBadgesList.length; i += batchSize) {
      const batch = selectedBadgesList.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (badge) => {
          try {
            // Update status to processing
            setClaimStatus(prev => ({
              ...prev,
              [badge.id]: { status: 'processing', message: 'Generating proof...' }
            }));

            // Generate ZK proof (will use cache if available)
            const proofData = await xpVerificationService.generateXPProof(
              address,
              badge.xpEarned,
              badge.runId
            );

            // Update status
            setClaimStatus(prev => ({
              ...prev,
              [badge.id]: { status: 'verifying', message: 'Verifying on-chain...' }
            }));

            // Submit proof to contract
            const txHash = await xpVerificationService.submitXPProof(
              contracts,
              proofData
            );

            // Claim badge
            const claimResponse = await apiFetch('/api/badges/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerAddress: address,
                runId: badge.runId,
                zkProof: {
                  nullifier: proofData.nullifier,
                  commitment: proofData.commitment,
                  verificationTxHash: txHash
                }
              })
            });

            if (claimResponse.ok) {
              results[badge.id] = { success: true, txHash };
              setClaimStatus(prev => ({
                ...prev,
                [badge.id]: { status: 'success', message: 'Claimed!', txHash }
              }));
            } else {
              throw new Error('Claim failed');
            }

          } catch (error) {
            results[badge.id] = { success: false, error: error.message };
            setClaimStatus(prev => ({
              ...prev,
              [badge.id]: { status: 'error', message: error.message }
            }));
          }

          setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
        })
      );
    }

    setIsProcessing(false);

    // Show summary
    const successful = Object.values(results).filter(r => r.success).length;
    const failed = Object.values(results).filter(r => !r.success).length;
    
    console.log(`Batch claim complete: ${successful} successful, ${failed} failed`);
    
    if (onComplete) {
      onComplete(results);
    }

    // Refresh unclaimed badges
    setTimeout(fetchUnclaimedBadges, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            Batch Badge Claim
          </h2>
          {unclaimedBadges.length > 0 && (
            <button
              onClick={selectAll}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Select All ({unclaimedBadges.length})
            </button>
          )}
        </div>

        {unclaimedBadges.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No unclaimed badges found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <AnimatePresence>
                {unclaimedBadges.map((badge) => {
                  const tier = BADGE_TIERS[badge.tokenId];
                  const isSelected = selectedBadges.has(badge.id);
                  const status = claimStatus[badge.id];

                  return (
                    <motion.div
                      key={badge.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? `border-${tier.color}-500 bg-${tier.color}-500/10` 
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }
                        ${status ? 'pointer-events-none' : ''}
                      `}
                      onClick={() => !status && toggleBadgeSelection(badge.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{tier.emoji}</span>
                          <div>
                            <h4 className="font-semibold text-white">
                              {tier.name} Badge
                            </h4>
                            <p className="text-sm text-gray-400">
                              {badge.xpEarned} XP • Run #{badge.runId.slice(-6)}
                            </p>
                          </div>
                        </div>

                        {status && (
                          <div className="flex items-center gap-2">
                            {status.status === 'processing' && (
                              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                            )}
                            {status.status === 'verifying' && (
                              <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
                            )}
                            {status.status === 'success' && (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            )}
                            {status.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        )}
                      </div>

                      {status && (
                        <p className={`
                          text-xs mt-2
                          ${status.status === 'success' ? 'text-green-400' : ''}
                          ${status.status === 'error' ? 'text-red-400' : ''}
                          ${['processing', 'verifying'].includes(status.status) ? 'text-gray-400' : ''}
                        `}>
                          {status.message}
                        </p>
                      )}

                      {isSelected && !status && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                        >
                          <CheckCircle className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {selectedBadges.size > 0 && (
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-300">
                    {selectedBadges.size} badge{selectedBadges.size !== 1 ? 's' : ''} selected
                  </p>
                  {isProcessing && (
                    <p className="text-sm text-gray-400">
                      Processing {batchProgress.current} of {batchProgress.total}
                    </p>
                  )}
                </div>

                <button
                  onClick={processBatchClaim}
                  disabled={isProcessing}
                  className={`
                    w-full py-3 px-6 rounded-lg font-semibold transition-all
                    ${isProcessing
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    }
                  `}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Batch...
                    </span>
                  ) : (
                    `Claim ${selectedBadges.size} Badge${selectedBadges.size !== 1 ? 's' : ''}`
                  )}
                </button>

                {isProcessing && batchProgress.total > 0 && (
                  <div className="mt-4">
                    <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full"
                        initial={{ width: '0%' }}
                        animate={{ 
                          width: `${(batchProgress.current / batchProgress.total) * 100}%` 
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BatchBadgeClaim;