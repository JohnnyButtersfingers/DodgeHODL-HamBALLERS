import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useXp } from '../contexts/XpContext';
import { useGameState } from '../hooks/useGameState';
import { useWebSocket } from '../services/useWebSocketService';
import ClaimXPPanel from './ClaimXPPanel';
import GameControls from './GameControls';
import HelpPanel from './HelpPanel';

const PlayerDashboard = () => {
  const { isConnected, address } = useWallet();
  const { totalXp, level, recentGains } = useXp();
  const { playerStats, currentRun, loading } = useGameState();
  const { connected: wsConnected } = useWebSocket();
  const [activeTab, setActiveTab] = useState('overview');

  const stats = {
    gamesPlayed: playerStats?.gamesPlayed || 0,
    totalScore: playerStats?.totalScore || 0,
    avgScore: playerStats?.avgScore || 0,
    bestScore: playerStats?.bestScore || 0,
    winRate: playerStats?.winRate || 0,
    dbpTokens: playerStats?.dbpTokens || 0,
    nftBoosts: playerStats?.nftBoosts || 0,
    playTime: playerStats?.playTime || '0m'
  };

  const recentGames = [
    { id: 1, score: 1250, xp: 85, tokens: 12, timestamp: '2 min ago', result: 'win' },
    { id: 2, score: 890, xp: 45, tokens: 8, timestamp: '15 min ago', result: 'loss' },
    { id: 3, score: 1580, xp: 120, tokens: 18, timestamp: '1 hour ago', result: 'win' },
    { id: 4, score: 750, xp: 35, tokens: 5, timestamp: '2 hours ago', result: 'loss' },
  ];

  const achievements = [
    { name: 'First Victory', unlocked: true, rarity: 'common', icon: '🏆' },
    { name: 'HODL Master', unlocked: true, rarity: 'rare', icon: '💎' },
    { name: 'Market Ninja', unlocked: false, rarity: 'epic', icon: '⚡' },
    { name: 'Legendary Trader', unlocked: false, rarity: 'legendary', icon: '👑' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'achievements', label: 'Achievements', icon: '🏅' },
    { id: 'history', label: 'History', icon: '📺' }
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-8xl">🔒</div>
          <h2 className="text-logo text-3xl font-bold text-cloud-white">
            Connect Your Wallet
          </h2>
          <p className="text-body text-gray-400">
            Connect your Web3 wallet to access your player dashboard and start earning rewards.
          </p>
          <div className="pt-4">
            <div className="btn-primary inline-flex items-center space-x-2 cursor-not-allowed opacity-50">
              <span>🔗</span>
              <span>Waiting for Wallet...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-logo text-3xl font-bold text-cloud-white">
            Player Dashboard
          </h1>
          <p className="text-body text-gray-400 mt-1">
            Welcome back! Track your progress and dominate the leaderboards.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 p-3 bg-retro-black/50 rounded-2xl border border-soft-grey/20">
            <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-fresh-green animate-pulse-glow' : 'bg-retro-red'}`} />
            <span className="text-label text-gray-400">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          {/* Player Address */}
          <div className="p-3 bg-arcade-blue/10 rounded-2xl border border-arcade-blue/30">
            <span className="text-label text-arcade-blue font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x...'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-6 bg-fresh-green/10 rounded-2xl border border-fresh-green/30">
          <div className="text-3xl font-bold text-fresh-green mb-2">
            {level}
          </div>
          <div className="text-label text-gray-400">Current Level</div>
        </div>
        
        <div className="text-center p-6 bg-arcade-blue/10 rounded-2xl border border-arcade-blue/30">
          <div className="text-3xl font-bold text-arcade-blue mb-2">
            {totalXp.toLocaleString()}
          </div>
          <div className="text-label text-gray-400">Total XP</div>
        </div>
        
        <div className="text-center p-6 bg-neon-yellow/10 rounded-2xl border border-neon-yellow/30">
          <div className="text-3xl font-bold text-neon-yellow mb-2">
            {stats.dbpTokens}
          </div>
          <div className="text-label text-gray-400">DBP Tokens</div>
        </div>
        
        <div className="text-center p-6 bg-cheese-orange/10 rounded-2xl border border-cheese-orange/30">
          <div className="text-3xl font-bold text-cheese-orange mb-2">
            {stats.gamesPlayed}
          </div>
          <div className="text-label text-gray-400">Games Played</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-soft-grey/20">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-arcade-blue text-arcade-blue'
                  : 'border-transparent text-gray-400 hover:text-cloud-white hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Controls */}
            <div className="lg:col-span-2">
              <GameControls
                gamePhase={currentRun ? 'running' : 'setup'}
                disabled={loading}
                className="mb-6"
              />
              
              {/* Performance Summary */}
              <div className="game-visual-window">
                <h3 className="text-logo font-bold text-retro-black mb-4">
                  Performance Summary
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-arcade-blue">
                      {stats.bestScore}
                    </div>
                    <div className="text-label text-gray-600">Best Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-fresh-green">
                      {stats.avgScore}
                    </div>
                    <div className="text-label text-gray-600">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neon-yellow">
                      {stats.winRate}%
                    </div>
                    <div className="text-label text-gray-600">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cheese-orange">
                      {stats.playTime}
                    </div>
                    <div className="text-label text-gray-600">Play Time</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* XP Panel */}
            <div>
              <ClaimXPPanel />
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="game-visual-window">
              <h3 className="text-logo font-bold text-retro-black mb-4">
                📈 Score Trends
              </h3>
              <div className="h-64 flex items-center justify-center bg-arcade-blue/10 rounded-xl">
                <p className="text-gray-600">Chart visualization coming soon</p>
              </div>
            </div>
            
            <div className="game-visual-window">
              <h3 className="text-logo font-bold text-retro-black mb-4">
                💰 Token Earnings
              </h3>
              <div className="h-64 flex items-center justify-center bg-fresh-green/10 rounded-xl">
                <p className="text-gray-600">Earnings chart coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => (
              <div 
                key={achievement.name}
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  achievement.unlocked
                    ? 'bg-fresh-green/20 border-fresh-green/50 shadow-glow'
                    : 'bg-soft-grey/10 border-soft-grey/20'
                }`}
              >
                <div className="text-center">
                  <div className={`text-5xl mb-3 ${achievement.unlocked ? '' : 'opacity-50'}`}>
                    {achievement.icon}
                  </div>
                  <h4 className={`text-body font-bold mb-2 ${
                    achievement.unlocked ? 'text-cloud-white' : 'text-gray-400'
                  }`}>
                    {achievement.name}
                  </h4>
                  <div className={`inline-flex px-3 py-1 rounded-full text-label font-medium ${
                    achievement.rarity === 'legendary' ? 'bg-purple-80s/20 text-purple-80s' :
                    achievement.rarity === 'epic' ? 'bg-retro-red/20 text-retro-red' :
                    achievement.rarity === 'rare' ? 'bg-arcade-blue/20 text-arcade-blue' :
                    'bg-fresh-green/20 text-fresh-green'
                  }`}>
                    {achievement.rarity}
                  </div>
                  {achievement.unlocked && (
                    <div className="mt-3">
                      <div className="badge-success">Unlocked!</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="game-visual-window">
              <h3 className="text-logo font-bold text-retro-black mb-4">
                Recent Games
              </h3>
              
              <div className="space-y-3">
                {recentGames.map((game) => (
                  <div 
                    key={game.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        game.result === 'win' ? 'bg-fresh-green' : 'bg-retro-red'
                      }`} />
                      <div>
                        <div className="text-body font-semibold text-retro-black">
                          Score: {game.score}
                        </div>
                        <div className="text-label text-gray-600">
                          {game.timestamp}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-body font-semibold text-retro-black">
                        +{game.xp} XP
                      </div>
                      <div className="text-label text-gray-600">
                        {game.tokens} DBP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Panel */}
      <div className="relative">
        <HelpPanel />
      </div>
    </div>
  );
};

export default PlayerDashboard;