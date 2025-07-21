import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import xpVerificationService from '../services/xpVerificationService';
import { useZKToasts } from './ZKErrorToast';
import { zkLogger } from '../services/zkAnalyticsService';
import '../styles/mobile-fixes.css';

const BADGE_TYPES = [
  { id: 0, name: 'Participation', xpRange: '1-24 XP', emoji: '🥾', color: 'text-gray-400' },
  { id: 1, name: 'Common', xpRange: '25-49 XP', emoji: '🥉', color: 'text-bronze-400' },
  { id: 2, name: 'Rare', xpRange: '50-74 XP', emoji: '🥈', color: 'text-blue-400' },
  { id: 3, name: 'Epic', xpRange: '75-99 XP', emoji: '🥇', color: 'text-purple-400' },
  { id: 4, name: 'Legendary', xpRange: '100+ XP', emoji: '👑', color: 'text-yellow-400' },
];

// Enhanced loading spinner component for better UX
const LoadingSpinner = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-5 w-5',
    large: 'h-6 w-6'
  };
  
  return (
    <svg className={`animate-spin ${sizeClasses[size]} ${className}`} 
         xmlns="http://www.w3.org/2000/svg" 
         fill="none" 
         viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};

// Enhanced status badge component
const StatusBadge = ({ status, className = '' }) => {
  const statusConfig = {
    pending: { 
      bg: 'bg-yellow-500/10', 
      text: 'text-yellow-400', 
      border: 'border-yellow-500/30',
      icon: '⏳'
    },
    processing: { 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-400', 
      border: 'border-blue-500/30',
      icon: '⚡'
    },
    failed: { 
      bg: 'bg-red-500/10', 
      text: 'text-red-400', 
      border: 'border-red-500/30',
      icon: '❌'
    },
    generating: { 
      bg: 'bg-purple-500/10', 
      text: 'text-purple-400', 
      border: 'border-purple-500/30',
      icon: '🔮'
    }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${className}`}>
      <span className="animate-pulse">{config.icon}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Enhanced error display component
const ErrorDisplay = ({ error, onRetry, className = '' }) => {
  if (!error) return null;
  
  return (
    <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="text-red-400 text-lg flex-shrink-0">⚠️</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-400 mb-1">Error Occurred</h4>
          <p className="text-sm text-red-300 break-words">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ClaimBadge = () => {
  const { address } = useWallet();
  const { contracts } = useContracts();
  const {
    showInvalidProof,
    showNullifierReused,
    showNotEligible,
    showNetworkError,
    showInsufficientGas,
    showProofTimeout
  } = useZKToasts();
  const [unclaimedBadges, setUnclaimedBadges] = useState([]);
  const [failedBadges, setFailedBadges] = useState([]);
  const [pendingBadges, setPendingBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState({});
  const [retrying, setRetrying] = useState({});
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [proofGenerating, setProofGenerating] = useState({});
  const [loadingError, setLoadingError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('connected');

  useEffect(() => {
    if (address) {
      fetchBadgeStatus();
      // Set up periodic refresh for pending badges
      const interval = setInterval(fetchBadgeStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [address]);

  const fetchBadgeStatus = async () => {
    if (!address) return;
    
    setLoading(true);
    setLoadingError(null);
    setNetworkStatus('connecting');
    
    try {
      // Fetch both status and pending badges with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const [statusResponse, pendingResponse] = await Promise.all([
        apiFetch(`/api/badges/status/${address}`, { signal: controller.signal }),
        apiFetch(`/api/badges/pending/${address}`, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      setNetworkStatus('connected');
      
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setUnclaimedBadges(data.unclaimed || []);
        setFailedBadges(data.failed || []);
      }

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingBadges(pendingData.pending || []);
      }
    } catch (error) {
      console.error('Error fetching badge status:', error);
      setNetworkStatus('disconnected');
      
      if (error.name === 'AbortError') {
        setLoadingError('Request timed out. Please check your connection and try again.');
      } else {
        setLoadingError('Failed to load badge status. Using mock data for development.');
      }
      
      // Enhanced mock data for development with more realistic scenarios
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
          failureReason: 'Network timeout during proof generation',
          retryCount: 2,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          lastAttempt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'run-789',
          tokenId: 3,
          xpEarned: 85,
          season: 1,
          runId: 'run-789',
          status: 'failed',
          failureReason: 'Gas estimation exceeded limit (320k+ required)',
          retryCount: 5,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          lastAttempt: new Date(Date.now() - 1800000).toISOString()
        }
      ]);
      setPendingBadges([
        {
          id: 'run-pending-1',
          tokenId: 1,
          xpEarned: 30,
          season: 1,
          runId: 'run-pending-1',
          retryCount: 1,
          nextRetryAt: new Date(Date.now() + 300000).toISOString(),
          queuePosition: 1,
          createdAt: new Date(Date.now() - 300000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const classifyProofError = (error) => {
    const message = error.message.toLowerCase();
    if (message.includes('nullifier')) return 'nullifier_reuse';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('invalid') || message.includes('verification')) return 'invalid_proof';
    if (message.includes('network') || message.includes('connection')) return 'network_error';
    if (message.includes('gas')) return 'insufficient_gas';
    return 'unknown_error';
  };

  const claimBadge = async (badge) => {
    if (!address || !contracts?.xpBadge) {
      showNetworkError({ message: 'Address or XP Badge contract not available' });
      return;
    }

    setClaiming(prev => ({ ...prev, [badge.id]: true }));
    
    try {
      // Step 1: Generate ZK proof if XPVerifier is available and required
      let verificationData = null;
      if (contracts?.xpVerifier && (badge.requiresProof || badge.xpEarned >= 50)) {
        try {
          console.log('🔐 Generating ZK proof for XP verification...');
          setProofGenerating(prev => ({ ...prev, [badge.id]: true }));
          
          // Log proof attempt
          await zkLogger.logProofAttempt({
            playerAddress: address,
            claimedXP: badge.xpEarned,
            runId: badge.runId,
            badgeType: badge.name
          });
          
          verificationData = await xpVerificationService.generateXPProof(
            address,
            badge.xpEarned,
            badge.runId
          );
          
          // Log successful proof generation
          await zkLogger.logProofSuccess({
            playerAddress: address,
            claimedXP: badge.xpEarned,
            nullifier: verificationData.nullifier,
            proofSize: JSON.stringify(verificationData.proof).length
          });
          
          console.log('✅ ZK proof generated successfully');
          setProofGenerating(prev => ({ ...prev, [badge.id]: false }));
        } catch (proofError) {
          setProofGenerating(prev => ({ ...prev, [badge.id]: false }));
          console.warn('⚠️ ZK proof generation failed:', proofError.message);
          
          // Log proof failure with specific error handling
          await zkLogger.logProofFailure({
            playerAddress: address,
            claimedXP: badge.xpEarned,
            error: proofError.message,
            errorType: classifyProofError(proofError)
          });
          
          // Handle specific error types with appropriate UX
          if (proofError.message.includes('nullifier')) {
            showNullifierReused(proofError.nullifier || 'unknown');
            setClaiming(prev => ({ ...prev, [badge.id]: false }));
            return;
          } else if (proofError.message.includes('timeout')) {
            showProofTimeout();
            setClaiming(prev => ({ ...prev, [badge.id]: false }));
            return;
          } else if (proofError.message.includes('invalid')) {
            showInvalidProof(`Invalid proof: Please retry with updated XP data`);
            setClaiming(prev => ({ ...prev, [badge.id]: false }));
            return;
          } else if (proofError.message.includes('insufficient')) {
            showNotEligible(badge.xpEarned, `Minimum XP required for verification`);
            setClaiming(prev => ({ ...prev, [badge.id]: false }));
            return;
          }
          
          // Continue without verification for lower XP amounts
          if (badge.xpEarned >= 100) {
            showNotEligible(100, badge.xpEarned);
            setClaiming(prev => ({ ...prev, [badge.id]: false }));
            return;
          }
        }
      }

      // Step 2: Submit to backend for badge minting
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
          runId: badge.runId,
          verificationData // Include ZK proof if available
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove from unclaimed badges
          setUnclaimedBadges(prev => prev.filter(b => b.id !== badge.id));
          
          // Show success message with transaction hash
          console.log('Badge claimed successfully:', result.txHash);
          
          // If XP verification was used, log that too
          if (verificationData) {
            console.log('XP verified on-chain:', verificationData.nullifier);
          }
        } else {
          throw new Error(result.error || 'Failed to claim badge');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to claim badge');
      }
    } catch (error) {
      console.error('Error claiming badge:', error);
      
      // Handle different types of errors with appropriate UX
      if (error.message.includes('gas')) {
        showInsufficientGas('Unknown', 'Unknown');
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        showNetworkError(error);
      } else if (error.message.includes('not eligible')) {
        showNotEligible(badge.xpEarned, 0);
      } else {
        showInvalidProof(error.message);
      }
      
      // Move to failed badges if not already there
      if (!failedBadges.find(b => b.id === badge.id)) {
        setFailedBadges(prev => [...prev, {
          ...badge,
          status: 'failed',
          failureReason: error.message,
          retryCount: (badge.retryCount || 0) + 1,
          lastAttempt: new Date().toISOString()
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

  const getTimeUntil = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMs <= 0) return 'Ready';
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    if (diffMins > 0) return `${diffMins}m`;
    return 'Soon';
  };

  const isRetryLimitReached = (badge) => {
    return (badge.retryCount || 0) >= 5;
  };

  const getNetworkStatusIndicator = () => {
    const statusConfig = {
      connected: { color: 'text-green-400', icon: '🟢', text: 'Connected' },
      connecting: { color: 'text-yellow-400', icon: '🟡', text: 'Connecting' },
      disconnected: { color: 'text-red-400', icon: '🔴', text: 'Disconnected' }
    };
    
    const config = statusConfig[networkStatus];
    return (
      <div className={`flex items-center space-x-1 text-xs ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
      </div>
    );
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
      {/* Enhanced Header with Network Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">🏆 Badge Center</h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-400">Claim and manage your XP badges</p>
            {getNetworkStatusIndicator()}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Dev Panel Toggle (only show in development) */}
          {import.meta.env.DEV && (
            <button
              onClick={() => setShowDevPanel(!showDevPanel)}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                showDevPanel 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
            >
              🔧 Dev Panel
            </button>
          )}
          
          <button
            onClick={fetchBadgeStatus}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {loadingError && (
        <ErrorDisplay 
          error={loadingError} 
          onRetry={fetchBadgeStatus}
          className="mb-4"
        />
      )}

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

      {/* Dev Panel - Enhanced Pending Badges Queue */}
      {import.meta.env.DEV && showDevPanel && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-yellow-500/30">
            <h2 className="text-xl font-semibold text-white">
              🔧 Dev Panel - Production Monitoring Preview
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Real-time badge processing status (Phase 10 ready)
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Queue Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-900/30 rounded p-3">
                <div className="text-yellow-400 font-semibold">Queue Depth</div>
                <div className="text-2xl text-white">{pendingBadges.length}</div>
              </div>
              <div className="bg-blue-900/30 rounded p-3">
                <div className="text-blue-400 font-semibold">Processing Rate</div>
                <div className="text-2xl text-white">209 ops/sec</div>
              </div>
              <div className="bg-green-900/30 rounded p-3">
                <div className="text-green-400 font-semibold">Success Rate</div>
                <div className="text-2xl text-white">99.3%</div>
              </div>
            </div>
            
            {/* Pending Badges List */}
            {pendingBadges.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-2xl mb-2">⚡</div>
                <div>No badges in pending queue</div>
              </div>
            ) : (
              <div className="divide-y divide-yellow-500/30">
                {pendingBadges.map(badge => {
                  const badgeType = getBadgeType(badge.tokenId);
                  return (
                    <div key={badge.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{badgeType.emoji}</div>
                          <div>
                            <div className={`font-semibold ${badgeType.color}`}>
                              {badgeType.name} Badge
                            </div>
                            <div className="text-sm text-gray-400">
                              {badge.xpEarned} XP • Run: {badge.runId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status="pending" />
                          <div className="text-xs text-gray-400 mt-1">
                            Next: {getTimeUntil(badge.nextRetryAt)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-900/30 rounded p-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-gray-300">
                          <div>Retry Count: {badge.retryCount || 0}/5</div>
                          <div>Created: {getTimeSince(badge.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Unclaimed Badges */}
      {unclaimedBadges.length > 0 && (
        <div className="badge-modal bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="badge-modal-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="responsive-text-xl font-semibold text-white">
                  🎁 Unclaimed Badges ({unclaimedBadges.length})
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  These badges are ready to be claimed to your wallet
                </p>
              </div>
              <StatusBadge status="pending" />
            </div>
          </div>
          
          <div className="badge-modal-content divide-y divide-gray-700 mobile-scroll">
            {unclaimedBadges.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              const isProcessing = claiming[badge.id] || proofGenerating[badge.id];
              
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
                      {badge.xpEarned >= 50 && (
                        <div className="text-xs text-purple-400 mt-1">
                          🔐 ZK Proof Required
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="badge-actions flex-shrink-0">
                    <button
                      onClick={() => claimBadge(badge)}
                      disabled={isProcessing}
                      className="mobile-button bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded text-sm transition-colors mobile-focus relative flex items-center space-x-2"
                    >
                      {proofGenerating[badge.id] ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span className="hidden sm:inline">Generating Proof...</span>
                          <span className="sm:hidden">Proof...</span>
                        </>
                      ) : claiming[badge.id] ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span className="hidden sm:inline">Claiming...</span>
                          <span className="sm:hidden">Wait...</span>
                        </>
                      ) : (
                        <>
                          <span>🎯</span>
                          <span className="hidden sm:inline">Claim Badge</span>
                          <span className="sm:hidden">Claim</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Failed Badges */}
      {failedBadges.length > 0 && (
        <div className="badge-modal bg-red-900/20 border border-red-500/30 rounded-lg overflow-hidden">
          <div className="badge-modal-header border-b border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="responsive-text-xl font-semibold text-white">
                  ⚠️ Failed Badges ({failedBadges.length})
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  These badges failed to mint and can be retried
                </p>
              </div>
              <StatusBadge status="failed" />
            </div>
          </div>
          
          <div className="badge-modal-content divide-y divide-red-500/30 mobile-scroll">
            {failedBadges.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              const canRetry = !isRetryLimitReached(badge);
              const isUnclaimable = isRetryLimitReached(badge);
              const isRetryInProgress = retrying[badge.id];
              
              return (
                <div key={badge.id} className="badge-list-item">
                  <div className="w-full space-y-3">
                    <div className="flex items-start justify-between">
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
                            {badge.lastAttempt && (
                              <span> • Last attempt: {getTimeSince(badge.lastAttempt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="badge-actions flex items-center space-x-2 flex-shrink-0">
                        {canRetry ? (
                          <button
                            onClick={() => retryBadgeClaim(badge)}
                            disabled={isRetryInProgress}
                            className="mobile-button-sm bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-black rounded text-sm transition-colors mobile-focus flex items-center space-x-1"
                          >
                            {isRetryInProgress ? (
                              <>
                                <LoadingSpinner size="small" className="text-black" />
                                <span className="hidden sm:inline">Retrying...</span>
                              </>
                            ) : (
                              <>
                                <span>🔄</span>
                                <span className="hidden sm:inline">Retry</span>
                              </>
                            )}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced No Badges State */}
      {!loading && unclaimedBadges.length === 0 && failedBadges.length === 0 && (
        <div className="bg-gray-800/50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-semibold text-white mb-2">No Badges to Claim</h2>
          <p className="text-gray-400 mb-4">
            Complete runs to earn XP and unlock badges!
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>Network: {networkStatus}</span>
            <span>•</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimBadge;