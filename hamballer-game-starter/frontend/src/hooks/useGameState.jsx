import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWebSocket } from './useWebSocket';

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
  const { address, isConnected } = useAccount();
  const { liveXP, liveStats } = useWebSocket();

  // Update player stats when live stats come in
  useEffect(() => {
    if (liveStats && liveStats.address === address) {
      dispatch({
        type: 'SET_PLAYER_STATS',
        payload: liveStats,
      });
    }
  }, [liveStats, address]);

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch player stats
      const statsResponse = await fetch(`${apiUrl}/api/dashboard/stats/${address}`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        dispatch({ type: 'SET_PLAYER_STATS', payload: stats });
      }

      // Fetch boosts (from contract or backend)
      // This would integrate with your useContracts hook
      // For now, mock data
      dispatch({ 
        type: 'SET_BOOSTS', 
        payload: [
          { id: 0, name: 'Speed Boost', count: 2 },
          { id: 1, name: 'Shield', count: 1 },
          { id: 2, name: 'Double Points', count: 3 },
        ] 
      });

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

  const startRun = async (moveSelection) => {
    if (!address) {
      dispatch({ type: 'SET_ERROR', payload: 'Wallet not connected' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/run/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: address,
          moveSelection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start run');
      }

      const runData = await response.json();
      dispatch({ 
        type: 'SET_CURRENT_RUN', 
        payload: {
          ...runData,
          moves: moveSelection,
        }
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/run/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runId: state.currentRun.runId,
          hodlDecision,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to end run');
      }

      const result = await response.json();
      
      // Update run with final results
      dispatch({
        type: 'UPDATE_RUN_PROGRESS',
        payload: {
          ...result,
          isComplete: true,
        },
      });

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
