import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Leaderboard from '../src/components/Leaderboard';

// Mock the dependencies
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: vi.fn()
}));

vi.mock('../src/services/useApiService', () => ({
  apiFetch: vi.fn()
}));

// Import the mocked modules
import { useWallet } from '../src/contexts/WalletContext';
import { apiFetch } from '../src/services/useApiService';

// Mock data
const mockLeaderboardData = [
  { address: "0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2", xp: 1250 },
  { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", xp: 980 },
  { address: "0x8ba1f109551bD432803012645Hac136c5C2eE5e3", xp: 875 },
  { address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", xp: 420 },
  { address: "0xaB5801a7D398351b8bE11C439e05C5B3259aeC9B", xp: 350 }
];

const mockUserRank = {
  address: "0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2",
  xp: 1250,
  rank: 1,
  isTopFive: true,
  lastUpdated: "2024-01-15T10:30:00Z"
};

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Leaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default wallet mock - no connected wallet
    useWallet.mockReturnValue({
      address: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', async () => {
      // Mock a delayed API response
      apiFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      // Check for loading elements
      expect(screen.getByText('Loading Leaderboard...')).toBeInTheDocument();
      expect(screen.getByText('Fetching the latest XP rankings')).toBeInTheDocument();
    });
  });

  describe('Successful Data Loading', () => {
    beforeEach(() => {
      // Mock successful API response
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockLeaderboardData,
          count: 5,
          source: 'local_xp_store'
        })
      });
    });

    it('should display leaderboard data correctly', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('XP Leaderboard')).toBeInTheDocument();
      });

      // Check header
      expect(screen.getByText('Top players ranked by experience points')).toBeInTheDocument();

      // Check stats cards
      expect(screen.getByText('5')).toBeInTheDocument(); // Active Players
      expect(screen.getByText('4,725')).toBeInTheDocument(); // Total XP (sum of all players)
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Highest XP

      // Check that all players are displayed
      expect(screen.getByText('0x742d...F9e2')).toBeInTheDocument();
      expect(screen.getByText('0xd8dA...6045')).toBeInTheDocument();
      expect(screen.getByText('0x8ba1...5e3')).toBeInTheDocument();
    });

    it('should display XP values correctly formatted', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('XP Leaderboard')).toBeInTheDocument();
      });

      // Check that XP values are displayed
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Top player XP
      expect(screen.getByText('980')).toBeInTheDocument(); // Second player XP
      expect(screen.getByText('875')).toBeInTheDocument(); // Third player XP
    });

    it('should show rank indicators for top 3 players', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('XP Leaderboard')).toBeInTheDocument();
      });

      // Check for rank positions (the component should show "#4" and "#5" for lower ranks)
      expect(screen.getByText('#4')).toBeInTheDocument();
      expect(screen.getByText('#5')).toBeInTheDocument();
    });

    it('should call the correct API endpoint', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith('/api/leaderboard');
      });
    });
  });

  describe('Connected Wallet State', () => {
    beforeEach(() => {
      // Mock connected wallet
      useWallet.mockReturnValue({
        address: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2'
      });

      // Mock leaderboard API
      apiFetch.mockImplementation((url) => {
        if (url === '/api/leaderboard') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: mockLeaderboardData,
              count: 5
            })
          });
        }
        
        if (url.includes('/api/leaderboard/rank/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: mockUserRank
            })
          });
        }
        
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should display user rank card when wallet is connected', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Your Rank')).toBeInTheDocument();
      });

      // Check user rank details
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('1250 XP')).toBeInTheDocument();
      expect(screen.getByText('Top 5!')).toBeInTheDocument();
    });

    it('should highlight user row in leaderboard', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('YOU')).toBeInTheDocument();
      });
    });

    it('should fetch user rank when wallet is connected', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalledWith('/api/leaderboard/rank/0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      apiFetch.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Leaderboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should display error when API returns error response', async () => {
      apiFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Leaderboard')).toBeInTheDocument();
      });

      expect(screen.getByText('HTTP 500: Internal Server Error')).toBeInTheDocument();
    });

    it('should handle API success:false response', async () => {
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Failed to fetch leaderboard data'
        })
      });

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Leaderboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to fetch leaderboard data')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no players exist', async () => {
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          count: 0
        })
      });

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No Players Yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Be the first to earn XP and claim the top spot!')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockLeaderboardData,
          count: 5
        })
      });
    });

    it('should refresh data when refresh button is clicked', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Click refresh button
      fireEvent.click(screen.getByText('Refresh'));

      // Verify API is called again
      expect(apiFetch).toHaveBeenCalledWith('/api/leaderboard');
    });

    it('should refresh data when Try Again button is clicked in error state', async () => {
      // First, trigger an error
      apiFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Mock successful response for retry
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockLeaderboardData,
          count: 5
        })
      });

      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'));

      // Should show loading and then success
      await waitFor(() => {
        expect(screen.getByText('XP Leaderboard')).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting', () => {
    beforeEach(() => {
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockLeaderboardData,
          count: 5
        })
      });
    });

    it('should format addresses correctly', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('XP Leaderboard')).toBeInTheDocument();
      });

      // Check that addresses are formatted as expected (first 6 + last 4)
      expect(screen.getByText('0x742d...F9e2')).toBeInTheDocument();
      expect(screen.getByText('0xd8dA...6045')).toBeInTheDocument();
    });

    it('should format large XP numbers with commas', async () => {
      const dataWithLargeXP = [
        { address: "0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2", xp: 12500 },
        { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", xp: 9800 }
      ];

      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: dataWithLargeXP,
          count: 2
        })
      });

      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('12,500')).toBeInTheDocument();
      });

      expect(screen.getByText('9,800')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockLeaderboardData,
          count: 5
        })
      });
    });

    it('should render without layout issues', async () => {
      render(
        <TestWrapper>
          <Leaderboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('XP Leaderboard')).toBeInTheDocument();
      });

      // Check that key layout elements exist
      const header = screen.getByText('XP Leaderboard');
      const statsCards = screen.getByText('Active Players');
      const leaderboardSection = screen.getByText('Top Players');

      expect(header).toBeInTheDocument();
      expect(statsCards).toBeInTheDocument();
      expect(leaderboardSection).toBeInTheDocument();
    });
  });
});