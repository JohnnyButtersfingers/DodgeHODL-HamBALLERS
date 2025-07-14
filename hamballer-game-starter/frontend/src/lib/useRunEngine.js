import { useState, useEffect } from 'react';

export default function useRunEngine(moves = []) {
  const [currentMove, setCurrentMove] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);

  const validateMoves = (list) => list.length === 10 && list.every(m => m === 'UP' || m === 'DOWN');

  const calculateScore = (move, prev) => prev + (move === 'UP' ? 10 : -5);

  const start = () => {
    if (!validateMoves(moves)) return false;
    setCurrentMove(0);
    setScore(0);
    setRunning(true);
    setComplete(false);
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
  };

  return {
    currentMove,
    score,
    running,
    complete,
    start,
    reset,
    validateMoves,
  };
}
