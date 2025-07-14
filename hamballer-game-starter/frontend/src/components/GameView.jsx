import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useGameState } from '../hooks/useGameState';
import { useWebSocket } from '../services/useWebSocketService';
import RunProgress from './RunProgress';
import StatOverlay from './StatOverlay';
import LiveReplay from './LiveReplay';
import MoveSelector from './MoveSelector';
import RunResultDisplay from './RunResultDisplay';
import useRunEngine from '../lib/useRunEngine';

const GameView = () => {
  const { address, isConnected } = useWallet();
  const { 
    currentRun, 
    playerStats, 
    boosts, 
    loading, 
    error, 
    startRun, 
    endRun, 
    resetRun 
  } = useGameState();
  
  const { liveReplay, connected: wsConnected } = useWebSocket();

  const [selectedMoves, setSelectedMoves] = useState([]);
  const engine = useRunEngine(selectedMoves);
  const [gamePhase, setGamePhase] = useState('setup'); // setup, running, decision, complete
  const [hodlDecision, setHodlDecision] = useState(null);

  // Game phases: setup -> running -> decision -> complete
  useEffect(() => {
    if (currentRun) {
      if (currentRun.isComplete || engine.complete) {
        setGamePhase('complete');
      } else if (currentRun.reachedCheckpoint) {
        setGamePhase('decision');
      } else if (engine.running) {
        setGamePhase('running');
      }
    } else {
      setGamePhase('setup');
    }
  }, [currentRun, engine.complete, engine.running]);

  const handleMoveSelection = (moves) => {
    setSelectedMoves(moves);
  };

  const handleStartRun = async () => {
    if (!engine.validateMoves(selectedMoves)) {
      alert('Please select your moves first!');
      return;
    }

    try {
      await startRun(selectedMoves);
      engine.start();
    } catch (error) {
      console.error('Failed to start run:', error);
    }
  };

  const handleHodlDecision = async (decision) => {
    setHodlDecision(decision);
    try {
      await endRun(decision);
    } catch (error) {
      console.error('Failed to end run:', error);
    }
  };

  const handlePlayAgain = () => {
    resetRun();
    setSelectedMoves([]);
    engine.reset();
    setHodlDecision(null);
    setGamePhase('setup');
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🏀</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to HamBaller.xyz
          </h1>
          <p className="text-gray-400 mb-8">
            The ultimate Web3 DODGE & HODL game. Connect your wallet to start playing!
          </p>
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">How to Play</h2>
            <div className="text-left space-y-3 text-gray-300">
              <div className="flex items-start space-x-3">
                <span className="text-green-400 font-bold">1.</span>
                <span>Select your 10 moves (UP/DOWN) to navigate the slipnode</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-400 font-bold">2.</span>
                <span>Watch your run play out in real-time</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-400 font-bold">3.</span>
                <span>Decide to HODL or CLIMB when you reach the checkpoint</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-green-400 font-bold">4.</span>
                <span>Earn DBP tokens based on your performance!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Main Game Area */}
      <div className="xl:col-span-3">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              {gamePhase === 'setup' && 'Select Your Moves'}
              {gamePhase === 'running' && 'Run in Progress...'}
              {gamePhase === 'decision' && 'HODL or CLIMB?'}
              {gamePhase === 'complete' && 'Run Complete!'}
            </h1>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-gray-400">
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Game Phase Content */}
          {gamePhase === 'setup' && (
            <MoveSelector 
              selectedMoves={selectedMoves}
              onMovesChange={handleMoveSelection}
              onStartRun={handleStartRun}
              loading={loading}
              boosts={boosts}
            />
          )}

          {(gamePhase === 'running' || gamePhase === 'decision' || gamePhase === 'complete') && (
            <div className="space-y-6">
              {/* Run Progress */}
              <RunProgress
                run={currentRun}
                phase={gamePhase}
                onHodlDecision={handleHodlDecision}
                loading={loading}
                engine={engine}
              />

              {/* Live Replay */}
              {(gamePhase === 'running' && liveReplay) && (
                <LiveReplay replay={liveReplay} />
              )}

              {/* Game Complete Actions */}
              {gamePhase === 'complete' && (
                <RunResultDisplay run={currentRun} onPlayAgain={handlePlayAgain} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <StatOverlay stats={playerStats} />
        
        {/* Recent Activity */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Runs Today:</span>
              <span className="text-green-400">{playerStats?.runsToday || 0}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Best Score:</span>
              <span className="text-blue-400">{playerStats?.bestScore || 0}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Total DBP:</span>
              <span className="text-yellow-400">{playerStats?.totalDbp || 0}</span>
            </div>
          </div>
        </div>

        {/* Available Boosts */}
        {boosts && boosts.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Available Boosts</h3>
            <div className="space-y-2">
              {boosts.map((boost) => (
                <div key={boost.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">{boost.name}</span>
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                    {boost.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameView;
