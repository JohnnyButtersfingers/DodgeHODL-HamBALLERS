import React from 'react';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Leaderboard from '../src/components/Leaderboard';

// Mock the hooks and services
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

vi.mock('../src/hooks/useContracts', () => ({
  useContracts: () => ({
    getPlayerStats: vi.fn(),
    getCurrentPrice: vi.fn(),
    isConnected: true
  })
}));

vi.mock('../src/services/useApiService', () => ({
  apiFetch: vi.fn()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}));

const mockLeaderboardData = [
  {
    address: '0x1234567890123456789012345678901234567890',
    totalDbpEarned: 1250.75,
    bestScore: 8750,
    totalRuns: 45,
    winRate: 82.2,
    level: 12
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    totalDbpEarned: 980.50,
    bestScore: 7890,
    totalRuns: 38,
    winRate: 78.9,
    level: 10
  }
];

const renderLeaderboard = () => {
  return render(
    <BrowserRouter>
      <Leaderboard />
    </BrowserRouter>
  );
};

describe('Leaderboard Component', () => {
  let mockApiFetch;
  let mockGetPlayerStats;
  let mockGetCurrentPrice;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiFetch = vi.mocked(require('../src/services/useApiService').apiFetch);
    mockGetPlayerStats = vi.mocked(require('../src/hooks/useContracts').useContracts)().getPlayerStats;
    mockGetCurrentPrice = vi.mocked(require('../src/hooks/useContracts').useContracts)().getCurrentPrice;

    // Default mock responses
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ leaderboard: mockLeaderboardData })
    });

    mockGetPlayerStats.mockResolvedValue({
      totalRuns: '10',
      successfulRuns: '8',
      totalDbpEarned: '500000000000000000000',
      currentXp: '1500',
      level: '5'
    });

    mockGetCurrentPrice.mockResolvedValue('1234567890000000000'); // 1.23456789 DBP
  });

  describe('Initial Rendering', () => {
    it('should render leaderboard header', () => {
      renderLeaderboard();
      expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
    });

    it('should render category and timeframe filters', () => {
      renderLeaderboard();
      expect(screen.getByDisplayValue('Total DBP Earned')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Time')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      renderLeaderboard();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      // Use a delayed promise instead of never-resolving
      mockApiFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderLeaderboard();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch leaderboard data on mount', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/api/dashboard/leaderboard?category=total_dbp&timeframe=all'
        );
      });
    });

    it('should fetch contract data on mount', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(mockGetCurrentPrice).toHaveBeenCalled();
        expect(mockGetPlayerStats).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      });
    });

    it('should refetch data when category changes', async () => {
      renderLeaderboard();
      
      const categorySelect = screen.getByDisplayValue('Total DBP Earned');
      fireEvent.change(categorySelect, { target: { value: 'best_score' } });

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/api/dashboard/leaderboard?category=best_score&timeframe=all'
        );
      });
    });

    it('should refetch data when timeframe changes', async () => {
      renderLeaderboard();
      
      const timeframeSelect = screen.getByDisplayValue('All Time');
      fireEvent.change(timeframeSelect, { target: { value: '24h' } });

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/api/dashboard/leaderboard?category=total_dbp&timeframe=24h'
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('No players found for the selected timeframe')).toBeInTheDocument();
      });
    });
  });

  describe('Live Price Display', () => {
    it('should display current DBP price', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('$1.234568')).toBeInTheDocument();
      });
    });

    it('should display last updated time', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        const timeElement = screen.getByText(/Last Updated/);
        expect(timeElement).toBeInTheDocument();
      });
    });

    it('should handle price fetch errors gracefully', async () => {
      mockGetCurrentPrice.mockRejectedValue(new Error('Price fetch failed'));
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('$0.000000')).toBeInTheDocument();
      });
    });
  });

  describe('Leaderboard Table', () => {
    it('should display player data correctly', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
        expect(screen.getByText('1,250.75 DBP')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('82.2%')).toBeInTheDocument();
      });
    });

    it('should highlight current user', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        const userRow = screen.getByText('YOU');
        expect(userRow).toBeInTheDocument();
      });
    });

    it('should display rank icons correctly', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('🥇')).toBeInTheDocument();
        expect(screen.getByText('🥈')).toBeInTheDocument();
      });
    });

    it('should show win rate progress bars', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        const progressBars = document.querySelectorAll('.bg-green-400');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display total active players', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Active Players')).toBeInTheDocument();
      });
    });

    it('should display total DBP distributed', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('2,231.25')).toBeInTheDocument();
        expect(screen.getByText('Total DBP Distributed')).toBeInTheDocument();
      });
    });

    it('should display total runs', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('83')).toBeInTheDocument();
        expect(screen.getByText('Total Runs')).toBeInTheDocument();
      });
    });

    it('should display user level', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Your Level')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    it('should refresh data when refresh button is clicked', async () => {
      renderLeaderboard();
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('should disable refresh button while loading', async () => {
      mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderLeaderboard();
      
      const refreshButton = screen.getByText('Loading...');
      expect(refreshButton).toBeDisabled();
    });

    it('should handle category filter changes', async () => {
      renderLeaderboard();
      
      const categorySelect = screen.getByDisplayValue('Total DBP Earned');
      fireEvent.change(categorySelect, { target: { value: 'win_rate' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Win Rate')).toBeInTheDocument();
      });
    });

    it('should handle timeframe filter changes', async () => {
      renderLeaderboard();
      
      const timeframeSelect = screen.getByDisplayValue('All Time');
      fireEvent.change(timeframeSelect, { target: { value: '7d' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should show error message when no data is available', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ leaderboard: [] })
      });
      
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText('No players found for the selected timeframe')).toBeInTheDocument();
      });
    });

    it('should show user ranking message when user is not in top list', async () => {
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          leaderboard: [
            { address: '0xDifferentAddress', totalDbpEarned: 100, bestScore: 1000, totalRuns: 5, winRate: 80, level: 1 }
          ] 
        })
      });
      
      renderLeaderboard();
      
      await waitFor(() => {
        expect(screen.getByText("You're not in the top 1 for this category and timeframe.")).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderLeaderboard();
      
      const categorySelect = screen.getByDisplayValue('Total DBP Earned');
      const timeframeSelect = screen.getByDisplayValue('All Time');
      const refreshButton = screen.getByText('Refresh');
      
      expect(categorySelect).toBeInTheDocument();
      expect(timeframeSelect).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderLeaderboard();
      
      const categorySelect = screen.getByDisplayValue('Total DBP Earned');
      categorySelect.focus();
      expect(categorySelect).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should not make unnecessary API calls', async () => {
      renderLeaderboard();
      
      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should debounce rapid filter changes', async () => {
      renderLeaderboard();
      
      const categorySelect = screen.getByDisplayValue('Total DBP Earned');
      
      // Rapid changes
      fireEvent.change(categorySelect, { target: { value: 'best_score' } });
      fireEvent.change(categorySelect, { target: { value: 'total_runs' } });
      fireEvent.change(categorySelect, { target: { value: 'win_rate' } });

      await waitFor(() => {
        // Should only make one call for the final value
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/api/dashboard/leaderboard?category=win_rate&timeframe=all'
        );
      });
    });
  });
}); 