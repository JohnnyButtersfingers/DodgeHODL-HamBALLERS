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
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = () => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;
        
        // Subscribe to all channels
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'xp' }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'replay' }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'stats' }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'price' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.channel) {
            case 'xp':
              setLiveXP(data.data);
              break;
            case 'replay':
              setLiveReplay(data.data);
              break;
            case 'stats':
              setLiveStats(data.data);
              break;
            case 'price':
              setDbpPrice(data.data);
              break;
            default:
              console.log('Unknown channel:', data.channel);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setSocket(null);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          setTimeout(() => {
            console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
            connectWebSocket();
          }, Math.pow(2, reconnectAttempts.current) * 1000); // Exponential backoff
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const sendMessage = (message) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  const value = {
    socket,
    connected,
    liveXP,
    liveReplay,
    liveStats,
    dbpPrice,
    sendMessage,
    reconnect: connectWebSocket,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
