import { render, screen, fireEvent, within } from './test-utils';
import { describe, it, expect, vi } from 'vitest';
import RunProgress from '../src/components/RunProgress';

describe('RunProgress', () => {
  const mockRun = {
    id: '1',
    moves: ['UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN'],
    currentMove: 3,
    score: 4500,
    isComplete: false,
    reachedCheckpoint: false,
    finalScore: 0,
    dbpEarned: 0,
    xpGained: 0,
    hodlDecision: null
  };

  const mockEngine = {
    currentMove: 3,
    totalMoves: 10,
    running: true,
    complete: false,
    score: 4500
  };

  const mockOnHodlDecision = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders running phase correctly', () => {
    render(
      <RunProgress
        run={mockRun}
        phase="running"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    // Header should contain 'Run #' and move info
    expect(screen.getByText((content, node) =>
      node.tagName.toLowerCase() === 'h3' && content.includes('Run #')
    )).toBeInTheDocument();
    expect(screen.getByText((content, node) =>
      node.textContent === 'Move 4/10'
    )).toBeInTheDocument();
    // Find the div with 'Current Score:' and check for the span with '0'
    const scoreDiv = screen.getByText((content, node) =>
      node.tagName.toLowerCase() === 'div' && content.includes('Current Score:')
    );
    expect(within(scoreDiv).getByText('0')).toBeInTheDocument();
  });

  it('renders decision phase with HODL and CLIMB buttons', () => {
    const decisionRun = { ...mockRun, reachedCheckpoint: true };
    render(
      <RunProgress
        run={decisionRun}
        phase="decision"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    // The decision phase header is an h3 with the checkpoint emoji
    expect(screen.getByText((content, node) =>
      node.tagName.toLowerCase() === 'h3' && content.includes('🚨 Checkpoint Reached!')
    )).toBeInTheDocument();
    expect(screen.getByText('HODL 💎')).toBeInTheDocument();
    expect(screen.getByText('CLIMB 🧗')).toBeInTheDocument();
  });

  it('calls onHodlDecision when HODL button is clicked', () => {
    const decisionRun = { ...mockRun, reachedCheckpoint: true };
    
    render(
      <RunProgress
        run={decisionRun}
        phase="decision"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    fireEvent.click(screen.getByText('HODL 💎'));
    expect(mockOnHodlDecision).toHaveBeenCalledWith(true);
  });

  it('calls onHodlDecision when CLIMB button is clicked', () => {
    const decisionRun = { ...mockRun, reachedCheckpoint: true };
    
    render(
      <RunProgress
        run={decisionRun}
        phase="decision"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    fireEvent.click(screen.getByText('CLIMB 🧗'));
    expect(mockOnHodlDecision).toHaveBeenCalledWith(false);
  });

  it('renders complete phase with run summary', () => {
    const completeRun = {
      ...mockRun,
      isComplete: true,
      finalScore: 8500,
      dbpEarned: 125.50,
      xpGained: 150,
      hodlDecision: true
    };

    render(
      <RunProgress
        run={completeRun}
        phase="complete"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    expect(screen.getByText('Run Summary')).toBeInTheDocument();
    expect(screen.getByText('8500')).toBeInTheDocument(); // finalScore
    expect(screen.getByText('125.5')).toBeInTheDocument(); // dbpEarned (note: .50 becomes .5)
    expect(screen.getByText('150')).toBeInTheDocument(); // xpGained
    expect(screen.getByText('HODL 💎')).toBeInTheDocument(); // decision
  });

  it('shows loading state when loading prop is true', () => {
    // Test loading state in decision phase where buttons would be present
    const decisionRun = { ...mockRun, reachedCheckpoint: true };
    render(
      <RunProgress
        run={decisionRun}
        phase="decision"
        onHodlDecision={mockOnHodlDecision}
        loading={true}
        engine={mockEngine}
      />
    );

    // Check for loading state in decision buttons
    const hodlButton = screen.getByRole('button', { name: /HODL/ });
    expect(hodlButton).toBeDisabled();
  });

  it('displays move sequence correctly', () => {
    render(
      <RunProgress
        run={mockRun}
        phase="running"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    // Check that move sequence is displayed using ARIA labels
    expect(screen.getByLabelText('Move 1: UP (completed)')).toBeInTheDocument();
    expect(screen.getByLabelText('Move 2: DOWN (completed)')).toBeInTheDocument();
    expect(screen.getByLabelText('Move 4: DOWN (current) (completed)')).toBeInTheDocument();
  });

  it('handles missing run data gracefully', () => {
    render(
      <RunProgress
        run={null}
        phase="setup"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={mockEngine}
      />
    );

    // Component should render nothing when run is null
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('handles missing engine data gracefully', () => {
    render(
      <RunProgress
        run={mockRun}
        phase="running"
        onHodlDecision={mockOnHodlDecision}
        loading={false}
        engine={null}
      />
    );

    // Should still render with default values
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Move 1/10')).toBeInTheDocument();
  });
}); 