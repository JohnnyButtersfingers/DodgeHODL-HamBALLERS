import React, { useState } from 'react';

const HelpPanel = ({ className = '' }) => {
  const [activeSection, setActiveSection] = useState('gameplay');
  const [isExpanded, setIsExpanded] = useState(false);

  const helpSections = {
    gameplay: {
      title: 'How to Play',
      icon: '🎮',
      content: [
        {
          question: 'What is DODGE & HODL?',
          answer: 'Navigate through volatile crypto markets by making strategic moves and timing your HODL decisions to maximize DBP token rewards.',
          emoji: '📈'
        },
        {
          question: 'How do I start a game?',
          answer: 'Connect your wallet, click "Start Game," then make moves through market volatility and choose when to HODL for maximum gains.',
          emoji: '🚀'
        },
        {
          question: 'What are DBP tokens?',
          answer: 'DBP (DODGE Ball Points) are your reward tokens earned through successful gameplay. Use them for boosts and special features.',
          emoji: '💰'
        }
      ]
    },
    xp: {
      title: 'XP & Badges',
      icon: '🏆',
      content: [
        {
          question: 'How do I earn XP?',
          answer: 'Complete games, make successful moves, and achieve high scores. Different actions give different XP amounts.',
          emoji: '⚡'
        },
        {
          question: 'What are badges?',
          answer: 'Achievement badges unlock as you reach XP milestones. Each badge shows your mastery of different game aspects.',
          emoji: '🏅'
        },
        {
          question: 'How do levels work?',
          answer: 'Your level increases as you accumulate XP. Higher levels unlock new features and show your expertise.',
          emoji: '📊'
        }
      ]
    },
    strategy: {
      title: 'Pro Strategies',
      icon: '🧠',
      content: [
        {
          question: 'When should I HODL?',
          answer: 'Watch for price volatility patterns. HODL during upward trends but be ready to move during crashes.',
          emoji: '💎'
        },
        {
          question: 'How to maximize rewards?',
          answer: 'Take calculated risks, time your moves carefully, and use NFT boosts strategically for higher multipliers.',
          emoji: '🎯'
        },
        {
          question: 'Best practices?',
          answer: 'Start with smaller moves to learn patterns, study market history, and practice timing without rushing.',
          emoji: '📚'
        }
      ]
    },
    technical: {
      title: 'Technical Help',
      icon: '⚙️',
      content: [
        {
          question: 'Wallet connection issues?',
          answer: 'Make sure your wallet supports Abstract Testnet. Try refreshing the page or switching wallet networks.',
          emoji: '🔧'
        },
        {
          question: 'Transaction failed?',
          answer: 'Check your wallet for sufficient gas fees and network connectivity. Wait a moment and try again.',
          emoji: '⚠️'
        },
        {
          question: 'Game not loading?',
          answer: 'Clear your browser cache, check internet connection, and ensure JavaScript is enabled.',
          emoji: '🔄'
        }
      ]
    }
  };

  const quickTips = [
    { tip: 'Start with small moves to learn market patterns', emoji: '🎯' },
    { tip: 'Watch the live price feed for timing cues', emoji: '👀' },
    { tip: 'Use NFT boosts during high-volatility periods', emoji: '🚀' },
    { tip: 'Review replays to improve your strategy', emoji: '📺' }
  ];

  return (
    <div className={`panel-dark rounded-2xl shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-soft-grey/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-logo font-bold text-cloud-white">
              Need Help? 🤔
            </h3>
            <p className="text-label text-gray-400">
              Everything you need to master HamBaller
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-help text-sm py-2 px-4 flex items-center space-x-2"
          >
            <span>❓</span>
            <span>{isExpanded ? 'Minimize' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="p-6 border-b border-soft-grey/20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(helpSections).map(([key, section]) => (
            <button
              key={key}
              onClick={() => {
                setActiveSection(key);
                setIsExpanded(true);
              }}
              className={`p-3 rounded-2xl text-center transition-all duration-200 touch-target ${
                activeSection === key 
                  ? 'bg-neon-yellow text-retro-black shadow-glow-yellow' 
                  : 'bg-soft-grey/10 text-gray-400 hover:bg-neon-yellow/20 hover:text-neon-yellow'
              }`}
            >
              <div className="text-2xl mb-1">{section.icon}</div>
              <div className="text-label font-medium">{section.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {isExpanded && (
        <div className="p-6 animate-in slide-in-from-top duration-300">
          <div className="space-y-6">
            {/* Active Section Content */}
            <div>
              <h4 className="text-body font-bold text-cloud-white mb-4 flex items-center space-x-2">
                <span className="text-2xl">{helpSections[activeSection].icon}</span>
                <span>{helpSections[activeSection].title}</span>
              </h4>
              
              <div className="space-y-4">
                {helpSections[activeSection].content.map((item, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-retro-black/50 rounded-2xl border border-soft-grey/20"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{item.emoji}</div>
                      <div className="flex-1">
                        <h5 className="text-body font-semibold text-cloud-white mb-2">
                          {item.question}
                        </h5>
                        <p className="text-label text-gray-400">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tips Section */}
            <div className="border-t border-soft-grey/20 pt-6">
              <h4 className="text-body font-bold text-cloud-white mb-4 flex items-center space-x-2">
                <span className="text-2xl">💡</span>
                <span>Quick Tips</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickTips.map((tip, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-fresh-green/10 rounded-2xl border border-fresh-green/30 flex items-center space-x-3"
                  >
                    <div className="text-xl">{tip.emoji}</div>
                    <p className="text-label text-gray-300 flex-1">
                      {tip.tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact & Support */}
            <div className="border-t border-soft-grey/20 pt-6">
              <h4 className="text-body font-bold text-cloud-white mb-4 flex items-center space-x-2">
                <span className="text-2xl">📞</span>
                <span>Still Need Help?</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a 
                  href="#" 
                  className="btn-primary text-center py-3 flex items-center justify-center space-x-2 no-underline"
                >
                  <span>💬</span>
                  <span>Discord</span>
                </a>
                <a 
                  href="#" 
                  className="btn-secondary text-center py-3 flex items-center justify-center space-x-2 no-underline"
                >
                  <span>📖</span>
                  <span>Docs</span>
                </a>
                <a 
                  href="#" 
                  className="btn-help text-center py-3 flex items-center justify-center space-x-2 no-underline"
                >
                  <span>🐦</span>
                  <span>Twitter</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Quick Actions */}
      {!isExpanded && (
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="btn-help py-3 flex items-center justify-center space-x-2 text-sm"
              onClick={() => setIsExpanded(true)}
            >
              <span>❓</span>
              <span>Quick Help</span>
            </button>
            <button className="btn-primary py-3 flex items-center justify-center space-x-2 text-sm">
              <span>💬</span>
              <span>Support</span>
            </button>
          </div>

          {/* Mini Tips Carousel */}
          <div className="mt-4 p-3 bg-arcade-blue/10 rounded-2xl border border-arcade-blue/30">
            <div className="flex items-center space-x-2">
              <div className="text-lg">💡</div>
              <p className="text-label text-gray-400 flex-1">
                Tip: {quickTips[Math.floor(Date.now() / 10000) % quickTips.length].tip}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Help Button (Always Visible) */}
      <div className="absolute top-4 right-4">
        <button 
          className="w-12 h-12 bg-retro-red hover:bg-retro-red/90 text-cloud-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          title="Emergency Help"
        >
          <span className="text-xl">🆘</span>
        </button>
      </div>
    </div>
  );
};

export default HelpPanel;