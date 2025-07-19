import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../services/useApiService';
import { useWallet } from '../contexts/WalletContext';
import { useContracts } from '../hooks/useContracts';
import xpVerificationService from '../services/xpVerificationService';
import { BadgeClaimStates } from './BadgeClaimStates';
import { BadgeConfetti } from './BadgeConfetti';
import { Badge3DReveal } from './Badge3DReveal';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ExponentialBackoff } from '../utils/exponentialBackoff';

// State management for claim process
const CLAIM_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  VERIFYING: 'verifying',
  GENERATING_PROOF: 'generating_proof',
  SUBMITTING_PROOF: 'submitting_proof',
  CLAIMING: 'claiming',
  SUCCESS: 'success',
  ERROR: 'error',
  RETRY: 'retry'
};

// Badge type configuration with enhanced visuals
const BADGE_CONFIG = [
  { 
    id: 0, 
    name: 'Participation', 
    xpRange: '1-24 XP', 
    emoji: '🥾', 
    gradient: 'from-gray-600 to-gray-400',
    shadowColor: 'shadow-gray-500/50',
    glowColor: 'glow-gray-400'
  },
  { 
    id: 1, 
    name: 'Common', 
    xpRange: '25-49 XP', 
    emoji: '🥉', 
    gradient: 'from-bronze-600 to-bronze-400',
    shadowColor: 'shadow-bronze-500/50',
    glowColor: 'glow-bronze-400'
  },
  { 
    id: 2, 
    name: 'Rare', 
    xpRange: '50-74 XP', 
    emoji: '🥈', 
    gradient: 'from-blue-600 to-blue-400',
    shadowColor: 'shadow-blue-500/50',
    glowColor: 'glow-blue-400'
  },
  { 
    id: 3, 
    name: 'Epic', 
    xpRange: '75-99 XP', 
    emoji: '🥇', 
    gradient: 'from-purple-600 to-purple-400',
    shadowColor: 'shadow-purple-500/50',
    glowColor: 'glow-purple-400'
  },
  { 
    id: 4, 
    name: 'Legendary', 
    xpRange: '100+ XP', 
    emoji: '👑', 
    gradient: 'from-yellow-600 to-yellow-400',
    shadowColor: 'shadow-yellow-500/50',
    glowColor: 'glow-yellow-400'
  }
];

const BadgeClaimStatusV2 = ({ runId, onClaimSuccess }) => {
  const { address, isConnected } = useWallet();
  const { contracts } = useContracts();
  const [claimState, setClaimState] = useState(CLAIM_STATES.IDLE);
  const [badgeStatus, setBadgeStatus] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [show3DReveal, setShow3DReveal] = useState(false);
  const [zkProof, setZkProof] = useState(null);
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const backoffRef = useRef(new ExponentialBackoff());
  const checkIntervalRef = useRef(null);

  // Check badge status with error handling
  const checkBadgeStatus = useCallback(async () => {
    if (!address || !isConnected) return;

    try {
      const response = await apiFetch(`/api/badges/check/${address}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check badge status: ${response.status}`);
      }

      const data = await response.json();
      setBadgeStatus(data);
      
      // Auto-transition states based on response
      if (data.status === 'eligible' && claimState === CLAIM_STATES.IDLE) {
        setClaimState(CLAIM_STATES.IDLE);
      } else if (data.status === 'pending') {
        setClaimState(CLAIM_STATES.CLAIMING);
      } else if (data.status === 'failure' && data.canRetry) {
        setClaimState(CLAIM_STATES.RETRY);
        setError(data.error);
      }
      
      return data;
    } catch (err) {
      console.error('Error checking badge status:', err);
      setError(err.message);
      setClaimState(CLAIM_STATES.ERROR);
      throw err;
    }
  }, [address, isConnected, claimState]);

  // Initialize and poll for updates
  useEffect(() => {
    if (address && isConnected) {
      checkBadgeStatus();
      
      // Set up polling for pending states
      checkIntervalRef.current = setInterval(() => {
        if (badgeStatus?.status === 'pending' || claimState === CLAIM_STATES.CLAIMING) {
          checkBadgeStatus();
        }
      }, 3000); // Check every 3 seconds
      
      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
      };
    }
  }, [address, isConnected, runId]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    setClaimState(CLAIM_STATES.CONNECTING);
    try {
      // This would trigger RainbowKit modal
      // Implementation depends on your wallet context
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      setClaimState(CLAIM_STATES.IDLE);
    } catch (err) {
      setError('Failed to connect wallet');
      setClaimState(CLAIM_STATES.ERROR);
    }
  }, []);

  // Generate ZK proof for XP claim
  const generateZKProof = useCallback(async () => {
    if (!badgeStatus || !address) {
      throw new Error('Missing badge status or address');
    }

    setClaimState(CLAIM_STATES.GENERATING_PROOF);
    
    try {
      console.log('🔐 Generating ZK proof for XP claim...');
      
      const proofData = await xpVerificationService.generateXPProof(
        address,
        badgeStatus.xpEarned,
        badgeStatus.runId
      );
      
      setZkProof(proofData);
      console.log('✅ ZK proof generated successfully');
      
      return proofData;
    } catch (err) {
      console.error('Failed to generate ZK proof:', err);
      throw new Error('Failed to generate proof: ' + err.message);
    }
  }, [badgeStatus, address]);

  // Submit ZK proof to XPVerifier contract
  const submitZKProof = useCallback(async (proofData) => {
    if (!contracts?.xpVerifier) {
      throw new Error('XPVerifier contract not available');
    }

    setClaimState(CLAIM_STATES.SUBMITTING_PROOF);
    
    try {
      console.log('📤 Submitting ZK proof to contract...');
      
      // Check if nullifier already used
      const isUsed = await xpVerificationService.isNullifierUsed(
        contracts,
        proofData.nullifier
      );
      
      if (isUsed) {
        throw new Error('This XP claim has already been verified');
      }
      
      const txHash = await xpVerificationService.submitXPProof(
        contracts,
        proofData
      );
      
      console.log('✅ ZK proof verified on-chain:', txHash);
      return txHash;
      
    } catch (err) {
      console.error('Failed to submit ZK proof:', err);
      throw new Error('Proof verification failed: ' + err.message);
    }
  }, [contracts]);

  // Claim badge with ZK proof verification
  const handleClaim = useCallback(async () => {
    if (!badgeStatus || badgeStatus.status !== 'eligible') return;

    setClaimState(CLAIM_STATES.VERIFYING);
    setError(null);

    try {
      // Step 1: Generate ZK proof
      const proofData = await generateZKProof();
      
      // Step 2: Submit proof to XPVerifier contract
      const verificationTxHash = await submitZKProof(proofData);
      
      // Step 3: Claim badge with verified proof
      setClaimState(CLAIM_STATES.CLAIMING);
      
      const response = await apiFetch('/api/badges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerAddress: address,
          runId: badgeStatus.runId,
          zkProof: {
            nullifier: proofData.nullifier,
            commitment: proofData.commitment,
            verificationTxHash
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim badge');
      }

      const result = await response.json();
      
      // Success! Show celebrations
      setClaimState(CLAIM_STATES.SUCCESS);
      setShowConfetti(true);
      setTimeout(() => setShow3DReveal(true), 500);
      
      if (onClaimSuccess) {
        onClaimSuccess({
          ...result,
          verificationTxHash,
          zkProof: proofData
        });
      }
      
      // Reset confetti after animation
      setTimeout(() => setShowConfetti(false), 5000);
      
    } catch (err) {
      console.error('Error claiming badge:', err);
      setError(err.message);
      setClaimState(CLAIM_STATES.ERROR);
      
      // Automatic retry logic for network errors
      if (retryCount < 3 && err.message.includes('network')) {
        const delay = backoffRef.current.nextDelay();
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleClaim();
        }, delay);
      }
    }
  }, [badgeStatus, address, retryCount, onClaimSuccess, generateZKProof, submitZKProof]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    backoffRef.current.reset();
    setClaimState(CLAIM_STATES.IDLE);
    setError(null);
    setZkProof(null);
    checkBadgeStatus().then(() => {
      if (badgeStatus?.status === 'failure' && badgeStatus.canRetry) {
        handleClaim();
      }
    });
  }, [badgeStatus, checkBadgeStatus, handleClaim]);

  // Don't render if not eligible
  if (!badgeStatus || badgeStatus.status === 'not_eligible') {
    return null;
  }

  const badge = badgeStatus.tokenId !== undefined ? BADGE_CONFIG[badgeStatus.tokenId] : BADGE_CONFIG[0];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={claimState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="relative mt-6"
        >
          <BadgeClaimStates
            state={claimState}
            badge={badge}
            badgeStatus={badgeStatus}
            error={error}
            retryCount={retryCount}
            isMobile={isMobile}
            zkProof={zkProof}
            onConnect={handleConnect}
            onClaim={handleClaim}
            onRetry={handleRetry}
            prefersReducedMotion={prefersReducedMotion}
          />
        </motion.div>
      </AnimatePresence>

      {/* Success animations */}
      {showConfetti && !prefersReducedMotion && (
        <BadgeConfetti badge={badge} />
      )}
      
      {show3DReveal && claimState === CLAIM_STATES.SUCCESS && (
        <Badge3DReveal 
          badge={badge} 
          badgeStatus={badgeStatus}
          zkProof={zkProof}
          onClose={() => setShow3DReveal(false)}
          prefersReducedMotion={prefersReducedMotion}
        />
      )}
    </>
  );
};

export default BadgeClaimStatusV2;