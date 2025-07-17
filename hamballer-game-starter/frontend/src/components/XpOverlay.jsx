import React, { useState, useEffect } from 'react';
import { useXp } from '../contexts/XpContext';
import '../styles/mobile-fixes.css';

const XpOverlay = ({ 
  xpGained = 0, 
  isVisible = false, 
  onAnimationComplete,
  duration = 2000,
  position = 'center' // 'center', 'top-right', 'bottom-left'
}) => {
  const { setXp } = useXp();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    if (isVisible && xpGained > 0) {
      setIsAnimating(true);
      setDisplayXp(xpGained);
      
      // Update global XP context
      setXp(prev => prev + xpGained);

      // Animation duration management
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, xpGained, duration, setXp, onAnimationComplete]);

  // Dynamic position styles with mobile fixes
  const getPositionStyles = () => {
    const baseClasses = 'xp-overlay-container';
    switch (position) {
      case 'top-right':
        return `${baseClasses} xp-overlay-top-right top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} xp-overlay-bottom-left bottom-4 left-4`;
      case 'center':
      default:
        return `${baseClasses} xp-overlay-center`;
    }
  };

  // Animation classes
  const getAnimationClasses = () => {
    if (!isVisible) return 'opacity-0 scale-0';
    
    if (isAnimating) {
      return 'opacity-100 scale-100 animate-pulse';
    }
    
    return 'opacity-90 scale-95';
  };

  if (!isVisible && !isAnimating) return null;

  return (
    <div className={getPositionStyles()}>
      <div 
        className={`
          xp-popup mobile-animation
          text-white
          transition-all duration-500 ease-out
          ${getAnimationClasses()}
        `}
        style={{
          transform: isAnimating 
            ? 'translateY(-20px) scale(1.1)' 
            : 'translateY(0px) scale(1)',
          boxShadow: isAnimating 
            ? '0 20px 40px rgba(255, 193, 7, 0.4)' 
            : '0 10px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="flex items-center space-x-2">
          <span className="text-yellow-100">✨</span>
          <span>+{displayXp} XP</span>
          <span className="text-yellow-100">✨</span>
        </div>
        
        {/* Sparkle effect */}
        {isAnimating && (
          <div className="absolute -top-2 -right-2">
            <div className="animate-spin text-yellow-200">⭐</div>
          </div>
        )}
      </div>
      
              {/* Floating particles effect for larger XP gains */}
        {xpGained >= 50 && isAnimating && (
          <div className="xp-particles">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`
                absolute w-2 h-2 bg-yellow-400 rounded-full
                animate-bounce
              `}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default XpOverlay;