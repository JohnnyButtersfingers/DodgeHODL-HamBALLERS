import React from 'react';

const RunProgress = ({ run, phase, onHodlDecision, loading, engine }) => {
  const currentMove = engine?.currentMove || 0;

  if (!run) return null;

  const totalMoves = run.moves?.length || 0;
  const progress = totalMoves > 0 ? ((currentMove + 1) / totalMoves) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Run Header */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Run #{run.runId}
            {phase === 'running' && (
              <span className="ml-2 text-sm text-blue-400">
                Move {currentMove + 1}/{totalMoves}
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Current Score: <span className="text-green-400 font-medium">{run.currentScore || 0}</span>
            </div>
            {run.checkpointReached && (
              <div className="text-sm text-yellow-400 font-medium">
                🎯 Checkpoint Reached!
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-600 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Move Sequence Visualization */}
        <div className="grid grid-cols-10 gap-1">
          {run.moves?.map((move, index) => (
            <div
              key={index}
              className={`
                h-8 rounded flex items-center justify-center text-xs font-medium transition-all duration-300
                ${index <= currentMove
                  ? move === 'UP'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-600 text-gray-400'
                }
                ${index === currentMove && phase === 'running' ? 'ring-2 ring-yellow-400 scale-110' : ''}
              `}
            >
              {move === 'UP' ? '⬆️' : '⬇️'}
            </div>
          ))}
        </div>
      </div>

      {/* Current Price & Position */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Current Price</div>
          <div className="text-xl font-bold text-white">
            ${run.currentPrice?.toFixed(4) || '0.0000'}
          </div>
          <div className="text-sm text-gray-400">
            {run.priceDirection === 'up' ? '📈 Rising' : '📉 Falling'}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Position</div>
          <div className="text-xl font-bold text-blue-400">
            {run.currentPosition || 'Starting'}
          </div>
          <div className="text-sm text-gray-400">
            Risk Level: {run.riskLevel || 'Low'}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Potential Reward</div>
          <div className="text-xl font-bold text-green-400">
            {run.potentialDbp?.toFixed(2) || '0.00'} DBP
          </div>
          <div className="text-sm text-gray-400">
            Multiplier: {run.multiplier || '1.0'}x
          </div>
        </div>
      </div>

      {/* HODL Decision Panel */}
      {phase === 'decision' && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-yellow-400 mb-2">
              🚨 Checkpoint Reached!
            </h3>
            <p className="text-gray-300">
              You've reached the decision point. What's your move?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HODL Option */}
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
              <h4 className="text-lg font-bold text-green-400 mb-2">💎 HODL</h4>
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
                onClick={() => onHodlDecision(true)}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'HODL 💎'}
              </button>
            </div>

            {/* CLIMB Option */}
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <h4 className="text-lg font-bold text-blue-400 mb-2">🧗 CLIMB</h4>
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
                onClick={() => onHodlDecision(false)}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'CLIMB 🧗'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Complete Summary */}
      {phase === 'complete' && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Run Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Final Score</div>
              <div className="text-white font-medium">{run.finalScore || 0}</div>
            </div>
            <div>
              <div className="text-gray-400">DBP Earned</div>
              <div className="text-green-400 font-medium">{run.dbpEarned || 0}</div>
            </div>
            <div>
              <div className="text-gray-400">XP Gained</div>
              <div className="text-blue-400 font-medium">{run.xpGained || 0}</div>
            </div>
            <div>
              <div className="text-gray-400">Decision</div>
              <div className={`font-medium ${run.hodlDecision ? 'text-green-400' : 'text-blue-400'}`}>
                {run.hodlDecision ? 'HODL 💎' : 'CLIMB 🧗'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunProgress;
