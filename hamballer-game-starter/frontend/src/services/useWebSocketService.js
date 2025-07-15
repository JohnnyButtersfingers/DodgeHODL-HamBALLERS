import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [liveXP, setLiveXP] = useState(null);
  const [liveReplay, setLiveReplay] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [dbpPrice, setDbpPrice] = useState(null);
  
  // Phase 5: Social XP Features
  const [friendsLeaderboard, setFriendsLeaderboard] = useState(null);
  const [xpHistory, setXpHistory] = useState(null);
  const [leaderboardUpdate, setLeaderboardUpdate] = useState(null);
  
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef(null);
  
  // Subscription management
  const [subscriptions, setSubscriptions] = useState(new Set());

  const connectWebSocket = () => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected successfully');
        setConnected(true);
        setSocket(ws);
        reconnectAttempts.current = 0;
        
        // Re-subscribe to all active subscriptions
        subscriptions.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          switch (data.type) {
            case 'connection':
              console.log('✅ WebSocket connection established');
              break;
              
            case 'xp_update':
              setLiveXP(data.data);
              break;
              
            case 'replay_update':
              setLiveReplay(data.data);
              break;
              
            case 'stats_update':
              setLiveStats(data.data);
              break;
              
            case 'price_update':
              setDbpPrice(data.data);
              break;
              
            // Phase 5: Social XP Features WebSocket handlers
            case 'friends_leaderboard_update':
              setFriendsLeaderboard(data.data);
              console.log('👥 Friends leaderboard updated:', data.data);
              break;
              
            case 'xp_history_update':
              setXpHistory(data.data);
              console.log('📈 XP history updated:', data.data);
              break;
              
            case 'leaderboard_update':
              setLeaderboardUpdate(data.data);
              console.log('🏆 Leaderboard updated:', data.data);
              break;
              
            case 'player_xp_change':
              // Handle individual player XP changes
              if (data.data && data.data.address) {
                console.log(`⚡ Player XP changed: ${data.data.address} - ${data.data.xp} XP`);
                setLiveXP(data.data);
              }
              break;
              
            case 'friend_added':
              // Handle friend addition events
              if (data.data) {
                console.log(`👥 Friend added: ${data.data.friend} to ${data.data.wallet}`);
                setFriendsLeaderboard(data.data);
              }
              break;
              
            case 'subscription_confirmed':
              console.log(`✅ Subscribed to channel: ${data.channel}`);
              break;
              
            case 'subscription_error':
              console.error(`❌ Subscription error for channel ${data.channel}:`, data.error);
              break;
              
            default:
              console.log('📨 Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        setSocket(null);
        
        // Attempt to reconnect if not a deliberate close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnected(false);
      };

      setSocket(ws);
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      setConnected(false);
    }
  };

  // Subscribe to a specific channel
  const subscribe = (channel) => {
    if (!channel) return;
    
    setSubscriptions(prev => new Set(prev).add(channel));
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', channel }));
      console.log(`📡 Subscribing to channel: ${channel}`);
    }
  };

  // Unsubscribe from a specific channel
  const unsubscribe = (channel) => {
    if (!channel) return;
    
    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel);
      return newSet;
    });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe', channel }));
      console.log(`📡 Unsubscribing from channel: ${channel}`);
    }
  };

  // Send a message through WebSocket
  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      console.log('📤 WebSocket message sent:', message);
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', message);
    }
  };

  // Phase 5: Social XP Features - Specific subscription helpers
  const subscribeFriendsLeaderboard = (walletAddress) => {
    if (walletAddress) {
      subscribe(`friends_leaderboard_${walletAddress}`);
    }
  };

  const subscribeXPHistory = (walletAddress) => {
    if (walletAddress) {
      subscribe(`xp_history_${walletAddress}`);
    }
  };

  const subscribeLeaderboardUpdates = () => {
    subscribe('leaderboard');
  };

  const subscribePlayerXPChanges = (walletAddress) => {
    if (walletAddress) {
      subscribe(`player_xp_${walletAddress}`);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, []);

  // Context value
  const value = {
    socket,
    connected,
    liveXP,
    liveReplay,
    liveStats,
    dbpPrice,
    
    // Phase 5: Social XP Features
    friendsLeaderboard,
    xpHistory,
    leaderboardUpdate,
    
    // Subscription management
    subscribe,
    unsubscribe,
    subscriptions: Array.from(subscriptions),
    
    // Helper functions
    sendMessage,
    subscribeFriendsLeaderboard,
    subscribeXPHistory,
    subscribeLeaderboardUpdates,
    subscribePlayerXPChanges,
    
    // Connection management
    reconnect: connectWebSocket,
    disconnect: () => {
      if (socket) {
        socket.close(1000, 'Manual disconnect');
      }
    }
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for friends leaderboard real-time updates
export const useFriendsLeaderboard = (walletAddress) => {
  const { friendsLeaderboard, subscribeFriendsLeaderboard, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    if (walletAddress) {
      subscribeFriendsLeaderboard(walletAddress);
      
      return () => {
        unsubscribe(`friends_leaderboard_${walletAddress}`);
      };
    }
  }, [walletAddress, subscribeFriendsLeaderboard, unsubscribe]);
  
  return friendsLeaderboard;
};

// Custom hook for XP history real-time updates
export const useXPHistory = (walletAddress) => {
  const { xpHistory, subscribeXPHistory, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    if (walletAddress) {
      subscribeXPHistory(walletAddress);
      
      return () => {
        unsubscribe(`xp_history_${walletAddress}`);
      };
    }
  }, [walletAddress, subscribeXPHistory, unsubscribe]);
  
  return xpHistory;
};

// Custom hook for leaderboard real-time updates
export const useLeaderboardUpdates = () => {
  const { leaderboardUpdate, subscribeLeaderboardUpdates, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    subscribeLeaderboardUpdates();
    
    return () => {
      unsubscribe('leaderboard');
    };
  }, [subscribeLeaderboardUpdates, unsubscribe]);
  
  return leaderboardUpdate;
};

// Custom hook for player XP changes
export const usePlayerXPChanges = (walletAddress) => {
  const { liveXP, subscribePlayerXPChanges, unsubscribe } = useWebSocket();
  
  useEffect(() => {
    if (walletAddress) {
      subscribePlayerXPChanges(walletAddress);
      
      return () => {
        unsubscribe(`player_xp_${walletAddress}`);
      };
    }
  }, [walletAddress, subscribePlayerXPChanges, unsubscribe]);
  
  return liveXP;
};

export default WebSocketProvider;
