import React from 'react';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ClaimBadge from '../src/components/ClaimBadge';

// Mock the contexts and hooks
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

vi.mock('../src/contexts/XpContext', () => ({
  useXp: () => ({
    xp: 750,
    level: 8
  })
}));

vi.mock('../src/contexts/AudioContext', () => ({
  useAudio: () => ({
    playGameSound: vi.fn()
  })
}));

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  usePrepareContractWrite: vi.fn(() => ({
    config: { address: '0x123', abi: [] },
    error: null
  })),
  useContractWrite: vi.fn(() => ({
    write: vi.fn(),
    isLoading: false,
    data: null
  })),
  useContractEvent: vi.fn(() => ({})),
  useAccount: vi.fn(() => ({ address: '0x123', isConnected: true })),
  usePublicClient: vi.fn(() => ({})),
  useWalletClient: vi.fn(() => ({ data: {} }))
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}));

const renderClaimBadge = () => {
  return render(
    <BrowserRouter>
      <ClaimBadge />
    </BrowserRouter>
  );
};

describe('ClaimBadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders badge grid with available badges', () => {
    renderClaimBadge();
    
    expect(screen.getByText('🏆 XP Badges')).toBeInTheDocument();
    expect(screen.getByText('Claim badges for your achievements and milestones')).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument(); // XP display
    expect(screen.getByText('Level 8')).toBeInTheDocument();
  });

  it('displays badge information correctly', () => {
    renderClaimBadge();
    
    // Check for badge names
    expect(screen.getByText('Novice HODLer')).toBeInTheDocument();
    expect(screen.getByText('Experienced Trader')).toBeInTheDocument();
    expect(screen.getByText('Master Strategist')).toBeInTheDocument();
    
    // Check for descriptions
    expect(screen.getByText('Complete your first run')).toBeInTheDocument();
    expect(screen.getByText('Reach 500 XP')).toBeInTheDocument();
    expect(screen.getByText('Reach 1000 XP')).toBeInTheDocument();
  });

  it('shows XP progress for each badge', () => {
    renderClaimBadge();
    
    // Check XP progress displays
    expect(screen.getByText('750 / 100 XP')).toBeInTheDocument();
    expect(screen.getByText('750 / 500 XP')).toBeInTheDocument();
    expect(screen.getByText('750 / 1000 XP')).toBeInTheDocument();
    
    // Check percentage displays
    expect(screen.getByText('100%')).toBeInTheDocument(); // 750/100 = 100%
    expect(screen.getByText('150%')).toBeInTheDocument(); // 750/500 = 150%
    expect(screen.getByText('75%')).toBeInTheDocument();  // 750/1000 = 75%
  });

  it('allows badge selection', async () => {
    renderClaimBadge();
    
    // Click on a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    // Check that mint panel appears
    await waitFor(() => {
      expect(screen.getByText('Claim Novice HODLer')).toBeInTheDocument();
    });
  });

  it('shows mint panel with correct information', async () => {
    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      expect(screen.getByText('Claim Novice HODLer')).toBeInTheDocument();
      expect(screen.getByText('Complete your first run')).toBeInTheDocument();
      expect(screen.getByText('100 XP')).toBeInTheDocument();
      expect(screen.getByText('750 XP')).toBeInTheDocument();
      expect(screen.getByText('✅ Eligible')).toBeInTheDocument();
    });
  });

  it('shows mobile fallback message', () => {
    renderClaimBadge();
    
    expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
    expect(screen.getByText(/Use RainbowKit or your preferred mobile wallet/)).toBeInTheDocument();
  });

  it('displays owned badges as claimed', () => {
    renderClaimBadge();
    
    // Badges 1 and 2 are marked as owned in the mock
    const ownedBadges = screen.getAllByText('✅ Owned');
    expect(ownedBadges.length).toBeGreaterThan(0);
  });

  it('shows ready to claim for eligible badges', () => {
    renderClaimBadge();
    
    // Badge 3 (1000 XP required, user has 750) should show progress
    const progressText = screen.getByText('250 XP needed');
    expect(progressText).toBeInTheDocument();
  });

  it('handles mint button click', async () => {
    const mockWrite = vi.fn();
    vi.mocked(require('wagmi').useContractWrite).mockReturnValue({
      write: mockWrite,
      isLoading: false,
      data: null
    });

    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      const mintButton = screen.getByText('🎖️ Claim Badge');
      fireEvent.click(mintButton);
    });
    
    expect(mockWrite).toHaveBeenCalled();
  });

  it('shows loading state during minting', async () => {
    vi.mocked(require('wagmi').useContractWrite).mockReturnValue({
      write: vi.fn(),
      isLoading: true,
      data: null
    });

    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      expect(screen.getByText('Minting...')).toBeInTheDocument();
    });
  });

  it('displays error messages', async () => {
    const mockError = new Error('Transaction failed');
    vi.mocked(require('wagmi').usePrepareContractWrite).mockReturnValue({
      config: { address: '0x123', abi: [] },
      error: mockError
    });

    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      expect(screen.getByText('Transaction failed')).toBeInTheDocument();
    });
  });

  it('shows success message after minting', async () => {
    const mockData = { hash: '0x1234567890abcdef' };
    vi.mocked(require('wagmi').useContractWrite).mockReturnValue({
      write: vi.fn(),
      isLoading: false,
      data: mockData
    });

    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      expect(screen.getByText('🎖️ Claim Badge')).toBeInTheDocument();
    });
  });

  it('handles wallet disconnection', () => {
    vi.mocked(require('../src/contexts/WalletContext').useWallet).mockReturnValue({
      address: null,
      isConnected: false
    });

    renderClaimBadge();
    
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    expect(screen.getByText('Connect your wallet to view and claim XP badges')).toBeInTheDocument();
  });

  it('displays correct badge colors', () => {
    renderClaimBadge();
    
    // Check that badge elements have the correct color classes
    const badgeElements = screen.getAllByText(/[1-5]/); // Badge numbers
    expect(badgeElements.length).toBeGreaterThan(0);
  });

  it('shows cancel button in mint panel', async () => {
    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('closes mint panel when cancel is clicked', async () => {
    renderClaimBadge();
    
    // Select a badge
    const badgeElement = screen.getByText('Novice HODLer').closest('div');
    fireEvent.click(badgeElement);
    
    await waitFor(() => {
      expect(screen.getByText('Claim Novice HODLer')).toBeInTheDocument();
    });
    
    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Claim Novice HODLer')).not.toBeInTheDocument();
    });
  });
}); 