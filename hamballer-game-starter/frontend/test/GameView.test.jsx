import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameView from '../src/components/GameView';

// Mock all the dependencies with proper .jsx extensions
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: vi.fn()
}));

vi.mock('../src/hooks/useGameState.jsx', () => ({
  useGameState: vi.fn()
}));

vi.mock('../src/services/useWebSocketService.jsx', () => ({
  useWebSocket: vi.fn()
}));

vi.mock('../src/lib/useRunEngine', () => ({
  default: vi.fn()
}));

// Mock child components to avoid complexity in integration tests
vi.mock('../src/components/RunProgress', () => ({
  default: ({ run, phase, onHodlDecision, loading, engine }) => (
    <div data-testid="run-progress">
      RunProgress: {phase} - {run ? 'hasRun' : 'noRun'}
      {phase === 'decision' && (
        <div>
          <button onClick={() => onHodlDecision(true)}>HODL</button>
          <button onClick={() => onHodlDecision(false)}>CLIMB</button>
        </div>
      )}
    </div>
  )
}));

vi.mock('../src/components/LiveReplay', () => ({
  default: ({ replay }) => (
    <div data-testid="live-replay">LiveReplay: {replay ? 'hasReplay' : 'noReplay'}</div>
  )
}));

vi.mock('../src/components/MoveSelector', () => ({
  default: ({ selectedMoves, onMovesChange, onStartRun, loading, boosts }) => (
    <div data-testid="move-selector">
      MoveSelector
      <button onClick={() => onMovesChange(['UP', 'DOWN'])}>Select Moves</button>
      <button onClick={onStartRun} disabled={loading}>Start Run</button>
    </div>
  )
}));

vi.mock('../src/components/RunResultDisplay', () => ({
  default: ({ run, onPlayAgain }) => (
    <div data-testid="run-result-display">
      RunResultDisplay
      <button onClick={onPlayAgain}>Play Again</button>
    </div>
  )
}));

vi.mock('../src/components/GameSummary', () => ({
  default: () => <div data-testid="game-summary">GameSummary</div>
}));

vi.mock('../src/components/ActivitySidebar', () => ({
  default: ({ playerStats, boosts }) => (
    <div data-testid="activity-sidebar">
      ActivitySidebar: {playerStats ? 'hasStats' : 'noStats'}
    </div>
  )
}));

describe('GameView Integration', () => {
  // Default mock implementations
  const mockUseWallet = vi.fn();
  const mockUseGameState = vi.fn();
  const mockUseWebSocket = vi.fn();
  const mockUseRunEngine = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set up default mock implementations
    mockUseWallet.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true
    });

    mockUseGameState.mockReturnValue({
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
    });

    mockUseWebSocket.mockReturnValue({
      liveReplay: null,
      connected: true
    });

    mockUseRunEngine.mockReturnValue({
      currentMove: 0,
      running: false,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    });

    // Apply mocks to the imported modules
    const WalletContext = require('../src/contexts/WalletContext');
    WalletContext.useWallet.mockImplementation(mockUseWallet);

    const GameState = require('../src/hooks/useGameState.jsx');
    GameState.useGameState.mockImplementation(mockUseGameState);

    const WebSocketService = require('../src/services/useWebSocketService.jsx');
    WebSocketService.useWebSocket.mockImplementation(mockUseWebSocket);

    const RunEngine = require('../src/lib/useRunEngine');
    RunEngine.default.mockImplementation(mockUseRunEngine);
  });

  it('renders GameSummary when wallet is not connected', () => {
    // Mock disconnected wallet
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false
    });

    render(<GameView />);
    
    expect(screen.getByTestId('game-summary')).toBeInTheDocument();
  });

  it('renders main game interface when wallet is connected', () => {
    render(<GameView />);
    
    expect(screen.getByTestId('move-selector')).toBeInTheDocument();
    expect(screen.getByTestId('activity-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Select Your Moves')).toBeInTheDocument();
  });

  it('passes correct props to ActivitySidebar', () => {
    render(<GameView />);
    
    expect(screen.getByText('ActivitySidebar: hasStats')).toBeInTheDocument();
  });

  it('displays WebSocket connection status', () => {
    render(<GameView />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
    
    // Test disconnected state
    mockUseWebSocket.mockReturnValue({
      liveReplay: null,
      connected: false
    });

    render(<GameView />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays error messages when present', () => {
    mockUseGameState.mockReturnValue({
      currentRun: null,
      playerStats: null,
      boosts: [],
      loading: false,
      error: 'Test error message',
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    render(<GameView />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('transitions to running phase correctly', () => {
    const mockCurrentRun = {
      runId: 'test-run',
      moves: ['UP', 'DOWN'],
      isComplete: false,
      reachedCheckpoint: false
    };

    mockUseGameState.mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    mockUseRunEngine.mockReturnValue({
      currentMove: 0,
      running: true,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    });

    render(<GameView />);
    
    expect(screen.getByText('Run in Progress...')).toBeInTheDocument();
    expect(screen.getByTestId('run-progress')).toBeInTheDocument();
  });

  it('transitions to decision phase correctly', () => {
    const mockCurrentRun = {
      runId: 'test-run',
      moves: ['UP', 'DOWN'],
      isComplete: false,
      reachedCheckpoint: true
    };

    mockUseGameState.mockReturnValue({
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
  });

  it('transitions to complete phase correctly', () => {
    const mockCurrentRun = {
      runId: 'test-run',
      moves: ['UP', 'DOWN'],
      isComplete: true,
      reachedCheckpoint: false
    };

    mockUseGameState.mockReturnValue({
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

  it('handles move selection and run start', () => {
    const mockStartRun = vi.fn();
    const mockEngineStart = vi.fn();

    mockUseGameState.mockReturnValue({
      currentRun: null,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: mockStartRun,
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    mockUseRunEngine.mockReturnValue({
      currentMove: 0,
      running: false,
      complete: false,
      start: mockEngineStart,
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    });

    render(<GameView />);
    
    fireEvent.click(screen.getByText('Select Moves'));
    fireEvent.click(screen.getByText('Start Run'));
    
    expect(mockStartRun).toHaveBeenCalled();
  });

  it('handles play again functionality', () => {
    const mockResetRun = vi.fn();
    const mockEngineReset = vi.fn();

    const mockCurrentRun = {
      runId: 'test-run',
      moves: ['UP', 'DOWN'],
      isComplete: true,
      reachedCheckpoint: false
    };

    mockUseGameState.mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: mockResetRun
    });

    mockUseRunEngine.mockReturnValue({
      currentMove: 0,
      running: false,
      complete: true,
      start: vi.fn(),
      reset: mockEngineReset,
      validateMoves: vi.fn(() => true)
    });

    render(<GameView />);
    
    fireEvent.click(screen.getByText('Play Again'));
    
    expect(mockResetRun).toHaveBeenCalled();
  });

  it('shows LiveReplay during running phase when replay data is available', () => {
    const mockCurrentRun = {
      runId: 'test-run',
      moves: ['UP', 'DOWN'],
      isComplete: false,
      reachedCheckpoint: false
    };

    const mockLiveReplay = { data: 'replay-data' };

    mockUseWebSocket.mockReturnValue({
      liveReplay: mockLiveReplay,
      connected: true
    });

    mockUseGameState.mockReturnValue({
      currentRun: mockCurrentRun,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: vi.fn(),
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    mockUseRunEngine.mockReturnValue({
      currentMove: 0,
      running: true,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: vi.fn(() => true)
    });

    render(<GameView />);
    
    expect(screen.getByTestId('live-replay')).toBeInTheDocument();
    expect(screen.getByText('LiveReplay: hasReplay')).toBeInTheDocument();
  });

  it('handles invalid move selection gracefully', () => {
    const mockStartRun = vi.fn();
    
    mockUseGameState.mockReturnValue({
      currentRun: null,
      playerStats: null,
      boosts: [],
      loading: false,
      error: null,
      startRun: mockStartRun,
      endRun: vi.fn(),
      resetRun: vi.fn()
    });

    mockUseRunEngine.mockReturnValue({
      currentMove: 0,
      running: false,
      complete: false,
      start: vi.fn(),
      reset: vi.fn(),
      validateMoves: vi.fn(() => false)
    });

    render(<GameView />);
    
    fireEvent.click(screen.getByText('Start Run'));
    
    // Should not call startRun when validation fails
    expect(mockStartRun).not.toHaveBeenCalled();
  });

  it('renders without crashing in all scenarios', () => {
    // Test with null states
    mockUseGameState.mockReturnValue({
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