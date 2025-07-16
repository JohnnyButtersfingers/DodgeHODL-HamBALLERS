import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import LootPacks from '../LootPacks';

// Mock dependencies
const mockUseWallet = vi.fn();
const mockUseXp = vi.fn();
const mockUseWebSocket = vi.fn();
const mockApiFetch = vi.fn();

vi.mock('../contexts/WalletContext', () => ({
  useWallet: mockUseWallet
}));

vi.mock('../contexts/XpContext', () => ({
  useXp: mockUseXp
}));

vi.mock('../services/useWebSocketService', () => ({
  useWebSocket: mockUseWebSocket
}));

vi.mock('../services/useApiService', () => ({
  apiFetch: mockApiFetch
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }) => children,
}));

describe('LootPacks', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockPlayerPacks = [
    { id: 'starter_pack', quantity: 2, earnedAt: '2024-01-01T00:00:00Z' },
    { id: 'bronze_pack', quantity: 1, earnedAt: '2024-01-02T00:00:00Z' },
    { id: 'silver_pack', quantity: 0 }
  ];

  const mockPlayerCurrency = { xp: 2500, dbp: 1250 };

  const mockPlayerInventory = [
    {
      id: 'xp_boost_1',
      type: 'XP_BOOST',
      value: 2.0,
      duration: 3,
      rarity: 'COMMON',
      quantity: 2,
      earnedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'dbp_bonus_1',
      type: 'DBP_BONUS',
      value: 500,
      rarity: 'RARE',
      quantity: 1,
      earnedAt: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: mockAddress
    });

    mockUseXp.mockReturnValue({
      xp: 2500,
      addXp: vi.fn(),
      refreshXpData: vi.fn()
    });

    mockUseWebSocket.mockReturnValue({
      connected: true,
      sendMessage: vi.fn()
    });

    mockApiFetch.mockImplementation((url) => {
      if (url.includes('/api/lootpacks/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ packs: mockPlayerPacks })
        });
      }
      if (url.includes('/api/player/currency/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ currency: mockPlayerCurrency })
        });
      }
      if (url.includes('/api/player/inventory/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ inventory: mockPlayerInventory })
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Wallet Connection', () => {
    it('should show wallet connection prompt when no wallet connected', () => {
      mockUseWallet.mockReturnValue({ address: null });
      
      render(<LootPacks />);
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
      expect(screen.getByText('Connect your wallet to view and open loot packs')).toBeInTheDocument();
    });

    it('should load player data when wallet is connected', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/lootpacks/${mockAddress}`);
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/player/currency/${mockAddress}`);
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/player/inventory/${mockAddress}`);
      });
    });
  });

  describe('Currency Display', () => {
    it('should display player currency in header', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('2,500 XP')).toBeInTheDocument();
        expect(screen.getByText('1,250 DBP')).toBeInTheDocument();
      });
    });
  });

  describe('Pack Store', () => {
    it('should display all pack types in store', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('Starter Pack')).toBeInTheDocument();
        expect(screen.getByText('Bronze Pack')).toBeInTheDocument();
        expect(screen.getByText('Silver Pack')).toBeInTheDocument();
        expect(screen.getByText('Gold Pack')).toBeInTheDocument();
        expect(screen.getByText('Diamond Pack')).toBeInTheDocument();
      });
    });

    it('should show pack costs correctly', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('FREE')).toBeInTheDocument(); // Starter pack
        expect(screen.getByText('500')).toBeInTheDocument(); // Bronze pack
        expect(screen.getByText('1,500')).toBeInTheDocument(); // Silver pack
        expect(screen.getByText('3,000')).toBeInTheDocument(); // Gold pack
        expect(screen.getByText('7,500')).toBeInTheDocument(); // Diamond pack
      });
    });

    it('should show pack rarity indicators', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Common')).toHaveLength(2); // Starter and Bronze
        expect(screen.getByText('Rare')).toBeInTheDocument(); // Silver
        expect(screen.getByText('Epic')).toBeInTheDocument(); // Gold
        expect(screen.getByText('Legendary')).toBeInTheDocument(); // Diamond
      });
    });

    it('should show item previews for each pack', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        // Each pack should show preview items
        const xpBoostPreviews = screen.getAllByText('XP Boost');
        const dbpBonusPreviews = screen.getAllByText('DBP Bonus');
        expect(xpBoostPreviews.length).toBeGreaterThan(0);
        expect(dbpBonusPreviews.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Pack Purchasing', () => {
    it('should allow purchasing affordable packs', async () => {
      const mockRefreshXpData = vi.fn();
      mockUseXp.mockReturnValue({
        xp: 2500,
        addXp: vi.fn(),
        refreshXpData: mockRefreshXpData
      });

      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/purchase' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const purchaseButtons = screen.getAllByText('Purchase Pack');
        fireEvent.click(purchaseButtons[0]); // Bronze pack (500 XP)
      });

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/lootpacks/purchase',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('bronze_pack')
          })
        );
      });
    });

    it('should disable purchase buttons for unaffordable packs', async () => {
      mockUseXp.mockReturnValue({
        xp: 100, // Low XP
        addXp: vi.fn(),
        refreshXpData: vi.fn()
      });

      mockApiFetch.mockImplementation((url) => {
        if (url.includes('/api/player/currency/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ currency: { xp: 100, dbp: 0 } })
          });
        }
        return mockApiFetch.getMockImplementation()(url);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        // Expensive packs should be disabled
        const purchaseButtons = screen.getAllByText(/Purchase Pack|Claim Free Pack/);
        const expensivePackButtons = purchaseButtons.filter(button => 
          button.disabled && button.textContent === 'Purchase Pack'
        );
        expect(expensivePackButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show loading state during purchase', async () => {
      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/purchase' && options?.method === 'POST') {
          return new Promise(resolve => {
            setTimeout(() => resolve({
              ok: true,
              json: () => Promise.resolve({ success: true })
            }), 100);
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const purchaseButton = screen.getAllByText('Claim Free Pack')[0];
        fireEvent.click(purchaseButton);
      });

      // Should show loading state
      expect(screen.getByText('Purchasing...')).toBeInTheDocument();
    });
  });

  describe('Pack Opening', () => {
    it('should show owned packs section when player has packs', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('📋 Your Packs')).toBeInTheDocument();
        // Should show starter pack and bronze pack (quantity > 0)
        expect(screen.getAllByText('Starter Pack')).toHaveLength(2); // One in store, one in owned
        expect(screen.getAllByText('Bronze Pack')).toHaveLength(2);
      });
    });

    it('should show pack quantities correctly', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('x2')).toBeInTheDocument(); // Starter pack quantity
        expect(screen.getByText('x1')).toBeInTheDocument(); // Bronze pack quantity
      });
    });

    it('should trigger pack opening animation when clicking owned pack', async () => {
      const mockAddXp = vi.fn();
      mockUseXp.mockReturnValue({
        xp: 2500,
        addXp: mockAddXp,
        refreshXpData: vi.fn()
      });

      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/open' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              rewards: [
                { type: 'XP_BOOST', value: 2.0, duration: 3, rarity: 'COMMON' },
                { type: 'DBP_BONUS', value: 100, rarity: 'COMMON' }
              ]
            })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const ownedPacks = screen.getAllByText('Starter Pack');
        const ownedStarterPack = ownedPacks.find(pack => 
          pack.closest('.relative.cursor-pointer')
        );
        if (ownedStarterPack) {
          fireEvent.click(ownedStarterPack);
        }
      });

      // Should show opening animation
      await waitFor(() => {
        expect(screen.getByText(/Opening/)).toBeInTheDocument();
      });
    });

    it('should show rewards modal after pack opening', async () => {
      vi.useFakeTimers();
      
      const mockAddXp = vi.fn();
      mockUseXp.mockReturnValue({
        xp: 2500,
        addXp: mockAddXp,
        refreshXpData: vi.fn()
      });

      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/open' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              rewards: [
                { id: 'reward1', type: 'XP_BOOST', value: 2.0, duration: 3, rarity: 'COMMON' },
                { id: 'reward2', type: 'DBP_BONUS', value: 100, rarity: 'COMMON' }
              ]
            })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const ownedPacks = screen.getAllByText('Starter Pack');
        const ownedStarterPack = ownedPacks.find(pack => 
          pack.closest('.relative.cursor-pointer')
        );
        if (ownedStarterPack) {
          fireEvent.click(ownedStarterPack);
        }
      });

      // Fast-forward through opening animation
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.getByText('🎉 Pack Opened!')).toBeInTheDocument();
        expect(screen.getByText('Here are your rewards:')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should trigger XP notifications for rewards', async () => {
      vi.useFakeTimers();
      
      const mockAddXp = vi.fn();
      mockUseXp.mockReturnValue({
        xp: 2500,
        addXp: mockAddXp,
        refreshXpData: vi.fn()
      });

      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/open' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              rewards: [
                { id: 'reward1', type: 'XP_BOOST', value: 2.0, duration: 3, rarity: 'COMMON' },
                { id: 'reward2', type: 'DBP_BONUS', value: 100, rarity: 'COMMON' }
              ]
            })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const ownedPacks = screen.getAllByText('Starter Pack');
        const ownedStarterPack = ownedPacks.find(pack => 
          pack.closest('.relative.cursor-pointer')
        );
        if (ownedStarterPack) {
          fireEvent.click(ownedStarterPack);
        }
      });

      // Fast-forward through opening animation
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockAddXp).toHaveBeenCalledWith(50, 'lootpack'); // XP_BOOST reward
        expect(mockAddXp).toHaveBeenCalledWith(25, 'lootpack'); // DBP_BONUS reward
      });

      vi.useRealTimers();
    });
  });

  describe('Inventory Management', () => {
    it('should display player inventory when items exist', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('🎒 Your Inventory')).toBeInTheDocument();
      });
    });

    it('should show inventory items with correct details', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        // Should show XP boost item
        expect(screen.getByText('2x for 3 runs')).toBeInTheDocument();
        // Should show DBP bonus item
        expect(screen.getByText('+500 DBP')).toBeInTheDocument();
      });
    });

    it('should show progress bars for XP boost items', async () => {
      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('Ready to use')).toBeInTheDocument();
      });
    });

    it('should update inventory after opening packs', async () => {
      vi.useFakeTimers();
      
      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/open' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              rewards: [
                { id: 'new_reward', type: 'BADGE', value: 'speed_badge', rarity: 'RARE' }
              ]
            })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const ownedPacks = screen.getAllByText('Starter Pack');
        const ownedStarterPack = ownedPacks.find(pack => 
          pack.closest('.relative.cursor-pointer')
        );
        if (ownedStarterPack) {
          fireEvent.click(ownedStarterPack);
        }
      });

      // Fast-forward through opening animation
      vi.advanceTimersByTime(3000);

      // Should refresh inventory
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/player/inventory/${mockAddress}`);
      });

      vi.useRealTimers();
    });
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to lootpack updates when connected', async () => {
      const mockSendMessage = vi.fn();
      mockUseWebSocket.mockReturnValue({
        connected: true,
        sendMessage: mockSendMessage
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'subscribe',
          channel: 'lootpacks',
          playerAddress: mockAddress
        });
      });
    });

    it('should handle lootpack update events', async () => {
      render(<LootPacks />);
      
      // Simulate WebSocket message for pack purchase
      const event = new CustomEvent('websocket_message', {
        detail: {
          type: 'lootpack_updated',
          data: {
            playerAddress: mockAddress,
            type: 'pack_purchased'
          }
        }
      });
      
      window.dispatchEvent(event);
      
      // Should refresh packs and currency
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/lootpacks/${mockAddress}`);
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/player/currency/${mockAddress}`);
      });
    });

    it('should handle currency update events', async () => {
      render(<LootPacks />);
      
      // Simulate WebSocket message for currency update
      const event = new CustomEvent('websocket_message', {
        detail: {
          type: 'lootpack_updated',
          data: {
            playerAddress: mockAddress,
            type: 'currency_updated',
            currency: { xp: 3000, dbp: 1500 }
          }
        }
      });
      
      window.dispatchEvent(event);
      
      // Should update local currency state
      await waitFor(() => {
        expect(screen.getByText('3,000 XP')).toBeInTheDocument();
        expect(screen.getByText('1,500 DBP')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show mock data when API fails', async () => {
      mockApiFetch.mockImplementation(() => Promise.reject(new Error('API Error')));

      render(<LootPacks />);
      
      await waitFor(() => {
        // Should still show lootpack content with mock data
        expect(screen.getByText('📦 Loot Packs')).toBeInTheDocument();
      });
    });

    it('should handle purchase failures gracefully', async () => {
      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/purchase') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ message: 'Purchase failed' })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const purchaseButton = screen.getAllByText('Claim Free Pack')[0];
        fireEvent.click(purchaseButton);
      });

      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('📦 Loot Packs')).toBeInTheDocument();
      });
    });

    it('should show mock rewards when pack opening API fails', async () => {
      vi.useFakeTimers();
      
      const mockAddXp = vi.fn();
      mockUseXp.mockReturnValue({
        xp: 2500,
        addXp: mockAddXp,
        refreshXpData: vi.fn()
      });

      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/lootpacks/open') {
          return Promise.reject(new Error('Open pack API error'));
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        const ownedPacks = screen.getAllByText('Starter Pack');
        const ownedStarterPack = ownedPacks.find(pack => 
          pack.closest('.relative.cursor-pointer')
        );
        if (ownedStarterPack) {
          fireEvent.click(ownedStarterPack);
        }
      });

      // Fast-forward through opening animation
      vi.advanceTimersByTime(3000);

      // Should still show rewards modal with mock data
      await waitFor(() => {
        expect(screen.getByText('🎉 Pack Opened!')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Empty State Handling', () => {
    it('should show empty state when player has no packs', async () => {
      mockApiFetch.mockImplementation((url) => {
        if (url.includes('/api/lootpacks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ packs: [] })
          });
        }
        return mockApiFetch.getMockImplementation()(url);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.getByText('No packs to open. Purchase some packs below!')).toBeInTheDocument();
      });
    });

    it('should not show inventory section when inventory is empty', async () => {
      mockApiFetch.mockImplementation((url) => {
        if (url.includes('/api/player/inventory/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ inventory: [] })
          });
        }
        return mockApiFetch.getMockImplementation()(url);
      });

      render(<LootPacks />);
      
      await waitFor(() => {
        expect(screen.queryByText('🎒 Your Inventory')).not.toBeInTheDocument();
      });
    });
  });
});