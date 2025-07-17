import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/mobile-fixes.css';

const ZKErrorToast = ({ 
  error, 
  onClose, 
  duration = 5000,
  position = 'top-right' 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const getErrorConfig = (errorType) => {
    switch (errorType) {
      case 'invalid_proof':
        return {
          icon: '❌',
          title: 'Invalid Proof',
          message: 'Invalid proof. Please try again.',
          bgColor: 'bg-red-900',
          borderColor: 'border-red-500',
          textColor: 'text-red-100',
          iconBg: 'bg-red-800'
        };
      case 'nullifier_reused':
        return {
          icon: '🚫',
          title: 'Claim Already Used',
          message: 'Claim already used.',
          bgColor: 'bg-orange-900',
          borderColor: 'border-orange-500',
          textColor: 'text-orange-100',
          iconBg: 'bg-orange-800'
        };
      case 'not_eligible':
        return {
          icon: '⚠️',
          title: 'Not Eligible',
          message: 'You haven\'t earned this badge yet.',
          bgColor: 'bg-yellow-900',
          borderColor: 'border-yellow-500',
          textColor: 'text-yellow-100',
          iconBg: 'bg-yellow-800'
        };
      case 'network_error':
        return {
          icon: '🌐',
          title: 'Network Error',
          message: 'Connection failed. Please check your network.',
          bgColor: 'bg-gray-900',
          borderColor: 'border-gray-500',
          textColor: 'text-gray-100',
          iconBg: 'bg-gray-800'
        };
      case 'insufficient_gas':
        return {
          icon: '⛽',
          title: 'Insufficient Gas',
          message: 'Not enough gas for transaction.',
          bgColor: 'bg-purple-900',
          borderColor: 'border-purple-500',
          textColor: 'text-purple-100',
          iconBg: 'bg-purple-800'
        };
      case 'proof_timeout':
        return {
          icon: '⏱️',
          title: 'Proof Timeout',
          message: 'Proof generation timed out. Try again.',
          bgColor: 'bg-blue-900',
          borderColor: 'border-blue-500',
          textColor: 'text-blue-100',
          iconBg: 'bg-blue-800'
        };
      default:
        return {
          icon: '❗',
          title: 'Verification Error',
          message: error?.message || 'An error occurred during verification.',
          bgColor: 'bg-red-900',
          borderColor: 'border-red-500',
          textColor: 'text-red-100',
          iconBg: 'bg-red-800'
        };
    }
  };

  const getPositionClasses = (position) => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const config = getErrorConfig(error?.type);

  const toastVariants = {
    initial: {
      opacity: 0,
      x: position.includes('right') ? 300 : position.includes('left') ? -300 : 0,
      y: position.includes('top') ? -50 : position.includes('bottom') ? 50 : 0,
      scale: 0.9
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      x: position.includes('right') ? 300 : position.includes('left') ? -300 : 0,
      scale: 0.9,
      transition: {
        duration: 0.3
      }
    }
  };

  const iconVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 20,
        delay: 0.2
      }
    }
  };

  const progressVariants = {
    initial: { width: '100%' },
    animate: { 
      width: '0%',
      transition: {
        duration: duration / 1000,
        ease: 'linear'
      }
    }
  };

  if (!error) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed z-50 ${getPositionClasses(position)} max-w-sm w-full`}
          variants={toastVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className={`
            ${config.bgColor} ${config.borderColor} ${config.textColor}
            border-2 rounded-lg shadow-2xl backdrop-blur-sm bg-opacity-95
            overflow-hidden
          `}>
            {/* Progress Bar */}
            {duration > 0 && (
              <div className="h-1 bg-white bg-opacity-20">
                <motion.div
                  className="h-full bg-white bg-opacity-60"
                  variants={progressVariants}
                  initial="initial"
                  animate="animate"
                />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start space-x-3">
                {/* Animated Icon */}
                <motion.div
                  className={`
                    ${config.iconBg} rounded-full p-2 flex-shrink-0
                    shadow-lg
                  `}
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                >
                  <span className="text-lg">{config.icon}</span>
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-sm font-medium">{config.title}</h3>
                    <p className="text-xs opacity-90 mt-1">{config.message}</p>
                    
                    {/* Additional Error Details */}
                    {error?.details && (
                      <div className="mt-2 text-xs opacity-75">
                        <details className="cursor-pointer">
                          <summary className="hover:opacity-100">View Details</summary>
                          <div className="mt-1 font-mono text-xs bg-black bg-opacity-30 rounded p-2">
                            {typeof error.details === 'string' 
                              ? error.details 
                              : JSON.stringify(error.details, null, 2)
                            }
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {error?.actions && (
                      <div className="mt-3 flex space-x-2">
                        {error.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              action.handler();
                              if (action.closeToast) handleClose();
                            }}
                            className="mobile-button-sm bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-200 rounded-md mobile-focus"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Close Button */}
                <motion.button
                  onClick={handleClose}
                  className="mobile-icon-button text-white text-opacity-60 hover:text-opacity-100 transition-colors duration-200 mobile-focus"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast Manager Hook
export const useZKToasts = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (error) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...error, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showInvalidProof = (details) => {
    addToast({
      type: 'invalid_proof',
      details,
      actions: [
        {
          label: 'Try Again',
          handler: () => window.location.reload(),
          closeToast: true
        }
      ]
    });
  };

  const showNullifierReused = (nullifier) => {
    addToast({
      type: 'nullifier_reused',
      details: `Nullifier: ${nullifier}`,
      actions: [
        {
          label: 'View Claims',
          handler: () => console.log('Navigate to claims history'),
          closeToast: false
        }
      ]
    });
  };

  const showNotEligible = (requiredXP, currentXP) => {
    addToast({
      type: 'not_eligible',
      details: `Required: ${requiredXP} XP, Current: ${currentXP} XP`,
      actions: [
        {
          label: 'Play More',
          handler: () => console.log('Navigate to game'),
          closeToast: true
        }
      ]
    });
  };

  const showNetworkError = (error) => {
    addToast({
      type: 'network_error',
      details: error?.message || 'Network connection failed',
      actions: [
        {
          label: 'Retry',
          handler: () => window.location.reload(),
          closeToast: true
        }
      ]
    });
  };

  const showInsufficientGas = (estimatedGas, currentGas) => {
    addToast({
      type: 'insufficient_gas',
      details: `Estimated: ${estimatedGas}, Available: ${currentGas}`,
      actions: [
        {
          label: 'Get Gas',
          handler: () => window.open('https://faucet.testnet.abs.xyz', '_blank'),
          closeToast: false
        }
      ]
    });
  };

  const showProofTimeout = () => {
    addToast({
      type: 'proof_timeout',
      actions: [
        {
          label: 'Retry',
          handler: () => console.log('Retry proof generation'),
          closeToast: true
        }
      ]
    });
  };

  const ToastContainer = ({ position = 'top-right' }) => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast) => (
        <ZKErrorToast
          key={toast.id}
          error={toast}
          onClose={() => removeToast(toast.id)}
          position={position}
        />
      ))}
    </div>
  );

  return {
    toasts,
    addToast,
    removeToast,
    showInvalidProof,
    showNullifierReused,
    showNotEligible,
    showNetworkError,
    showInsufficientGas,
    showProofTimeout,
    ToastContainer
  };
};

export default ZKErrorToast;