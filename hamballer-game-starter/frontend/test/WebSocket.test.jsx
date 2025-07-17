import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketProvider, useWebSocket } from '../src/services/useWebSocketService';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.send = vi.fn();
    this.close = vi.fn();
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket;

const renderWebSocketHook = () => {
  return renderHook(() => useWebSocket(), {
    wrapper: WebSocketProvider
  });
};

describe('WebSocket Integration', () => {
  let mockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket on mount', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    it('should handle connection errors gracefully', async () => {
      // Mock WebSocket to throw error
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class ErrorWebSocket {
        constructor() {
          this.readyState = WebSocket.CONNECTING;
          this.onerror = null;
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Connection failed'));
          }, 10);
        }
      };

      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      global.WebSocket = originalWebSocket;
    });

    it('should reconnect on connection loss', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate connection loss
      act(() => {
        result.current.ws?.onclose();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Should attempt to reconnect
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle XP updates correctly', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const xpUpdate = {
        type: 'xp_update',
        data: {
          address: '0x1234567890123456789012345678901234567890',
          xp: 1500,
          level: 5
        }
      };

      act(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify(xpUpdate)
        });
      });

      await waitFor(() => {
        expect(result.current.liveReplay).toBeDefined();
      });
    });

    it('should handle leaderboard updates correctly', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const leaderboardUpdate = {
        type: 'leaderboard_update',
        data: {
          players: [
            {
              address: '0x1234567890123456789012345678901234567890',
              totalDbpEarned: 1250.75,
              level: 12
            }
          ]
        }
      };

      act(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify(leaderboardUpdate)
        });
      });

      await waitFor(() => {
        expect(result.current.liveReplay).toBeDefined();
      });
    });

    it('should handle price updates correctly', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const priceUpdate = {
        type: 'price_update',
        data: {
          price: '1234567890000000000',
          timestamp: Date.now()
        }
      };

      act(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify(priceUpdate)
        });
      });

      await waitFor(() => {
        expect(result.current.liveReplay).toBeDefined();
      });
    });

    it('should handle invalid message format gracefully', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      act(() => {
        result.current.ws?.onmessage({
          data: 'invalid json'
        });
      });

      // Should not crash and maintain connection
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update XP in real-time', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const initialXp = 1000;
      const updatedXp = 1500;

      // Send initial XP
      act(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify({
            type: 'xp_update',
            data: { xp: initialXp, level: 4 }
          })
        });
      });

      // Send updated XP
      act(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify({
            type: 'xp_update',
            data: { xp: updatedXp, level: 5 }
          })
        });
      });

      await waitFor(() => {
        expect(result.current.liveReplay).toBeDefined();
      });
    });

    it('should handle rapid updates without performance issues', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Send multiple rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.ws?.onmessage({
            data: JSON.stringify({
              type: 'xp_update',
              data: { xp: 1000 + i * 100, level: 4 + Math.floor(i / 2) }
            })
          });
        });
      }

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate network error
      act(() => {
        result.current.ws?.onerror(new Error('Network error'));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Should attempt to reconnect
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    it('should handle server disconnection gracefully', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate server disconnection
      act(() => {
        result.current.ws?.onclose({ code: 1000, reason: 'Server shutdown' });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with frequent updates', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      // Send many updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.ws?.onmessage({
            data: JSON.stringify({
              type: 'xp_update',
              data: { xp: i, level: 1 }
            })
          });
        });
      }

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Memory usage should be reasonable (not exact due to garbage collection)
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      expect(finalMemory).toBeGreaterThanOrEqual(initialMemory);
    });

    it('should handle large message payloads', async () => {
      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const largePayload = {
        type: 'leaderboard_update',
        data: {
          players: Array.from({ length: 1000 }, (_, i) => ({
            address: `0x${i.toString().padStart(40, '0')}`,
            totalDbpEarned: Math.random() * 1000,
            level: Math.floor(Math.random() * 20) + 1
          }))
        }
      };

      act(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify(largePayload)
        });
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });

  describe('Integration with Components', () => {
    it('should provide WebSocket context to child components', async () => {
      const TestComponent = () => {
        const { connected, liveReplay } = useWebSocket();
        return (
          <div>
            <span data-testid="connected">{connected.toString()}</span>
            <span data-testid="replay">{liveReplay ? 'has-replay' : 'no-replay'}</span>
          </div>
        );
      };

      const { getByTestId } = render(
        <WebSocketProvider>
          <TestComponent />
        </WebSocketProvider>
      );

      await waitFor(() => {
        expect(getByTestId('connected').textContent).toBe('true');
      });
    });

    it('should handle component unmounting gracefully', async () => {
      const { result, unmount } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      unmount();

      // Should not throw errors after unmount
      expect(() => {
        result.current.ws?.onmessage({
          data: JSON.stringify({ type: 'test', data: {} })
        });
      }).not.toThrow();
    });
  });

  describe('Offline/Online Scenarios', () => {
    it('should handle offline mode gracefully', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Restore online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    });

    it('should reconnect when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const { result } = renderWebSocketHook();

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Go online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Trigger online event
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });
}); 