import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import { apiFetch } from '../services/useApiService';
import xpVerificationService from '../services/xpVerificationService';
import analyticsManager from '../services/analyticsProviders';
import BadgeClaimStates from './BadgeClaimStates';
import { CLAIM_STATES } from './BadgeClaimStates';
import ExponentialBackoff from '../utils/exponentialBackoff';

const BadgeClaimStatusV3 = ({ badge, runId, onClaimComplete }) => {
  // Core state
  const { address, isConnected, showConnectModal } = useWallet();
  const { contracts, isReady: contractsReady } = useContracts();
  const [badgeStatus, setBadgeStatus] = useState(null);
  const [claimState, setClaimState] = useState(CLAIM_STATES.IDLE);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Analytics session
  const sessionId = useRef(null);
  const proofGenerationStart = useRef(null);
  const claimProcessStart = useRef(null);
  
  // Polling and retry management
  const pollingInterval = useRef(null);
  const backoffStrategy = useRef(new ExponentialBackoff());
  const maxRetries = 3;

  // Initialize analytics on mount
  useEffect(() => {
    // Initialize session when component mounts
    if (badgeStatus?.status === 'eligible') {
      sessionId.current = `claim_${runId}_${Date.now()}`;
      analyticsManager.trackBadgeClaimStep('claim_started', {
        sessionId: sessionId.current,
        runId,
        badgeType: badge.name,
        tokenId: badge.id,
        userId: address
      });
    }
  }, [badgeStatus, runId, badge, address]);

  // Check badge status
  const checkBadgeStatus = useCallback(async () => {
    if (!address || !runId) return;

    try {
      const response = await apiFetch(`/api/badges/check/${address}?runId=${runId}`);
      if (response.ok) {
        const data = await response.json();
        setBadgeStatus(data);
        
        // Track status check
        analyticsManager.trackEvent('badge_status_checked', {
          status: data.status,
          runId,
          sessionId: sessionId.current
        });
      }
    } catch (err) {
      console.error('Error checking badge status:', err);
    }
  }, [address, runId]);

  // Enhanced proof generation with analytics
  const generateZKProof = useCallback(async () => {
    if (!badgeStatus || badgeStatus.status !== 'eligible') {
      throw new Error('Not eligible for badge claim');
    }

    proofGenerationStart.current = Date.now();
    
    try {
      // Track proof generation start
      analyticsManager.trackBadgeClaimStep('generating_proof', {
        sessionId: sessionId.current,
        runId,
        xpAmount: badgeStatus.xpEarned,
        cacheStatus: 'checking'
      });

      const proofData = await xpVerificationService.generateXPProof(
        address,
        badgeStatus.xpEarned,
        badgeStatus.runId
      );

      const generationTime = Date.now() - proofGenerationStart.current;
      
      // Track successful generation
      analyticsManager.trackBadgeClaimStep('generating_proof', {
        sessionId: sessionId.current,
        success: true,
        duration: generationTime,
        cached: generationTime < 100, // If < 100ms, likely cached
        proofSize: JSON.stringify(proofData).length
      });

      return proofData;
    } catch (error) {
      const generationTime = Date.now() - proofGenerationStart.current;
      
      // Track generation failure
      analyticsManager.trackBadgeClaimStep('generating_proof', {
        sessionId: sessionId.current,
        success: false,
        duration: generationTime,
        error: error.message,
        errorCode: error.code
      });
      
      throw error;
    }
  }, [badgeStatus, address]);

  // Enhanced proof submission with analytics
  const submitProofToContract = useCallback(async (proofData) => {
    const submissionStart = Date.now();
    
    try {
      // Track submission start
      analyticsManager.trackBadgeClaimStep('submitting_proof', {
        sessionId: sessionId.current,
        runId,
        contractAddress: contracts?.xpVerifier?.address
      });

      const txHash = await xpVerificationService.submitXPProof(contracts, proofData);
      
      const submissionTime = Date.now() - submissionStart;
      
      // Track successful submission
      analyticsManager.trackBadgeClaimStep('submitting_proof', {
        sessionId: sessionId.current,
        success: true,
        duration: submissionTime,
        txHash,
        gasUsed: 'pending' // Will be updated after receipt
      });

      return txHash;
    } catch (error) {
      const submissionTime = Date.now() - submissionStart;
      
      // Track submission failure
      analyticsManager.trackBadgeClaimStep('submitting_proof', {
        sessionId: sessionId.current,
        success: false,
        duration: submissionTime,
        error: error.message,
        errorCode: error.code || 'CONTRACT_ERROR'
      });
      
      throw error;
    }
  }, [contracts]);

  // Enhanced claim process with analytics
  const claimBadge = useCallback(async () => {
    if (!address || !contracts || !contractsReady) {
      setError('Please connect your wallet');
      return;
    }

    setClaimState(CLAIM_STATES.VERIFYING);
    setError(null);
    claimProcessStart.current = Date.now();

    try {
      // Step 1: Verify eligibility
      analyticsManager.trackBadgeClaimStep('verifying', {
        sessionId: sessionId.current,
        runId
      });
      
      setClaimState(CLAIM_STATES.GENERATING_PROOF);
      
      // Step 2: Generate ZK proof (with caching)
      const proofData = await generateZKProof();
      
      setClaimState(CLAIM_STATES.SUBMITTING_PROOF);
      
      // Step 3: Submit proof to contract
      const txHash = await submitProofToContract(proofData);
      
      setClaimState(CLAIM_STATES.CLAIMING);
      
      // Step 4: Claim badge from backend
      analyticsManager.trackBadgeClaimStep('claiming', {
        sessionId: sessionId.current,
        runId,
        proofVerificationTx: txHash
      });
      
      const claimResponse = await apiFetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          runId: badgeStatus.runId,
          zkProof: {
            nullifier: proofData.nullifier,
            commitment: proofData.commitment,
            verificationTxHash: txHash
          }
        })
      });

      if (!claimResponse.ok) {
        const errorData = await claimResponse.json();
        throw new Error(errorData.error || 'Claim failed');
      }

      const result = await claimResponse.json();
      
      // Success!
      setClaimState(CLAIM_STATES.SUCCESS);
      
      const totalDuration = Date.now() - claimProcessStart.current;
      
      // Track successful claim
      analyticsManager.trackBadgeClaimStep('success', {
        sessionId: sessionId.current,
        runId,
        badgeType: badge.name,
        tokenId: badge.id,
        txHash: result.txHash,
        duration: totalDuration,
        retryCount
      });
      
      // Update badge status
      setBadgeStatus({ ...badgeStatus, status: 'claimed', txHash: result.txHash });
      
      if (onClaimComplete) {
        onClaimComplete(result);
      }
      
    } catch (err) {
      console.error('Claim error:', err);
      setError(err.message || 'Claim failed. Please try again.');
      setClaimState(CLAIM_STATES.ERROR);
      
      const totalDuration = Date.now() - claimProcessStart.current;
      
      // Track error
      analyticsManager.trackBadgeClaimStep('error', {
        sessionId: sessionId.current,
        runId,
        error: err.message,
        errorCode: err.code,
        duration: totalDuration,
        retryCount,
        lastState: claimState
      });
      
      // Track drop-off if user doesn't retry
      setTimeout(() => {
        if (claimState === CLAIM_STATES.ERROR && retryCount === 0) {
          analyticsManager.trackBadgeClaimStep('drop_off', {
            sessionId: sessionId.current,
            runId,
            reason: 'error_no_retry',
            error: err.message
          });
        }
      }, 30000); // 30 seconds
    }
  }, [address, contracts, contractsReady, badgeStatus, generateZKProof, submitProofToContract, onClaimComplete, badge, retryCount, claimState]);

  // Enhanced retry with analytics
  const handleRetry = useCallback(async () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // Track retry
    analyticsManager.trackRetry({
      sessionId: sessionId.current,
      attemptNumber: newRetryCount,
      reason: error,
      previousError: error,
      timeSinceLastAttempt: Date.now() - claimProcessStart.current,
      runId
    });
    
    // Apply backoff delay
    const delay = backoffStrategy.current.nextDelay();
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await claimBadge();
  }, [retryCount, error, claimBadge]);

  // Automatic retry for specific errors
  useEffect(() => {
    if (claimState === CLAIM_STATES.ERROR && retryCount < maxRetries) {
      const isRetryableError = error && (
        error.includes('network') ||
        error.includes('timeout') ||
        error.includes('gas')
      );
      
      if (isRetryableError) {
        console.log(`Auto-retrying after error: ${error}`);
        handleRetry();
      }
    }
  }, [claimState, error, retryCount, handleRetry]);

  // Polling for status updates
  useEffect(() => {
    if (address && runId) {
      checkBadgeStatus();
      
      // Poll for updates
      pollingInterval.current = setInterval(checkBadgeStatus, 10000);
      
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [address, runId, checkBadgeStatus]);

  // Track wallet connection
  const handleConnectWallet = useCallback(() => {
    analyticsManager.trackEvent('wallet_connect_initiated', {
      sessionId: sessionId.current,
      fromBadgeClaim: true,
      runId
    });
    
    showConnectModal();
  }, [showConnectModal]);

  // Get cache statistics for debugging
  useEffect(() => {
    const logCacheStats = async () => {
      const stats = await xpVerificationService.getCacheStats();
      console.log('📊 Cache Statistics:', stats);
    };
    
    // Log stats every minute in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(logCacheStats, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <BadgeClaimStates
      state={claimState}
      badge={badge}
      error={error}
      retryCount={retryCount}
      maxRetries={maxRetries}
      onClaim={isConnected ? claimBadge : handleConnectWallet}
      onRetry={handleRetry}
      badgeStatus={badgeStatus}
      isConnected={isConnected}
      contractsReady={contractsReady}
    />
  );
};

export default BadgeClaimStatusV3;