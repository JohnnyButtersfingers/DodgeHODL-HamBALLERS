import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { GameStateProvider, useGameState } from '../src/hooks/useGameState';

vi.mock('../src/hooks/useContracts', () => {
  return {
    default: () => ({
      startRun: vi.fn(() => Promise.resolve()),
      endRun: vi.fn(() => Promise.resolve()),
      isConnected: true
    })
  };
});

vi.mock('../src/services/useApiService', () => ({
  startRunApi: vi.fn(() => Promise.resolve({ ok: true, json: () => ({ runId: '1' }) })),
  endRunApi: vi.fn(() => Promise.resolve({ ok: true, json: () => ({ success: true }) }))
}));

test('start and end run', async () => {
  const { result } = renderHook(() => useGameState(), { wrapper: GameStateProvider });

  await act(async () => {
    await result.current.startRun(['UP','DOWN','UP','DOWN','UP','DOWN','UP','DOWN','UP','DOWN']);
    await result.current.endRun(true);
  });

  expect(result.current.currentRun.isComplete).toBe(true);
});
