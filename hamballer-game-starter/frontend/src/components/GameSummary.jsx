import React, { memo, useMemo } from 'react';
import { useXp } from '../contexts/XpContext';
import { useWallet } from '../contexts/WalletContext';

const GameSummary = memo(({ gamePhase, wsConnected, error }) => {
  const { xp, level } = useXp();
  const { address } = useWallet();

  const phaseData = useMemo(() => {
    const data = {
      setup: { title: 'Select Your Moves', icon: '🎯', ariaLabel: 'Game setup phase - select your moves' },
      running: { title: 'Run in Progress...', icon: '🏃', ariaLabel: 'Game running - watch your progress' },
      decision: { title: 'HODL or CLIMB?', icon: '💎', ariaLabel: 'Decision time - choose to HODL or CLIMB' },
      complete: { title: 'Run Complete!', icon: '🏆', ariaLabel: 'Game complete - view your results' }
    };
    return data[gamePhase] || { title: 'Game', icon: '🎮', ariaLabel: 'Game interface' };
  }, [gamePhase]);

  const connectionStatus = useMemo(() => ({
    text: wsConnected ? 'Live' : 'Offline',
    ariaLabel: wsConnected ? 'WebSocket connected - live updates active' : 'WebSocket disconnected - offline mode',
    color: wsConnected ? 'bg-green-400' : 'bg-red-400'
  }), [wsConnected]);

  return (
    <div 
      className="space-y-4"
      role="banner"
      aria-label="Game status and connection information"
    >
      {/* Main Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div 
            className="text-2xl"
            role="img"
            aria-label={phaseData.ariaLabel}
          >
            {phaseData.icon}
          </div>
          <h1 
            className="text-2xl font-bold text-white"
            aria-live="polite"
            aria-atomic="true"
          >
            {phaseData.title}
          </h1>
        </div>
        
        <div 
          className="flex items-center space-x-2"
          role="status"
          aria-label={connectionStatus.ariaLabel}
        >
          <div 
            className={`w-2 h-2 rounded-full ${connectionStatus.color}`}
            aria-hidden="true"
          />
          <span className="text-sm text-gray-400">
            {connectionStatus.text}
          </span>
        </div>
      </div>

      {/* Player Stats Bar */}
      {address && (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {/* XP Display */}
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400 text-lg">⭐</span>
                <div>
                  <div className="text-sm text-gray-400">XP</div>
                  <div className="text-lg font-bold text-white">
                    {xp.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Level Display */}
              <div className="flex items-center space-x-2">
                <span className="text-purple-400 text-lg">🏆</span>
                <div>
                  <div className="text-sm text-gray-400">Level</div>
                  <div className="text-lg font-bold text-white">
                    {level}
                  </div>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="hidden md:block">
                <div className="text-sm text-gray-400">Wallet</div>
                <div className="text-sm font-mono text-gray-300">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              </div>
            </div>

            {/* Live XP Indicator */}
            {wsConnected && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Live XP</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div 
          className="bg-red-500/20 border border-red-500 rounded-lg p-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
});

export default GameSummary; 