import React, { memo, useMemo } from 'react';
import useXPBadge from '../hooks/useXPBadge';

// Badge metadata – keep in sync with backend / contract tiers
const BADGE_TYPES = [
  { id: 0, name: 'Participation', threshold: 1, max: 24, emoji: '🥾', color: 'text-gray-400' },
  { id: 1, name: 'Common',        threshold: 25, max: 49, emoji: '🥉', color: 'text-bronze-400' },
  { id: 2, name: 'Rare',          threshold: 50, max: 74, emoji: '🥈', color: 'text-blue-400' },
  { id: 3, name: 'Epic',          threshold: 75, max: 99, emoji: '🥇', color: 'text-purple-400' },
  { id: 4, name: 'Legendary',     threshold: 100, max: Infinity, emoji: '👑', color: 'text-yellow-400' },
];

/**
 * Small sidebar card that shows the player's badge balances and highlights tiers
 * for which they are currently eligible based on the XP earned in the most
 * recent run / overall session.
 */
const BadgeProgress = memo(({ currentXp = 0 }) => {
  const { balances, loading, error } = useXPBadge();

  // Combine static metadata with on-chain balances & eligibility flag
  const badgeRows = useMemo(() => {
    return BADGE_TYPES.map((b) => {
      const minted = balances?.[b.id] ? Number(balances[b.id]) : 0;
      const eligible = currentXp >= b.threshold;
      return { ...b, minted, eligible };
    });
  }, [balances, currentXp]);

  return (
    <section
      className="bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-gray-600/50"
      aria-labelledby="badge-progress-heading"
    >
      <h3
        id="badge-progress-heading"
        className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
      >
        <span className="text-yellow-400" aria-hidden="true">🏅</span>
        Badges
      </h3>

      {error && (
        <div className="text-sm text-red-400 mb-2">Error loading badges</div>
      )}

      <div className="space-y-3">
        {badgeRows.map((row) => (
          <div key={row.id} className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{row.emoji}</span>
              <span className={`${row.color}`}>{row.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {row.eligible && (
                <span className="text-green-400 text-xs font-medium">Eligible</span>
              )}
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium">
                {row.minted}
              </span>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-xs text-gray-400 mt-2">Updating…</div>
      )}
    </section>
  );
});

BadgeProgress.displayName = 'BadgeProgress';

export default BadgeProgress;