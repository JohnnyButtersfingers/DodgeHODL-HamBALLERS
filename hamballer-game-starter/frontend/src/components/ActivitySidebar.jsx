import React from 'react';
import StatOverlay from './StatOverlay';

const ActivitySidebar = ({ playerStats, boosts }) => {
  return (
    <div className="space-y-6">
      <StatOverlay stats={playerStats} />
      
      {/* Recent Activity */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Runs Today:</span>
            <span className="text-green-400">{playerStats?.runsToday || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Best Score:</span>
            <span className="text-blue-400">{playerStats?.bestScore || 0}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Total DBP:</span>
            <span className="text-yellow-400">{playerStats?.totalDbp || 0}</span>
          </div>
        </div>
      </div>

      {/* Available Boosts */}
      {boosts && boosts.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Available Boosts</h3>
          <div className="space-y-2">
            {boosts.map((boost) => (
              <div key={boost.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{boost.name}</span>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  {boost.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySidebar;