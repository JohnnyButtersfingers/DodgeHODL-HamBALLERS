import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, Download } from 'lucide-react';
import { useWebSocket } from '../services/useWebSocketService.jsx';
import { usePWA } from '../hooks/usePWA';
import { QuickToggles } from './ThemeLanguageToggle';
import PriceTicker from './PriceTicker';

const Layout = () => {
  const location = useLocation();
  const { connected } = useWebSocket();
  const [showDevMenu, setShowDevMenu] = useState(false);
  const { canInstall, installApp } = usePWA();

  const navItems = [
    { path: '/', label: 'Game', icon: '🎮' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { path: '/replay', label: 'Replays', icon: '📺' },
    { path: '/how-to-play', label: 'How to Play', icon: '📖' },
    { path: '/launch-dashboard', label: 'Live Stats', icon: '📈' },
  ];

  const devNavItems = [
    { path: '/xp-progress', label: 'XP Tracker', icon: '📈' },
    { path: '/dev/recent-claims', label: 'ZK Monitor', icon: '🔍' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                🏀 HamBaller.xyz
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {/* Dev Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDevMenu(!showDevMenu)}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
                >
                  <span>🔧</span>
                  <span>Dev</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDevMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showDevMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
                    {devNavItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setShowDevMenu(false)}
                        className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors hover:bg-gray-700 first:rounded-t-md last:rounded-b-md ${
                          location.pathname === item.path
                            ? 'bg-green-500/20 text-green-400'
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Wallet Connect & Status */}
            <div className="flex items-center space-x-4">
              {/* WebSocket Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-xs text-gray-400">
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>

              {/* Price Ticker */}
              <PriceTicker />

              {/* Theme and Language Toggles */}
              <QuickToggles />

              {/* PWA Install Button */}
              {canInstall && (
                <button
                  onClick={installApp}
                  className="hidden sm:flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>
              )}

              {/* Connect Button */}
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Dev Routes in Mobile */}
            <div className="border-t border-gray-700 mt-3 pt-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 mb-2">
                Developer Tools
              </div>
              {devNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">HamBaller.xyz</h3>
              <p className="text-gray-400 text-sm">
                The ultimate Web3 DODGE & HODL game. Make your moves, time your holds, earn DBP tokens.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Game Features</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Real-time price action</li>
                <li>• On-chain rewards</li>
                <li>• NFT boosts</li>
                <li>• Live replays</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Network</h3>
              <div className="text-gray-400 text-sm">
                <p>Abstract Testnet</p>
                <p className="mt-2">
                  Status: <span className={connected ? 'text-green-400' : 'text-red-400'}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2024 HamBaller.xyz - Built on Abstract
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
