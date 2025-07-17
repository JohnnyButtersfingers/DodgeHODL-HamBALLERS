import React, { useCallback } from 'react';
import { useAudio } from '../contexts/AudioContext';

const MoveSelector = ({ selectedMoves, onMovesChange, onStartRun, loading, boosts }) => {
  const moves = ['UP', 'DOWN'];
  const maxMoves = 10;
  const { playGameSound } = useAudio();

  const handleMoveClick = useCallback((move) => {
    if (selectedMoves.length < maxMoves) {
      playGameSound('moveSelect');
      const newMoves = [...selectedMoves, move];
      onMovesChange(newMoves);
    }
  }, [selectedMoves.length, maxMoves, playGameSound, onMovesChange]);

  const handleClearMoves = useCallback(() => {
    playGameSound('buttonClick');
    onMovesChange([]);
  }, [playGameSound, onMovesChange]);

  const handleRandomMoves = useCallback(() => {
    playGameSound('buttonClick');
    const randomMoves = Array.from({ length: maxMoves }, () =>
      moves[Math.floor(Math.random() * moves.length)]
    );
    onMovesChange(randomMoves);
  }, [playGameSound, maxMoves, moves, onMovesChange]);

  return (
    <div className="space-y-6">
      {/* Move Selection */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Select Your Moves ({selectedMoves.length}/{maxMoves})
          </h3>
          <div className="space-x-2">
            <button
              onClick={handleRandomMoves}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Random
            </button>
            <button
              onClick={handleClearMoves}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Move Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {moves.map((move) => (
            <button
              key={move}
              onClick={() => handleMoveClick(move)}
              disabled={selectedMoves.length >= maxMoves}
              className={`py-8 text-xl font-bold rounded-lg transition-colors ${
                move === 'UP'
                  ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/50'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50'
              } text-white disabled:cursor-not-allowed`}
            >
              {move === 'UP' ? '⬆️ UP' : '⬇️ DOWN'}
            </button>
          ))}
        </div>

        {/* Selected Moves Display */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Your Move Sequence:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedMoves.map((move, index) => (
              <div
                key={index}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  move === 'UP'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {index + 1}. {move}
              </div>
            ))}
            {Array.from({ length: maxMoves - selectedMoves.length }).map((_, index) => (
              <div
                key={selectedMoves.length + index}
                className="px-3 py-1 rounded text-sm bg-gray-600/20 text-gray-500"
              >
                {selectedMoves.length + index + 1}. ?
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Run Button */}
      <button
        onClick={() => {
          playGameSound('success');
          onStartRun();
        }}
        disabled={selectedMoves.length !== maxMoves || loading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 text-xl rounded-lg transition-colors"
      >
        {loading ? 'Starting Run...' : `Start Run (${selectedMoves.length}/${maxMoves} moves)`}
      </button>
    </div>
  );
};

export default MoveSelector;
