import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseEventLogs } from 'viem';
import { useContracts } from './useContracts';
import { useWebSocket } from '../services/useWebSocketService';
import { apiFetch } from '../services/useApiService';

// Smart Contract Event Types
const EVENT_TYPES = {
  RUN_COMPLETED: 'RunCompleted',
  XP_AWARDED: 'XPAwarded',
  LEADERBOARD_UPDATE: 'LeaderboardUpdate',
  ACHIEVEMENT_UNLOCKED: 'AchievementUnlocked'
};

export const useSmartContractEvents = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { contracts } = useContracts();
  const { sendMessage, connected: wsConnected } = useWebSocket();
  
  // State management
  const [eventListeners, setEventListeners] = useState(new Map());
  const [recentEvents, setRecentEvents] = useState([]);
  const [processingEvents, setProcessingEvents] = useState(false);
  const [eventStats, setEventStats] = useState({
    totalEvents: 0,
    xpEvents: 0,
    runEvents: 0,
    lastEventTime: null
  });
  
  // Refs for tracking
  const lastBlockRef = useRef(null);
  const eventQueueRef = useRef([]);
  const processingRef = useRef(false);

  // Process XP-related events
  const processXPEvent = useCallback(async (event) => {
    try {
      const { eventName, args, transactionHash, blockNumber } = event;
      
      console.log('⚡ Processing XP event:', eventName, args);
      
      // Extract player address and XP amount from event args
      const playerAddress = args.player || args.user || args.address;
      const xpAmount = args.xp || args.amount || args.value;
      
      if (!playerAddress || !xpAmount) {
        console.warn('⚠️ Invalid XP event args:', args);
        return;
      }
      
      // Update backend with new XP
      const response = await apiFetch('/api/player/xp/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: playerAddress,
          xpAmount: Number(xpAmount),
          source: 'smart_contract',
          transactionHash,
          blockNumber
        })
      });
      
      if (response.success) {
        console.log('✅ XP updated successfully:', response.data);
        
        // Broadcast WebSocket update
        if (wsConnected) {
          sendMessage({
            type: 'xp_update',
            data: {
              address: playerAddress,
              xp: Number(xpAmount),
              source: 'smart_contract',
              transactionHash,
              blockNumber,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Update local stats
        setEventStats(prev => ({
          ...prev,
          xpEvents: prev.xpEvents + 1,
          totalEvents: prev.totalEvents + 1,
          lastEventTime: new Date()
        }));
      } else {
        console.error('❌ Failed to update XP:', response.error);
      }
    } catch (error) {
      console.error('❌ Error processing XP event:', error);
    }
  }, [wsConnected, sendMessage]);

  // Process run completion events
  const processRunCompletedEvent = useCallback(async (event) => {
    try {
      const { eventName, args, transactionHash, blockNumber } = event;
      
      console.log('🏃 Processing run completed event:', eventName, args);
      
      const playerAddress = args.player || args.user || args.address;
      const runData = {
        player: playerAddress,
        score: args.score || 0,
        distance: args.distance || 0,
        time: args.time || 0,
        xpEarned: args.xpEarned || 0,
        transactionHash,
        blockNumber
      };
      
      // Update backend with run completion
      const response = await apiFetch('/api/runs/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(runData)
      });
      
      if (response.success) {
        console.log('✅ Run completion processed:', response.data);
        
        // Broadcast WebSocket update
        if (wsConnected) {
          sendMessage({
            type: 'run_completed',
            data: {
              ...runData,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Update local stats
        setEventStats(prev => ({
          ...prev,
          runEvents: prev.runEvents + 1,
          totalEvents: prev.totalEvents + 1,
          lastEventTime: new Date()
        }));
      }
    } catch (error) {
      console.error('❌ Error processing run completed event:', error);
    }
  }, [wsConnected, sendMessage]);

  // Process leaderboard update events
  const processLeaderboardEvent = useCallback(async (event) => {
    try {
      const { eventName, args, transactionHash, blockNumber } = event;
      
      console.log('🏆 Processing leaderboard event:', eventName, args);
      
      // Trigger leaderboard refresh
      if (wsConnected) {
        sendMessage({
          type: 'leaderboard_refresh',
          data: {
            reason: 'contract_event',
            transactionHash,
            blockNumber,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Update local stats
      setEventStats(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + 1,
        lastEventTime: new Date()
      }));
    } catch (error) {
      console.error('❌ Error processing leaderboard event:', error);
    }
  }, [wsConnected, sendMessage]);

  // Event router - determines which handler to use
  const routeEvent = useCallback((event) => {
    const { eventName } = event;
    
    switch (eventName) {
      case EVENT_TYPES.RUN_COMPLETED:
        return processRunCompletedEvent(event);
      case EVENT_TYPES.XP_AWARDED:
        return processXPEvent(event);
      case EVENT_TYPES.LEADERBOARD_UPDATE:
        return processLeaderboardEvent(event);
      default:
        console.log('📋 Unhandled event type:', eventName);
        return Promise.resolve();
    }
  }, [processRunCompletedEvent, processXPEvent, processLeaderboardEvent]);

  // Process event queue
  const processEventQueue = useCallback(async () => {
    if (processingRef.current || eventQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    setProcessingEvents(true);
    
    try {
      const events = [...eventQueueRef.current];
      eventQueueRef.current = [];
      
      console.log(`📊 Processing ${events.length} contract events`);
      
      // Process events in parallel (with concurrency limit)
      const BATCH_SIZE = 5;
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(event => routeEvent(event)));
      }
      
      // Update recent events (keep last 20)
      setRecentEvents(prev => [...events, ...prev].slice(0, 20));
      
      console.log('✅ Event processing completed');
    } catch (error) {
      console.error('❌ Error processing event queue:', error);
    } finally {
      processingRef.current = false;
      setProcessingEvents(false);
    }
  }, [routeEvent]);

  // Listen for specific contract events
  const listenForEvents = useCallback(async (contractAddress, eventABI, eventName) => {
    if (!publicClient || !contractAddress || !eventABI) return;
    
    try {
      console.log(`📡 Setting up event listener for ${eventName} on ${contractAddress}`);
      
      // Create event filter
      const filter = await publicClient.createEventFilter({
        address: contractAddress,
        event: eventABI,
        fromBlock: lastBlockRef.current || 'latest'
      });
      
      // Start watching for events
      const unwatch = publicClient.watchEvent({
        address: contractAddress,
        event: eventABI,
        onLogs: (logs) => {
          console.log(`📨 Received ${logs.length} ${eventName} events`);
          
          const parsedEvents = logs.map(log => ({
            eventName,
            args: log.args,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            timestamp: new Date()
          }));
          
          // Add to processing queue
          eventQueueRef.current.push(...parsedEvents);
          
          // Process queue
          processEventQueue();
        },
        onError: (error) => {
          console.error(`❌ Error watching ${eventName} events:`, error);
        }
      });
      
      // Store listener for cleanup
      setEventListeners(prev => {
        const newListeners = new Map(prev);
        newListeners.set(`${contractAddress}-${eventName}`, unwatch);
        return newListeners;
      });
      
      console.log(`✅ Event listener set up for ${eventName}`);
      
    } catch (error) {
      console.error(`❌ Failed to set up event listener for ${eventName}:`, error);
    }
  }, [publicClient, processEventQueue]);

  // Initialize event listeners
  useEffect(() => {
    if (!isConnected || !contracts.hodlManager || !publicClient) return;
    
    const initializeListeners = async () => {
      try {
        // Example event ABIs (replace with actual ABIs from your contracts)
        const runCompletedABI = {
          type: 'event',
          name: 'RunCompleted',
          inputs: [
            { name: 'player', type: 'address', indexed: true },
            { name: 'score', type: 'uint256', indexed: false },
            { name: 'distance', type: 'uint256', indexed: false },
            { name: 'xpEarned', type: 'uint256', indexed: false }
          ]
        };
        
        const xpAwardedABI = {
          type: 'event',
          name: 'XPAwarded',
          inputs: [
            { name: 'player', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'reason', type: 'string', indexed: false }
          ]
        };
        
        // Set up listeners
        await listenForEvents(contracts.hodlManager.address, runCompletedABI, EVENT_TYPES.RUN_COMPLETED);
        await listenForEvents(contracts.hodlManager.address, xpAwardedABI, EVENT_TYPES.XP_AWARDED);
        
        console.log('✅ All event listeners initialized');
      } catch (error) {
        console.error('❌ Error initializing event listeners:', error);
      }
    };
    
    initializeListeners();
  }, [isConnected, contracts.hodlManager, publicClient, listenForEvents]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      eventListeners.forEach((unwatch, key) => {
        try {
          unwatch();
          console.log(`🧹 Cleaned up event listener: ${key}`);
        } catch (error) {
          console.error(`❌ Error cleaning up listener ${key}:`, error);
        }
      });
    };
  }, [eventListeners]);

  // Manual event fetch for historical data
  const fetchHistoricalEvents = useCallback(async (fromBlock = 'earliest', toBlock = 'latest') => {
    if (!publicClient || !contracts.hodlManager) return;
    
    try {
      console.log(`📊 Fetching historical events from block ${fromBlock} to ${toBlock}`);
      
      const logs = await publicClient.getLogs({
        address: contracts.hodlManager.address,
        fromBlock,
        toBlock,
        events: [
          // Add your event ABIs here
        ]
      });
      
      console.log(`📋 Found ${logs.length} historical events`);
      
      // Process historical events
      const parsedEvents = parseEventLogs({
        abi: contracts.hodlManager.abi,
        logs
      });
      
      // Add to processing queue
      eventQueueRef.current.push(...parsedEvents.map(event => ({
        eventName: event.eventName,
        args: event.args,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        timestamp: new Date()
      })));
      
      // Process queue
      await processEventQueue();
      
    } catch (error) {
      console.error('❌ Error fetching historical events:', error);
    }
  }, [publicClient, contracts.hodlManager, processEventQueue]);

  return {
    // Event management
    eventListeners: Array.from(eventListeners.keys()),
    recentEvents,
    processingEvents,
    eventStats,
    
    // Functions
    fetchHistoricalEvents,
    processEventQueue,
    
    // Event types
    EVENT_TYPES,
    
    // Status
    isListening: eventListeners.size > 0,
    isConnected: isConnected && !!publicClient
  };
};

export default useSmartContractEvents;