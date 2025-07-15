import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Line,
  Bar,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line as LineChart, Bar as BarChart } from 'react-chartjs-2';
import { 
  TrendingUp, TrendingDown, BarChart3, Activity, 
  Calendar, Clock, Award, Target, RefreshCw, 
  AlertCircle, ZapIcon, History, ChevronDown
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useWallet } from '../contexts/WalletContext';
import { apiFetch } from '../services/useApiService';
import { useWebSocket } from '../services/useWebSocketService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const XPHistoryChart = ({ playerAddress }) => {
  const { address } = useWallet();
  const { connected: wsConnected } = useWebSocket();
  
  // Use provided address or connected wallet address
  const targetAddress = playerAddress || address;
  
  // State management
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [timeRange, setTimeRange] = useState('7d'); // '7d', '30d', 'all'
  const [showDetails, setShowDetails] = useState(false);

  // Fetch XP history data
  const fetchXPHistory = useCallback(async () => {
    if (!targetAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFetch(`/api/player/history?address=${targetAddress}`);
      
      if (response.success) {
        setHistoryData(response.data.history || []);
        console.log(`📈 Loaded ${response.data.history.length} XP history entries`);
      } else {
        setError(response.message || 'Failed to load XP history');
      }
    } catch (error) {
      console.error('Error fetching XP history:', error);
      setError('Failed to load XP history');
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  // Refresh XP history
  const refreshXPHistory = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await fetchXPHistory();
    setRefreshing(false);
  }, [fetchXPHistory, refreshing]);

  // Initial load
  useEffect(() => {
    fetchXPHistory();
  }, [fetchXPHistory]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!historyData.length) return [];
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeRange) {
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      case 'all':
      default:
        return historyData;
    }
    
    return historyData.filter(entry => new Date(entry.date) >= cutoffDate);
  }, [historyData, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!filteredData.length) return null;
    
    // Sort by timestamp
    const sortedData = [...filteredData].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate cumulative XP
    let cumulativeXP = 0;
    const processedData = sortedData.map(entry => {
      cumulativeXP += entry.amount;
      return {
        ...entry,
        cumulative: cumulativeXP,
        date: new Date(entry.timestamp * 1000)
      };
    });
    
    const labels = processedData.map(entry => format(entry.date, 'MMM dd, HH:mm'));
    const xpGains = processedData.map(entry => entry.amount);
    const cumulativeXP_values = processedData.map(entry => entry.cumulative);
    
    return {
      labels,
      datasets: [
        {
          label: 'XP Gained',
          data: xpGains,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        },
        {
          label: 'Cumulative XP',
          data: cumulativeXP_values,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y1',
        }
      ]
    };
  }, [filteredData]);

  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9CA3AF',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: `XP History (${timeRange === 'all' ? 'All Time' : timeRange})`,
        color: '#FFFFFF',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString()} XP`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF',
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          color: '#9CA3AF',
          callback: function(value) {
            return value.toLocaleString() + ' XP';
          }
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        ticks: {
          color: '#9CA3AF',
          callback: function(value) {
            return value.toLocaleString() + ' XP';
          }
        },
        grid: {
          drawOnChartArea: false,
          color: 'rgba(75, 85, 99, 0.3)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }), [timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    
    const totalXP = filteredData.reduce((sum, entry) => sum + entry.amount, 0);
    const avgXP = totalXP / filteredData.length;
    const maxXP = Math.max(...filteredData.map(entry => entry.amount));
    const minXP = Math.min(...filteredData.map(entry => entry.amount));
    
    // Calculate trend
    const recentEntries = filteredData.slice(-5);
    const recentAvg = recentEntries.length > 0 ? 
      recentEntries.reduce((sum, entry) => sum + entry.amount, 0) / recentEntries.length : 0;
    const trend = recentAvg > avgXP ? 'up' : recentAvg < avgXP ? 'down' : 'stable';
    
    return {
      totalXP,
      avgXP: Math.round(avgXP),
      maxXP,
      minXP,
      trend,
      sessions: filteredData.length
    };
  }, [filteredData]);

  // Format address for display
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!targetAddress) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-8 text-center">
        <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Connect your wallet to view your XP history</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">XP History</h2>
            <p className="text-sm text-gray-400">
              {playerAddress ? formatAddress(playerAddress) : 'Your progression'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* WebSocket Connection Status */}
          <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          
          {/* Chart Type Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-gray-800/50 rounded-lg">
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'line' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-lg transition-colors ${
                chartType === 'bar' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
          
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={refreshXPHistory}
            disabled={refreshing}
            className="p-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total XP</p>
                <p className="text-lg font-bold text-white">{stats.totalXP.toLocaleString()}</p>
              </div>
              <Award className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Average XP</p>
                <p className="text-lg font-bold text-white">{stats.avgXP.toLocaleString()}</p>
              </div>
              <Target className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Best Session</p>
                <p className="text-lg font-bold text-white">{stats.maxXP.toLocaleString()}</p>
              </div>
              <ZapIcon className="h-6 w-6 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Trend</p>
                <div className="flex items-center space-x-1">
                  {stats.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : stats.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <Activity className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    stats.trend === 'up' ? 'text-green-400' : 
                    stats.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {stats.trend === 'up' ? 'Rising' : 
                     stats.trend === 'down' ? 'Falling' : 'Stable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading XP history...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchXPHistory}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && !filteredData.length && (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No XP History</h3>
            <p className="text-gray-400">
              {timeRange === 'all' 
                ? 'Start playing to build your XP history!' 
                : `No XP gained in the ${timeRange === '7d' ? 'last 7 days' : 'last 30 days'}`}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && chartData && (
        <div className="h-96 mb-6">
          {chartType === 'line' ? (
            <LineChart data={chartData} options={chartOptions} />
          ) : (
            <BarChart data={chartData} options={chartOptions} />
          )}
        </div>
      )}

      {/* Detailed History Toggle */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="border-t border-gray-800/50 pt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>Show detailed history</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-2 max-h-64 overflow-y-auto"
              >
                {filteredData.slice().reverse().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <ZapIcon className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">+{entry.amount.toLocaleString()} XP</p>
                        <p className="text-sm text-gray-400">{format(new Date(entry.timestamp * 1000), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Session #{filteredData.length - index}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default XPHistoryChart;