import React, { useEffect, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getLeaderboard } from '../services/useApiService';

const Leaderboard = () => {
  const { address } = useWallet();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getLeaderboard();
        setPlayers(data);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div>Loading leaderboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">🏆 Leaderboard</h1>
      <table className="min-w-full">
        <thead className="bg-gray-700/50">
          <tr className="text-sm text-gray-300">
            <th className="py-2 px-4 text-left">Rank</th>
            <th className="py-2 px-4 text-left">Player</th>
            <th className="py-2 px-4 text-left">XP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {players.map((p, idx) => {
            const isUser = address && p.address.toLowerCase() === address.toLowerCase();
            return (
              <tr
                key={p.address}
                className={isUser ? 'bg-green-500/20' : 'hover:bg-gray-700/30'}
              >
                <td className="py-2 px-4">{idx + 1}</td>
                <td className="py-2 px-4 font-mono">
                  {p.address.slice(0, 6)}...{p.address.slice(-4)}
                </td>
                <td className="py-2 px-4 text-green-300">{p.xp}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;

