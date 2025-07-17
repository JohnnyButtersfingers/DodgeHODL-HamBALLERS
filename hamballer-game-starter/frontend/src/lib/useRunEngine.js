import { useState, useEffect, useCallback } from 'react';
import { useContracts } from '../hooks/useContracts';
import { usePublicClient } from 'wagmi';

export default function useRunEngine(moves = [], onXpGained = null, onRunComplete = null) {
  const [currentMove, setCurrentMove] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [runId, setRunId] = useState(null);
  const [contractEvents, setContractEvents] = useState([]);
  const [xpGained, setXpGained] = useState(0);
  const [error, setError] = useState(null);
  
  const { contracts, startRun, endRun, getPlayerStats } = useContracts();
  const publicClient = usePublicClient();

  const validateMoves = (list) => list.length === 10 && list.every(m => m === 'UP' || m === 'DOWN');

  const calculateScore = (move, prev) => prev + (move === 'UP' ? 10 : -5);

  // Listen for contract events related to this run
  const watchContractEvents = useCallback(async (runIdToWatch) => {
    if (!contracts?.hodlManager || !publicClient || !runIdToWatch) return;

    try {
      // Watch for RunCompleted events
      const unwatch = publicClient.watchContractEvent({
        address: contracts.hodlManager.address,
        abi: contracts.hodlManager.abi,
        eventName: 'RunCompleted',
        onLogs: (logs) => {
          logs.forEach(log => {
            if (log.args.runId === runIdToWatch) {
              const { player, xpEarned, dbpEarned, successful } = log.args;
              
              setXpGained(parseInt(xpEarned || 0));
              setContractEvents(prev => [...prev, {
                type: 'RunCompleted',
                data: { player, xpEarned, dbpEarned, successful }
              }]);
              
              // Trigger XP gained callback
              if (onXpGained && xpEarned > 0) {
                onXpGained(parseInt(xpEarned));
              }
              
              // Trigger run completion callback
              if (onRunComplete) {
                onRunComplete({
                  xpEarned: parseInt(xpEarned || 0),
                  dbpEarned: parseInt(dbpEarned || 0),
                  successful
                });
              }
            }
          });
        }
      });

      return unwatch;
    } catch (error) {
      console.error('Error watching contract events:', error);
    }
  }, [contracts, publicClient, onXpGained, onRunComplete]);

  const start = async () => {
    if (!validateMoves(moves)) {
      setError('Invalid moves provided');
      return false;
    }
    
    setCurrentMove(0);
    setScore(0);
    setRunning(true);
    setComplete(false);
    setError(null);
    setXpGained(0);
    setContractEvents([]);
    
    // Try to start run on contract if available
    if (contracts?.hodlManager && startRun) {
      try {
        const tx = await startRun(moves);
        const receipt = await tx.wait();
        
        // Extract run ID from events
        const runStartedEvent = receipt.logs.find(log => 
          log.topics[0] === '0x...' // RunStarted event signature
        );
        
        if (runStartedEvent) {
          const newRunId = runStartedEvent.topics[1]; // Assuming runId is first indexed param
          setRunId(newRunId);
          
          // Start watching for events
          watchContractEvents(newRunId);
        }
        
        return true;
      } catch (error) {
        console.error('Error starting contract run:', error);
        setError('Failed to start run on contract');
        // Continue with local simulation
      }
    }
    
    return true;
  };

  useEffect(() => {
    if (!running) return;
    if (currentMove >= moves.length) {
      setRunning(false);
      setComplete(true);
      return;
    }
    const timer = setTimeout(() => {
      setScore((s) => calculateScore(moves[currentMove], s));
      setCurrentMove((i) => i + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [running, currentMove, moves]);

  const reset = () => {
    setCurrentMove(0);
    setScore(0);
    setRunning(false);
    setComplete(false);
    setRunId(null);
    setContractEvents([]);
    setXpGained(0);
    setError(null);
  };

  const endRunContract = async (hodlDecision) => {
    if (!runId || !contracts?.hodlManager || !endRun) {
      console.warn('No active run or contract not available');
      return false;
    }

    try {
      const tx = await endRun(runId, hodlDecision);
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error ending contract run:', error);
      setError('Failed to end run on contract');
      return false;
    }
  };

  return {
    currentMove,
    score,
    running,
    complete,
    runId,
    contractEvents,
    xpGained,
    error,
    start,
    reset,
    endRunContract,
    validateMoves,
  };
}
