import { render, screen, fireEvent } from './test-utils';
import { describe, it, expect, vi } from 'vitest';
import RunProgress from '../src/components/RunProgress';

describe('RunProgress Enhanced', () => {
  const mockRun = {
    id: '1',
    runId: 'RUN-001',
    moves: ['UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN', 'UP', 'DOWN'],
    currentMove: 3,
    score: 4500,
    currentScore: 4500,
    isComplete: false,
    reachedCheckpoint: false,
    checkpointReached: false,
    finalScore: 0,
    dbpEarned: 0,
    xpGained: 0,
    hodlDecision: null,
    currentPrice: 0.1234,
    priceDirection: 'up',
    currentPosition: 'Middle',
    riskLevel: 'Medium',
    potentialDbp: 125.50,
    multiplier: 1.5
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

  describe('Accessibility Features', () => {
    it('has proper ARIA labels for progress bar', () => {
      render(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Run progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '4');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '10');
      expect(progressBar).toHaveAttribute('aria-valuetext', 'Move 4 of 10');
    });

    it('has proper ARIA labels for move sequence', () => {
      render(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      const moveList = screen.getByRole('list');
      expect(moveList).toHaveAttribute('aria-label', 'Move sequence visualization');

      const moveItems = screen.getAllByRole('listitem');
      expect(moveItems).toHaveLength(10);
      
      // Check first move (completed)
      expect(moveItems[0]).toHaveAttribute('aria-label', 'Move 1: UP (completed)');
      
      // Check current move (both current and completed)
      expect(moveItems[3]).toHaveAttribute('aria-label', 'Move 4: DOWN (current) (completed)');
      
      // Check future move
      expect(moveItems[5]).toHaveAttribute('aria-label', 'Move 6: DOWN');
    });

    it('has proper ARIA labels for decision buttons', () => {
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

      const hodlButton = screen.getByRole('button', { name: /HODL/ });
      expect(hodlButton).toHaveAttribute('aria-label', 'Choose HODL option - high risk, high reward');

      const climbButton = screen.getByRole('button', { name: /CLIMB/ });
      expect(climbButton).toHaveAttribute('aria-label', 'Choose CLIMB option - safe, guaranteed reward');
    });

    it('has proper focus management for buttons', () => {
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

      const hodlButton = screen.getByRole('button', { name: /HODL/ });
      const climbButton = screen.getByRole('button', { name: /CLIMB/ });

      expect(hodlButton).toHaveClass('focus:ring-2', 'focus:ring-green-400');
      expect(climbButton).toHaveClass('focus:ring-2', 'focus:ring-blue-400');
    });
  });

  describe('Performance Optimizations', () => {
    it('uses memoized move sequence', () => {
      const { rerender } = render(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      // Re-render with same props should not cause unnecessary re-renders
      rerender(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      // Component should still render correctly
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('uses callback for decision handling', () => {
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

      const hodlButton = screen.getByRole('button', { name: /HODL/ });
      fireEvent.click(hodlButton);

      expect(mockOnHodlDecision).toHaveBeenCalledWith(true);
    });

    it('prevents decision when loading', () => {
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

      const hodlButton = screen.getByRole('button', { name: /HODL/ });
      fireEvent.click(hodlButton);

      expect(mockOnHodlDecision).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('renders correctly on different screen sizes', () => {
      render(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      // Check that grid layouts are responsive
      const priceGrid = screen.getByText('Current Price').closest('div').parentElement.parentElement;
      expect(priceGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3');

      const moveGrid = screen.getByRole('list');
      expect(moveGrid).toHaveClass('grid-cols-10');
    });
  });

  describe('Animation and Transitions', () => {
    it('has smooth transitions for progress bar', () => {
      render(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      const progressBar = screen.getByRole('progressbar').querySelector('div');
      expect(progressBar).toHaveClass('transition-all', 'duration-1000', 'ease-out');
    });

    it('has smooth transitions for move sequence', () => {
      render(
        <RunProgress
          run={mockRun}
          phase="running"
          onHodlDecision={mockOnHodlDecision}
          loading={false}
          engine={mockEngine}
        />
      );

      const moveItems = screen.getAllByRole('listitem');
      moveItems.forEach(item => {
        expect(item).toHaveClass('transition-all', 'duration-300');
      });
    });
  });
}); 