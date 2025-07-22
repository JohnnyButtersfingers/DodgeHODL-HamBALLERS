import React, { useState, useEffect } from 'react';

const SlipnodeShowcase = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const showcaseData = [
    {
      title: 'Powered by Slipnode',
      subtitle: 'Next-Gen Web3 Infrastructure',
      description: 'Experience lightning-fast transactions and real-time game updates powered by Slipnode\'s cutting-edge blockchain technology.',
      icon: '⚡',
      color: 'arcade-blue'
    },
    {
      title: 'Zero-Knowledge Proofs',
      subtitle: 'Privacy-First Gaming',
      description: 'Your gameplay data is secured with advanced zero-knowledge cryptography, ensuring fair play while protecting your strategies.',
      icon: '🔐',
      color: 'fresh-green'
    },
    {
      title: 'Instant Rewards',
      subtitle: 'On-Chain Settlement',
      description: 'Earn DBP tokens and NFT badges instantly with gas-optimized smart contracts running on Abstract Testnet.',
      icon: '💎',
      color: 'neon-yellow'
    },
    {
      title: 'Decentralized Gaming',
      subtitle: 'True Ownership',
      description: 'Own your achievements, badges, and game assets as NFTs. Trade, showcase, or use them across the HamBaller ecosystem.',
      icon: '🎮',
      color: 'purple-80s'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % showcaseData.length);
        setIsAnimating(false);
      }, 300);
    }, 5000);

    return () => clearInterval(timer);
  }, [showcaseData.length]);

  const currentData = showcaseData[currentSlide];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-retro-black to-game-darker p-8">
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-arcade-blue via-fresh-green to-neon-yellow animate-gradient-shift" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
          {/* Icon */}
          <div className={`text-6xl mb-6 animate-bounce-gentle`}>
            {currentData.icon}
          </div>

          {/* Title */}
          <h3 className={`text-2xl font-bold text-${currentData.color} mb-2`}>
            {currentData.title}
          </h3>

          {/* Subtitle */}
          <p className="text-lg font-semibold text-cloud-white mb-4">
            {currentData.subtitle}
          </p>

          {/* Description */}
          <p className="text-body text-gray-300 leading-relaxed">
            {currentData.description}
          </p>
        </div>

        {/* Progress Indicators */}
        <div className="flex space-x-2 mt-8">
          {showcaseData.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? `w-8 bg-${currentData.color}`
                  : 'w-2 bg-soft-grey/30 hover:bg-soft-grey/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slipnode Branding */}
        <div className="mt-8 pt-6 border-t border-soft-grey/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-arcade-blue to-fresh-green animate-pulse" />
              <span className="text-label text-gray-400">
                Powered by Slipnode Protocol
              </span>
            </div>
            <a
              href="https://slipnode.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-label text-arcade-blue hover:text-fresh-green transition-colors"
            >
              Learn More →
            </a>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-arcade-blue/20 to-transparent rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-fresh-green/20 to-transparent rounded-full blur-xl" />
    </div>
  );
};

export default SlipnodeShowcase;