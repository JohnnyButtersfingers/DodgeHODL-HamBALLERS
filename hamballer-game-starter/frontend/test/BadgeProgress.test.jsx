import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BadgeProgress from '../src/components/BadgeProgress';

// Mock the custom XPBadge hook so we can inject balances deterministically
vi.mock('../src/hooks/useXPBadge', () => {
  return {
    __esModule: true,
    default: vi.fn()
  };
});

const mockUseXPBadge = require('../src/hooks/useXPBadge').default;

describe('BadgeProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays minted counts and eligibility correctly', () => {
    mockUseXPBadge.mockReturnValue({
      balances: { 0: '2', 1: '0', 2: '0', 3: '0', 4: '0' },
      loading: false,
      error: null,
    });

    // Current XP qualifies for Common badge (>=25)
    render(<BadgeProgress currentXp={30} />);

    // Participation minted count shown
    expect(screen.getByText('Participation')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Eligibility label should appear for Common tier
    expect(screen.getByText('Common')).toBeInTheDocument();
    expect(screen.getByText(/Eligible/i)).toBeInTheDocument();
  });

  it('renders loading indicator when loading', () => {
    mockUseXPBadge.mockReturnValue({
      balances: {},
      loading: true,
      error: null,
    });

    render(<BadgeProgress currentXp={10} />);
    expect(screen.getByText(/Updating…/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseXPBadge.mockReturnValue({
      balances: {},
      loading: false,
      error: new Error('Test Error'),
    });

    render(<BadgeProgress currentXp={10} />);
    expect(screen.getByText(/Error loading badges/i)).toBeInTheDocument();
  });
});