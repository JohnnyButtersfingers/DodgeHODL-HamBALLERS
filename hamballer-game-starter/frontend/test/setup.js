import '@testing-library/jest-dom'

// Mock WebSocket globally for tests
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
  }

  send(data) {
    // Mock send implementation
  }

  close() {
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure' })
    }
  }

  // Mock successful connection
  mockConnect() {
    if (this.onopen) {
      this.onopen({})
    }
  }

  // Mock incoming message
  mockMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) })
    }
  }
}

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_WS_URL: 'ws://localhost:3001',
    VITE_API_URL: 'http://localhost:3001',
  },
  writable: true
})

// Mock fetch globally
global.fetch = vi.fn()

// Setup default fetch mock
global.fetch.mockResolvedValue({
  ok: true,
  json: async () => ({ 
    leaderboard: [],
    player: {},
    xpHistory: []
  })
})