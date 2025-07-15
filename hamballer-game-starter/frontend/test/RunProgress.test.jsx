import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RunProgress from '../src/components/RunProgress';

describe('RunProgress', () => {
  const mockEngine = {
    currentMove: 3,
  };

  const mockRun = {
    runId: 'test-run-123',
    moves: ['UP', 'DOWN', 'UP', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP'],
    currentScore: 150,
    currentPrice: 0.1234,
    priceDirection: 'up',
    currentPosition: 'Safe Zone',
    riskLevel: 'Medium',
    potentialDbp: 25.50,
    multiplier: 2.5,
  };

  const mockOnHodlDecision = vi.fn();

  beforeEach(() => {
    mockOnHodlDecision.mockClear();
  });

  it('returns null when run prop is not provided', () => {
    const { container } = render(
      <RunProgress 
        run={null} 
        phase="setup" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders run header with correct information', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('Run #test-run-123')).toBeInTheDocument();
    expect(screen.getByText('Move 4/10')).toBeInTheDocument();
    expect(screen.getByText('Current Score:')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('displays progress bar with correct percentage', () => {
    const { container } = render(
      <RunProgress 
        run={mockRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    // Progress should be (currentMove + 1) / totalMoves * 100 = 4/10 * 100 = 40%
    const progressBar = container.querySelector('.bg-gradient-to-r');
    expect(progressBar).toHaveStyle({ width: '40%' });
  });

  it('renders move sequence visualization correctly', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    // Check for arrows representing moves
    expect(screen.getAllByText('⬆️')).toHaveLength(6); // 6 UP moves
    expect(screen.getAllByText('⬇️')).toHaveLength(4); // 4 DOWN moves
  });

  it('displays current price and position information', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('Current Price')).toBeInTheDocument();
    expect(screen.getByText('$0.1234')).toBeInTheDocument();
    expect(screen.getByText('📈 Rising')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Safe Zone')).toBeInTheDocument();
    expect(screen.getByText('Risk Level: Medium')).toBeInTheDocument();
  });

  it('displays potential reward information', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('Potential Reward')).toBeInTheDocument();
    expect(screen.getByText('25.50 DBP')).toBeInTheDocument();
    expect(screen.getByText('Multiplier: 2.5x')).toBeInTheDocument();
  });

  it('shows checkpoint reached indicator when appropriate', () => {
    const runWithCheckpoint = {
      ...mockRun,
      checkpointReached: true
    };
    
    render(
      <RunProgress 
        run={runWithCheckpoint} 
        phase="decision" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('🎯 Checkpoint Reached!')).toBeInTheDocument();
  });

  it('renders HODL decision panel in decision phase', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="decision" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('🚨 Checkpoint Reached!')).toBeInTheDocument();
    expect(screen.getByText("You've reached the decision point. What's your move?")).toBeInTheDocument();
    expect(screen.getByText('💎 HODL')).toBeInTheDocument();
    expect(screen.getByText('🧗 CLIMB')).toBeInTheDocument();
  });

  it('calls onHodlDecision with true when HODL button is clicked', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="decision" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    const hodlButton = screen.getByRole('button', { name: /HODL 💎/i });
    fireEvent.click(hodlButton);
    
    expect(mockOnHodlDecision).toHaveBeenCalledWith(true);
  });

  it('calls onHodlDecision with false when CLIMB button is clicked', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="decision" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    const climbButton = screen.getByRole('button', { name: /CLIMB 🧗/i });
    fireEvent.click(climbButton);
    
    expect(mockOnHodlDecision).toHaveBeenCalledWith(false);
  });

  it('disables decision buttons when loading', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="decision" 
        onHodlDecision={mockOnHodlDecision} 
        loading={true} 
        engine={mockEngine} 
      />
    );
    
    const processingButtons = screen.getAllByRole('button', { name: /Processing.../i });
    expect(processingButtons).toHaveLength(2);
    
    processingButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('renders run complete summary in complete phase', () => {
    const completedRun = {
      ...mockRun,
      finalScore: 200,
      dbpEarned: 30,
      xpGained: 50,
      hodlDecision: true
    };
    
    render(
      <RunProgress 
        run={completedRun} 
        phase="complete" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('Run Summary')).toBeInTheDocument();
    expect(screen.getByText('Final Score')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('DBP Earned')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('XP Gained')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('HODL 💎')).toBeInTheDocument();
  });

  it('shows CLIMB decision in complete phase summary', () => {
    const completedRun = {
      ...mockRun,
      finalScore: 150,
      dbpEarned: 20,
      xpGained: 30,
      hodlDecision: false
    };
    
    render(
      <RunProgress 
        run={completedRun} 
        phase="complete" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('CLIMB 🧗')).toBeInTheDocument();
  });

  it('handles missing engine gracefully', () => {
    render(
      <RunProgress 
        run={mockRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={null} 
      />
    );
    
    // Should default to move 1/10 when engine is null
    expect(screen.getByText('Move 1/10')).toBeInTheDocument();
  });

  it('handles missing optional run properties', () => {
    const minimalRun = {
      runId: 'minimal-run',
      moves: ['UP', 'DOWN']
    };
    
    render(
      <RunProgress 
        run={minimalRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={mockEngine} 
      />
    );
    
    expect(screen.getByText('Run #minimal-run')).toBeInTheDocument();
    expect(screen.getByText('$0.0000')).toBeInTheDocument(); // Default price
    expect(screen.getByText('0.00 DBP')).toBeInTheDocument(); // Default potential DBP
  });

  it('calculates progress correctly with different move counts', () => {
    const shortRun = {
      ...mockRun,
      moves: ['UP', 'DOWN'] // Only 2 moves
    };
    
    const shortEngine = {
      currentMove: 1 // Second move (0-indexed)
    };
    
    const { container } = render(
      <RunProgress 
        run={shortRun} 
        phase="running" 
        onHodlDecision={mockOnHodlDecision} 
        loading={false} 
        engine={shortEngine} 
      />
    );
    
    // Progress should be (1 + 1) / 2 * 100 = 100%
    const progressBar = container.querySelector('.bg-gradient-to-r');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });
});