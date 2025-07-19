import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BadgeClaimStatus from '../src/components/BadgeClaimStatus';
import { useWallet } from '../src/contexts/WalletContext';
import * as apiService from '../src/services/useApiService';

// Mock dependencies
vi.mock('../src/contexts/WalletContext');
vi.mock('../src/services/useApiService');

describe('BadgeClaimStatus', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockRunId = 'run-123';
  const mockOnClaimSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWallet.mockReturnValue({ address: mockAddress });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Eligible State', () => {
    it('should display eligible badge UI when user can claim', async () => {
      const mockResponse = {
        status: 'eligible',
        message: 'Eligible to claim badge',
        runId: mockRunId,
        tokenId: 2,
        xpEarned: 65,
        cpEarned: 75,
        badgeType: { name: 'Rare', xpRange: '50-74 XP', rarity: 'Rare' }
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Rare Badge Available!')).toBeInTheDocument();
        expect(screen.getByText('65 XP earned • 50-74 XP')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Claim Badge' })).toBeInTheDocument();
      });
    });

    it('should handle claim button click', async () => {
      const mockResponse = {
        status: 'eligible',
        runId: mockRunId,
        tokenId: 1,
        xpEarned: 35
      };

      apiService.apiFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, txHash: '0xabc123' })
        });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Claim Badge' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Claim Badge' }));

      await waitFor(() => {
        expect(apiService.apiFetch).toHaveBeenCalledWith('/api/badges/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerAddress: mockAddress, runId: mockRunId })
        });
      });
    });
  });

  describe('Pending State', () => {
    it('should display pending UI when badge claim is processing', async () => {
      const mockResponse = {
        status: 'pending',
        message: 'Badge claim is being processed',
        runId: mockRunId,
        tokenId: 3,
        xpEarned: 85,
        attemptId: 'attempt-123'
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Badge Claim Processing')).toBeInTheDocument();
        expect(screen.getByText(/Epic badge.*85 XP.*is being minted/)).toBeInTheDocument();
      });
    });

    it('should poll for updates when in pending state', async () => {
      const mockPendingResponse = {
        status: 'pending',
        tokenId: 2,
        xpEarned: 55
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPendingResponse
      });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      // Wait for initial call
      await waitFor(() => {
        expect(apiService.apiFetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(apiService.apiFetch).toHaveBeenCalledTimes(2);
        expect(apiService.apiFetch).toHaveBeenLastCalledWith(`/api/badges/check/${mockAddress}`);
      });
    });
  });

  describe('Failure State', () => {
    it('should display failure UI with retry option', async () => {
      const mockResponse = {
        status: 'failure',
        message: 'Badge claim failed',
        runId: mockRunId,
        tokenId: 4,
        xpEarned: 120,
        error: 'Gas estimation failed',
        retryCount: 2,
        canRetry: true
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Badge Claim Failed')).toBeInTheDocument();
        expect(screen.getByText(/Legendary badge.*120 XP.*Gas estimation failed/)).toBeInTheDocument();
        expect(screen.getByText('Retry attempts: 2/5')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry Claim' })).toBeInTheDocument();
      });
    });

    it('should not show retry button when max retries reached', async () => {
      const mockResponse = {
        status: 'failure',
        runId: mockRunId,
        tokenId: 1,
        xpEarned: 30,
        error: 'Network error',
        retryCount: 5,
        canRetry: false
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Badge Claim Failed')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Retry Claim' })).not.toBeInTheDocument();
      });
    });

    it('should handle retry button click', async () => {
      const mockFailureResponse = {
        status: 'failure',
        runId: mockRunId,
        tokenId: 2,
        xpEarned: 60,
        canRetry: true
      };

      apiService.apiFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFailureResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry Claim' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Retry Claim' }));

      await waitFor(() => {
        expect(apiService.apiFetch).toHaveBeenCalledWith('/api/badges/claim', expect.any(Object));
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading skeleton initially', async () => {
      apiService.apiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API call fails', async () => {
      apiService.apiFetch.mockRejectedValue(new Error('Network error'));

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Error checking badge status: Network error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });
    });

    it('should handle API error responses', async () => {
      apiService.apiFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(screen.getByText(/Error checking badge status/)).toBeInTheDocument();
      });
    });
  });

  describe('Not Eligible State', () => {
    it('should not render anything when not eligible', async () => {
      const mockResponse = {
        status: 'not_eligible',
        message: 'No eligible runs for badge claim',
        hint: 'Complete a run with at least 25 CP to earn a badge'
      };

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const { container } = render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Badge Type Display', () => {
    const badgeTypes = [
      { tokenId: 0, name: 'Participation', emoji: '🥾', xpEarned: 15 },
      { tokenId: 1, name: 'Common', emoji: '🥉', xpEarned: 35 },
      { tokenId: 2, name: 'Rare', emoji: '🥈', xpEarned: 60 },
      { tokenId: 3, name: 'Epic', emoji: '🥇', xpEarned: 85 },
      { tokenId: 4, name: 'Legendary', emoji: '👑', xpEarned: 120 }
    ];

    badgeTypes.forEach(({ tokenId, name, emoji, xpEarned }) => {
      it(`should display correct ${name} badge UI`, async () => {
        const mockResponse = {
          status: 'eligible',
          runId: mockRunId,
          tokenId,
          xpEarned
        };

        apiService.apiFetch.mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        });

        render(<BadgeClaimStatus runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

        await waitFor(() => {
          expect(screen.getByText(`${name} Badge Available!`)).toBeInTheDocument();
          expect(screen.getByText(emoji)).toBeInTheDocument();
        });
      });
    });
  });
});