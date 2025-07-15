import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, TrendingUp, Activity, Zap, Award, 
  Settings, Maximize2, Minimize2, RefreshCw,
  BarChart3, History, Trophy, Star
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useWebSocket } from '../services/useWebSocketService';
import useSmartContractEvents from '../hooks/useSmartContractEvents';
import FriendLeaderboard from './FriendLeaderboard';
import XPHistoryChart from './XPHistoryChart';
import PlayerBrowser from './PlayerBrowser';

const SocialDashboard = () => {
  const { address } = useWallet();
  const { connected: wsConnected } = useWebSocket();
  const { 
    eventStats, 
    recentEvents, 
    processingEvents, 
    isListening 
  } = useSmartContractEvents();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'history', label: 'XP History', icon: History },
    { id: 'browser', label: 'Player Browser', icon: Trophy },
    { id: 'events', label: 'Live Events', icon: Activity }
  ];

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Recent activity summary
  const activitySummary = useMemo(() => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentActivity = recentEvents.filter(event => 
      new Date(event.timestamp) > last24h
    );
    
    return {
      totalEvents: recentActivity.length,
      xpEvents: recentActivity.filter(e => e.eventName.includes('XP')).length,
      runEvents: recentActivity.filter(e => e.eventName.includes('Run')).length,
      lastActivity: recentActivity[0]?.timestamp || null
    };
  }, [recentEvents]);

  // Status indicators
  const StatusIndicator = ({ label, status, color }) => (
    <div className="flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{status}</span>
    </div>
  );

  // Overview Tab Component
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">WebSocket Status</p>
              <p className={`text-lg font-bold ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
                {wsConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${wsConnected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Zap className={`h-6 w-6 ${wsConnected ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Smart Contract Events</p>
              <p className={`text-lg font-bold ${isListening ? 'text-green-400' : 'text-yellow-400'}`}>
                {isListening ? 'Listening' : 'Idle'}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${isListening ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              <Activity className={`h-6 w-6 ${isListening ? 'text-green-400' : 'text-yellow-400'}`} />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Recent Activity</p>
              <p className="text-lg font-bold text-white">{activitySummary.totalEvents}</p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Trophy className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">24h Activity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{activitySummary.totalEvents}</p>
            <p className="text-sm text-gray-400">Total Events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{activitySummary.xpEvents}</p>
            <p className="text-sm text-gray-400">XP Events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{activitySummary.runEvents}</p>
            <p className="text-sm text-gray-400">Run Events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{eventStats.totalEvents}</p>
            <p className="text-sm text-gray-400">All Time</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('friends')}
            className="flex items-center space-x-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors"
          >
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-blue-400 font-medium">View Friends</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className="flex items-center space-x-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors"
          >
            <History className="h-5 w-5 text-green-400" />
            <span className="text-green-400 font-medium">XP History</span>
          </button>
          
          <button
            onClick={() => setActiveTab('events')}
            className="flex items-center space-x-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors"
          >
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-purple-400 font-medium">Live Events</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Events Tab Component
  const EventsTab = () => (
    <div className="space-y-6">
      {/* Event Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Events</p>
              <p className="text-lg font-bold text-white">{eventStats.totalEvents}</p>
            </div>
            <Star className="h-6 w-6 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">XP Events</p>
              <p className="text-lg font-bold text-green-400">{eventStats.xpEvents}</p>
            </div>
            <Award className="h-6 w-6 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Run Events</p>
              <p className="text-lg font-bold text-blue-400">{eventStats.runEvents}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Recent Events</h3>
          <div className="flex items-center space-x-2">
            {processingEvents && (
              <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
            )}
            <span className="text-sm text-gray-400">
              {recentEvents.length} events
            </span>
          </div>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No recent events</p>
            </div>
          ) : (
            recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Activity className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{event.eventName}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Block #{event.blockNumber}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (!address) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Connect your wallet to access the social dashboard</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl transition-all duration-300 ${
      isExpanded ? 'col-span-2' : ''
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Social Dashboard</h2>
              <p className="text-sm text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status Indicators */}
            <StatusIndicator
              label="WebSocket"
              status={wsConnected ? 'Online' : 'Offline'}
              color={wsConnected ? 'bg-green-400' : 'bg-red-400'}
            />
            
            <StatusIndicator
              label="Events"
              status={isListening ? 'Listening' : 'Idle'}
              color={isListening ? 'bg-green-400' : 'bg-yellow-400'}
            />
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4 text-gray-400" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center space-x-1 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'friends' && <FriendLeaderboard />}
            {activeTab === 'history' && <XPHistoryChart />}
            {activeTab === 'browser' && <PlayerBrowser />}
            {activeTab === 'events' && <EventsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SocialDashboard;