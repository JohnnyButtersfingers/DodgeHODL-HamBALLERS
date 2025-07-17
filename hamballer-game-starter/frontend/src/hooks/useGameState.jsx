import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useXp } from '../contexts/XpContext';
import { useWebSocket } from '../services/useWebSocketService';
import useContracts from './useContracts';
import { startRunApi, endRunApi, apiFetch } from '../services/useApiService';

const GameStateContext = createContext();

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};

// Game state reducer
const gameStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_RUN':
      return {
        ...state,
        currentRun: action.payload,
      };
    case 'UPDATE_RUN_PROGRESS':
      return {
        ...state,
        currentRun: {
          ...state.currentRun,
          ...action.payload,
        },
      };
    case 'SET_PLAYER_STATS':
      return {
        ...state,
        playerStats: action.payload,
      };
    case 'SET_BOOSTS':
      return {
        ...state,
        boosts: action.payload,
      };
    case 'SET_DBP_BALANCE':
      return {
        ...state,
        dbpBalance: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'RESET_RUN':
      return {
        ...state,
        currentRun: null,
        error: null,
      };
    default:
      return state;
  }
};

const initialState = {
  currentRun: null,
  playerStats: null,
  boosts: [],
  dbpBalance: '0',
  loading: false,
  error: null,
};

export const GameStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameStateReducer, initialState);
  const { address, isConnected } = useWallet();
  const { setXp } = useXp();
  const { liveXP, liveStats } = useWebSocket();
  const { 
    startRun: contractStartRun, 
    endRun: contractEndRun, 
    isConnected: contractAvailable,
    getDbpBalance,
    getBoostBalances
  } = useContracts();

  // Update player stats when live stats come in
  useEffect(() => {
    if (liveStats && liveStats.address === address) {
      dispatch({
        type: 'SET_PLAYER_STATS',
        payload: liveStats,
      });
    }
  }, [liveStats, address]);

  useEffect(() => {
    if (liveXP && liveXP.playerAddress === address) {
      setXp((xp) => xp + (liveXP.xpEarned || 0));
    }
  }, [liveXP, address, setXp]);

  // Fetch initial data when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      fetchPlayerData();
    }
  }, [isConnected, address]);

  const fetchPlayerData = async () => {
    if (!address) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Fetch player stats from backend
      const statsResponse = await apiFetch(`/api/dashboard/stats/${address}`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        dispatch({ type: 'SET_PLAYER_STATS', payload: stats });
      }

      // Fetch DBP balance from contract if available
      if (contractAvailable) {
        try {
          const dbpBalance = await getDbpBalance(address);
          dispatch({ type: 'SET_DBP_BALANCE', payload: dbpBalance });
        } catch (error) {
          console.warn('Failed to fetch DBP balance from contract:', error);
        }
      }

      // Fetch boost balances from contract if available
      if (contractAvailable) {
        try {
          const boostBalances = await getBoostBalances(address);
          const formattedBoosts = boostBalances.map(boost => ({
            id: boost.id,
            name: getBoostName(boost.id),
            count: parseInt(boost.balance)
          }));
          dispatch({ type: 'SET_BOOSTS', payload: formattedBoosts });
        } catch (error) {
          console.warn('Failed to fetch boost balances from contract:', error);
          // Fallback to mock data
          dispatch({ 
            type: 'SET_BOOSTS', 
            payload: [
              { id: 0, name: 'Speed Boost', count: 2 },
              { id: 1, name: 'Shield', count: 1 },
              { id: 2, name: 'Double Points', count: 3 },
            ] 
          });
        }
      } else {
        // Mock data when contracts not available
        dispatch({ 
          type: 'SET_BOOSTS', 
          payload: [
            { id: 0, name: 'Speed Boost', count: 2 },
            { id: 1, name: 'Shield', count: 1 },
            { id: 2, name: 'Double Points', count: 3 },
          ] 
        });
      }

    } catch (error) {
      console.error('Error fetching player data:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'Failed to load player data' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getBoostName = (boostId) => {
    const boostNames = {
      0: 'Speed Boost',
      1: 'Shield',
      2: 'Double Points',
      3: 'Time Freeze',
      4: 'Multiplier'
    };
    return boostNames[boostId] || `Boost ${boostId}`;
  };

  const startRun = async (moveSelection, boostIds = []) => {
    if (!address) {
      dispatch({ type: 'SET_ERROR', payload: 'Wallet not connected' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      let runData;
      
      // Try on-chain transaction first if contracts are available
      if (contractAvailable) {
        try {
          console.log('🚀 Starting run on-chain...');
          const tx = await contractStartRun(moveSelection, boostIds);
          console.log('✅ On-chain run started:', tx);
          
          // Generate a unique run ID for tracking
          const runId = `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          runData = { 
            runId,
            moves: moveSelection,
            boostIds,
            txHash: tx.hash,
            isOnChain: true
          };
        } catch (contractError) {
          console.warn('On-chain start failed, falling back to REST API:', contractError);
          
          // Fallback to REST API
          const response = await startRunApi(address, moveSelection);
          if (!response.ok) {
            throw new Error('Both on-chain and REST API failed to start run');
          }
          runData = await response.json();
          runData.isOnChain = false;
        }
      } else {
        // Use REST API when contracts not available
        console.log('📡 Starting run via REST API...');
        const response = await startRunApi(address, moveSelection);
        if (!response.ok) {
          throw new Error('Failed to start run');
        }
        runData = await response.json();
        runData.isOnChain = false;
      }

      dispatch({
        type: 'SET_CURRENT_RUN',
        payload: runData
      });

      return runData;
    } catch (error) {
      console.error('Error starting run:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.message || 'Failed to start run' 
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const endRun = async (hodlDecision) => {
    if (!state.currentRun) {
      dispatch({ type: 'SET_ERROR', payload: 'No active run' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      let result;
      
      // Try on-chain transaction first if contracts are available and run was started on-chain
      if (contractAvailable && state.currentRun.isOnChain) {
        try {
          console.log('🏁 Ending run on-chain...');
          const tx = await contractEndRun(state.currentRun.runId, hodlDecision);
          console.log('✅ On-chain run ended:', tx);
          
          result = { 
            ...state.currentRun, 
            isComplete: true,
            hodlDecision,
            txHash: tx.hash,
            isOnChain: true
          };
        } catch (contractError) {
          console.warn('On-chain end failed, falling back to REST API:', contractError);
          
          // Fallback to REST API
          const response = await endRunApi(state.currentRun.runId, hodlDecision);
          if (!response.ok) {
            throw new Error('Both on-chain and REST API failed to end run');
          }
          result = await response.json();
          result.isOnChain = false;
        }
      } else {
        // Use REST API when contracts not available or run wasn't started on-chain
        console.log('📡 Ending run via REST API...');
        const response = await endRunApi(state.currentRun.runId, hodlDecision);
        if (!response.ok) {
          throw new Error('Failed to end run');
        }
        result = await response.json();
        result.isOnChain = false;
      }

      // Update run with final results
      dispatch({
        type: 'UPDATE_RUN_PROGRESS',
        payload: {
          ...result,
          isComplete: true,
        },
      });

      // Update XP if gained
      if (result.xpGained) {
        setXp((xp) => xp + result.xpGained);
      }

      // Refresh player data after run completion
      setTimeout(() => {
        fetchPlayerData();
      }, 1000);

      return result;
    } catch (error) {
      console.error('Error ending run:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.message || 'Failed to end run' 
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resetRun = () => {
    dispatch({ type: 'RESET_RUN' });
  };

  const value = {
    ...state,
    address,
    isConnected,
    contractAvailable,
    startRun,
    endRun,
    resetRun,
    fetchPlayerData,
    dispatch,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};
