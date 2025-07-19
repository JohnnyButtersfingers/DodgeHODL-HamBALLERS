import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Share2 } from 'lucide-react';

export const Badge3DReveal = ({ badge, onClose, prefersReducedMotion }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareText = `I just earned a ${badge.name} badge in HamBaller! 🎮 ${badge.emoji}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HamBaller Badge',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: prefersReducedMotion ? 0 : 0.8
          }}
          className="relative max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Badge Card */}
          <motion.div
            className={`
              relative bg-gradient-to-br ${badge.gradient} 
              rounded-2xl p-8 shadow-2xl
              ${!prefersReducedMotion && 'hover:shadow-3xl'}
              transform-gpu perspective-1000
            `}
            animate={{
              rotateY: isFlipped ? 180 : 0,
            }}
            transition={{ duration: 0.6 }}
            onHoverStart={() => !prefersReducedMotion && setIsFlipped(true)}
            onHoverEnd={() => !prefersReducedMotion && setIsFlipped(false)}
            style={{ 
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Front Side */}
            <div className="text-center">
              <motion.div
                animate={{ 
                  rotate: prefersReducedMotion ? 0 : [0, 5, -5, 0],
                  scale: prefersReducedMotion ? 1 : [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="text-8xl mb-6"
              >
                {badge.emoji}
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {badge.name} Badge
              </h2>
              
              <p className="text-white/80 mb-4">
                {badge.xpRange}
              </p>
              
              <div className="flex flex-col gap-3 mt-6">
                <motion.div
                  className="bg-white/20 backdrop-blur-sm rounded-lg p-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-sm text-white/90">
                    This badge is now permanently recorded on the blockchain
                  </p>
                </motion.div>
                
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                  
                  <a
                    href={`https://opensea.io/collection/hamballer-badges`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Collection
                  </a>
                </div>
              </div>
            </div>
            
            {/* Back Side (visible on hover) */}
            <div 
              className="absolute inset-0 rounded-2xl p-8 text-center flex flex-col justify-center"
              style={{ 
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden'
              }}
            >
              <h3 className="text-2xl font-bold text-white mb-4">
                Badge Details
              </h3>
              <div className="space-y-2 text-white/80">
                <p>Rarity: {badge.name}</p>
                <p>XP Range: {badge.xpRange}</p>
                <p>Season: 1</p>
                <p className="text-sm mt-4">
                  Hover to flip back
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="absolute -top-2 -right-2 bg-gray-800 hover:bg-gray-700 rounded-full p-2 text-white shadow-lg transition-colors"
            aria-label="Close badge reveal"
          >
            <X className="w-5 h-5" />
          </motion.button>
          
          {/* Glow effect */}
          {!prefersReducedMotion && (
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${badge.gradient} rounded-2xl blur-3xl opacity-50 -z-10`}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};