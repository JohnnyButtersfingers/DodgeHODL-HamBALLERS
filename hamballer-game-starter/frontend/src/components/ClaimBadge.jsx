import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { usePrepareContractWrite, useContractWrite, useContractEvent } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useWallet } from '../contexts/WalletContext';
import { useXp } from '../contexts/XpContext';
import { useAudio } from '../contexts/AudioContext';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';

// XP Badge ABI for minting
const XP_BADGE_ABI = [
  'function mintBadge(uint256 badgeId, uint256 xpRequired) external returns (uint256)',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function getBadgeInfo(uint256 badgeId) view returns (string memory name, string memory description, uint256 xpRequired, bool isActive)',
  'function getPlayerBadges(address player) view returns (uint256[])',
  'event BadgeMinted(address indexed player, uint256 indexed badgeId, uint256 tokenId, uint256 xpRequired)',
];

// Badge definitions (dummy values until contract deployment)
const BADGE_DEFINITIONS = {
  1: { name: 'Novice HODLer', description: 'Complete your first run', xpRequired: 100, color: 'bg-green-500' },
  2: { name: 'Experienced Trader', description: 'Reach 500 XP', xpRequired: 500, color: 'bg-blue-500' },
  3: { name: 'Master Strategist', description: 'Reach 1000 XP', xpRequired: 1000, color: 'bg-purple-500' },
  4: { name: 'Legendary HODLer', description: 'Reach 2500 XP', xpRequired: 2500, color: 'bg-yellow-500' },
  5: { name: 'Supreme Champion', description: 'Reach 5000 XP', xpRequired: 5000, color: 'bg-red-500' },
};

const ClaimBadge = () => {
  const { address, isConnected } = useWallet();
  const { xp, level } = useXp();
  const { playGameSound } = useAudio();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [mintStatus, setMintStatus] = useState('idle'); // idle, preparing, minting, success, error
  const [mintError, setMintError] = useState('');
  const [ownedBadges, setOwnedBadges] = useState([]);
  const [mintTxHash, setMintTxHash] = useState('');

  // Contract configuration
  const xpBadgeAddress = CONTRACT_ADDRESSES.XP_BADGE || '0x0000000000000000000000000000000000000000';

  // Prepare contract write for minting
  const { config: mintConfig, error: prepareError } = usePrepareContractWrite({
    address: xpBadgeAddress,
    abi: XP_BADGE_ABI,
    functionName: 'mintBadge',
    args: selectedBadge ? [selectedBadge.badgeId, selectedBadge.xpRequired] : undefined,
    enabled: !!selectedBadge && isConnected,
  });

  // Contract write hook
  const { write: mintBadge, isLoading: isMinting, data: mintData } = useContractWrite(mintConfig);

  // Listen for mint events
  useContractEvent({
    address: xpBadgeAddress,
    abi: XP_BADGE_ABI,
    eventName: 'BadgeMinted',
    onSuccess: (data) => {
      if (data.args.player === address) {
        console.log('🎖️ Badge minted successfully:', data);
        setMintStatus('success');
        setMintTxHash(data.transactionHash);
        playGameSound('success');
        
        // Update owned badges
        setTimeout(() => {
          fetchOwnedBadges();
        }, 2000);
      }
    },
  });

  // Calculate available badges
  const availableBadges = useMemo(() => {
    return Object.entries(BADGE_DEFINITIONS)
      .map(([id, badge]) => ({
        badgeId: parseInt(id),
        ...badge,
        canClaim: xp >= badge.xpRequired && !ownedBadges.includes(parseInt(id)),
        progress: Math.min((xp / badge.xpRequired) * 100, 100),
      }))
      .filter(badge => badge.canClaim || xp >= badge.xpRequired * 0.5); // Show badges that are at least 50% complete
  }, [xp, ownedBadges]);

  // Fetch owned badges
  const fetchOwnedBadges = async () => {
    if (!address || !isConnected) return;

    try {
      // For now, use mock data until contract is deployed
      setOwnedBadges([1, 2]); // Mock owned badges
      
      // TODO: Replace with actual contract call when deployed
      // const badges = await contract.read.getPlayerBadges([address]);
      // setOwnedBadges(badges.map(b => Number(b)));
    } catch (error) {
      console.error('Error fetching owned badges:', error);
    }
  };

  useEffect(() => {
    fetchOwnedBadges();
  }, [address, isConnected]);

  // Handle badge selection
  const handleBadgeSelect = (badge) => {
    setSelectedBadge(badge);
    setMintStatus('idle');
    setMintError('');
    playGameSound('moveSelect');
  };

  // Handle minting
  const handleMint = async () => {
    if (!selectedBadge || !mintBadge) {
      setMintError('Unable to prepare mint transaction');
      return;
    }

    try {
      setMintStatus('minting');
      setMintError('');
      
      console.log('🎖️ Minting badge:', selectedBadge);
      mintBadge();
      
    } catch (error) {
      console.error('Error minting badge:', error);
      setMintStatus('error');
      setMintError(error.message || 'Failed to mint badge');
      playGameSound('error');
    }
  };

  // Handle mint transaction status
  useEffect(() => {
    if (mintData) {
      setMintStatus('minting');
      console.log('🎖️ Mint transaction submitted:', mintData.hash);
    }
  }, [mintData]);

  // Handle prepare errors
  useEffect(() => {
    if (prepareError) {
      setMintError(prepareError.message);
      setMintStatus('error');
    }
  }, [prepareError]);

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-lg p-6 text-center"
      >
        <div className="text-2xl mb-4">🔗</div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet</h3>
        <p className="text-gray-400">
          Connect your wallet to view and claim XP badges
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🏆 XP Badges</h2>
            <p className="text-gray-300">
              Claim badges for your achievements and milestones
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-yellow-400">{xp.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Total XP</div>
            <div className="text-lg font-semibold text-blue-400">Level {level}</div>
          </div>
        </div>
      </motion.div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {availableBadges.map((badge, index) => (
            <motion.div
              key={badge.badgeId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-gray-700/50 rounded-lg p-4 border-2 transition-all duration-300 cursor-pointer hover:scale-105 ${
                selectedBadge?.badgeId === badge.badgeId
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-gray-600 hover:border-gray-500'
              } ${ownedBadges.includes(badge.badgeId) ? 'opacity-60' : ''}`}
              onClick={() => handleBadgeSelect(badge)}
            >
              {/* Badge Icon */}
              <div className={`w-16 h-16 ${badge.color} rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold`}>
                {badge.badgeId}
              </div>

              {/* Badge Info */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-1">{badge.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{badge.description}</p>
                
                {/* XP Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{xp.toLocaleString()} / {badge.xpRequired.toLocaleString()} XP</span>
                    <span>{Math.round(badge.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${badge.canClaim ? 'bg-green-500' : 'bg-blue-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${badge.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>

                {/* Status */}
                {ownedBadges.includes(badge.badgeId) ? (
                  <div className="text-green-400 text-sm font-medium">✅ Owned</div>
                ) : badge.canClaim ? (
                  <div className="text-yellow-400 text-sm font-medium">🎖️ Ready to Claim</div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {badge.xpRequired - xp} XP needed
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mint Panel */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-800/50 rounded-lg p-6 border border-gray-600"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Claim {selectedBadge.name}
                </h3>
                <p className="text-gray-400">{selectedBadge.description}</p>
              </div>
              <div className={`w-12 h-12 ${selectedBadge.color} rounded-full flex items-center justify-center text-white text-lg font-bold`}>
                {selectedBadge.badgeId}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Requirements:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">XP Required:</span>
                  <span className={xp >= selectedBadge.xpRequired ? 'text-green-400' : 'text-red-400'}>
                    {selectedBadge.xpRequired.toLocaleString()} XP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your XP:</span>
                  <span className="text-white">{xp.toLocaleString()} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={selectedBadge.canClaim ? 'text-green-400' : 'text-red-400'}>
                    {selectedBadge.canClaim ? '✅ Eligible' : '❌ Not Eligible'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mint Button */}
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMint}
                disabled={!selectedBadge.canClaim || isMinting || mintStatus === 'minting'}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  selectedBadge.canClaim && !isMinting
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isMinting || mintStatus === 'minting' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Minting...
                  </div>
                ) : (
                  '🎖️ Claim Badge'
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedBadge(null)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </motion.button>
            </div>

            {/* Error Display */}
            {mintError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
              >
                <p className="text-red-400 text-sm">{mintError}</p>
              </motion.div>
            )}

            {/* Success Display */}
            {mintStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg"
              >
                <p className="text-green-400 text-sm">
                  ✅ Badge minted successfully!
                  {mintTxHash && (
                    <span className="block text-xs text-gray-400 mt-1">
                      TX: {mintTxHash.slice(0, 10)}...{mintTxHash.slice(-8)}
                    </span>
                  )}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Fallback */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="md:hidden bg-blue-500/20 border border-blue-500/50 rounded-lg p-4"
      >
        <div className="flex items-center">
          <div className="text-blue-400 mr-3">📱</div>
          <div>
            <h4 className="text-sm font-medium text-white">Mobile Wallet</h4>
            <p className="text-xs text-gray-400">
              Use RainbowKit or your preferred mobile wallet to claim badges
            </p>
          </div>
          
          <div className="badge-modal-content divide-y divide-gray-700 mobile-scroll">
            {unclaimedBadges.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              return (
                <div key={badge.id} className="badge-list-item">
                  <div className="badge-info flex items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="text-2xl sm:text-3xl flex-shrink-0">{badgeType.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold ${badgeType.color} responsive-text-lg`}>
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
                  
                  <div className="badge-actions flex-shrink-0">
                    <button
                      onClick={() => claimBadge(badge)}
                      disabled={claiming[badge.id] || proofGenerating[badge.id]}
                      className="mobile-button bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded text-sm transition-colors mobile-focus relative"
                    >
                      {proofGenerating[badge.id] ? (
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating Proof...</span>
                        </div>
                      ) : claiming[badge.id] ? (
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Claiming...</span>
                        </div>
                      ) : 'Claim Badge'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Badges */}
      {failedBadges.length > 0 && (
        <div className="badge-modal bg-red-900/20 border border-red-500/30 rounded-lg overflow-hidden">
          <div className="badge-modal-header border-b border-red-500/30">
            <h2 className="responsive-text-xl font-semibold text-white">
              ⚠️ Failed Badges ({failedBadges.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              These badges failed to mint and can be retried
            </p>
          </div>
          
          <div className="badge-modal-content divide-y divide-red-500/30 mobile-scroll">
            {failedBadges.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              const canRetry = !isRetryLimitReached(badge);
              const isUnclaimable = isRetryLimitReached(badge);
              
              return (
                <div key={badge.id} className="badge-list-item">
                  <>
                    <div className="badge-info flex items-start space-x-3 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className={`text-2xl sm:text-3xl ${isUnclaimable ? 'opacity-30' : 'opacity-50'}`}>
                          {badgeType.emoji}
                        </div>
                        {isUnclaimable && (
                          <div className="absolute -top-1 -right-1 text-red-500 text-sm sm:text-lg">❌</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <div className={`font-semibold ${badgeType.color} ${isUnclaimable ? 'opacity-50' : ''} responsive-text-lg`}>
                            {badgeType.name} Badge
                          </div>
                          {isUnclaimable && (
                            <div 
                              className="text-red-400 text-xs sm:text-sm font-medium cursor-help"
                              title="Retry limit reached. Contact support or refresh your run."
                            >
                              (Unclaimable)
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          {badge.xpEarned} XP earned • {getTimeSince(badge.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Run: {badge.runId} • Season {badge.season}
                        </div>
                      </div>
                    </div>
                    
                    <div className="badge-actions flex-shrink-0">
                      {canRetry ? (
                        <button
                          onClick={() => retryBadgeClaim(badge)}
                          disabled={retrying[badge.id]}
                          className="mobile-button-sm bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-black rounded text-sm transition-colors mobile-focus"
                        >
                          {retrying[badge.id] ? 'Retrying...' : 'Retry'}
                        </button>
                      ) : (
                        <div 
                          className="mobile-button-sm bg-red-600/30 text-red-300 rounded text-sm cursor-help pointer-events-none"
                          title="Retry limit reached. Contact support or refresh your run."
                        >
                            Max Retries
                          </div>
                        )}
                        
                        <button
                          onClick={() => abandonBadge(badge.id)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {isUnclaimable ? 'Dismiss' : 'Abandon'}
                        </button>
                    </div>
                    
                    <div className={`rounded p-3 ${isUnclaimable ? 'bg-red-900/50' : 'bg-red-900/30'}`}>
                      <div className="text-sm text-red-400 mb-1">
                        <strong>Error:</strong> {badge.failureReason || 'Unknown error'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Retry attempts: {badge.retryCount || 0}/5
                        {isUnclaimable && (
                          <span className="text-red-300"> • Contact support for assistance</span>
                        )}
                      </div>
                    </div>
                  </>
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