import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useRunEngine from '../src/lib/useRunEngine';

describe('useRunEngine', () => {
  it('progresses through moves', () => {
    vi.useFakeTimers();
    const moves = ['UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN']; // Need 10 moves
    const { result } = renderHook(() => useRunEngine(moves));

    act(() => {
      result.current.start();
    });

    // Initial state
    expect(result.current.currentMove).toBe(0);
    expect(result.current.running).toBe(true);

    // Advance timer to trigger first move
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should have progressed to move 1
    expect(result.current.currentMove).toBe(1);
    expect(result.current.score).toBe(10); // UP gives +10

    vi.useRealTimers();
  });

  it('validates moves correctly', () => {
    const { result } = renderHook(() => useRunEngine(['UP', 'DOWN'])); // Invalid - needs 10 moves
    expect(result.current.start()).toBe(false);
  });
});
