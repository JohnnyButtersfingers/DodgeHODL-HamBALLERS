import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useGameState } from '../hooks/useGameState';
import { useWebSocket } from '../services/useWebSocketService.jsx';
import RunProgress from './RunProgress';
import LiveReplay from './LiveReplay';
import MoveSelector from './MoveSelector';
import RunResultDisplay from './RunResultDisplay';
import GameSummary from './GameSummary';
import ActivitySidebar from './ActivitySidebar';
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
    return <GameSummary />;
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
      <ActivitySidebar playerStats={playerStats} boosts={boosts} />
    </div>
  );
};

export default GameView;
