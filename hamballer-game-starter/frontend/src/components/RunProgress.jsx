import React, { memo, useMemo, useCallback } from 'react';

const RunProgress = memo(({ run, phase, onHodlDecision, loading, engine }) => {
  const currentMove = engine?.currentMove || 0;

  // Memoize calculations for better performance
  const progressData = useMemo(() => {
    if (!run) return null;
    
    const totalMoves = run.moves?.length || 0;
    const progress = totalMoves > 0 ? ((currentMove + 1) / totalMoves) * 100 : 0;
    
    return {
      totalMoves,
      progress,
      currentMoveDisplay: currentMove + 1
    };
  }, [run, currentMove]);

  // Memoize move sequence for performance
  const moveSequence = useMemo(() => {
    if (!run?.moves) return [];
    
    return run.moves.map((move, index) => ({
      move,
      index,
      isActive: index <= currentMove,
      isCurrent: index === currentMove && phase === 'running',
      icon: move === 'UP' ? '⬆️' : '⬇️',
      ariaLabel: `Move ${index + 1}: ${move}`
    }));
  }, [run?.moves, currentMove, phase]);

  // Memoize stats for performance
  const gameStats = useMemo(() => [
    {
      label: 'Current Price',
      value: `$${run?.currentPrice?.toFixed(4) || '0.0000'}`,
      subtitle: run?.priceDirection === 'up' ? '📈 Rising' : '📉 Falling',
      color: 'text-white',
      bgColor: 'bg-gray-700/50'
    },
    {
      label: 'Position',
      value: run?.currentPosition || 'Starting',
      subtitle: `Risk Level: ${run?.riskLevel || 'Low'}`,
      color: 'text-blue-400',
      bgColor: 'bg-gray-700/50'
    },
    {
      label: 'Potential Reward',
      value: `${run?.potentialDbp?.toFixed(2) || '0.00'} DBP`,
      subtitle: `Multiplier: ${run?.multiplier || '1.0'}x`,
      color: 'text-green-400',
      bgColor: 'bg-gray-700/50'
    }
  ], [run]);

  // Memoized decision handlers
  const handleHodl = useCallback(() => {
    onHodlDecision(true);
  }, [onHodlDecision]);

  const handleClimb = useCallback(() => {
    onHodlDecision(false);
  }, [onHodlDecision]);

  if (!progressData) return null;

  return (
    <div className="space-y-6" role="region" aria-label="Game run progress">
      {/* Run Header */}
      <header className="bg-gray-700/60 backdrop-blur-sm rounded-xl border border-gray-600/50 p-4 sm:p-6 shadow-lg animate-in slide-in-from-top duration-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <h3 className="text-lg font-semibold text-white">
            Run #{run.runId}
            {phase === 'running' && (
              <span className="ml-2 text-sm text-blue-400 animate-pulse">
                Move {progressData.currentMoveDisplay}/{progressData.totalMoves}
              </span>
            )}
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2">
            <div className="text-sm text-gray-300">
              Current Score: <span className="text-green-400 font-medium">{run.currentScore || 0}</span>
            </div>
            {run.checkpointReached && (
              <div className="text-sm text-yellow-400 font-medium animate-bounce">
                🎯 Checkpoint Reached!
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-600 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
            style={{ width: `${progressData.progress}%` }}
            role="progressbar"
            aria-valuenow={progressData.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Game progress: ${Math.round(progressData.progress)}% complete`}
          />
        </div>

        {/* Move Sequence Visualization */}
        <div 
          className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2"
          role="list"
          aria-label="Move sequence"
        >
          {moveSequence.map((moveItem) => (
            <div
              key={moveItem.index}
              className={`
                h-8 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 transform
                ${moveItem.isActive
                  ? moveItem.move === 'UP'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-red-500 text-white shadow-lg'
                  : 'bg-gray-600 text-gray-400'
                }
                ${moveItem.isCurrent ? 'ring-2 ring-yellow-400 scale-110 animate-pulse' : ''}
                hover:scale-105
              `}
              role="listitem"
              aria-label={moveItem.ariaLabel}
            >
              {moveItem.icon}
            </div>
          ))}
        </div>
      </header>

      {/* Current Price & Position */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Game statistics">
        {gameStats.map((stat, index) => (
          <div 
            key={stat.label}
            className={`${stat.bgColor} backdrop-blur-sm rounded-xl border border-gray-600/50 p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-gray-500/50 animate-in slide-in-from-bottom duration-500`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
            <div className={`text-xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-400">
              {stat.subtitle}
            </div>
          </div>
        ))}
      </section>

      {/* HODL Decision Panel */}
      {phase === 'decision' && (
        <section 
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-6 shadow-2xl animate-in zoom-in duration-500"
          aria-labelledby="decision-heading"
        >
          <header className="text-center mb-6">
            <h3 id="decision-heading" className="text-2xl font-bold text-yellow-400 mb-2">
              🚨 Checkpoint Reached!
            </h3>
            <p className="text-gray-300">
              You've reached the decision point. What's your move?
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HODL Option */}
            <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 group hover:bg-green-500/30 transition-all duration-300">
              <h4 className="text-lg font-bold text-green-400 mb-2 flex items-center gap-2">
                💎 HODL
              </h4>
              <p className="text-sm text-gray-300 mb-3">
                Continue holding for potentially higher rewards, but risk losing everything if the market turns.
              </p>
              <div className="text-sm space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Potential Reward:</span>
                  <span className="text-green-400 font-medium">
                    {(run.potentialDbp * 2)?.toFixed(2) || '0.00'} DBP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level:</span>
                  <span className="text-red-400">High</span>
                </div>
              </div>
              <button
                onClick={handleHodl}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-green-400 focus:outline-none"
                aria-label="Choose HODL option"
              >
                {loading ? 'Processing...' : 'HODL 💎'}
              </button>
            </div>

            {/* CLIMB Option */}
            <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 group hover:bg-blue-500/30 transition-all duration-300">
              <h4 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                🧗 CLIMB
              </h4>
              <p className="text-sm text-gray-300 mb-3">
                Take your current rewards and exit safely. Guaranteed payout but lower potential.
              </p>
              <div className="text-sm space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Guaranteed Reward:</span>
                  <span className="text-blue-400 font-medium">
                    {run.potentialDbp?.toFixed(2) || '0.00'} DBP
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level:</span>
                  <span className="text-green-400">None</span>
                </div>
              </div>
              <button
                onClick={handleClimb}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                aria-label="Choose CLIMB option"
              >
                {loading ? 'Processing...' : 'CLIMB 🧗'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Run Complete Summary */}
      {phase === 'complete' && (
        <section 
          className="bg-gray-700/60 backdrop-blur-sm rounded-xl border border-gray-600/50 p-4 sm:p-6 shadow-lg animate-in slide-in-from-bottom duration-500"
          aria-labelledby="summary-heading"
        >
          <h3 id="summary-heading" className="text-lg font-semibold text-white mb-4">
            🏁 Run Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-600/30 rounded-lg">
              <div className="text-gray-400">Final Score</div>
              <div className="text-white font-medium text-lg">{run.finalScore || 0}</div>
            </div>
            <div className="text-center p-3 bg-gray-600/30 rounded-lg">
              <div className="text-gray-400">DBP Earned</div>
              <div className="text-green-400 font-medium text-lg">{run.dbpEarned || 0}</div>
            </div>
            <div className="text-center p-3 bg-gray-600/30 rounded-lg">
              <div className="text-gray-400">XP Gained</div>
              <div className="text-blue-400 font-medium text-lg">{run.xpGained || 0}</div>
            </div>
            <div className="text-center p-3 bg-gray-600/30 rounded-lg">
              <div className="text-gray-400">Decision</div>
              <div className={`font-medium text-lg ${run.hodlDecision ? 'text-green-400' : 'text-blue-400'}`}>
                {run.hodlDecision ? 'HODL 💎' : 'CLIMB 🧗'}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
});

RunProgress.displayName = 'RunProgress';

export default RunProgress;
