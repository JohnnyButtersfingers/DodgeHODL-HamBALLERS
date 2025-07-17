import React, { memo, useMemo } from 'react';
import StatOverlay from './StatOverlay';

const ActivitySidebar = memo(({ playerStats, boosts }) => {
  const activityStats = useMemo(() => [
    { label: 'Runs Today', value: playerStats?.runsToday || 0, color: 'text-green-400' },
    { label: 'Best Score', value: playerStats?.bestScore || 0, color: 'text-blue-400' },
    { label: 'Total DBP', value: playerStats?.totalDbp || 0, color: 'text-yellow-400' }
  ], [playerStats]);

  const hasBoosts = useMemo(() => boosts && boosts.length > 0, [boosts]);
  return (
    <div className="space-y-6">
      <StatOverlay stats={playerStats} />
      
      {/* Recent Activity */}
      <div 
        className="bg-gray-800/50 rounded-lg p-4"
        role="region"
        aria-label="Recent game activity statistics"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div 
          className="space-y-2 text-sm"
          role="list"
          aria-label="Activity statistics list"
        >
          {activityStats.map((stat, index) => (
            <div 
              key={stat.label}
              className="flex justify-between text-gray-300"
              role="listitem"
            >
              <span>{stat.label}:</span>
              <span 
                className={stat.color}
                aria-live="polite"
                aria-atomic="true"
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Boosts */}
      {hasBoosts && (
        <div 
          className="bg-gray-800/50 rounded-lg p-4"
          role="region"
          aria-label="Available boost items"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Available Boosts</h3>
          <div 
            className="space-y-2"
            role="list"
            aria-label="Boost items list"
          >
            {boosts.map((boost) => (
              <div 
                key={boost.id} 
                className="flex justify-between items-center text-sm"
                role="listitem"
              >
                <span className="text-gray-300">{boost.name}</span>
                <span 
                  className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded"
                  aria-label={`${boost.count} ${boost.name} available`}
                >
                  {boost.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ActivitySidebar; 