import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

const SidebarNav = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { isConnected } = useWallet();
  const [activeSection, setActiveSection] = useState('game');

  const navSections = [
    {
      id: 'game',
      title: 'Game',
      items: [
        { path: '/', label: 'Play Game', icon: '🎮', requiresAuth: false },
        { path: '/dashboard', label: 'Dashboard', icon: '📊', requiresAuth: true },
        { path: '/leaderboard', label: 'Leaderboard', icon: '🏆', requiresAuth: false },
      ]
    },
    {
      id: 'rewards',
      title: 'Rewards',
      items: [
        { path: '/badges', label: 'Badges', icon: '🏅', requiresAuth: true },
        { path: '/claim', label: 'Claim XP', icon: '⚡', requiresAuth: true },
        { path: '/replay', label: 'Replays', icon: '📺', requiresAuth: false },
      ]
    },
    {
      id: 'community',
      title: 'Community',
      items: [
        { path: '/dev/recent-claims', label: 'Recent Claims', icon: '🔔', requiresAuth: false },
        { path: '/launch-dashboard', label: 'Launch Stats', icon: '🚀', requiresAuth: false },
      ]
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-retro-black border-r border-soft-grey/20
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:relative lg:transform-none
      `}>
        {/* Header */}
        <div className="p-6 border-b border-soft-grey/20">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🏀</span>
              <span className="text-logo text-xl font-bold text-cloud-white">
                HamBaller
              </span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-soft-grey/10 touch-target"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] mobile-scroll">
          {navSections.map((section) => (
            <div key={section.id}>
              <h3 className="text-label uppercase text-gray-500 mb-3 px-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const shouldShow = !item.requiresAuth || isConnected;
                  
                  if (!shouldShow) return null;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`
                        flex items-center space-x-3 px-3 py-3 rounded-xl
                        transition-all duration-200 touch-target
                        ${isActive(item.path)
                          ? 'bg-arcade-blue text-cloud-white shadow-lg'
                          : 'text-gray-400 hover:bg-soft-grey/10 hover:text-cloud-white'
                        }
                      `}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-body font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-soft-grey/20">
          <div className="flex items-center justify-between text-label text-gray-500">
            <span>v10.2A</span>
            <span>Beta</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarNav;