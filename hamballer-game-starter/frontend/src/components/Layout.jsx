import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWebSocket } from '../services/useWebSocketService';
import PriceTicker from './PriceTicker';
import AudioControls from './AudioControls';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const location = useLocation();
  const { connected } = useWebSocket();

  const navItems = [
    { path: '/', label: 'Game', icon: '🎮' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { path: '/badges', label: 'Badges', icon: '🏅' },
    { path: '/replay', label: 'Replays', icon: '📺' },
  ];

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.header 
        className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                🏀 HamBaller.xyz
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 ${
                      location.pathname === item.path
                        ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <motion.span
                      animate={{ rotate: location.pathname === item.path ? [0, 10, -10, 0] : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {item.icon}
                    </motion.span>
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Wallet Connect & Status */}
            <div className="flex items-center space-x-4">
              {/* Audio Controls */}
              <AudioControls />

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
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.main>

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
                <li>• XP badges</li>
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
    </motion.div>
  );
};

export default Layout;
