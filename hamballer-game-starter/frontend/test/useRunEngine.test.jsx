import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useRunEngine from '../src/lib/useRunEngine';

describe('useRunEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const moves = ['UP', 'DOWN'];
    const { result } = renderHook(() => useRunEngine(moves));

    expect(result.current.currentMove).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.complete).toBe(false);
  });

  it('progresses through moves when started', () => {
    const moves = ['UP', 'DOWN'];
    const { result } = renderHook(() => useRunEngine(moves));

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);

    // Advance timer to trigger the first move progression
    act(() => {
      vi.advanceTimersByTime(2000); // Advance by 2 seconds to ensure move progression
    });

    expect(result.current.currentMove).toBe(1);
  });

  it('validates moves correctly', () => {
    const moves = ['UP', 'DOWN'];
    const { result } = renderHook(() => useRunEngine(moves));

    expect(result.current.validateMoves(['UP', 'DOWN'])).toBe(true);
    expect(result.current.validateMoves([])).toBe(false);
    expect(result.current.validateMoves(null)).toBe(false);
  });

  it('resets to initial state', () => {
    const moves = ['UP', 'DOWN'];
    const { result } = renderHook(() => useRunEngine(moves));

    act(() => {
      result.current.start();
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentMove).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.complete).toBe(false);
  });

  it('completes when all moves are processed', () => {
    const moves = ['UP'];
    const { result } = renderHook(() => useRunEngine(moves));

    act(() => {
      result.current.start();
    });

    // Advance enough time to complete all moves
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.complete).toBe(true);
    expect(result.current.running).toBe(false);
  });
});
