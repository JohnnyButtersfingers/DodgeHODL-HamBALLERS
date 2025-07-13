import React, { useEffect, useRef, useState } from 'react';

const LiveReplay = ({ replay }) => {
  const [events, setEvents] = useState([]);
  const eventsEndRef = useRef(null);

  useEffect(() => {
    if (replay) {
      setEvents(prev => [...prev, replay].slice(-20)); // Keep last 20 events
    }
  }, [replay]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'move': return '🎯';
      case 'price_update': return '💹';
      case 'checkpoint': return '🚩';
      case 'hodl_decision': return '💎';
      case 'reward': return '💰';
      case 'penalty': return '💥';
      default: return '📡';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'move': return 'text-blue-400';
      case 'price_update': return 'text-yellow-400';
      case 'checkpoint': return 'text-orange-400';
      case 'hodl_decision': return 'text-purple-400';
      case 'reward': return 'text-green-400';
      case 'penalty': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Live Game Feed</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-400">Live</span>
        </div>
      </div>

      <div className="h-64 overflow-y-auto space-y-2 bg-gray-900/50 rounded p-3">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-2xl mb-2">📡</div>
            <div>Waiting for game events...</div>
          </div>
        ) : (
          events.map((event, index) => (
            <div 
              key={index}
              className="flex items-start space-x-3 p-2 bg-gray-800/30 rounded border-l-2 border-gray-600 hover:border-blue-500 transition-colors"
            >
              <div className="text-lg">{getEventIcon(event.type)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${getEventColor(event.type)}`}>
                    {event.type?.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-300 mt-1">
                  {event.message || event.description}
                </div>
                
                {event.data && (
                  <div className="text-xs text-gray-500 mt-1 font-mono">
                    {typeof event.data === 'object' 
                      ? JSON.stringify(event.data, null, 2)
                      : event.data
                    }
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={eventsEndRef} />
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-400">Events</div>
          <div className="text-sm font-medium text-white">{events.length}</div>
        </div>
        <div className="bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-400">Last Update</div>
          <div className="text-sm font-medium text-white">
            {events.length > 0 ? formatTimestamp(events[events.length - 1].timestamp) : '--:--'}
          </div>
        </div>
        <div className="bg-gray-700/50 rounded p-2">
          <div className="text-xs text-gray-400">Status</div>
          <div className="text-sm font-medium text-green-400">Active</div>
        </div>
      </div>
    </div>
  );
};

export default LiveReplay;