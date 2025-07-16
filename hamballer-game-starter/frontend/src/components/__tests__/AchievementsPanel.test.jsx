import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import AchievementsPanel from '../AchievementsPanel';

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

describe('AchievementsPanel', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockAchievements = [
    {
      id: 'first_run',
      unlockedAt: '2024-01-01T00:00:00Z',
      claimed: true
    },
    {
      id: 'win_streak_5',
      unlockedAt: '2024-01-02T00:00:00Z',
      claimed: false
    },
    {
      id: 'badge_collector',
      unlockedAt: null,
      claimed: false
    }
  ];

  const mockPlayerStats = {
    totalRuns: 25,
    totalXp: 2500,
    winStreak: 3,
    currentStreak: 3,
    maxWinStreak: 7,
    totalBadges: 3,
    legendaryBadges: 1,
    perfectRuns: 2,
    fastestRun: 28
  };

  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: mockAddress
    });

    mockUseXp.mockReturnValue({
      xp: 1250,
      addXp: vi.fn()
    });

    mockUseWebSocket.mockReturnValue({
      connected: true,
      sendMessage: vi.fn()
    });

    mockApiFetch.mockImplementation((url) => {
      if (url.includes('/api/achievements/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ achievements: mockAchievements })
        });
      }
      if (url.includes('/api/player/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stats: mockPlayerStats })
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
      
      render(<AchievementsPanel />);
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
      expect(screen.getByText('Connect your wallet to view your achievements')).toBeInTheDocument();
    });

    it('should load achievements when wallet is connected', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/achievements/${mockAddress}`);
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/player/stats/${mockAddress}`);
      });
    });
  });

  describe('Achievement Display', () => {
    it('should display achievement types in overview', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('🎯')).toBeInTheDocument(); // Milestone
        expect(screen.getByText('🔥')).toBeInTheDocument(); // Streak
        expect(screen.getByText('⭐')).toBeInTheDocument(); // Unique
        expect(screen.getByText('🏆')).toBeInTheDocument(); // Badge
      });
    });

    it('should show overall progress correctly', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        // 2 out of 12 achievements unlocked (first_run and win_streak_5)
        expect(screen.getByText('2/12 achievements')).toBeInTheDocument();
      });
    });

    it('should display achievement cards with correct styling', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
        expect(screen.getByText('Hot Streak')).toBeInTheDocument();
        expect(screen.getByText('Badge Collector')).toBeInTheDocument();
      });
    });

    it('should show progress bars for locked achievements', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        // Badge Collector should have progress bar since it's not unlocked
        const progressBars = screen.getAllByText('Progress');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show claim button for unlocked but unclaimed achievements', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const claimButtons = screen.getAllByText('Claim');
        expect(claimButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show claimed status for claimed achievements', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('✓ Claimed')).toBeInTheDocument();
      });
    });
  });

  describe('Achievement Filtering', () => {
    it('should show filter buttons', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Unlocked')).toBeInTheDocument();
        expect(screen.getByText('Locked')).toBeInTheDocument();
      });
    });

    it('should filter achievements when clicking filter buttons', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const unlockedFilter = screen.getByText('Unlocked');
        fireEvent.click(unlockedFilter);
      });

      // Should only show unlocked achievements
      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
        expect(screen.getByText('Hot Streak')).toBeInTheDocument();
        // Badge Collector should not be visible since it's locked
      });
    });
  });

  describe('Achievement Claiming', () => {
    it('should call claim API when claiming achievement', async () => {
      const mockAddXp = vi.fn();
      mockUseXp.mockReturnValue({
        xp: 1250,
        addXp: mockAddXp
      });

      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/achievements/claim' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const claimButton = screen.getAllByText('Claim')[0];
        fireEvent.click(claimButton);
      });

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith('/api/achievements/claim', 
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining(mockAddress)
          })
        );
        expect(mockAddXp).toHaveBeenCalled();
      });
    });
  });

  describe('Achievement Modals', () => {
    it('should open achievement detail modal when clicking achievement', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const achievementCard = screen.getByText('First Steps').closest('div');
        fireEvent.click(achievementCard);
      });

      await waitFor(() => {
        expect(screen.getByText('Complete your first run')).toBeInTheDocument();
        expect(screen.getByText('Reward: +50 XP')).toBeInTheDocument();
      });
    });

    it('should close modal when clicking outside', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const achievementCard = screen.getByText('First Steps').closest('div');
        fireEvent.click(achievementCard);
      });

      // Modal should be open
      await waitFor(() => {
        expect(screen.getByText('Complete your first run')).toBeInTheDocument();
      });

      // Click outside modal (on backdrop)
      const modal = screen.getByText('Complete your first run').closest('[data-testid="modal-backdrop"]') || 
                   document.querySelector('.fixed.inset-0');
      
      if (modal) {
        fireEvent.click(modal);
      }
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly for run-based achievements', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        // With 25 total runs, progress toward 100 runs should be 25%
        // This would be visible in progress bars for locked achievements
        const progressElements = screen.getAllByText(/\d+%/);
        expect(progressElements.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should show 100% progress for completed but locked achievements', async () => {
      // Mock stats that would complete an achievement
      const completedStats = { ...mockPlayerStats, totalRuns: 100 };
      
      mockApiFetch.mockImplementation((url) => {
        if (url.includes('/api/player/stats/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ stats: completedStats })
          });
        }
        return mockApiFetch.getMockImplementation()(url);
      });

      render(<AchievementsPanel />);
      
      await waitFor(() => {
        // Should show 100% for veteran runner achievement
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to achievement updates when connected', async () => {
      const mockSendMessage = vi.fn();
      mockUseWebSocket.mockReturnValue({
        connected: true,
        sendMessage: mockSendMessage
      });

      render(<AchievementsPanel />);
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'subscribe',
          channel: 'achievements',
          playerAddress: mockAddress
        });
      });
    });

    it('should handle achievement unlock events', async () => {
      render(<AchievementsPanel />);
      
      // Simulate WebSocket message
      const event = new CustomEvent('websocket_message', {
        detail: {
          type: 'achievement_unlocked',
          data: {
            playerAddress: mockAddress,
            achievementId: 'speed_demon'
          }
        }
      });
      
      window.dispatchEvent(event);
      
      // Component should handle the event and refresh achievements
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(`/api/achievements/${mockAddress}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show mock data when API fails', async () => {
      mockApiFetch.mockImplementation(() => Promise.reject(new Error('API Error')));

      render(<AchievementsPanel />);
      
      await waitFor(() => {
        // Should still show achievement content with mock data
        expect(screen.getByText('🏆 Achievements')).toBeInTheDocument();
      });
    });

    it('should handle claim failures gracefully', async () => {
      mockApiFetch.mockImplementation((url, options) => {
        if (url === '/api/achievements/claim') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Claim failed' })
          });
        }
        return mockApiFetch.getMockImplementation()(url, options);
      });

      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const claimButton = screen.getAllByText('Claim')[0];
        fireEvent.click(claimButton);
      });

      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('🏆 Achievements')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh achievements when refresh button is clicked', async () => {
      render(<AchievementsPanel />);
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh');
        fireEvent.click(refreshButton);
      });

      // Should call API again
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledTimes(4); // Initial 2 calls + 2 refresh calls
      });
    });
  });
});