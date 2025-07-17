import React, { useState, useEffect } from 'react';
import { useXp } from '../contexts/XpContext';

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

  // Dynamic position styles
  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'center':
      default:
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
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
    <div className={`fixed z-50 ${getPositionStyles()}`}>
      <div 
        className={`
          bg-gradient-to-r from-yellow-400 to-orange-500 
          text-white font-bold text-lg sm:text-xl md:text-2xl
          px-4 py-2 sm:px-6 sm:py-3
          rounded-lg shadow-2xl
          border-2 border-yellow-300
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
        <div className="absolute inset-0 pointer-events-none">
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