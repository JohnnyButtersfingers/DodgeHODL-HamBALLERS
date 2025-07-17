import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Calendar, Filter, TrendingUp, User } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';

const XPProgressGraph = ({ showInDashboard = false }) => {
  const { address, isConnected } = useWallet();
  const [xpData, setXpData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [availableWallets, setAvailableWallets] = useState([]);
  const [badgeTier, setBadgeTier] = useState('all');
  const [chartType, setChartType] = useState('area');
  
  const timeRangeOptions = [
    { value: '24h', label: 'Last 24 Hours', hours: 24 },
    { value: '7d', label: 'Last 7 Days', hours: 24 * 7 },
    { value: '30d', label: 'Last 30 Days', hours: 24 * 30 }
  ];

  const badgeTierOptions = [
    { value: 'all', label: 'All Tiers' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'silver', label: 'Silver' },
    { value: 'gold', label: 'Gold' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'diamond', label: 'Diamond' }
  ];

  useEffect(() => {
    fetchAvailableWallets();
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setSelectedWallet(address);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (selectedWallet || timeRange === '24h' || timeRange === '7d') {
      fetchXPData();
    }
  }, [selectedWallet, timeRange, badgeTier]);

  const fetchAvailableWallets = async () => {
    try {
      const response = await apiFetch('/api/xp/wallets');
      if (response.ok) {
        const data = await response.json();
        setAvailableWallets(data.wallets || []);
      }
    } catch (error) {
      console.error('Error fetching available wallets:', error);
    }
  };

  const fetchXPData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        ...(selectedWallet && { wallet: selectedWallet }),
        ...(badgeTier !== 'all' && { badgeTier })
      });

      const endpoint = selectedWallet 
        ? `/api/xp/progress/${selectedWallet}?${params}`
        : `/api/xp/aggregate?${params}`;

      const response = await apiFetch(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        setXpData(formatXPData(data.xpProgress || []));
      }
    } catch (error) {
      console.error('Error fetching XP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatXPData = (rawData) => {
    return rawData.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp).getTime(),
      formattedTime: formatTimeLabel(point.timestamp),
      cumulativeXP: point.cumulativeXP || 0,
      xpGained: point.xpGained || 0,
      gamesPlayed: point.gamesPlayed || 0
    }));
  };

  const formatTimeLabel = (timestamp) => {
    const date = new Date(timestamp);
    if (timeRange === '24h') {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">
            {new Date(label).toLocaleString()}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
          {data.gamesPlayed > 0 && (
            <p className="text-gray-400 text-xs mt-1">
              Games: {data.gamesPlayed}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <AreaChart data={xpData}>
          <defs>
            <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00ff88" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#00ff88" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp"
            scale="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTimeLabel}
            stroke="#9CA3AF"
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulativeXP"
            stroke="#00ff88"
            fillOpacity={1}
            fill="url(#xpGradient)"
            strokeWidth={2}
            name="Cumulative XP"
          />
        </AreaChart>
      );
    } else if (chartType === 'bar') {
      return (
        <BarChart data={xpData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp"
            scale="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTimeLabel}
            stroke="#9CA3AF"
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="xpGained" fill="#00ff88" name="XP Gained" />
        </BarChart>
      );
    } else {
      return (
        <LineChart data={xpData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp"
            scale="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTimeLabel}
            stroke="#9CA3AF"
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="cumulativeXP"
            stroke="#00ff88"
            strokeWidth={2}
            dot={{ fill: '#00ff88', strokeWidth: 2, r: 4 }}
            name="Cumulative XP"
          />
          <Line
            type="monotone"
            dataKey="xpGained"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            name="XP per Session"
          />
        </LineChart>
      );
    }
  };

  const totalXP = xpData.reduce((sum, point) => Math.max(sum, point.cumulativeXP), 0);
  const totalGames = xpData.reduce((sum, point) => sum + (point.gamesPlayed || 0), 0);
  const avgXPPerGame = totalGames > 0 ? (totalXP / totalGames).toFixed(1) : 0;

  if (showInDashboard) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>XP Progress</span>
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : xpData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div>No XP data available</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2 mb-2">
              <TrendingUp className="w-6 h-6" />
              <span>XP Progress Tracker</span>
            </h2>
            <p className="text-gray-400">Track experience point gains over time</p>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Time Range Filter */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Wallet Filter */}
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none min-w-[200px]"
              >
                <option value="">All Players</option>
                {isConnected && address && (
                  <option value={address}>
                    My Wallet ({address.slice(0, 6)}...{address.slice(-4)})
                  </option>
                )}
                {availableWallets.map(wallet => (
                  <option key={wallet.address} value={wallet.address}>
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} 
                    ({wallet.totalXP} XP)
                  </option>
                ))}
              </select>
            </div>

            {/* Badge Tier Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={badgeTier}
                onChange={(e) => setBadgeTier(e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {badgeTierOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center space-x-4 mt-4">
          <span className="text-gray-400 text-sm">Chart Type:</span>
          {['area', 'line', 'bar'].map(type => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                chartType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {xpData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {totalXP.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Total XP</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {totalGames.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Games Played</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {avgXPPerGame}
            </div>
            <div className="text-gray-400 text-sm">Avg XP/Game</div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="h-96">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : xpData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <div className="text-xl mb-2">No XP data available</div>
                <div className="text-sm">
                  {selectedWallet 
                    ? 'This wallet has no XP data for the selected time range'
                    : 'No players have earned XP in the selected time range'
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XPProgressGraph;