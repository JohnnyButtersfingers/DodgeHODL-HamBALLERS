import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Wallet, Zap } from 'lucide-react';

export const BadgeClaimStates = ({
  state,
  badge,
  badgeStatus,
  error,
  retryCount,
  isMobile,
  onConnect,
  onClaim,
  onRetry,
  prefersReducedMotion
}) => {
  // Mobile-optimized button styles with 44px minimum touch target
  const buttonBaseStyles = `
    min-h-[44px] px-6 py-3 rounded-lg font-semibold 
    transition-all duration-200 transform
    active:scale-95 disabled:active:scale-100
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
    text-base md:text-sm
  `;

  const primaryButtonStyles = `
    ${buttonBaseStyles}
    bg-gradient-to-r ${badge.gradient}
    text-white shadow-lg ${badge.shadowColor}
    hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
    focus:ring-${badge.name.toLowerCase()}-500
  `;

  const secondaryButtonStyles = `
    ${buttonBaseStyles}
    bg-gray-800 border-2 border-gray-700
    text-gray-300 hover:bg-gray-700 hover:border-gray-600
    focus:ring-gray-500
  `;

  const errorButtonStyles = `
    ${buttonBaseStyles}
    bg-red-900/20 border-2 border-red-500
    text-red-400 hover:bg-red-900/30
    focus:ring-red-500
  `;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: prefersReducedMotion ? 0 : 0.3 }
    }
  };

  const iconVariants = {
    initial: { rotate: 0 },
    animate: { 
      rotate: 360,
      transition: { 
        duration: 2,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  // Error-first UI: Display errors prominently
  if (state === 'error' && error) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-red-900/20 border-2 border-red-500 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-red-400 mb-1">
              Claim Failed
            </h3>
            <p className="text-sm text-gray-300 break-words">
              {error}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Retry attempt {retryCount} of 3
              </p>
            )}
          </div>
          {retryCount < 3 && (
            <button
              onClick={onRetry}
              className={errorButtonStyles}
              aria-label="Retry badge claim"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Retry
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // State-based rendering
  switch (state) {
    case 'idle':
      if (!badgeStatus || badgeStatus.status !== 'eligible') return null;
      
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`
            bg-gradient-to-br ${badge.gradient} bg-opacity-10
            border-2 border-opacity-30 border-white
            rounded-xl p-6 backdrop-blur-sm
            ${!prefersReducedMotion && 'hover:scale-[1.02] transition-transform'}
          `}
        >
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span className="text-5xl">{badge.emoji}</span>
                <h3 className="text-2xl font-bold text-white">
                  {badge.name} Badge Available!
                </h3>
              </div>
              <p className="text-gray-300">
                {badgeStatus.xpEarned} XP earned • {badge.xpRange}
              </p>
            </div>
            <button
              onClick={onClaim}
              className={primaryButtonStyles}
              aria-label={`Claim ${badge.name} badge`}
            >
              <Zap className="w-4 h-4 mr-2 inline" />
              Claim Badge
            </button>
          </div>
        </motion.div>
      );

    case 'connecting':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-gray-800/50 border-2 border-gray-700 rounded-xl p-6"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <Wallet className="w-12 h-12 text-blue-400" />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Connecting Wallet...
            </h3>
            <p className="text-gray-400 text-sm">
              Please approve the connection in your wallet
            </p>
          </div>
        </motion.div>
      );

    case 'verifying':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`bg-gradient-to-br ${badge.gradient} bg-opacity-10 border-2 border-opacity-30 border-white rounded-xl p-6`}
        >
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 blur-xl"
              />
              <span className="text-6xl relative z-10">{badge.emoji}</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Verifying Eligibility...
            </h3>
            <div className="flex justify-center items-center gap-2 text-gray-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Checking blockchain data</span>
            </div>
          </div>
        </motion.div>
      );

    case 'generating_proof':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`bg-gradient-to-br ${badge.gradient} bg-opacity-10 border-2 border-opacity-30 border-white rounded-xl p-6`}
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                rotate: [0, 180, 360],
                scale: [1, 0.9, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-4"
            >
              <div className="relative">
                <span className="text-6xl">{badge.emoji}</span>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-dashed border-white/30 animate-spin-slow" />
                </div>
              </div>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Generating ZK Proof...
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Creating cryptographic proof of your {badgeStatus?.xpEarned} XP
              </p>
              <div className="flex justify-center items-center gap-2 text-blue-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">Privacy preserved</span>
              </div>
            </div>
          </div>
        </motion.div>
      );

    case 'submitting_proof':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`bg-gradient-to-br ${badge.gradient} bg-opacity-15 border-2 border-opacity-40 border-white rounded-xl p-6`}
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-4"
            >
              <span className="text-6xl">{badge.emoji}</span>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Verifying Proof On-Chain...
            </h3>
            <div className="space-y-3">
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">ZK Proof</p>
                <p className="text-sm text-green-400 font-mono truncate">
                  {badgeStatus?.zkProof?.nullifier ? `0x${badgeStatus.zkProof.nullifier.slice(0, 8)}...${badgeStatus.zkProof.nullifier.slice(-6)}` : 'Generating...'}
                </p>
              </div>
              <div className="flex justify-center items-center gap-2 text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Submitting to XPVerifier contract</span>
              </div>
            </div>
          </div>
        </motion.div>
      );

    case 'claiming':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`bg-gradient-to-br ${badge.gradient} bg-opacity-20 border-2 border-opacity-50 border-white rounded-xl p-6`}
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-4"
            >
              <span className="text-6xl">{badge.emoji}</span>
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Claiming Your Badge...
            </h3>
            <div className="space-y-3">
              <div className="bg-black/20 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${badge.gradient}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "70%" }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </div>
              <p className="text-sm text-gray-300">
                Minting {badge.name} badge on-chain...
              </p>
            </div>
          </div>
        </motion.div>
      );

    case 'success':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`bg-gradient-to-br ${badge.gradient} bg-opacity-30 border-2 border-opacity-50 border-white rounded-xl p-6`}
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              className="inline-block mb-4"
            >
              <CheckCircle className="w-16 h-16 text-green-400" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Badge Claimed! 🎉
            </h3>
            <p className="text-gray-300 mb-4">
              Your {badge.name} badge has been minted successfully
            </p>
            {badgeStatus?.txHash && (
              <a
                href={`https://etherscan.io/tx/${badgeStatus.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                View transaction →
              </a>
            )}
          </div>
        </motion.div>
      );

    case 'retry':
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-orange-900/20 border-2 border-orange-500 rounded-xl p-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-center md:text-left flex-1">
              <h3 className="text-xl font-semibold text-orange-400 mb-1">
                Previous Claim Failed
              </h3>
              <p className="text-sm text-gray-300">
                {error || 'Your previous claim attempt failed. You can try again.'}
              </p>
              {badgeStatus?.retryCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Attempts: {badgeStatus.retryCount}/5
                </p>
              )}
            </div>
            <button
              onClick={onRetry}
              className={`${buttonBaseStyles} bg-orange-500/20 border-2 border-orange-500 text-orange-400 hover:bg-orange-500/30`}
              disabled={!badgeStatus?.canRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Try Again
            </button>
          </div>
        </motion.div>
      );

    default:
      return null;
  }
};