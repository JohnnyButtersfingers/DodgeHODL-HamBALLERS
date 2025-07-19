import { useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import analyticsManager from '../services/analyticsProviders';
import analyticsConfig, { isAnalyticsConfigured } from '../config/analytics';

/**
 * Hook to initialize and manage analytics
 */
export const useAnalytics = () => {
  const { address } = useWallet();

  // Initialize analytics on mount
  useEffect(() => {
    if (isAnalyticsConfigured() && analyticsConfig.trackingEnabled) {
      console.log('🔧 Initializing analytics providers...');
      
      analyticsManager.initialize({
        helika: analyticsConfig.helika,
        zkMe: analyticsConfig.zkMe,
        userId: address || 'anonymous'
      });

      // Track app launch
      analyticsManager.trackEvent('app_launch', {
        platform: 'web',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        network: import.meta.env.VITE_CHAIN_NAME || 'abstract-testnet'
      });
    }
  }, []);

  // Update user ID when wallet connects
  useEffect(() => {
    if (address && isAnalyticsConfigured()) {
      analyticsManager.identifyUser(address, {
        walletType: 'metamask', // Could be detected dynamically
        network: import.meta.env.VITE_CHAIN_NAME || 'abstract-testnet'
      });
    }
  }, [address]);

  // Return analytics manager for direct use
  return {
    trackEvent: analyticsManager.trackEvent.bind(analyticsManager),
    trackBadgeClaimStep: analyticsManager.trackBadgeClaimStep.bind(analyticsManager),
    trackRetry: analyticsManager.trackRetry.bind(analyticsManager),
    trackGasUsed: analyticsManager.trackGasUsed.bind(analyticsManager),
    analyticsManager
  };
};

export default useAnalytics;