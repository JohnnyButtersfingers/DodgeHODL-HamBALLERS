import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useGameState } from '../hooks/useGameState';
import { useWebSocket } from '../services/useWebSocketService.jsx';
import RunProgress from './RunProgress';
import LiveReplay from './LiveReplay';
import MoveSelector from './MoveSelector';
import RunResultDisplay from './RunResultDisplay';
import GameSummary from './GameSummary';
import ActivitySidebar from './ActivitySidebar';
import XpOverlay from './XpOverlay';
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
  const [xpOverlayVisible, setXpOverlayVisible] = useState(false);
  const [currentXpGained, setCurrentXpGained] = useState(0);
  const [gamePhase, setGamePhase] = useState('setup'); // setup, running, decision, complete
  const [hodlDecision, setHodlDecision] = useState(null);
  const [contractError, setContractError] = useState(null);

  // XP gained callback for useRunEngine
  const handleXpGained = useCallback((xpAmount) => {
    setCurrentXpGained(xpAmount);
    setXpOverlayVisible(true);
  }, []);

  // Run completion callback for useRunEngine
  const handleRunComplete = useCallback((runData) => {
    console.log('Run completed with data:', runData);
    // Additional completion handling can go here
  }, []);

  const engine = useRunEngine(selectedMoves, handleXpGained, handleRunComplete);

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

  // Memoized callbacks to prevent unnecessary re-renders
  const handleMoveSelection = useCallback((moves) => {
    setSelectedMoves(moves);
  }, []);

  const handleStartRun = useCallback(async () => {
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
  }, [engine, selectedMoves, startRun]);

  const handleHodlDecision = useCallback(async (decision) => {
    setHodlDecision(decision);
    try {
      await endRun(decision);
    } catch (error) {
      console.error('Failed to end run:', error);
    }
  }, [endRun]);

  const handlePlayAgain = useCallback(() => {
    resetRun();
    setSelectedMoves([]);
    engine.reset();
    setHodlDecision(null);
    setGamePhase('setup');
  }, [resetRun, engine]);

  // Memoized game phase title
  const gamePhaseTitle = useMemo(() => {
    switch (gamePhase) {
      case 'setup': return 'Select Your Moves';
      case 'running': return 'Run in Progress...';
      case 'decision': return 'HODL or CLIMB?';
      case 'complete': return 'Run Complete!';
      default: return 'Game';
    }
  }, [gamePhase]);

  // Memoized connection status
  const connectionStatus = useMemo(() => ({
    indicator: wsConnected ? 'bg-green-400' : 'bg-red-400',
    text: wsConnected ? 'Live' : 'Offline',
    pulse: wsConnected ? 'animate-pulse' : ''
  }), [wsConnected]);

  if (!isConnected) {
    return <GameSummary />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          
          {/* Main Game Area - Takes more space on larger screens */}
          <section className="lg:col-span-8 xl:col-span-9 order-2 lg:order-1">
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 sm:p-6 shadow-2xl transition-all duration-300">
              
              {/* Header with improved responsive design */}
              <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white transition-colors duration-300">
                  {gamePhaseTitle}
                </h1>
                
                {/* Connection Status with animations */}
                <div className="flex items-center space-x-2" role="status" aria-live="polite">
                  <div 
                    className={`w-2 h-2 rounded-full ${connectionStatus.indicator} ${connectionStatus.pulse}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-gray-400">
                    {connectionStatus.text}
                  </span>
                </div>
              </header>

              {/* Error Display with improved animation */}
              {error && (
                <div 
                  className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 animate-in slide-in-from-top duration-300"
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Game Phase Content with transitions */}
              <div className="transition-all duration-500 ease-in-out">
                {gamePhase === 'setup' && (
                  <div className="animate-in fade-in duration-500">
                    <MoveSelector 
                      selectedMoves={selectedMoves}
                      onMovesChange={handleMoveSelection}
                      onStartRun={handleStartRun}
                      loading={loading}
                      boosts={boosts}
                    />
                  </div>
                )}

                {(gamePhase === 'running' || gamePhase === 'decision' || gamePhase === 'complete') && (
                  <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                    {/* Run Progress */}
                    <RunProgress
                      run={currentRun}
                      phase={gamePhase}
                      onHodlDecision={handleHodlDecision}
                      loading={loading}
                      engine={engine}
                    />

                    {/* Live Replay with conditional animation */}
                    {(gamePhase === 'running' && liveReplay) && (
                      <div className="animate-in fade-in duration-700 delay-200">
                        <LiveReplay replay={liveReplay} />
                      </div>
                    )}

                    {/* Game Complete Actions */}
                    {gamePhase === 'complete' && (
                      <div className="animate-in zoom-in duration-500 delay-300">
                        <RunResultDisplay run={currentRun} onPlayAgain={handlePlayAgain} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sidebar - Responsive positioning and styling */}
          <aside className="lg:col-span-4 xl:col-span-3 order-1 lg:order-2">
            <div className="sticky top-6">
              <ActivitySidebar 
                playerStats={playerStats} 
                boosts={boosts} 
              />
            </div>
          </aside>

        </div>
      </div>

      {/* XP Overlay - Global overlay for XP feedback */}
      <XpOverlay
        xpGained={currentXpGained}
        isVisible={xpOverlayVisible}
        onAnimationComplete={() => setXpOverlayVisible(false)}
        duration={2500}
        position="center"
      />

      {/* Contract Error Toast */}
      {(contractError || engine.error) && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Transaction Failed</p>
                <p className="text-sm opacity-90">
                  {contractError || engine.error}
                </p>
              </div>
              <button 
                onClick={() => {
                  setContractError(null);
                  engine.setError?.(null);
                }}
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default GameView;
