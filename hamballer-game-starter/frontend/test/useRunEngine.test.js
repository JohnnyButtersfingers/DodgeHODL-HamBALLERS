import { renderHook, act } from '@testing-library/react';
import useRunEngine from '../src/lib/useRunEngine';
import { test, expect, vi } from 'vitest';

test('progresses through moves', () => {
  vi.useFakeTimers();
  const moves = ['UP', 'DOWN'];
  const { result } = renderHook(() => useRunEngine(moves));

  act(() => {
    result.current.start();
    vi.advanceTimersByTime(1000);
  });

  expect(result.current.currentMove).toBe(1);
  vi.useRealTimers();
});
