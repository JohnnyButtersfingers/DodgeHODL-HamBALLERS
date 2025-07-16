import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameStateProvider, useGameState } from '../src/hooks/useGameState';

// Mock all required dependencies
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

vi.mock('../src/contexts/XpContext', () => ({
  useXp: () => ({
    setXp: vi.fn()
  })
}));

vi.mock('../src/services/useWebSocketService.jsx', () => ({
  useWebSocket: () => ({
    liveXP: null,
    liveStats: null
  })
}));

vi.mock('../src/hooks/useContracts', () => ({
  default: () => ({
    startRun: vi.fn(() => Promise.resolve()),
    endRun: vi.fn(() => Promise.resolve()),
    isConnected: true
  })
}));

vi.mock('../src/services/useApiService', () => ({
  startRunApi: vi.fn(() => Promise.resolve({ 
    ok: true, 
    json: () => Promise.resolve({ runId: '1' }) 
  })),
  endRunApi: vi.fn(() => Promise.resolve({ 
    ok: true, 
    json: () => Promise.resolve({ success: true }) 
  }))
}));

// Wrapper component that provides all necessary contexts
const TestWrapper = ({ children }) => {
  return (
    <GameStateProvider>
      {children}
    </GameStateProvider>
  );
};

describe('Run Integration', () => {
  it('should start and end run successfully', async () => {
    const { result } = renderHook(() => useGameState(), { 
      wrapper: TestWrapper 
    });

    // Wait for initial render
    await act(async () => {
      // Give the hook time to initialize
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.startRun(['UP','DOWN','UP','DOWN','UP','DOWN','UP','DOWN','UP','DOWN']);
    });

    // Verify run was started
    expect(result.current.currentRun).toBeTruthy();

    await act(async () => {
      await result.current.endRun(true);
    });

    // Verify run was completed
    expect(result.current.currentRun?.isComplete).toBe(true);
  });

  it('should handle start run errors gracefully', async () => {
    const { result } = renderHook(() => useGameState(), { 
      wrapper: TestWrapper 
    });

    // Wait for initial render
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      // Test with invalid moves (empty array)
      await result.current.startRun([]);
    });

    // Should handle error gracefully
    expect(result.current.error).toBeFalsy(); // No error should be thrown
  });
});
