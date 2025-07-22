import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '../contexts/WalletContext';

const LandingPage = () => {
  const { isConnected } = useWallet();
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: '🎮',
      title: 'DODGE & HODL Gameplay',
      description: 'Navigate through volatile markets while making strategic HODL decisions to maximize your DBP tokens.',
      color: 'arcade-blue'
    },
    {
      icon: '🏆',
      title: 'XP & Badge System',
      description: 'Earn experience points and unlock exclusive badges as you master the art of crypto timing.',
      color: 'fresh-green'
    },
    {
      icon: '⚡',
      title: 'Real-time Action',
      description: 'Experience live price feeds and instant on-chain rewards in this fast-paced Web3 adventure.',
      color: 'neon-yellow'
    },
    {
      icon: '💎',
      title: 'NFT Boosts',
      description: 'Collect rare NFTs that give you gameplay advantages and exclusive perks.',
      color: 'purple-80s'
    }
  ];

  const stats = [
    { label: 'Active Players', value: '2,847', color: 'fresh-green' },
    { label: 'DBP Tokens Earned', value: '145.2K', color: 'arcade-blue' },
    { label: 'Badges Unlocked', value: '892', color: 'neon-yellow' },
    { label: 'Games Played', value: '12.4K', color: 'cheese-orange' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-retro-black via-game-darker to-retro-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-arcade-blue/10 to-fresh-green/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center animate-in fade-in duration-1000">
            {/* Logo */}
            <div className="text-logo text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-fresh-green via-arcade-blue to-neon-yellow bg-clip-text text-transparent">
                🏀 HamBaller.xyz
              </span>
            </div>
            
            {/* Tagline */}
            <h1 className="text-2xl md:text-4xl font-bold text-cloud-white mb-4 animate-in slide-in-from-bottom duration-700 delay-200">
              The Ultimate Web3 DODGE & HODL Game
            </h1>
            
            <p className="text-body text-gray-300 max-w-2xl mx-auto mb-8 animate-in slide-in-from-bottom duration-700 delay-400">
              Navigate volatile crypto markets, time your HODLs perfectly, and earn DBP tokens while unlocking exclusive badges and NFT boosts.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in slide-in-from-bottom duration-700 delay-600">
              {isConnected ? (
                <Link to="/dashboard" className="btn-primary touch-target">
                  Enter Game Dashboard 🚀
                </Link>
              ) : (
                <div className="touch-target">
                  <ConnectButton />
                </div>
              )}
              <Link to="#features" className="btn-help touch-target">
                Learn How to Play ❓
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-retro-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className={`text-center p-6 rounded-2xl bg-${stat.color}/10 border border-${stat.color}/30 animate-in zoom-in duration-500`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`text-3xl font-bold text-${stat.color} mb-2`}>
                  {stat.value}
                </div>
                <div className="text-label text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-cloud-white mb-4 animate-in fade-in duration-700">
              Master the Art of Crypto Gaming
            </h2>
            <p className="text-body text-gray-300 max-w-2xl mx-auto animate-in fade-in duration-700 delay-200">
              Experience the perfect blend of skill, strategy, and luck in our innovative Web3 gaming ecosystem.
            </p>
          </div>

          {/* Feature Showcase */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Feature Carousel */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`p-6 rounded-2xl transition-all duration-500 ${
                    index === currentFeature 
                      ? `bg-${feature.color}/20 border-2 border-${feature.color} shadow-glow scale-105` 
                      : 'bg-retro-black/30 border border-soft-grey/20'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{feature.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-cloud-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-body text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Game Preview Mock */}
            <div className="game-visual-window animate-in slide-in-from-right duration-1000">
              <div className="aspect-video bg-gradient-to-br from-arcade-blue/20 to-fresh-green/20 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-2xl font-bold text-retro-black mb-2">
                    Live Game Preview
                  </h3>
                  <p className="text-body text-gray-600">
                    Connect your wallet to start playing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-r from-retro-black to-game-darker">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-cloud-white mb-4">
              How HamBaller Works
            </h2>
            <p className="text-body text-gray-300 max-w-2xl mx-auto">
              Three simple steps to start earning DBP tokens and climbing the leaderboards.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect & Start',
                description: 'Link your Web3 wallet and begin your first DODGE & HODL run.',
                icon: '🔗',
                color: 'arcade-blue'
              },
              {
                step: '02', 
                title: 'Navigate & HODL',
                description: 'Make strategic moves through volatile markets and time your HODLs perfectly.',
                icon: '⚡',
                color: 'fresh-green'
              },
              {
                step: '03',
                title: 'Earn & Unlock',
                description: 'Collect DBP tokens, gain XP, and unlock exclusive badges and NFTs.',
                icon: '🏆',
                color: 'neon-yellow'
              }
            ].map((step, index) => (
              <div 
                key={step.step}
                className={`text-center p-8 rounded-2xl bg-${step.color}/10 border border-${step.color}/30 animate-in slide-in-from-bottom duration-700`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className={`text-5xl mb-4`}>{step.icon}</div>
                <div className={`text-6xl font-bold text-${step.color} mb-4`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-cloud-white mb-4">
                  {step.title}
                </h3>
                <p className="text-body text-gray-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-arcade-blue/20 to-fresh-green/20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-cloud-white mb-6 animate-in fade-in duration-700">
            Ready to Start Your Journey?
          </h2>
          <p className="text-body text-gray-300 mb-8 animate-in fade-in duration-700 delay-200">
            Join thousands of players already earning DBP tokens and climbing the leaderboards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in slide-in-from-bottom duration-700 delay-400">
            {isConnected ? (
              <Link to="/dashboard" className="btn-success touch-target">
                Play Now 🚀
              </Link>
            ) : (
              <div className="touch-target">
                <ConnectButton />
              </div>
            )}
            <Link to="/leaderboard" className="btn-primary touch-target">
              View Leaderboard 🏆
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;