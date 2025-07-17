import { render, screen } from './test-utils';
import { describe, it, expect, vi } from 'vitest';
import ActivitySidebar from '../src/components/ActivitySidebar';

// Mock StatOverlay component
vi.mock('../src/components/StatOverlay', () => ({
  default: ({ stats }) => (
    <div data-testid="stat-overlay">
      <span>Stats: {stats?.level || 0}</span>
    </div>
  )
}));

describe('ActivitySidebar', () => {
  const mockPlayerStats = {
    runsToday: 5,
    bestScore: 8500,
    totalDbp: 1250.75,
    level: 12
  };

  const mockBoosts = [
    { id: 0, name: 'Speed Boost', count: 2 },
    { id: 1, name: 'Shield', count: 1 },
    { id: 2, name: 'Double Points', count: 3 }
  ];

  it('renders StatOverlay with player stats', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    expect(screen.getByTestId('stat-overlay')).toBeInTheDocument();
    expect(screen.getByText('Stats: 12')).toBeInTheDocument();
  });

  it('renders recent activity section with correct stats', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // runsToday
    expect(screen.getByText('8500')).toBeInTheDocument(); // bestScore
    expect(screen.getByText('1250.75')).toBeInTheDocument(); // totalDbp
  });

  it('renders available boosts section when boosts are provided', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    expect(screen.getByText('Available Boosts')).toBeInTheDocument();
    expect(screen.getByText('Speed Boost')).toBeInTheDocument();
    expect(screen.getByText('Shield')).toBeInTheDocument();
    expect(screen.getByText('Double Points')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Speed Boost count
    expect(screen.getByText('1')).toBeInTheDocument(); // Shield count
    expect(screen.getByText('3')).toBeInTheDocument(); // Double Points count
  });

  it('does not render boosts section when boosts are empty', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={[]} />);
    expect(screen.queryByText('Available Boosts')).not.toBeInTheDocument();
  });

  it('does not render boosts section when boosts are null', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={null} />);
    expect(screen.queryByText('Available Boosts')).not.toBeInTheDocument();
  });

  it('handles missing player stats gracefully', () => {
    render(<ActivitySidebar playerStats={null} boosts={mockBoosts} />);
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    // Use getAllByText to avoid ambiguity
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('handles partial player stats', () => {
    const partialStats = { runsToday: 3 };
    render(<ActivitySidebar playerStats={partialStats} boosts={mockBoosts} />);
    // Use more specific selector to find the runsToday value
    const runsTodayElement = screen.getByText('Runs Today:').nextElementSibling;
    expect(runsTodayElement).toHaveTextContent('3');
    expect(screen.getAllByText('0').length).toBeGreaterThan(0); // default bestScore and totalDbp
  });
}); 