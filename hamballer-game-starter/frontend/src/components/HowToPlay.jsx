import React, { useState } from 'react';
import { Play, Wallet, Trophy, Zap, Shield, Target, ChevronRight, ExternalLink, Copy, Check } from 'lucide-react';

const HowToPlay = () => {
  const [activeTab, setActiveTab] = useState('basics');
  const [copiedAddress, setCopiedAddress] = useState('');

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  const tabs = [
    { id: 'basics', label: '🎮 Game Basics', icon: <Play className="w-4 h-4" /> },
    { id: 'wallet', label: '👛 Wallet Setup', icon: <Wallet className="w-4 h-4" /> },
    { id: 'badges', label: '🏆 Badge System', icon: <Trophy className="w-4 h-4" /> },
    { id: 'zkproof', label: '🔐 ZK Protection', icon: <Shield className="w-4 h-4" /> },
  ];

  const badgeTiers = [
    { tier: 'Bronze', xp: '1,000 XP', emoji: '🥉', color: 'text-amber-600', description: 'Your first achievement milestone' },
    { tier: 'Silver', xp: '5,000 XP', emoji: '🥈', color: 'text-gray-400', description: 'Proving your dedication' },
    { tier: 'Gold', xp: '15,000 XP', emoji: '🥇', color: 'text-yellow-400', description: 'Elite player recognition' },
    { tier: 'Platinum', xp: '50,000 XP', emoji: '💎', color: 'text-blue-400', description: 'Master-level achievement' },
    { tier: 'Diamond', xp: '100,000 XP', emoji: '💎', color: 'text-purple-400', description: 'Ultimate legendary status' },
  ];

  const gameplaySteps = [
    {
      step: 1,
      title: 'Start Your Run',
      description: 'Click "Start Game" and begin dodging obstacles',
      icon: <Play className="w-6 h-6" />,
      details: 'Use arrow keys (desktop) or touch controls (mobile) to navigate through obstacles.'
    },
    {
      step: 2,
      title: 'Collect Points',
      description: 'Gather Catch Points (CP) as you progress',
      icon: <Target className="w-6 h-6" />,
      details: 'CP are earned based on distance traveled, obstacles dodged, and time survived.'
    },
    {
      step: 3,
      title: 'Make Decisions',
      description: 'Choose to HODL 💎 or CLIMB 🧗 at key moments',
      icon: <Zap className="w-6 h-6" />,
      details: 'Strategic decisions affect your final score and XP multipliers.'
    },
    {
      step: 4,
      title: 'Complete & Claim',
      description: 'Finish runs to earn XP and convert CP to DBP tokens',
      icon: <Trophy className="w-6 h-6" />,
      details: 'XP accumulates toward badge thresholds. CP converts to DBP at 10:1 ratio.'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-4">
            How to Play HamBaller.xyz
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Master the ultimate Web3 DODGE & HODL game. Learn the mechanics, earn XP, unlock badges, and climb the leaderboards!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center mb-8 bg-gray-800/50 rounded-xl p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Game Basics Tab */}
          {activeTab === 'basics' && (
            <div className="space-y-8">
              <div className="bg-gray-800/50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Play className="w-6 h-6 text-green-400" />
                  <span>Game Mechanics</span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {gameplaySteps.map((step) => (
                    <div key={step.step} className="bg-gray-700/30 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {step.step}
                        </div>
                        <div className="text-green-400">
                          {step.icon}
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-gray-300 text-sm mb-3">{step.description}</p>
                      <p className="text-gray-400 text-xs">{step.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="bg-gray-800/50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-6">🎮 Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold text-green-400 mb-4">Desktop Controls</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <kbd className="px-3 py-1 bg-gray-700 rounded text-white font-mono">↑ ↓ ← →</kbd>
                        <span className="text-gray-300">Move character</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <kbd className="px-3 py-1 bg-gray-700 rounded text-white font-mono">Space</kbd>
                        <span className="text-gray-300">Action/Select</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <kbd className="px-3 py-1 bg-gray-700 rounded text-white font-mono">ESC</kbd>
                        <span className="text-gray-300">Pause game</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-400 mb-4">Mobile Controls</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">👆</div>
                        <span className="text-gray-300">Touch and drag to move</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">🔘</div>
                        <span className="text-gray-300">Tap action buttons</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">🔄</div>
                        <span className="text-gray-300">Swipe for quick moves</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Setup Tab */}
          {activeTab === 'wallet' && (
            <div className="space-y-8">
              <div className="bg-gray-800/50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Wallet className="w-6 h-6 text-blue-400" />
                  <span>Wallet Connection Guide</span>
                </h2>

                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">Step 1: Install a Web3 Wallet</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { name: 'MetaMask', url: 'https://metamask.io', recommended: true },
                        { name: 'WalletConnect', url: 'https://walletconnect.com', recommended: false },
                        { name: 'Coinbase Wallet', url: 'https://wallet.coinbase.com', recommended: false },
                        { name: 'Rainbow', url: 'https://rainbow.me', recommended: false },
                      ].map((wallet) => (
                        <a
                          key={wallet.name}
                          href={wallet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block p-4 rounded-lg border transition-all hover:scale-105 ${
                            wallet.recommended
                              ? 'border-green-500/50 bg-green-500/10'
                              : 'border-gray-600/50 bg-gray-700/30'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">👛</div>
                            <div className="font-medium text-white">{wallet.name}</div>
                            {wallet.recommended && (
                              <div className="text-xs text-green-400 mt-1">Recommended</div>
                            )}
                            <ExternalLink className="w-3 h-3 text-gray-400 mx-auto mt-2" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4">Step 2: Add Abstract Testnet</h3>
                    <p className="text-gray-300 mb-4">Add the Abstract Testnet network to your wallet:</p>
                    
                    <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Network Name:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">Abstract Testnet</span>
                          <button
                            onClick={() => copyToClipboard('Abstract Testnet', 'name')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'name' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">RPC URL:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">https://api.testnet.abs.xyz</span>
                          <button
                            onClick={() => copyToClipboard('https://api.testnet.abs.xyz', 'rpc')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'rpc' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Chain ID:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">11124</span>
                          <button
                            onClick={() => copyToClipboard('11124', 'chainId')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'chainId' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Currency Symbol:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">ETH</span>
                          <button
                            onClick={() => copyToClipboard('ETH', 'symbol')}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedAddress === 'symbol' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-4">Step 3: Get Test ETH</h3>
                    <p className="text-gray-300 mb-4">You'll need test ETH for gas fees to play the game:</p>
                    <a
                      href="https://faucet.testnet.abs.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                      <span>Get Test ETH</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Badge System Tab */}
          {activeTab === 'badges' && (
            <div className="space-y-8">
              <div className="bg-gray-800/50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <span>Badge System & XP Progression</span>
                </h2>

                <div className="space-y-6">
                  {badgeTiers.map((badge, index) => (
                    <div key={badge.tier} className="bg-gray-700/30 rounded-lg p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                          <div className="text-4xl">{badge.emoji}</div>
                          <div>
                            <h3 className={`text-xl font-bold ${badge.color}`}>{badge.tier} Badge</h3>
                            <p className="text-gray-300">{badge.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{badge.xp}</div>
                          <div className="text-gray-400 text-sm">Required XP</div>
                        </div>
                      </div>
                      
                      {index < badgeTiers.length - 1 && (
                        <div className="mt-4 flex items-center justify-center">
                          <ChevronRight className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-400 mb-4">💡 XP Earning Tips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">Complete runs for base XP</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">Higher scores = more XP</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">Use boost NFTs for multipliers</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-300">Consistent play earns bonus XP</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-300">Perfect HODL timing bonuses</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-300">Leaderboard position rewards</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ZK Proof Tab */}
          {activeTab === 'zkproof' && (
            <div className="space-y-8">
              <div className="bg-gray-800/50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <span>Zero-Knowledge Proof Protection</span>
                </h2>

                <div className="space-y-6">
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-4">🔐 What are ZK Proofs?</h3>
                    <p className="text-gray-300 mb-4">
                      Zero-knowledge proofs ensure your game results are authentic without revealing your gameplay data. 
                      This technology prevents cheating and maintains fair competition.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <h4 className="text-green-400 font-semibold mb-2">✅ Benefits</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                          <li>• Tamper-proof game results</li>
                          <li>• Fair leaderboard rankings</li>
                          <li>• Cheat-resistant gameplay</li>
                          <li>• Privacy-preserving verification</li>
                        </ul>
                      </div>
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <h4 className="text-blue-400 font-semibold mb-2">🛡️ Protection</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                          <li>• Score manipulation prevention</li>
                          <li>• Bot detection and blocking</li>
                          <li>• Authentic badge eligibility</li>
                          <li>• Secure token distribution</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4">⚡ How It Works</h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                        <div>
                          <h4 className="text-white font-semibold">Game Completion</h4>
                          <p className="text-gray-300 text-sm">When you finish a game, your client generates a cryptographic proof of your performance.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                        <div>
                          <h4 className="text-white font-semibold">Proof Validation</h4>
                          <p className="text-gray-300 text-sm">The blockchain verifies your proof without seeing your actual gameplay data.</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                        <div>
                          <h4 className="text-white font-semibold">Reward Distribution</h4>
                          <p className="text-gray-300 text-sm">Upon successful verification, your XP, badges, and tokens are automatically distributed.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-4">✨ Player Experience</h3>
                    <p className="text-gray-300 mb-4">
                      As a player, ZK proofs work seamlessly in the background. You won't notice any difference in gameplay, 
                      but you can trust that all results are fair and verified.
                    </p>
                    <div className="text-sm text-gray-400">
                      <strong>Note:</strong> Proof generation happens automatically after each game. 
                      If a proof fails, you can retry or contact support for assistance.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Start Playing?</h2>
          <p className="text-gray-300 mb-6">Join thousands of players earning XP, unlocking badges, and climbing leaderboards!</p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a
              href="/"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              🎮 Start Playing Now
            </a>
            <a
              href="/launch-dashboard"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              📊 View Live Stats
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;