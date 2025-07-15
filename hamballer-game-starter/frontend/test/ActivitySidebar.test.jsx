import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActivitySidebar from '../src/components/ActivitySidebar';

// Mock StatOverlay component
vi.mock('../src/components/StatOverlay', () => ({
  default: ({ stats }) => (
    <div data-testid="stat-overlay">
      StatOverlay with stats: {stats ? 'present' : 'absent'}
    </div>
  )
}));

describe('ActivitySidebar', () => {
  const mockPlayerStats = {
    runsToday: 5,
    bestScore: 1250,
    totalDbp: 2500
  };

  const mockBoosts = [
    { id: 0, name: 'Speed Boost', count: 2 },
    { id: 1, name: 'Shield', count: 1 },
    { id: 2, name: 'Double Points', count: 3 }
  ];

  it('renders StatOverlay component', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    
    expect(screen.getByTestId('stat-overlay')).toBeInTheDocument();
  });

  it('displays recent activity section with correct data', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Runs Today:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Best Score:')).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('Total DBP:')).toBeInTheDocument();
    expect(screen.getByText('2500')).toBeInTheDocument();
  });

  it('displays default values when playerStats is null', () => {
    render(<ActivitySidebar playerStats={null} boosts={[]} />);
    
    // Use more specific selectors to avoid conflicts with boost counts
    const activitySection = screen.getByText('Recent Activity').parentElement;
    expect(activitySection).toHaveTextContent('Runs Today:0');
    expect(activitySection).toHaveTextContent('Best Score:0');
    expect(activitySection).toHaveTextContent('Total DBP:0');
  });

  it('displays default values when playerStats is undefined', () => {
    render(<ActivitySidebar playerStats={undefined} boosts={[]} />);
    
    const activitySection = screen.getByText('Recent Activity').parentElement;
    expect(activitySection).toHaveTextContent('Runs Today:0');
    expect(activitySection).toHaveTextContent('Best Score:0');
    expect(activitySection).toHaveTextContent('Total DBP:0');
  });

  it('renders available boosts section when boosts are provided', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    
    expect(screen.getByText('Available Boosts')).toBeInTheDocument();
    expect(screen.getByText('Speed Boost')).toBeInTheDocument();
    expect(screen.getByText('Shield')).toBeInTheDocument();
    expect(screen.getByText('Double Points')).toBeInTheDocument();
    
    // Check boost counts
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render boosts section when boosts array is empty', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={[]} />);
    
    expect(screen.queryByText('Available Boosts')).not.toBeInTheDocument();
  });

  it('does not render boosts section when boosts is null', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={null} />);
    
    expect(screen.queryByText('Available Boosts')).not.toBeInTheDocument();
  });

  it('does not render boosts section when boosts is undefined', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={undefined} />);
    
    expect(screen.queryByText('Available Boosts')).not.toBeInTheDocument();
  });

  it('renders with minimal props', () => {
    render(<ActivitySidebar />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    const activitySection = screen.getByText('Recent Activity').parentElement;
    expect(activitySection).toHaveTextContent('Runs Today:0');
    expect(activitySection).toHaveTextContent('Best Score:0');
    expect(activitySection).toHaveTextContent('Total DBP:0');
    expect(screen.queryByText('Available Boosts')).not.toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('space-y-6');
  });

  it('renders boost items with unique keys', () => {
    render(<ActivitySidebar playerStats={mockPlayerStats} boosts={mockBoosts} />);
    
    // All boost names should be present
    mockBoosts.forEach(boost => {
      expect(screen.getByText(boost.name)).toBeInTheDocument();
    });
  });

  it('handles edge case with partial playerStats', () => {
    const partialStats = {
      runsToday: 7, // Using different number to avoid conflicts
      // bestScore missing
      totalDbp: 1000
    };
    
    render(<ActivitySidebar playerStats={partialStats} boosts={[]} />);
    
    const activitySection = screen.getByText('Recent Activity').parentElement;
    expect(activitySection).toHaveTextContent('Runs Today:7');
    expect(activitySection).toHaveTextContent('Best Score:0');
    expect(activitySection).toHaveTextContent('Total DBP:1000');
  });

  it('renders without crashing', () => {
    expect(() => render(<ActivitySidebar />)).not.toThrow();
  });
});