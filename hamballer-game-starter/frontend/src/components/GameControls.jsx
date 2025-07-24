import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useGameState } from '../hooks/useGameState';

const GameControls = ({ 
  onStartGame, 
  onRetryGame, 
  onEndGame,
  gamePhase = 'setup', // 'setup', 'running', 'decision', 'complete'
  disabled = false,
  className = ''
}) => {
  const { isConnected } = useWallet();
  const { loading, currentRun } = useGameState();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartGame = async () => {
    if (!isConnected || disabled || loading) return;
    
    setIsStarting(true);
    try {
      await onStartGame?.();
    } finally {
      setIsStarting(false);
    }
  };

  const handleRetryGame = async () => {
    if (!isConnected || disabled || loading) return;
    
    try {
      await onRetryGame?.();
    } catch (error) {
      console.error('Error retrying game:', error);
    }
  };

  const handleEndGame = async () => {
    if (!isConnected || disabled) return;
    
    try {
      await onEndGame?.();
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  // Connection check
  if (!isConnected) {
    return (
      <div className={`game-visual-window p-6 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h3 className="text-logo font-bold text-retro-black">
            Connect Wallet to Play
          </h3>
          <p className="text-body text-gray-600">
            Link your Web3 wallet to start earning DBP tokens and XP
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`game-visual-window space-y-6 ${className}`}>
      {/* Game Status Indicator */}
      <div className="flex items-center justify-between p-4 bg-arcade-blue/10 rounded-2xl border border-arcade-blue/30">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            gamePhase === 'running' ? 'bg-fresh-green animate-pulse-glow' :
            gamePhase === 'complete' ? 'bg-neon-yellow' :
            'bg-soft-grey'
          }`} />
          <div>
            <h3 className="text-body font-semibold text-retro-black">
              {gamePhase === 'setup' && 'Ready to Play'}
              {gamePhase === 'running' && 'Game in Progress'}
              {gamePhase === 'decision' && 'Making Decision'}
              {gamePhase === 'complete' && 'Game Complete'}
            </h3>
            <p className="text-label text-gray-600">
              {gamePhase === 'setup' && 'Start a new DODGE & HODL session'}
              {gamePhase === 'running' && 'Navigate the markets carefully'}
              {gamePhase === 'decision' && 'Choose your HODL timing'}
              {gamePhase === 'complete' && 'View results and try again'}
            </p>
          </div>
        </div>
        
        {currentRun && (
          <div className="text-right">
            <div className="text-2xl font-bold text-arcade-blue">
              {currentRun.score || 0}
            </div>
            <div className="text-label text-gray-600">Score</div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="space-y-4">
        {/* Primary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Play Button */}
          {(gamePhase === 'setup' || gamePhase === 'complete') && (
            <button
              onClick={handleStartGame}
              disabled={disabled || loading || isStarting}
              className={`btn-primary flex items-center justify-center space-x-3 text-lg py-4 ${
                disabled || loading || isStarting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 active:scale-95'
              } transition-all duration-200`}
            >
              {isStarting ? (
                <>
                  <div className="loading-spinner w-5 h-5" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">🎮</span>
                  <span>{gamePhase === 'complete' ? 'Play Again' : 'Start Game'}</span>
                </>
              )}
            </button>
          )}

          {/* Retry Button */}
          {gamePhase === 'complete' && (
            <button
              onClick={handleRetryGame}
              disabled={disabled || loading}
              className={`btn-secondary flex items-center justify-center space-x-3 text-lg py-4 ${
                disabled || loading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 active:scale-95'
              } transition-all duration-200`}
            >
              <span className="text-2xl">🔄</span>
              <span>Quick Retry</span>
            </button>
          )}

          {/* End Game Button (during gameplay) */}
          {gamePhase === 'running' && (
            <button
              onClick={handleEndGame}
              disabled={disabled}
              className={`btn-warning flex items-center justify-center space-x-3 text-lg py-4 ${
                disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 active:scale-95'
              } transition-all duration-200`}
            >
              <span className="text-2xl">⏹️</span>
              <span>End Game</span>
            </button>
          )}
        </div>

        {/* Secondary Actions */}
        {gamePhase === 'setup' && (
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-help text-sm py-3 flex items-center justify-center space-x-2">
              <span>❓</span>
              <span>How to Play</span>
            </button>
            <button className="btn-secondary text-sm py-3 flex items-center justify-center space-x-2 bg-purple-80s hover:bg-purple-80s/90">
              <span>📊</span>
              <span>View Stats</span>
            </button>
          </div>
        )}
      </div>

      {/* Game Tips */}
      <div className="p-4 bg-fresh-green/10 rounded-2xl border border-fresh-green/30">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="text-body font-semibold text-fresh-green mb-1">
              Pro Tip
            </h4>
            <p className="text-label text-gray-600">
              {gamePhase === 'setup' && 'Time your HODLs during market volatility to maximize DBP token rewards.'}
              {gamePhase === 'running' && 'Watch for price patterns and decide when to HODL for maximum gains.'}
              {gamePhase === 'decision' && 'Trust your instincts - timing is everything in the markets!'}
              {gamePhase === 'complete' && 'Review your performance and learn from each session to improve.'}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-retro-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="loading-spinner w-12 h-12 mx-auto" />
            <p className="text-body text-cloud-white">
              Processing game state...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameControls;