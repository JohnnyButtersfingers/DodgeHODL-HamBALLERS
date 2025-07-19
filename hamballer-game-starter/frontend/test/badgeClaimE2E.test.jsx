import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import BadgeClaimStatusV2 from '../src/components/BadgeClaimStatusV2';
import { useWallet } from '../src/contexts/WalletContext';
import { useContracts } from '../src/hooks/useContracts';
import * as apiService from '../src/services/useApiService';
import xpVerificationService from '../src/services/xpVerificationService';

// Mock all dependencies
vi.mock('../src/contexts/WalletContext');
vi.mock('../src/hooks/useContracts');
vi.mock('../src/services/useApiService');
vi.mock('../src/services/xpVerificationService');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('Badge Claim E2E Tests with XPVerifier', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockRunId = 'run-123';
  const mockOnClaimSuccess = vi.fn();
  
  const mockContracts = {
    xpVerifier: {
      read: {
        isNullifierUsed: vi.fn(),
        getThreshold: vi.fn(),
        getVerificationResult: vi.fn()
      },
      write: {
        verifyXPProof: vi.fn()
      }
    },
    xpBadge: {
      write: {
        mintBadge: vi.fn()
      }
    }
  };

  const mockProofData = {
    nullifier: '0xabcdef123456789',
    commitment: '0x987654321fedcba',
    proof: [1, 2, 3, 4, 5, 6, 7, 8],
    claimedXP: 65,
    threshold: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    useWallet.mockReturnValue({ 
      address: mockAddress, 
      isConnected: true 
    });
    
    useContracts.mockReturnValue({ 
      contracts: mockContracts 
    });

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Complete Badge Claim Flow', () => {
    it('should complete full claim flow: check -> generate proof -> verify -> claim', async () => {
      // Step 1: Badge eligibility check
      const eligibleResponse = {
        status: 'eligible',
        runId: mockRunId,
        tokenId: 2,
        xpEarned: 65,
        cpEarned: 75,
        badgeType: { name: 'Rare', xpRange: '50-74 XP' }
      };

      apiService.apiFetch.mockImplementation((url) => {
        if (url.includes('/api/badges/check/')) {
          return Promise.resolve({
            ok: true,
            json: async () => eligibleResponse
          });
        }
        if (url === '/api/badges/claim') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              txHash: '0xbadge123',
              tokenId: 2,
              badgeType: 'Rare'
            })
          });
        }
      });

      // Step 2: Mock XP proof generation
      xpVerificationService.generateXPProof.mockResolvedValue(mockProofData);
      
      // Step 3: Mock nullifier check
      xpVerificationService.isNullifierUsed.mockResolvedValue(false);
      
      // Step 4: Mock proof submission
      xpVerificationService.submitXPProof.mockResolvedValue('0xverify123');

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      // Wait for initial badge check
      await waitFor(() => {
        expect(screen.getByText('Rare Badge Available!')).toBeInTheDocument();
        expect(screen.getByText('65 XP earned • 50-74 XP')).toBeInTheDocument();
      });

      // Click claim button
      const claimButton = screen.getByRole('button', { name: /Claim Badge/i });
      fireEvent.click(claimButton);

      // Should show verifying state
      await waitFor(() => {
        expect(screen.getByText('Verifying Eligibility...')).toBeInTheDocument();
      });

      // Should progress to generating proof
      await waitFor(() => {
        expect(screen.getByText('Generating ZK Proof...')).toBeInTheDocument();
        expect(screen.getByText(/Creating cryptographic proof of your 65 XP/)).toBeInTheDocument();
      });

      // Verify proof generation was called
      expect(xpVerificationService.generateXPProof).toHaveBeenCalledWith(
        mockAddress,
        65,
        mockRunId
      );

      // Should show submitting proof state
      await waitFor(() => {
        expect(screen.getByText('Verifying Proof On-Chain...')).toBeInTheDocument();
      });

      // Verify nullifier check
      expect(xpVerificationService.isNullifierUsed).toHaveBeenCalledWith(
        mockContracts,
        mockProofData.nullifier
      );

      // Verify proof submission
      expect(xpVerificationService.submitXPProof).toHaveBeenCalledWith(
        mockContracts,
        mockProofData
      );

      // Should show claiming state
      await waitFor(() => {
        expect(screen.getByText('Claiming Your Badge...')).toBeInTheDocument();
      });

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText('Badge Claimed! 🎉')).toBeInTheDocument();
      });

      // Verify claim success callback
      expect(mockOnClaimSuccess).toHaveBeenCalledWith({
        success: true,
        txHash: '0xbadge123',
        tokenId: 2,
        badgeType: 'Rare',
        verificationTxHash: '0xverify123',
        zkProof: mockProofData
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle nullifier already used error', async () => {
      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 1,
          xpEarned: 35
        })
      });

      xpVerificationService.generateXPProof.mockResolvedValue(mockProofData);
      xpVerificationService.isNullifierUsed.mockResolvedValue(true);

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Claim Failed')).toBeInTheDocument();
        expect(screen.getByText(/This XP claim has already been verified/)).toBeInTheDocument();
      });
    });

    it('should handle proof generation failure', async () => {
      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 3,
          xpEarned: 85
        })
      });

      xpVerificationService.generateXPProof.mockRejectedValue(
        new Error('Failed to generate proof: Invalid input')
      );

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Claim Failed')).toBeInTheDocument();
        expect(screen.getByText(/Failed to generate proof: Invalid input/)).toBeInTheDocument();
      });
    });

    it('should handle contract verification failure', async () => {
      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 2,
          xpEarned: 60
        })
      });

      xpVerificationService.generateXPProof.mockResolvedValue(mockProofData);
      xpVerificationService.isNullifierUsed.mockResolvedValue(false);
      xpVerificationService.submitXPProof.mockRejectedValue(
        new Error('Transaction reverted: Invalid proof')
      );

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Claim Failed')).toBeInTheDocument();
        expect(screen.getByText(/Proof verification failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Wallet Integration', () => {
    it('should handle disconnected wallet state', async () => {
      useWallet.mockReturnValue({ 
        address: null, 
        isConnected: false 
      });

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      // Should not render anything when wallet is not connected
      expect(screen.queryByText(/Badge Available/)).not.toBeInTheDocument();
    });

    it('should handle missing XPVerifier contract', async () => {
      useContracts.mockReturnValue({ 
        contracts: { ...mockContracts, xpVerifier: null } 
      });

      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 1,
          xpEarned: 30
        })
      });

      xpVerificationService.generateXPProof.mockResolvedValue(mockProofData);

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Claim Badge/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Claim Failed')).toBeInTheDocument();
        expect(screen.getByText(/XPVerifier contract not available/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid clicks', async () => {
      apiService.apiFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'eligible',
          runId: mockRunId,
          tokenId: 2,
          xpEarned: 55
        })
      });

      xpVerificationService.generateXPProof.mockResolvedValue(mockProofData);

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      await waitFor(() => {
        const claimButton = screen.getByRole('button', { name: /Claim Badge/i });
        
        // Click multiple times rapidly
        fireEvent.click(claimButton);
        fireEvent.click(claimButton);
        fireEvent.click(claimButton);
      });

      // Should only generate proof once
      expect(xpVerificationService.generateXPProof).toHaveBeenCalledTimes(1);
    });

    it('should handle claim status polling for pending badges', async () => {
      const responses = [
        { status: 'pending', runId: mockRunId, tokenId: 3, xpEarned: 80 },
        { status: 'pending', runId: mockRunId, tokenId: 3, xpEarned: 80 },
        { status: 'success', runId: mockRunId, tokenId: 3, xpEarned: 80, txHash: '0xsuccess' }
      ];

      let callCount = 0;
      apiService.apiFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => responses[callCount++ % responses.length]
        })
      );

      render(<BadgeClaimStatusV2 runId={mockRunId} onClaimSuccess={mockOnClaimSuccess} />);

      // Initial pending state
      await waitFor(() => {
        expect(screen.getByText('Claiming Your Badge...')).toBeInTheDocument();
      });

      // Advance timers to trigger polling
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should still be pending
      await waitFor(() => {
        expect(screen.getByText('Claiming Your Badge...')).toBeInTheDocument();
      });

      // Advance again
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should now show success
      await waitFor(() => {
        expect(screen.getByText('Badge Claimed! 🎉')).toBeInTheDocument();
      });
    });
  });
});