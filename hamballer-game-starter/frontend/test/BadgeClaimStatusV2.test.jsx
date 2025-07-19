import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import BadgeClaimStatusV2 from '../src/components/BadgeClaimStatusV2';
import { useWallet } from '../src/contexts/WalletContext';
import { useContracts } from '../src/hooks/useContracts';
import * as apiService from '../src/services/useApiService';

// Mock dependencies
vi.mock('../src/contexts/WalletContext');
vi.mock('../src/hooks/useContracts');
vi.mock('../src/services/useApiService');

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('BadgeClaimStatusV2', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockRunId = 'run-123';
  const mockOnClaimSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default wallet state
    useWallet.mockReturnValue({ 
      address: mockAddress, 
      isConnected: true 
    });
    
    // Default contracts
    useContracts.mockReturnValue({ 
      contracts: { badges: {} } 
    });

    // Mock matchMedia for useMediaQuery
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('State Management', () => {
    it('should handle all claim states correctly', async () => {
      const mockEligibleResponse = {
        status: 'eligible',
        runId: mockRunId,
        tokenId: 2,
        xpEarned: 65,
        badgeType: { name: 'Rare', xpRange: '50-74 XP' }
      };

      apiService.apiFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEligibleResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, txHash: '0xabc123' })
        });

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Rare Badge Available!')).toBeInTheDocument();
      });

      // Click claim button
      fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));

      // Should show verifying state
      await waitFor(() => {
        expect(screen.getByText('Verifying Eligibility...')).toBeInTheDocument();
      });

      // Advance timers to pass verification
      act(() => {
        vi.advanceTimersByTime(800);
      });

      // Should show claiming state
      await waitFor(() => {
        expect(screen.getByText('Claiming Your Badge...')).toBeInTheDocument();
      });
    });

    it('should handle error states with retry mechanism', async () => {
      const mockError = 'Network error';
      
      apiService.apiFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'eligible',
            runId: mockRunId,
            tokenId: 1,
            xpEarned: 35
          })
        })
        .mockRejectedValueOnce(new Error(mockError));

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Claim Badge/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Claim Failed')).toBeInTheDocument();
        expect(screen.getByText(mockError)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt UI for mobile devices', async () => {
      // Mock mobile media query
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 3,
          xpEarned: 85
        })
      });

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Claim Badge/i });
        expect(button).toBeInTheDocument();
        // Check for mobile-optimized button size
        expect(button.className).toContain('min-h-[44px]');
      });
    });
  });

  describe('Accessibility', () => {
    it('should respect prefers-reduced-motion', async () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 4,
          xpEarned: 120
        })
      });

      const { container } = render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Legendary Badge Available!')).toBeInTheDocument();
      });

      // Should not have hover animations
      const badgeContainer = container.querySelector('[class*="hover:scale"]');
      expect(badgeContainer).toBeNull();
    });

    it('should have proper ARIA labels', async () => {
      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 2,
          xpEarned: 60
        })
      });

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        const claimButton = screen.getByRole('button', { name: /Claim Rare badge/i });
        expect(claimButton).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Polling and Real-time Updates', () => {
    it('should poll for updates when status is pending', async () => {
      const pendingResponse = {
        status: 'pending',
        runId: mockRunId,
        tokenId: 2,
        xpEarned: 55,
        message: 'Badge claim is being processed'
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => pendingResponse
      });

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Claiming Your Badge...')).toBeInTheDocument();
      });

      // Advance time to trigger polling
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(apiService.apiFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Success Animations', () => {
    it('should show success state and trigger confetti', async () => {
      apiService.apiFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'eligible',
            runId: mockRunId,
            tokenId: 3,
            xpEarned: 85
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            txHash: '0xabc123',
            tokenId: 3 
          })
        });

      const { container } = render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Claim Badge/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));

      // Advance through verification
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Badge Claimed! 🎉')).toBeInTheDocument();
      });

      expect(mockOnClaimSuccess).toHaveBeenCalledWith({
        success: true,
        txHash: '0xabc123',
        tokenId: 3
      });
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff for network errors', async () => {
      const networkError = new Error('network error');
      
      apiService.apiFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'eligible',
            runId: mockRunId,
            tokenId: 1,
            xpEarned: 30
          })
        })
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));
      });

      // First retry after base delay
      act(() => {
        vi.advanceTimersByTime(1100); // Base delay + buffer
      });

      // Second retry with increased delay
      act(() => {
        vi.advanceTimersByTime(2100); // 2x base delay + buffer
      });

      await waitFor(() => {
        expect(apiService.apiFetch).toHaveBeenCalledTimes(4); // Initial + claim + 2 retries
      });
    });
  });

  describe('Wallet Connection', () => {
    it('should handle wallet connection flow', async () => {
      useWallet.mockReturnValue({ 
        address: null, 
        isConnected: false 
      });

      window.ethereum = {
        request: vi.fn().mockResolvedValue(['0xabc123'])
      };

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      // Component should not render if wallet not connected
      expect(screen.queryByText(/Badge Available/)).toBeNull();
    });
  });
});