import React from 'react';
import { useXp } from '../contexts/XpContext';

const DemoControls = () => {
  const { addXp, level } = useXp();

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  const triggerXpGain = (amount, source) => {
    addXp(amount, source);
  };

  const triggerLevelUp = () => {
    // Add enough XP to trigger a level up
    const xpNeeded = (level * 500) - 100; // Assuming current XP is low
    addXp(xpNeeded, 'demo');
  };

  const triggerMultipleNotifications = () => {
    setTimeout(() => addXp(100, 'achievement'), 100);
    setTimeout(() => addXp(50, 'lootpack'), 600);
    setTimeout(() => addXp(75, 'badge_claim'), 1100);
    setTimeout(() => addXp(200, 'run_completion'), 1600);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-yellow-900/90 backdrop-blur-sm border border-yellow-600 rounded-lg p-4 z-40">
      <h3 className="text-yellow-400 font-bold mb-3 text-sm">🔧 Demo Controls</h3>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          onClick={() => triggerXpGain(100, 'achievement')}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded"
        >
          +100 XP (Achievement)
        </button>
        
        <button
          onClick={() => triggerXpGain(50, 'lootpack')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded"
        >
          +50 XP (LootPack)
        </button>
        
        <button
          onClick={() => triggerXpGain(75, 'badge_claim')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
        >
          +75 XP (Badge)
        </button>
        
        <button
          onClick={() => triggerXpGain(200, 'run_completion')}
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
        >
          +200 XP (Run)
        </button>
        
        <button
          onClick={triggerLevelUp}
          className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded col-span-2"
        >
          🎉 Trigger Level Up
        </button>
        
        <button
          onClick={triggerMultipleNotifications}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded col-span-2"
        >
          🚀 Multiple Notifications
        </button>
      </div>
    </div>
  );
};

export default DemoControls;