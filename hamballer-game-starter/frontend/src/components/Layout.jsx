import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWebSocket } from '../services/useWebSocketService';
import { useWallet } from '../contexts/WalletContext';
import PriceTicker from './PriceTicker';
import AudioControls from './AudioControls';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const location = useLocation();
  const { connected } = useWebSocket();
  const { isConnected, address } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Game', icon: '🎮', description: 'Main gameplay' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊', description: 'Player stats' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆', description: 'Top players' },
    { path: '/badges', label: 'Badges', icon: '🏅', description: 'Achievements' },
    { path: '/claim', label: 'Claim', icon: '🎁', description: 'Rewards' },
    { path: '/replay', label: 'Replays', icon: '📺', description: 'Game history' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-retro-black via-game-darker to-retro-black">
      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-retro-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-nav transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between p-6 border-b border-soft-grey/20">
            <Link to="/" className="flex items-center space-x-3" onClick={() => setSidebarOpen(false)}>
              <div className="text-logo text-2xl font-bold">
                <span className="bg-gradient-to-r from-fresh-green to-arcade-blue bg-clip-text text-transparent">
                  🏀 HamBaller
                </span>
              </div>
            </Link>
            <button 
              className="lg:hidden touch-target text-cloud-white hover:text-fresh-green"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 touch-target group ${
                  isActive(item.path)
                    ? 'bg-arcade-blue text-cloud-white shadow-glow-blue'
                    : 'text-gray-300 hover:text-cloud-white hover:bg-soft-grey/10'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-body font-semibold">{item.label}</div>
                  <div className="text-label text-gray-400 group-hover:text-gray-300">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
          </nav>

          {/* Wallet & Status Section */}
          <div className="p-4 border-t border-soft-grey/20 space-y-4">
            {/* WebSocket Status */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-retro-black/50">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-fresh-green animate-pulse-glow' : 'bg-retro-red'
                  }`}
                />
                <span className="text-label text-gray-400">
                  Network {connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Price Ticker */}
            <div className="p-3 rounded-2xl bg-retro-black/50">
              <PriceTicker />
            </div>

            {/* Wallet Connect */}
            <div className="flex flex-col space-y-2">
              <ConnectButton />
              {isConnected && address && (
                <div className="text-label text-gray-400 truncate">
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Header (Mobile) */}
        <header className="lg:hidden bg-retro-black/90 backdrop-blur-sm border-b border-soft-grey/20 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 h-16">
            <button 
              className="touch-target text-cloud-white hover:text-fresh-green"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <Link to="/" className="text-logo font-bold">
              <span className="bg-gradient-to-r from-fresh-green to-arcade-blue bg-clip-text text-transparent">
                🏀 HamBaller
              </span>
            </Link>

            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-fresh-green' : 'bg-retro-red'
                }`}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-retro-black/80 backdrop-blur-sm border-t border-soft-grey/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="text-logo font-bold text-cloud-white">HamBaller.xyz</h3>
                <p className="text-body text-gray-400">
                  The ultimate Web3 DODGE & HODL game. Master volatile markets, earn DBP tokens, unlock exclusive badges.
                </p>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connected ? 'bg-fresh-green animate-pulse-glow' : 'bg-retro-red'
                    }`}
                  />
                  <span className="text-label text-gray-400">
                    Abstract Testnet {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-logo font-bold text-cloud-white">Game Features</h3>
                <ul className="space-y-2 text-body text-gray-400">
                  <li className="flex items-center space-x-2">
                    <span className="text-fresh-green">•</span>
                    <span>Real-time price action gameplay</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-arcade-blue">•</span>
                    <span>On-chain rewards & NFT boosts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-neon-yellow">•</span>
                    <span>XP system & achievement badges</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-cheese-orange">•</span>
                    <span>Live game replays & analysis</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-logo font-bold text-cloud-white">Community</h3>
                <div className="flex space-x-4">
                  <a href="#" className="touch-target text-gray-400 hover:text-arcade-blue transition-colors">
                    <span className="text-2xl">🐦</span>
                  </a>
                  <a href="#" className="touch-target text-gray-400 hover:text-fresh-green transition-colors">
                    <span className="text-2xl">💬</span>
                  </a>
                  <a href="#" className="touch-target text-gray-400 hover:text-neon-yellow transition-colors">
                    <span className="text-2xl">📖</span>
                  </a>
                </div>
                <p className="text-label text-gray-400">
                  Join our community for updates, strategies, and exclusive events.
                </p>
              </div>
            </div>

            <div className="border-t border-soft-grey/20 mt-8 pt-8 text-center">
              <p className="text-label text-gray-400">
                © 2024 HamBaller.xyz - Built on Abstract • Phase 10.2A Player-Facing UI
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
