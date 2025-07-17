import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for component size tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock AudioContext for audio tests
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn() },
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  destination: {},
}));

// Mock Web Audio API
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock WebSocket for real-time tests
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
}));

// Mock howler for audio tests
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    unload: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    fade: vi.fn(),
    seek: vi.fn(),
    playing: vi.fn(),
    duration: vi.fn(),
    volume: vi.fn(),
  })),
  Howler: {
    ctx: {
      createGain: vi.fn(),
      createBuffer: vi.fn(),
      createBufferSource: vi.fn(),
    },
    volume: vi.fn(),
    stop: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    state: vi.fn(() => 'running'),
    codecs: vi.fn(() => true),
    unload: vi.fn(),
    listeners: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
  },
}));

// Mock use-sound for audio tests
vi.mock('use-sound', () => ({
  __esModule: true,
  default: () => [vi.fn(), { stop: vi.fn(), sound: { play: vi.fn(), stop: vi.fn() } }],
}));

// Mock viem for contract tests
vi.mock('viem', () => ({
  getContract: vi.fn(),
  createPublicClient: vi.fn(),
  http: vi.fn(),
  createWalletClient: vi.fn(),
  custom: vi.fn(),
  parseEther: vi.fn((value) => value),
  formatEther: vi.fn((value) => value.toString()),
}));

// Mock wagmi for wallet tests
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x123', isConnected: true })),
  usePublicClient: vi.fn(() => ({})),
  useWalletClient: vi.fn(() => ({ data: {} })),
  useContractRead: vi.fn(),
  useContractWrite: vi.fn(),
  usePrepareContractWrite: vi.fn(),
}));

// Mock framer-motion for animation tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Memory management for tests
afterEach(() => {
  // Clear any remaining timers
  vi.clearAllTimers();
  // Clear any remaining mocks
  vi.clearAllMocks();
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Increase memory limit for tests
process.setMaxListeners(0); 