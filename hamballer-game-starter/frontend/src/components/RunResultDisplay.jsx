import React from 'react';

const RunResultDisplay = ({ run, onPlayAgain }) => {
  if (!run) return null;
  return (
    <div className="text-center space-y-4">
      <div className="bg-green-500/20 border border-green-500 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-green-400 mb-2">
          {run.hodlSuccess ? '🎉 HODL Success!' : '💰 Climb Reward!'}
        </h3>
        <p className="text-gray-300">
          You earned <span className="text-green-400 font-bold">{run.dbpEarned || 0} DBP</span> tokens!
        </p>
        {run.xpGained > 0 && (
          <p className="text-blue-400 mt-2">+{run.xpGained} XP</p>
        )}
      </div>
      <button
        onClick={onPlayAgain}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
      >
        Play Again
      </button>
    </div>
  );
};

export default RunResultDisplay;
