import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import xpVerificationService from '../services/xpVerificationService';
import { useZKToasts } from './ZKErrorToast';
import { zkLogger } from '../services/zkAnalyticsService';
import badgeRetryService from '../services/badgeRetryService';

const BADGE_TYPES = [
  { id: 0, name: 'Participation', xpRange: '1-24 XP', emoji: '🥾', color: 'text-gray-400', tier: 'common' },
  { id: 1, name: 'Common', xpRange: '25-49 XP', emoji: '🥉', color: 'text-bronze-400', tier: 'common' },
  { id: 2, name: 'Rare', xpRange: '50-74 XP', emoji: '🥈', color: 'text-blue-400', tier: 'rare' },
  { id: 3, name: 'Epic', xpRange: '75-99 XP', emoji: '🥇', color: 'text-purple-400', tier: 'epic' },
  { id: 4, name: 'Legendary', xpRange: '100+ XP', emoji: '👑', color: 'text-yellow-400', tier: 'legendary' },
];

const ClaimPanel = () => {
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

  // Badge state management
  const [claimableData, setClaimableData] = useState(null);
  const [badgeStatus, setBadgeStatus] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState({});
  const [retrying, setRetrying] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [errors, setErrors] = useState([]);

  // Advanced state tracking
  const [retryAnalysis, setRetryAnalysis] = useState({});
  const [queueMetadata, setQueueMetadata] = useState(null);
  const [contractSyncStatus, setContractSyncStatus] = useState('unknown');

  /**
   * Comprehensive badge data fetching with Supabase fallback
   */
  const fetchBadgeData = useCallback(async (forceRefresh = false) => {
    if (!address) return;
    
    setLoading(true);
    setErrors([]);
    setSyncStatus('syncing');
    
    try {
      // Parallel fetching for better performance
      const fetchPromises = [
        apiFetch(`/api/badges/claimable/${address}`).catch(error => ({ 
          ok: false, 
          error: `Claimable fetch failed: ${error.message}` 
        })),
        apiFetch(`/api/badges/status/${address}`).catch(error => ({ 
          ok: false, 
          error: `Status fetch failed: ${error.message}` 
        })),
        apiFetch(`/api/badges/pending/${address}`).catch(error => ({ 
          ok: false, 
          error: `Pending fetch failed: ${error.message}` 
        }))
      ];
      
      const [claimableResponse, statusResponse, pendingResponse] = await Promise.all(fetchPromises);
      
      // Process claimable badges with fallback
      if (claimableResponse.ok) {
        const claimableData = await claimableResponse.json();
        setClaimableData(claimableData);
        setContractSyncStatus(claimableData.syncMetadata?.contractSyncStatus || 'unknown');
      } else {
        console.warn('⚠️ Claimable badges fetch failed, using fallback');
        setClaimableData(generateFallbackClaimableData());
        setErrors(prev => [...prev, claimableResponse.error || 'Claimable data unavailable']);
      }
      
      // Process badge status with fallback
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setBadgeStatus(statusData);
        
        // Track sync metadata
        if (statusData.warnings?.length > 0) {
          setErrors(prev => [...prev, ...statusData.warnings]);
        }
      } else {
        console.warn('⚠️ Badge status fetch failed, using fallback');
        setBadgeStatus(generateFallbackStatusData());
        setErrors(prev => [...prev, statusResponse.error || 'Status data unavailable']);
      }
      
      // Process pending badges with retry queue integration
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingData(pendingData);
        setQueueMetadata(pendingData.queueMetadata);
        
        // Update retry analysis for failed badges
        if (pendingData.pending) {
          const analysis = {};
          pendingData.pending.forEach(badge => {
            if (badge.status === 'failed' || badge.retryCount > 0) {
              analysis[badge.id] = {
                retryCount: badge.retryCount,
                nextRetryAt: badge.nextRetryAt,
                queuePosition: badge.queuePosition,
                estimatedWaitTime: badge.estimatedWaitTime
              };
            }
          });
          setRetryAnalysis(analysis);
        }
      } else {
        console.warn('⚠️ Pending badges fetch failed, using fallback');
        setPendingData(generateFallbackPendingData());
        setErrors(prev => [...prev, pendingResponse.error || 'Pending data unavailable']);
      }
      
      setSyncStatus('success');
      setLastSyncAt(new Date().toISOString());
      
    } catch (error) {
      console.error('❌ Critical error in fetchBadgeData:', error);
      setErrors(prev => [...prev, `Critical sync error: ${error.message}`]);
      setSyncStatus('error');
      
      // Set comprehensive fallback data
      setClaimableData(generateFallbackClaimableData());
      setBadgeStatus(generateFallbackStatusData());
      setPendingData(generateFallbackPendingData());
    } finally {
      setLoading(false);
    }
  }, [address]);

  /**
   * Enhanced badge claiming with retry queue integration
   */
  const claimBadge = async (badge) => {
    if (!address || !contracts?.xpBadge) {
      showNetworkError({ message: 'Wallet or XP Badge contract not available' });
      return;
    }

    setClaiming(prev => ({ ...prev, [badge.id]: true }));
    
    try {
      // Step 1: ZK Proof generation for high-tier badges
      let verificationData = null;
      if (contracts?.xpVerifier && badge.requiresProof) {
        try {
          console.log('🔐 Generating ZK proof for badge claim...');
          
          await zkLogger.logProofAttempt({
            playerAddress: address,
            claimedXP: badge.xpEarned,
            runId: badge.runId,
            badgeType: badge.tier,
            tokenId: badge.tokenId
          });
          
          verificationData = await xpVerificationService.generateXPProof(
            address,
            badge.xpEarned,
            badge.runId
          );
          
          await zkLogger.logProofSuccess({
            playerAddress: address,
            claimedXP: badge.xpEarned,
            nullifier: verificationData.nullifier,
            proofSize: JSON.stringify(verificationData.proof).length
          });
          
          console.log('✅ ZK proof generated for badge claim');
        } catch (proofError) {
          console.warn('⚠️ ZK proof generation failed:', proofError.message);
          
          await zkLogger.logProofFailure({
            playerAddress: address,
            claimedXP: badge.xpEarned,
            error: proofError.message,
            errorType: classifyProofError(proofError)
          });
          
          // Handle specific ZK proof errors
          if (proofError.message.includes('nullifier')) {
            showNullifierReused(proofError.nullifier || 'unknown');
            return;
          } else if (proofError.message.includes('timeout')) {
            showProofTimeout();
            return;
          } else if (proofError.message.includes('invalid')) {
            showInvalidProof(proofError.message);
            return;
          }
          
          // Continue without verification for lower tiers
          if (badge.tier === 'legendary' || badge.tier === 'epic') {
            showNotEligible(badge.xpEarned, 75);
            return;
          }
        }
      }

      // Step 2: Submit claim with comprehensive error handling
      const claimResponse = await apiFetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          tokenId: badge.tokenId,
          xpEarned: badge.xpEarned,
          season: badge.season || 1,
          runId: badge.runId,
          verificationData
        }),
      });

      if (claimResponse.ok) {
        const result = await claimResponse.json();
        
        if (result.success) {
          console.log('🎉 Badge claimed successfully:', result.txHash);
          
          // Update UI optimistically
          setClaimableData(prev => ({
            ...prev,
            claimable: prev.claimable.filter(b => b.id !== badge.id)
          }));
          
          // Refresh badge data to reflect changes
          await fetchBadgeData();
          
        } else if (result.retryScheduled) {
          console.log('⏳ Badge claim added to retry queue:', result.queuePosition);
          
          // Move to pending status
          setPendingData(prev => ({
            ...prev,
            pending: [...(prev.pending || []), {
              ...badge,
              status: 'pending',
              queuePosition: result.queuePosition,
              retryCount: 1,
              retryScheduled: true
            }]
          }));
          
          // Remove from claimable
          setClaimableData(prev => ({
            ...prev,
            claimable: prev.claimable.filter(b => b.id !== badge.id)
          }));
          
        } else {
          throw new Error(result.message || 'Claim failed');
        }
      } else {
        const errorData = await claimResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Claim request failed');
      }
      
    } catch (error) {
      console.error('❌ Badge claim error:', error);
      
      // Enhanced error handling with UX feedback
      handleClaimError(error, badge);
      
    } finally {
      setClaiming(prev => ({ ...prev, [badge.id]: false }));
    }
  };

  /**
   * Enhanced retry logic with comprehensive failure analysis
   */
  const retryBadgeClaim = async (badge) => {
    if (!address || (badge.retryCount >= 5)) return;

    // Get current retry analysis and recommendation
    const errorHistory = badgeRetryService.retryAttempts.get(badge.id) || [];
    const retryRecommendation = badgeRetryService.generateRetryRecommendation(
      badge, 
      errorHistory, 
      queueMetadata
    );
    
    // Check if retry is recommended
    if (!retryRecommendation.shouldRetry) {
      console.warn('⚠️ Retry not recommended for badge:', badge.id, retryRecommendation);
      setErrors(prev => [...prev, `Retry not recommended: ${retryRecommendation.riskAssessment} risk`]);
      return;
    }

    setRetrying(prev => ({ ...prev, [badge.id]: true }));
    
    try {
      // Log retry attempt with comprehensive context
      console.log('🔄 Attempting badge retry with analysis:', {
        badgeId: badge.id,
        retryCount: badge.retryCount || 0,
        recommendation: retryRecommendation,
        successProbability: retryRecommendation.confidence
      });

      const retryResponse = await apiFetch('/api/badges/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          badgeId: badge.id,
          tokenId: badge.tokenId,
          xpEarned: badge.xpEarned,
          season: badge.season || 1,
          runId: badge.runId,
          // Include retry analysis for backend optimization
          retryContext: {
            successProbability: retryRecommendation.confidence,
            riskAssessment: retryRecommendation.riskAssessment,
            queuePosition: retryRecommendation.queuePosition,
            recommendedActions: retryRecommendation.alternativeActions
          }
        }),
      });

      if (retryResponse.ok) {
        const result = await retryResponse.json();
        
        if (result.success) {
          console.log('🎉 Badge retry successful:', result.txHash);
          
          // Clear retry data on success
          badgeRetryService.clearRetryData(badge.id);
          
          // Remove from failed/pending, refresh data
          await fetchBadgeData();
          
        } else {
          // Create error object for analysis
          const retryError = new Error(result.message || 'Retry failed');
          
          // Analyze this retry failure
          const failureAnalysis = badgeRetryService.analyzeFailure(retryError, badge, errorHistory);
          const attemptData = badgeRetryService.trackRetryAttempt(badge, retryError, failureAnalysis.adaptiveStrategy);
          
          // Generate updated recommendation
          const updatedRecommendation = badgeRetryService.generateRetryRecommendation(
            badge, 
            [...errorHistory, attemptData], 
            queueMetadata
          );
          
          // Update retry analysis with comprehensive data
          setRetryAnalysis(prev => ({
            ...prev,
            [badge.id]: {
              retryCount: result.retryCount || (badge.retryCount || 0) + 1,
              nextRetryAt: result.nextRetryAt,
              analysisData: result.analysisData,
              message: result.message,
              successProbability: updatedRecommendation.confidence,
              riskLevel: updatedRecommendation.riskAssessment,
              recommendedActions: updatedRecommendation.alternativeActions,
              failureAnalysis,
              improvementTrend: badgeRetryService.getRetryStats(badge.id)?.improvementTrend
            }
          }));
          
          console.log(`🔄 Retry ${result.retryCount || (badge.retryCount || 0) + 1}/5 failed:`, result.message);
          console.log('📊 Updated retry analysis:', updatedRecommendation);
        }
      } else {
        throw new Error('Retry request failed');
      }
      
    } catch (error) {
      console.error('❌ Badge retry error:', error);
      
      // Analyze the retry attempt error
      const failureAnalysis = badgeRetryService.analyzeFailure(error, badge, errorHistory);
      const attemptData = badgeRetryService.trackRetryAttempt(badge, error, failureAnalysis.adaptiveStrategy);
      
      // Update error list with intelligent messaging
      const errorMessage = failureAnalysis.errorType.adaptable ? 
        `Retry failed (${failureAnalysis.errorType.type}): Will adapt strategy` :
        `Retry failed (${failureAnalysis.errorType.type}): ${error.message}`;
      
      setErrors(prev => [...prev, errorMessage]);
      
      // Update retry analysis
      const updatedRecommendation = badgeRetryService.generateRetryRecommendation(
        badge, 
        [...errorHistory, attemptData], 
        queueMetadata
      );
      
      setRetryAnalysis(prev => ({
        ...prev,
        [badge.id]: {
          ...prev[badge.id],
          retryCount: (badge.retryCount || 0) + 1,
          lastError: error.message,
          successProbability: updatedRecommendation.confidence,
          riskLevel: updatedRecommendation.riskAssessment,
          recommendedActions: updatedRecommendation.alternativeActions
        }
      }));
      
    } finally {
      setRetrying(prev => ({ ...prev, [badge.id]: false }));
    }
  };

  /**
   * Enhanced error handling with specific UX responses and retry analysis
   */
  const handleClaimError = (error, badge) => {
    // Use badgeRetryService for comprehensive error analysis
    const errorHistory = badgeRetryService.retryAttempts.get(badge.id) || [];
    const failureAnalysis = badgeRetryService.analyzeFailure(error, badge, errorHistory);
    
    // Track this attempt
    const attemptData = badgeRetryService.trackRetryAttempt(badge, error, failureAnalysis.adaptiveStrategy);
    
    // Generate retry recommendation
    const retryRecommendation = badgeRetryService.generateRetryRecommendation(
      badge, 
      errorHistory, 
      queueMetadata
    );
    
    console.log('🔍 Claim error analysis:', {
      error: error.message,
      analysis: failureAnalysis,
      recommendation: retryRecommendation,
      attemptData
    });
    
    // Show appropriate UX feedback based on error classification
    const errorClassification = failureAnalysis.errorType;
    
    switch (errorClassification.type) {
      case 'gas_error':
        showInsufficientGas('Unknown', 'Unknown');
        break;
      case 'network_error':
      case 'timeout_error':
        showNetworkError(error);
        break;
      case 'nullifier_reuse':
        showNullifierReused('unknown');
        break;
      case 'balance_error':
        showNotEligible(badge.xpEarned, 0);
        break;
      default:
        showInvalidProof(error.message);
    }
    
    // Update failed badges list with enhanced metadata
    setBadgeStatus(prev => ({
      ...prev,
      failed: [...(prev.failed || []), {
        ...badge,
        status: 'failed',
        failureReason: error.message,
        retryCount: errorHistory.length,
        lastAttempt: new Date().toISOString(),
        errorClassification: errorClassification.type,
        retryRecommendation,
        failureAnalysis,
        riskAssessment: retryRecommendation.riskAssessment
      }]
    }));
    
    // Update retry analysis state for UI display
    setRetryAnalysis(prev => ({
      ...prev,
      [badge.id]: {
        retryCount: errorHistory.length,
        nextRetryAt: new Date(Date.now() + failureAnalysis.suggestedDelay).toISOString(),
        queuePosition: retryRecommendation.queuePosition,
        estimatedWaitTime: retryRecommendation.estimatedWaitTime,
        successProbability: retryRecommendation.confidence,
        riskLevel: retryRecommendation.riskAssessment,
        recommendedActions: retryRecommendation.alternativeActions
      }
    }));
  };

  /**
   * Classify proof errors for better UX
   */
  const classifyProofError = (error) => {
    const message = error.message.toLowerCase();
    if (message.includes('nullifier')) return 'nullifier_reuse';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('invalid') || message.includes('verification')) return 'invalid_proof';
    if (message.includes('network') || message.includes('connection')) return 'network_error';
    if (message.includes('gas')) return 'insufficient_gas';
    return 'unknown_error';
  };

  // Fallback data generators
  const generateFallbackClaimableData = () => ({
    claimable: [
      {
        id: 'fallback-1',
        runId: 'run-123',
        tokenId: 2,
        xpEarned: 65,
        season: 1,
        tier: 'rare',
        requiresProof: false,
        cpEarned: 65,
        duration: 120,
        createdAt: new Date().toISOString(),
        eligibilityScore: 65,
        dataSource: 'fallback'
      }
    ],
    alreadyMinted: [],
    sources: { supabase: null, contract: null, syncStatus: 'fallback' },
    syncMetadata: {
      supabaseAvailable: false,
      contractSyncStatus: 'fallback',
      lastSyncAt: new Date().toISOString(),
      totalEligible: 1,
      highestTierAvailable: 'Rare'
    }
  });

  const generateFallbackStatusData = () => ({
    unclaimed: [],
    failed: [],
    claimHistory: [],
    contractSyncStatus: 'fallback',
    dataSource: 'fallback',
    syncedAt: new Date().toISOString()
  });

  const generateFallbackPendingData = () => ({
    pending: [],
    queueMetadata: {
      totalInQueue: 0,
      isProcessing: false,
      avgProcessingTime: '30s',
      initialized: false
    },
    retryStats: {
      distribution: {},
      lastProcessed: null,
      errorRate: 0
    }
  });

  // Effect hooks
  useEffect(() => {
    if (address) {
      fetchBadgeData();
    }
  }, [address, fetchBadgeData]);

  // Helper functions
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

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  const getTierGlow = (tier) => {
    const glows = {
      legendary: 'shadow-lg shadow-yellow-500/50',
      epic: 'shadow-lg shadow-purple-500/50',
      rare: 'shadow-lg shadow-blue-500/50',
      common: 'shadow-md shadow-gray-500/30'
    };
    return glows[tier] || '';
  };

  if (!address) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🏆</div>
        <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view and claim your XP badges</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">🏆 Badge Claim Center</h1>
          <p className="text-gray-400 mt-1">Claim your XP badges with intelligent retry system</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Sync Status Indicator */}
          <div className={`flex items-center space-x-2 ${getSyncStatusColor()}`}>
            <span className="text-sm">{getSyncStatusIcon()}</span>
            <span className="text-sm font-medium">
              {syncStatus === 'syncing' ? 'Syncing...' :
               syncStatus === 'success' ? 'Synced' :
               syncStatus === 'error' ? 'Sync Error' : 'Ready'}
            </span>
          </div>
          
          {/* Contract Sync Status */}
          {contractSyncStatus !== 'unknown' && (
            <div className="text-xs text-gray-500">
              Contract: {contractSyncStatus}
            </div>
          )}
          
          <button
            onClick={() => fetchBadgeData(true)}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-red-400 font-medium">Sync Warnings</span>
          </div>
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-red-300">{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Badge Types Reference */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Badge Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {BADGE_TYPES.map(type => (
            <div key={type.id} className={`text-center p-3 rounded-lg ${getTierGlow(type.tier)}`}>
              <div className="text-2xl mb-2">{type.emoji}</div>
              <div className={`font-semibold ${type.color}`}>{type.name}</div>
              <div className="text-sm text-gray-400">{type.xpRange}</div>
            </div>
          ))}
        </div>
      </div>

             {/* Comprehensive Sync Status Panel */}
       {(queueMetadata || claimableData || badgeStatus) && (
         <div className="bg-gray-800/50 rounded-lg p-6">
           <h3 className="text-lg font-semibold text-white mb-4">🔄 System Status</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Data Sources */}
             <div className="space-y-2">
               <div className="text-sm font-medium text-gray-300">Data Sources</div>
               <div className="space-y-1">
                 <div className="flex items-center justify-between text-xs">
                   <span>Supabase:</span>
                   <span className={claimableData?.syncMetadata?.supabaseAvailable ? 'text-green-400' : 'text-red-400'}>
                     {claimableData?.syncMetadata?.supabaseAvailable ? '✅ Active' : '❌ Unavailable'}
                   </span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span>Contract:</span>
                   <span className={contractSyncStatus === 'verified' ? 'text-green-400' : 'text-yellow-400'}>
                     {contractSyncStatus === 'verified' ? '✅ Synced' : 
                      contractSyncStatus === 'error' ? '❌ Error' : '⏳ Pending'}
                   </span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span>Retry Service:</span>
                   <span className="text-green-400">
                     ✅ Active ({badgeRetryService.getServiceStats().totalBadgesTracked} tracked)
                   </span>
                 </div>
               </div>
             </div>

             {/* Queue Status */}
             <div className="space-y-2">
               <div className="text-sm font-medium text-gray-300">Retry Queue</div>
               <div className="space-y-1">
                 <div className="flex items-center justify-between text-xs">
                   <span>In Queue:</span>
                   <span className="text-blue-400">
                     {queueMetadata?.totalInQueue || 0} badges
                   </span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span>Processing:</span>
                   <span className={queueMetadata?.isProcessing ? 'text-green-400' : 'text-gray-400'}>
                     {queueMetadata?.isProcessing ? '🔄 Yes' : '⏸️ No'}
                   </span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span>Avg Time:</span>
                   <span className="text-gray-400">
                     {queueMetadata?.avgProcessingTime || '30s'}
                   </span>
                 </div>
               </div>
             </div>

             {/* Badge Counts */}
             <div className="space-y-2">
               <div className="text-sm font-medium text-gray-300">Badge Counts</div>
               <div className="space-y-1">
                 <div className="flex items-center justify-between text-xs">
                   <span>Claimable:</span>
                   <span className="text-green-400">
                     {claimableData?.claimable?.length || 0}
                   </span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span>Failed:</span>
                   <span className="text-red-400">
                     {badgeStatus?.failed?.length || 0}
                   </span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                   <span>Pending:</span>
                   <span className="text-yellow-400">
                     {pendingData?.pending?.length || 0}
                   </span>
                 </div>
               </div>
             </div>
           </div>

           {/* Sync Quality Indicators */}
           {claimableData?.syncMetadata && (
             <div className="mt-4 pt-4 border-t border-gray-700">
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <span>
                   Last Sync: {getTimeSince(claimableData.syncMetadata.lastSyncAt)}
                 </span>
                 <span>
                   Highest Tier: {claimableData.syncMetadata.highestTierAvailable}
                 </span>
                 <span>
                   Quality: {errors.length === 0 ? '🟢 High' : errors.length <= 2 ? '🟡 Medium' : '🔴 Low'}
                 </span>
               </div>
             </div>
           )}
         </div>
       )}

      {/* Claimable Badges */}
      {claimableData?.claimable?.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              🎁 Ready to Claim ({claimableData.claimable.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              These badges are ready to be minted to your wallet
            </p>
            {claimableData.syncMetadata && (
              <div className="text-xs text-gray-500 mt-2">
                Highest Available: {claimableData.syncMetadata.highestTierAvailable} • 
                Last Sync: {getTimeSince(claimableData.syncMetadata.lastSyncAt)}
              </div>
            )}
          </div>
          
          <div className="divide-y divide-gray-700">
            {claimableData.claimable.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              return (
                <div key={badge.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`text-3xl ${getTierGlow(badge.tier)} rounded-lg p-2`}>
                      {badgeType.emoji}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-lg ${badgeType.color}`}>
                        {badgeType.name} Badge
                      </div>
                      <div className="text-sm text-gray-400">
                        {badge.xpEarned} XP earned • {getTimeSince(badge.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Run: {badge.runId} • Season {badge.season}
                        {badge.requiresProof && (
                          <span className="ml-2 text-purple-400">🔐 ZK Proof Required</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Source: {badge.dataSource} • Score: {badge.eligibilityScore}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => claimBadge(badge)}
                      disabled={claiming[badge.id]}
                      className={`px-6 py-3 rounded-lg text-white font-medium transition-all ${
                        claiming[badge.id]
                          ? 'bg-green-500/50 cursor-not-allowed'
                          : `bg-green-500 hover:bg-green-600 ${getTierGlow(badge.tier)}`
                      }`}
                    >
                      {claiming[badge.id] ? 'Claiming...' : 'Claim Badge'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Badges with Retry Analysis */}
      {badgeStatus?.failed?.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-red-500/30">
            <h2 className="text-xl font-semibold text-white">
              ⚠️ Failed Claims ({badgeStatus.failed.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              These badges failed to mint but can be retried
            </p>
          </div>
          
          <div className="divide-y divide-red-500/30">
            {badgeStatus.failed.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              const canRetry = (badge.retryCount || 0) < 5;
              const analysis = retryAnalysis[badge.id];
              
              return (
                <div key={badge.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`text-3xl opacity-60`}>
                        {badgeType.emoji}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold text-lg ${badgeType.color} opacity-80`}>
                          {badgeType.name} Badge
                        </div>
                        <div className="text-sm text-gray-400">
                          {badge.xpEarned} XP earned • {getTimeSince(badge.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Run: {badge.runId} • Season {badge.season} • 
                          Retries: {badge.retryCount || 0}/5
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {canRetry ? (
                        <button
                          onClick={() => retryBadgeClaim(badge)}
                          disabled={retrying[badge.id]}
                          className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-black px-4 py-2 rounded text-sm transition-colors"
                        >
                          {retrying[badge.id] ? 'Retrying...' : 'Retry Claim'}
                        </button>
                      ) : (
                        <div className="bg-red-600/30 text-red-300 px-4 py-2 rounded text-sm">
                          Max Retries
                        </div>
                      )}
                    </div>
                  </div>
                  
                                     <div className="bg-red-900/50 rounded p-3 space-y-2">
                     <div className="text-sm text-red-400">
                       <strong>Error:</strong> {badge.failureReason || 'Unknown error'}
                     </div>
                     
                     {badge.errorClassification && (
                       <div className="text-xs text-orange-400">
                         Type: {badge.errorClassification} • 
                         Risk: {badge.riskAssessment || 'Unknown'}
                       </div>
                     )}
                     
                     {analysis && (
                       <div className="text-xs text-gray-400 space-y-1">
                         <div className="grid grid-cols-2 gap-2">
                           <div>Next retry: {analysis.nextRetryAt ? getTimeSince(analysis.nextRetryAt) : 'Now'}</div>
                           <div>Success chance: {analysis.successProbability ? `${Math.round(analysis.successProbability * 100)}%` : 'Unknown'}</div>
                         </div>
                         {analysis.queuePosition && (
                           <div>Queue position: {analysis.queuePosition}</div>
                         )}
                         {analysis.estimatedWaitTime && (
                           <div>Estimated wait: {analysis.estimatedWaitTime}</div>
                         )}
                         {analysis.improvementTrend && (
                           <div className={`font-medium ${
                             analysis.improvementTrend === 'improving' ? 'text-green-400' :
                             analysis.improvementTrend === 'degrading' ? 'text-red-400' : 'text-yellow-400'
                           }`}>
                             Trend: {analysis.improvementTrend}
                           </div>
                         )}
                       </div>
                     )}
                     
                     {analysis?.recommendedActions?.length > 0 && (
                       <div className="text-xs">
                         <div className="text-blue-300 font-medium mb-1">Recommended Actions:</div>
                         <div className="space-y-1">
                           {analysis.recommendedActions.map((action, index) => (
                             <div key={index} className={`${
                               action.priority === 'high' ? 'text-red-300' :
                               action.priority === 'medium' ? 'text-yellow-300' : 'text-gray-300'
                             }`}>
                               • {action.action}
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Badges */}
      {pendingData?.pending?.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-blue-500/30">
            <h2 className="text-xl font-semibold text-white">
              ⏳ Processing Queue ({pendingData.pending.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              These badges are currently being processed
            </p>
          </div>
          
          <div className="divide-y divide-blue-500/30">
            {pendingData.pending.map(badge => {
              const badgeType = getBadgeType(badge.tokenId);
              
              return (
                <div key={badge.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="text-3xl animate-pulse">
                      {badgeType.emoji}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-lg ${badgeType.color}`}>
                        {badgeType.name} Badge
                      </div>
                      <div className="text-sm text-gray-400">
                        {badge.xpEarned} XP earned • Queue #{badge.queuePosition || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Run: {badge.runId} • Retry: {badge.retryCount || 0}/5
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-blue-400">
                      {badge.estimatedWaitTime || 'Processing...'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Status: {badge.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Badges State */}
      {!loading && 
       (!claimableData?.claimable?.length) && 
       (!badgeStatus?.failed?.length) && 
       (!pendingData?.pending?.length) && (
        <div className="bg-gray-800/50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-xl font-semibold text-white mb-2">No Badges Available</h2>
          <p className="text-gray-400">
            Complete runs to earn XP and unlock claimable badges!
          </p>
          {lastSyncAt && (
            <p className="text-xs text-gray-500 mt-2">
              Last sync: {getTimeSince(lastSyncAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaimPanel;