import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatOverlay from '../src/components/StatOverlay';

// Mock framer-motion to just render divs for deterministic width checks
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

describe('StatOverlay', () => {
  it('renders XP progress correctly', () => {
    const stats = { level: 2, currentXp: 50, xpToNext: 100 };
    render(<StatOverlay stats={stats} />);

    const bar = screen.getByRole('progressbar', { hidden: true });
    expect(bar.style.width).toContain('50%');
  });
});