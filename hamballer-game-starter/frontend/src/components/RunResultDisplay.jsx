import React from 'react';
import { Link } from 'react-router-dom';

const RunResultDisplay = ({ run, onPlayAgain }) => {
  if (!run) return null;

  // Determine badge tier based on XP earned
  const getBadgeInfo = (xp) => {
    if (xp >= 100) return { tier: 'Legendary', emoji: '👑', color: 'text-yellow-400' };
    if (xp >= 75) return { tier: 'Epic', emoji: '🥇', color: 'text-purple-400' };
    if (xp >= 50) return { tier: 'Rare', emoji: '🥈', color: 'text-blue-400' };
    if (xp >= 25) return { tier: 'Common', emoji: '🥉', color: 'text-bronze-400' };
    if (xp >= 1) return { tier: 'Participation', emoji: '🥾', color: 'text-gray-400' };
    return null;
  };

  const badgeInfo = run.xpGained > 0 ? getBadgeInfo(run.xpGained) : null;

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

      {/* XP Badge Mint Result */}
      {badgeInfo && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <span className="text-3xl">{badgeInfo.emoji}</span>
            <div>
              <h4 className={`text-lg font-semibold ${badgeInfo.color}`}>
                {badgeInfo.tier} Badge Earned!
              </h4>
              <p className="text-sm text-gray-400">{run.xpGained} XP Performance</p>
            </div>
          </div>
          
          {/* Badge mint status */}
          {run.badgeMintStatus === 'success' ? (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 mb-3">
              <p className="text-green-400 text-sm">✅ Badge minted successfully!</p>
              {run.badgeTxHash && (
                <p className="text-xs text-gray-400 mt-1">
                  Tx: {run.badgeTxHash.slice(0, 10)}...{run.badgeTxHash.slice(-8)}
                </p>
              )}
            </div>
          ) : run.badgeMintStatus === 'failed' ? (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-3">
              <p className="text-red-400 text-sm">❌ Badge mint failed</p>
              <p className="text-xs text-gray-400 mt-1">Will retry automatically</p>
            </div>
          ) : run.badgeMintStatus === 'pending' ? (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-3">
              <p className="text-yellow-400 text-sm">⏳ Badge minting in progress...</p>
            </div>
          ) : (
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 mb-3">
              <p className="text-blue-400 text-sm">🎫 Badge will be minted shortly</p>
            </div>
          )}

          <Link
            to="/claim"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View Badge Collection
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onPlayAgain}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Play Again
        </button>
        
        {badgeInfo && (
          <Link
            to="/claim"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-block"
          >
            Check Badge Status
          </Link>
        )}
      </div>
    </div>
  );
};

export default RunResultDisplay;
