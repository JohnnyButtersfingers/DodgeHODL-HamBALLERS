import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameView from '../src/components/GameView';

// Mock all the dependencies
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

vi.mock('../src/hooks/useGameState', () => ({
  useGameState: () => ({
    currentRun: null,
    playerStats: {
      runsToday: 3,
      bestScore: 500,
      totalDbp: 1000
    },
    boosts: [
      { id: 0, name: 'Speed Boost', count: 2 },
      { id: 1, name: 'Shield', count: 1 }
    ],
    loading: false,
    error: null,
    startRun: vi.fn(),
    endRun: vi.fn(),
    resetRun: vi.fn()
  })
}));

vi.mock('../src/services/useWebSocketService', () => ({
  useWebSocket: () => ({
    liveReplay: null,
    connected: true
  })
}));

vi.mock('../src/lib/useRunEngine', () => ({
  default: () => ({
    currentMove: 0,
    running: false,
    complete: false,
    start: vi.fn(),
    reset: vi.fn(),
    validateMoves: vi.fn(() => true)
  })
}));

// Mock all the child components
vi.mock('../src/components/GameSummary', () => ({
  default: () => <div data-testid="game-summary">GameSummary Component</div>
}));

vi.mock('../src/components/ActivitySidebar', () => ({
  default: ({ playerStats, boosts }) => (
    <div data-testid="activity-sidebar">
      ActivitySidebar with {playerStats?.runsToday || 0} runs and {boosts?.length || 0} boosts
    </div>
  )
}));

vi.mock('../src/components/RunProgress', () => ({
  default: ({ run, phase, onHodlDecision }) => (
    <div data-testid="run-progress">
      RunProgress: {phase} phase {run ? `(Run ${run.runId})` : '(No run)'}
    </div>
  )
}));

vi.mock('../src/components/MoveSelector', () => ({
  default: ({ selectedMoves, onMovesChange, onStartRun, loading }) => (
    <div data-testid="move-selector">
      MoveSelector: {selectedMoves.length} moves selected
      <button onClick={() => onStartRun()}>Start Run</button>
    </div>
  )
}));

vi.mock('../src/components/LiveReplay', () => ({
  default: ({ replay }) => (
    <div data-testid="live-replay">LiveReplay Component</div>
  )
}));

vi.mock('../src/components/RunResultDisplay', () => ({
  default: ({ run, onPlayAgain }) => (
    <div data-testid="run-result-display">
      RunResultDisplay
      <button onClick={() => onPlayAgain()}>Play Again</button>
    </div>
  )
}));

describe('GameView Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders GameSummary when wallet is not connected', () => {
    // Mock disconnected wallet
    vi.mocked(require('../src/contexts/WalletContext').useWallet).mockReturnValue({
      address: null,
      isConnected: false
    });

    render(<GameView />);
    
    expect(screen.getByTestId('game-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-sidebar')).not.toBeInTheDocument();
  });

  it('renders main game interface when wallet is connected', () => {
    render(<GameView />);
    
    expect(screen.queryByTestId('game-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('activity-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Select Your Moves')).toBeInTheDocument();
  });

  it('passes correct props to ActivitySidebar', () => {
    render(<GameView />);
    
    const sidebar = screen.getByTestId('activity-sidebar');
    expect(sidebar).toHaveTextContent('3 runs and 2 boosts');
  });

  it('displays WebSocket connection status', () => {
    render(<GameView />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
    
    // Test disconnected state
    vi.mocked(require('../src/services/useWebSocketService').useWebSocket).mockReturnValue({
      liveReplay: null,
      connected: false
    });

    render(<GameView />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays error messages when present', () => {
    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: null,
      playerStats: null,
      boosts: [],
      loading: false,
      error: 'Connection failed',
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    render(<GameView />);
    
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('transitions to running phase correctly', () => {
    const mockCurrentRun = {
      runId: 'test-run-123',
      moves: ['UP', 'DOWN', 'UP', 'UP', 'DOWN'],
      isComplete: false,
      reachedCheckpoint: false
    };

    const mockEngine = {
      currentMove: 2,
      running: true,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    };

    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    vi.mocked(require('../src/lib/useRunEngine').default).mockReturnValue(mockEngine);

    render(<GameView />);
    
    expect(screen.getByText('Run in Progress...')).toBeInTheDocument();
    expect(screen.getByTestId('run-progress')).toHaveTextContent('running phase');
  });

  it('transitions to decision phase correctly', () => {
    const mockCurrentRun = {
      runId: 'test-run-123',
      moves: ['UP', 'DOWN', 'UP', 'UP', 'DOWN'],
      isComplete: false,
      reachedCheckpoint: true
    };

    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    render(<GameView />);
    
    expect(screen.getByText('HODL or CLIMB?')).toBeInTheDocument();
    expect(screen.getByTestId('run-progress')).toHaveTextContent('decision phase');
  });

  it('transitions to complete phase correctly', () => {
    const mockCurrentRun = {
      runId: 'test-run-123',
      moves: ['UP', 'DOWN', 'UP', 'UP', 'DOWN'],
      isComplete: true,
      reachedCheckpoint: false
    };

    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    render(<GameView />);
    
    expect(screen.getByText('Run Complete!')).toBeInTheDocument();
    expect(screen.getByTestId('run-result-display')).toBeInTheDocument();
  });

  it('handles move selection and run start', async () => {
    const mockStartRun = vi.fn();
    const mockEngineStart = vi.fn();

    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: null,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: mockStartRun,
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    vi.mocked(require('../src/lib/useRunEngine').default).mockReturnValue({
      currentMove: 0,
      running: false,
      complete: false,
      start: mockEngineStart,
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    });

    render(<GameView />);
    
    const startButton = screen.getByText('Start Run');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartRun).toHaveBeenCalled();
      expect(mockEngineStart).toHaveBeenCalled();
    });
  });

  it('handles play again functionality', () => {
    const mockResetRun = vi.fn();
    const mockEngineReset = vi.fn();

    const mockCurrentRun = {
      runId: 'completed-run',
      isComplete: true
    };

    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: mockResetRun
    });

    vi.mocked(require('../src/lib/useRunEngine').default).mockReturnValue({
      currentMove: 0,
      running: false,
      complete: true,
      start: vi.fn(),
      reset: mockEngineReset,
      validateMoves: vi.fn(() => true)
    });

    render(<GameView />);
    
    const playAgainButton = screen.getByText('Play Again');
    fireEvent.click(playAgainButton);

    expect(mockResetRun).toHaveBeenCalled();
    expect(mockEngineReset).toHaveBeenCalled();
  });

  it('shows LiveReplay during running phase when replay data is available', () => {
    const mockLiveReplay = { data: 'replay-data' };

    vi.mocked(require('../src/services/useWebSocketService').useWebSocket).mockReturnValue({
      liveReplay: mockLiveReplay,
      connected: true
    });

    const mockCurrentRun = {
      runId: 'test-run',
      isComplete: false,
      reachedCheckpoint: false
    };

    const mockEngine = {
      currentMove: 2,
      running: true,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    };

    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    vi.mocked(require('../src/lib/useRunEngine').default).mockReturnValue(mockEngine);

    render(<GameView />);
    
    expect(screen.getByTestId('live-replay')).toBeInTheDocument();
  });

  it('handles invalid move selection gracefully', () => {
    const mockValidateMoves = vi.fn(() => false);
    
    vi.mocked(require('../src/lib/useRunEngine').default).mockReturnValue({
      currentMove: 0,
      running: false,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: mockValidateMoves
    });

    render(<GameView />);
    
    const startButton = screen.getByText('Start Run');
    fireEvent.click(startButton);

    // Should show alert for invalid moves
    expect(global.alert).toHaveBeenCalledWith('Please select your moves first!');
  });

  it('renders without crashing in all scenarios', () => {
    // Test with minimal props
    expect(() => render(<GameView />)).not.toThrow();
    
    // Test with null states
    vi.mocked(require('../src/hooks/useGameState').useGameState).mockReturnValue({
      currentRun: null,
      playerStats: null,
      boosts: null,
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });
    
    expect(() => render(<GameView />)).not.toThrow();
  });
});