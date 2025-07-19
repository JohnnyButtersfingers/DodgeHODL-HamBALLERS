/**
 * Analytics Configuration
 * Configure Helika and zkMe analytics providers
 */

export const analyticsConfig = {
  // Helika configuration
  helika: {
    apiKey: process.env.VITE_HELIKA_API_KEY || '',
    gameId: process.env.VITE_HELIKA_GAME_ID || 'hamballer-testnet',
    endpoint: process.env.VITE_HELIKA_ENDPOINT || 'https://api.helika.io/v1',
    enabled: process.env.VITE_HELIKA_ENABLED === 'true'
  },
  
  // zkMe configuration
  zkMe: {
    appId: process.env.VITE_ZKME_APP_ID || '',
    apiKey: process.env.VITE_ZKME_API_KEY || '',
    endpoint: process.env.VITE_ZKME_ENDPOINT || 'https://api.zk.me/v1',
    enabled: process.env.VITE_ZKME_ENABLED === 'true'
  },
  
  // General settings
  debug: process.env.NODE_ENV === 'development',
  trackingEnabled: process.env.VITE_ANALYTICS_ENABLED !== 'false'
};

// Helper to check if analytics is properly configured
export const isAnalyticsConfigured = () => {
  const { helika, zkMe } = analyticsConfig;
  return (helika.enabled && helika.apiKey) || (zkMe.enabled && zkMe.apiKey);
};

// Get active providers
export const getActiveProviders = () => {
  const providers = [];
  if (analyticsConfig.helika.enabled && analyticsConfig.helika.apiKey) {
    providers.push('helika');
  }
  if (analyticsConfig.zkMe.enabled && analyticsConfig.zkMe.apiKey) {
    providers.push('zkMe');
  }
  return providers;
};

export default analyticsConfig;