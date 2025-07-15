import React from 'react';

const GameSummary = () => {
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
};

export default GameSummary;