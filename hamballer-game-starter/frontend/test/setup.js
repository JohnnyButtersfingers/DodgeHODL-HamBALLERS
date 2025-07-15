import '@testing-library/jest-dom';

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  // log: jest.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock window.alert
global.alert = vi.fn();