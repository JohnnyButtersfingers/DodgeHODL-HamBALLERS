import React, { memo, useMemo } from 'react';
import StatOverlay from './StatOverlay';
import BadgeProgress from './BadgeProgress';
import { useXp } from '../contexts/XpContext';

const ActivitySidebar = memo(({ playerStats, boosts }) => {
  const { xp } = useXp();
  // Memoize activity data to prevent unnecessary recalculations
  const activityData = useMemo(() => [
    {
      label: 'Runs Today',
      value: playerStats?.runsToday || 0,
      color: 'text-green-400',
      icon: '🏃',
      ariaLabel: `Runs completed today: ${playerStats?.runsToday || 0}`
    },
    {
      label: 'Best Score',
      value: playerStats?.bestScore || 0,
      color: 'text-blue-400',
      icon: '🏆',
      ariaLabel: `Best score achieved: ${playerStats?.bestScore || 0}`
    },
    {
      label: 'Total DBP',
      value: playerStats?.totalDbp || 0,
      color: 'text-yellow-400',
      icon: '💰',
      ariaLabel: `Total DBP earned: ${playerStats?.totalDbp || 0}`
    }
  ], [playerStats]);

  // Memoize boost data for better performance
  const boostItems = useMemo(() => 
    boosts?.map((boost) => ({
      ...boost,
      ariaLabel: `${boost.name}: ${boost.count} available`
    })) || []
  , [boosts]);

  const hasBoosts = boostItems.length > 0;

  return (
    <aside className="space-y-4 sm:space-y-6" role="complementary" aria-label="Game statistics and boosts">
      {/* Stats Overview */}
      <div className="animate-in slide-in-from-right duration-500">
        <StatOverlay stats={playerStats} />
      </div>

      {/* Badge Progress */}
      <div className="animate-in slide-in-from-right duration-500 delay-75">
        <BadgeProgress currentXp={playerStats?.currentXp ?? xp} />
      </div>
      
      {/* Recent Activity */}
      <section 
        className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-gray-600/50 animate-in slide-in-from-right duration-500 delay-100"
        aria-labelledby="recent-activity-heading"
      >
        <h3 
          id="recent-activity-heading"
          className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
        >
          <span className="text-blue-400" aria-hidden="true">📊</span>
          Recent Activity
        </h3>
        <div className="space-y-3">
          {activityData.map((item, index) => (
            <div 
              key={item.label}
              className="flex justify-between items-center text-sm group hover:bg-gray-700/30 rounded-lg p-2 -m-2 transition-all duration-200"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <span className="text-gray-300 flex items-center gap-2 group-hover:text-white transition-colors duration-200">
                <span className="text-xs" aria-hidden="true">{item.icon}</span>
                {item.label}:
              </span>
              <span 
                className={`${item.color} font-medium transition-all duration-200 group-hover:scale-105`}
                aria-label={item.ariaLabel}
              >
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Available Boosts */}
      {hasBoosts && (
        <section 
          className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-gray-600/50 animate-in slide-in-from-right duration-500 delay-200"
          aria-labelledby="boosts-heading"
        >
          <h3 
            id="boosts-heading"
            className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
          >
            <span className="text-purple-400" aria-hidden="true">⚡</span>
            Available Boosts
          </h3>
          <div className="space-y-3">
            {boostItems.map((boost, index) => (
              <div 
                key={boost.id}
                className="flex justify-between items-center text-sm group hover:bg-gray-700/30 rounded-lg p-2 -m-2 transition-all duration-200 cursor-pointer"
                style={{ animationDelay: `${250 + index * 75}ms` }}
                tabIndex={0}
                role="button"
                aria-label={boost.ariaLabel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    // Future: Handle boost selection
                    e.preventDefault();
                  }
                }}
              >
                <span className="text-gray-300 group-hover:text-white transition-colors duration-200 flex-1">
                  {boost.name}
                </span>
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/30 group-hover:bg-blue-500/30 group-hover:border-blue-400/50 transition-all duration-200 group-hover:scale-105">
                  {boost.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loading State for when data is not available */}
      {!playerStats && (
        <section className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-lg animate-pulse">
          <div className="space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-700 rounded w-5/6"></div>
              <div className="h-3 bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
});

ActivitySidebar.displayName = 'ActivitySidebar';

export default ActivitySidebar;