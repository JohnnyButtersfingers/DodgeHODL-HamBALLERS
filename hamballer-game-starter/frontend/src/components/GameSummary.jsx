import React, { memo, useMemo } from 'react';

const GameSummary = memo(() => {
  // Memoize game instructions to prevent unnecessary re-creation
  const gameInstructions = useMemo(() => [
    {
      step: '1',
      icon: '🎯',
      text: 'Select your 10 moves (UP/DOWN) to navigate the slipnode',
      color: 'text-green-400'
    },
    {
      step: '2',
      icon: '⚡',
      text: 'Watch your run play out in real-time',
      color: 'text-blue-400'
    },
    {
      step: '3',
      icon: '🤔',
      text: 'Decide to HODL or CLIMB when you reach the checkpoint',
      color: 'text-yellow-400'
    },
    {
      step: '4',
      icon: '💎',
      text: 'Earn DBP tokens based on your performance!',
      color: 'text-purple-400'
    }
  ], []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="animate-in zoom-in duration-700">
          {/* Hero Section */}
          <header className="mb-8 sm:mb-12">
            <div 
              className="text-6xl sm:text-7xl md:text-8xl mb-6 animate-bounce" 
              role="img" 
              aria-label="Basketball emoji"
            >
              🏀
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 animate-in slide-in-from-bottom duration-500 delay-200">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                HamBaller.xyz
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-8 animate-in slide-in-from-bottom duration-500 delay-300">
              The ultimate Web3 DODGE & HODL game. Connect your wallet to start playing!
            </p>
          </header>

          {/* How to Play Section */}
          <section 
            className="bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 delay-400"
            aria-labelledby="how-to-play-heading"
          >
            <h2 
              id="how-to-play-heading"
              className="text-2xl sm:text-3xl font-semibold text-white mb-6 sm:mb-8 flex items-center justify-center gap-3"
            >
              <span className="text-blue-400" aria-hidden="true">🎮</span>
              How to Play
            </h2>
            
            {/* Instructions List */}
            <ol className="text-left space-y-4 sm:space-y-6" aria-label="Game instructions">
              {gameInstructions.map((instruction, index) => (
                <li 
                  key={instruction.step}
                  className="flex items-start space-x-4 group animate-in slide-in-from-left duration-500"
                  style={{ animationDelay: `${500 + index * 100}ms` }}
                >
                  {/* Step Number */}
                  <span 
                    className={`${instruction.color} font-bold text-lg sm:text-xl flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 border border-current transition-all duration-300 group-hover:scale-110 group-hover:bg-current group-hover:text-gray-900`}
                    aria-hidden="true"
                  >
                    {instruction.step}
                  </span>
                  
                  {/* Instruction Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg" aria-hidden="true">{instruction.icon}</span>
                      <span className="text-gray-300 group-hover:text-white transition-colors duration-300 text-base sm:text-lg leading-relaxed">
                        {instruction.text}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {/* Call to Action */}
            <div className="mt-8 sm:mt-12 animate-in fade-in duration-500 delay-1000">
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4 sm:p-6">
                <p className="text-green-300 text-sm sm:text-base font-medium mb-2">
                  🚀 Ready to start your journey?
                </p>
                <p className="text-gray-400 text-sm">
                  Connect your wallet using the button in the top-right corner to begin playing!
                </p>
              </div>
            </div>
          </section>

          {/* Additional Info */}
          <footer className="mt-8 animate-in fade-in duration-500 delay-1200">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">🔒</span>
                <span>Secure Web3 Gaming</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">⚡</span>
                <span>Lightning Fast</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">💰</span>
                <span>Earn Real Rewards</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
});

GameSummary.displayName = 'GameSummary';

export default GameSummary;