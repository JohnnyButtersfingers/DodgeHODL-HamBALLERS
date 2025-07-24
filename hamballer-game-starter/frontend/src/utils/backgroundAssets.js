/**
 * Background Asset Utilities
 * 
 * This module provides utilities for handling background asset loading,
 * WebP format detection, and proper fallbacks for the HamBaller.xyz interface.
 */

/**
 * Asset paths configuration
 */
export const BACKGROUND_ASSETS = {
  game: {
    webp: '/assets/backgrounds/game-background.webp',
    fallback: '/assets/backgrounds/game-background.png'
  },
  landing: {
    webp: '/assets/backgrounds/landing-background.webp',
    fallback: '/assets/backgrounds/landing-background.png'
  },
  dashboard: {
    webp: '/assets/backgrounds/dashboard-background.webp',
    fallback: '/assets/backgrounds/dashboard-background.png'
  },
  mobile: {
    webp: '/assets/backgrounds/mobile-background.webp',
    fallback: '/assets/backgrounds/mobile-background.png'
  }
};

/**
 * Detect WebP support in the browser
 * @returns {Promise<boolean>} True if WebP is supported
 */
export const detectWebPSupport = () => {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Check if an asset file exists
 * @param {string} url - The asset URL to check
 * @returns {Promise<boolean>} True if the asset exists
 */
export const checkAssetExists = (url) => {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

/**
 * Get the best available background asset URL
 * @param {string} assetKey - Key from BACKGROUND_ASSETS
 * @returns {Promise<string>} The best available asset URL
 */
export const getBestBackgroundAsset = async (assetKey) => {
  const asset = BACKGROUND_ASSETS[assetKey];
  if (!asset) {
    console.warn(`Background asset "${assetKey}" not found`);
    return null;
  }

  const supportsWebP = await detectWebPSupport();
  
  if (supportsWebP) {
    const webpExists = await checkAssetExists(asset.webp);
    if (webpExists) {
      return asset.webp;
    }
  }
  
  const fallbackExists = await checkAssetExists(asset.fallback);
  if (fallbackExists) {
    return asset.fallback;
  }
  
  console.warn(`No background asset found for "${assetKey}"`);
  return null;
};

/**
 * Apply background with proper fallback handling
 * @param {HTMLElement} element - The element to apply background to
 * @param {string} assetKey - Key from BACKGROUND_ASSETS
 * @param {Object} options - Additional options
 */
export const applyBackgroundAsset = async (element, assetKey, options = {}) => {
  const {
    size = 'cover',
    position = 'center',
    repeat = 'no-repeat',
    attachment = 'fixed'
  } = options;

  try {
    const assetUrl = await getBestBackgroundAsset(assetKey);
    
    if (assetUrl) {
      element.style.backgroundImage = `url('${assetUrl}')`;
      element.style.backgroundSize = size;
      element.style.backgroundPosition = position;
      element.style.backgroundRepeat = repeat;
      element.style.backgroundAttachment = attachment;
      
      // Remove error class if it was previously applied
      element.classList.remove('background-error');
      
      console.log(`Background asset "${assetKey}" applied successfully`);
    } else {
      // Apply error styling
      element.classList.add('background-error');
      console.error(`Failed to load background asset "${assetKey}"`);
    }
  } catch (error) {
    console.error(`Error applying background asset "${assetKey}":`, error);
    element.classList.add('background-error');
  }
};

/**
 * Preload background assets for better performance
 * @param {Array<string>} assetKeys - Array of asset keys to preload
 */
export const preloadBackgroundAssets = async (assetKeys = []) => {
  const supportsWebP = await detectWebPSupport();
  
  const preloadPromises = assetKeys.map(async (assetKey) => {
    const asset = BACKGROUND_ASSETS[assetKey];
    if (!asset) return;
    
    const urlToPreload = supportsWebP ? asset.webp : asset.fallback;
    
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = urlToPreload;
      link.onload = () => resolve(assetKey);
      link.onerror = () => resolve(null);
      document.head.appendChild(link);
    });
  });
  
  const results = await Promise.all(preloadPromises);
  const successful = results.filter(Boolean);
  
  console.log(`Preloaded ${successful.length} background assets:`, successful);
  return successful;
};

/**
 * Get responsive background asset based on viewport
 * @param {string} baseAssetKey - Base asset key
 * @returns {string} Asset key adjusted for viewport
 */
export const getResponsiveAssetKey = (baseAssetKey) => {
  const isMobile = window.innerWidth <= 768;
  
  // Use mobile-specific asset if available and on mobile viewport
  if (isMobile && BACKGROUND_ASSETS.mobile) {
    return 'mobile';
  }
  
  return baseAssetKey;
};

/**
 * Initialize background asset system
 * This should be called early in the application lifecycle
 */
export const initializeBackgroundAssets = async () => {
  console.log('Initializing background asset system...');
  
  // Add WebP support class to document
  const supportsWebP = await detectWebPSupport();
  if (!supportsWebP) {
    document.documentElement.classList.add('no-webp');
  }
  
  // Preload critical assets
  await preloadBackgroundAssets(['game', 'landing', 'dashboard']);
  
  console.log('Background asset system initialized');
};

/**
 * React hook for background assets (if using React)
 */
export const useBackgroundAsset = (assetKey, elementRef, options = {}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    if (!elementRef.current) return;
    
    const applyAsset = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const responsiveKey = getResponsiveAssetKey(assetKey);
        await applyBackgroundAsset(elementRef.current, responsiveKey, options);
        
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };
    
    applyAsset();
  }, [assetKey, elementRef, options]);
  
  return { loading, error };
};

/**
 * CSS class utilities for background assets
 */
export const getBackgroundClasses = (assetKey, additionalClasses = []) => {
  const baseClasses = ['background-container'];
  
  // Add asset-specific class
  baseClasses.push(`${assetKey}-background`);
  
  // Add responsive classes
  if (window.innerWidth <= 768) {
    baseClasses.push('mobile-background');
  }
  
  return [...baseClasses, ...additionalClasses].join(' ');
};

/**
 * Validate that required background assets are available
 * @returns {Promise<Object>} Validation results
 */
export const validateBackgroundAssets = async () => {
  const results = {
    valid: true,
    missing: [],
    available: []
  };
  
  for (const [key, asset] of Object.entries(BACKGROUND_ASSETS)) {
    const webpExists = await checkAssetExists(asset.webp);
    const fallbackExists = await checkAssetExists(asset.fallback);
    
    if (webpExists || fallbackExists) {
      results.available.push(key);
    } else {
      results.missing.push(key);
      results.valid = false;
    }
  }
  
  return results;
};

// Export default initialization function
export default initializeBackgroundAssets;