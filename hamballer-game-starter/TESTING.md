# HamBaller.xyz Testing Guide

## 🧪 Testing Overview

This document outlines the comprehensive testing strategy for HamBaller.xyz after resolving merge conflicts and implementing all core features.

## ✅ Testing Status

### Build Tests
- [x] Frontend build passes successfully
- [x] Backend starts without errors
- [x] All imports resolve correctly
- [x] JSX syntax validated
- [x] No TypeScript/JavaScript errors

### Component Integration
- [x] Layout.jsx - Navigation and responsiveness
- [x] Leaderboard.jsx - Supabase integration and state management
- [x] GameView.jsx - Wallet and game state handling
- [x] runCompletedListener.js - XP calculation and retry queue

## 🎯 Testing Strategy

### 1. Frontend Component Testing

#### Layout Component
```bash
# Test navigation responsiveness
cd frontend
npm run test -- Layout.test.jsx
```

**Test Cases:**
- Navigation menu renders correctly
- Mobile navigation toggles properly
- WebSocket status indicator updates
- Conditional rendering based on connection state
- Responsive design across viewports

#### Leaderboard Component
```bash
# Test leaderboard functionality
npm run test -- Leaderboard.test.jsx
```

**Test Cases:**
- Supabase query logic
- Timeframe state management (24h, 7d, 30d, all)
- Category filtering (total_dbp, best_score, etc.)
- WebSocket fallback polling
- Contract XP data integration
- Responsive table design
- Error handling for failed requests

#### GameView Component
```bash
# Test game state management
npm run test -- GameView.test.jsx
```

**Test Cases:**
- Wallet connection checks
- Game state transitions (setup → running → decision → complete)
- XP overlay animations
- Error handling for contract failures
- Responsive grid layout
- Component re-rendering optimization

### 2. Backend Service Testing

#### Run Completed Listener
```bash
cd backend
npm run test -- runCompletedListener.test.js
```

**Test Cases:**
- Event listener initialization
- XP calculation accuracy
- Badge tokenId generation
- Retry queue integration
- Error handling and logging
- Database updates
- Achievement system integration

#### API Endpoints
```bash
# Test all API routes
npm run test -- api.test.js
```

**Test Cases:**
- Leaderboard API responses
- Health check endpoints
- Error handling middleware
- Rate limiting
- CORS configuration
- Input validation

### 3. Integration Testing

#### WebSocket Testing
```javascript
// websocket.test.js
const WebSocket = require('ws');

describe('WebSocket Integration', () => {
  test('should connect and receive messages', (done) => {
    const ws = new WebSocket('ws://localhost:3001/socket');
    
    ws.on('open', () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      expect(message.type).toBe('pong');
      ws.close();
      done();
    });
  });
});
```

#### Database Integration
```javascript
// database.test.js
const { createClient } = require('@supabase/supabase-js');

describe('Database Integration', () => {
  test('should connect to Supabase', async () => {
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await client
      .from('run_logs')
      .select('*')
      .limit(1);
      
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

### 4. End-to-End Testing

#### Cypress Setup
```bash
cd frontend
npm install --save-dev cypress @testing-library/cypress

# Create cypress.config.js
cat > cypress.config.js << EOF
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
EOF
```

#### E2E Test Scenarios

**User Journey Test**
```javascript
// cypress/e2e/user-journey.cy.js
describe('Complete User Journey', () => {
  it('should complete full game flow', () => {
    // Visit application
    cy.visit('/');
    
    // Connect wallet (mock)
    cy.get('[data-testid="connect-wallet"]').click();
    cy.get('[data-testid="metamask-option"]').click();
    
    // Navigate to game
    cy.get('[data-testid="game-nav"]').click();
    
    // Select moves
    cy.get('[data-testid="move-selector"]').should('be.visible');
    cy.get('[data-testid="move-dodge"]').click();
    cy.get('[data-testid="move-hodl"]').click();
    
    // Start game
    cy.get('[data-testid="start-run"]').click();
    
    // Wait for game completion
    cy.get('[data-testid="run-complete"]', { timeout: 10000 })
      .should('be.visible');
    
    // Check leaderboard
    cy.get('[data-testid="leaderboard-nav"]').click();
    cy.get('[data-testid="leaderboard-table"]').should('be.visible');
  });
});
```

**Responsive Design Test**
```javascript
// cypress/e2e/responsive.cy.js
describe('Responsive Design', () => {
  const viewports = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1920, height: 1080, name: 'Desktop' }
  ];
  
  viewports.forEach(viewport => {
    it(`should display correctly on ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height);
      cy.visit('/');
      
      // Test navigation
      if (viewport.width < 768) {
        cy.get('[data-testid="mobile-nav-toggle"]').should('be.visible');
      } else {
        cy.get('[data-testid="desktop-nav"]').should('be.visible');
      }
      
      // Test leaderboard table
      cy.visit('/leaderboard');
      cy.get('[data-testid="leaderboard-table"]').should('be.visible');
      
      // Verify no horizontal scrolling
      cy.window().then(win => {
        expect(win.document.body.scrollWidth).to.be.lte(viewport.width);
      });
    });
  });
});
```

### 5. Performance Testing

#### Lighthouse CI Setup
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Create lighthouserc.js
cat > lighthouserc.js << EOF
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
      },
    },
  },
};
EOF
```

#### Bundle Size Analysis
```bash
cd frontend
npm install --save-dev webpack-bundle-analyzer

# Add to package.json scripts
"analyze": "npm run build && npx webpack-bundle-analyzer dist/assets/*.js"
```

### 6. Security Testing

#### Input Validation Tests
```javascript
// security.test.js
describe('Security Tests', () => {
  test('should sanitize XSS attempts', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    // Test input sanitization in forms
    cy.get('[data-testid="input-field"]')
      .type(maliciousInput)
      .should('not.contain', '<script>');
  });
  
  test('should validate wallet addresses', () => {
    const invalidAddress = '0xinvalid';
    // Test wallet address validation
    expect(isValidAddress(invalidAddress)).toBe(false);
  });
});
```

#### Smart Contract Security
```bash
# Install security testing tools
npm install --save-dev @openzeppelin/test-helpers
npm install --save-dev hardhat-gas-reporter

# Run security analysis
npx hardhat test --gas-reporter
```

### 7. Load Testing

#### WebSocket Load Test
```javascript
// load-test-websocket.js
const WebSocket = require('ws');

async function loadTestWebSocket() {
  const connections = [];
  const numConnections = 100;
  
  for (let i = 0; i < numConnections; i++) {
    const ws = new WebSocket('ws://localhost:3001/socket');
    connections.push(ws);
    
    ws.on('open', () => {
      console.log(`Connection ${i} opened`);
      setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping', id: i }));
      }, 1000);
    });
  }
  
  // Monitor for 60 seconds
  setTimeout(() => {
    connections.forEach(ws => ws.close());
    console.log('Load test completed');
  }, 60000);
}

loadTestWebSocket();
```

#### API Load Test
```bash
# Install artillery for load testing
npm install -g artillery

# Create artillery config
cat > artillery-config.yml << EOF
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/dashboard/leaderboard"
      - get:
          url: "/api/health"
EOF

# Run load test
artillery run artillery-config.yml
```

### 8. Cross-Browser Testing

#### Browser Matrix
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

#### Automated Cross-Browser Testing
```javascript
// playwright.config.js
const { devices } = require('@playwright/test');

module.exports = {
  testDir: './tests',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
};
```

## 🛠️ Testing Tools and Setup

### Required Dependencies
```bash
# Frontend testing
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# E2E testing
npm install --save-dev cypress @cypress/react

# Performance testing
npm install --save-dev lighthouse @lhci/cli

# Cross-browser testing
npm install --save-dev @playwright/test

# Load testing
npm install -g artillery

# Backend testing
cd backend
npm install --save-dev jest supertest
```

### Test Scripts (package.json)
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:load": "artillery run artillery-config.yml",
    "test:lighthouse": "lhci autorun",
    "test:security": "npm audit && npm run test:xss",
    "test:all": "npm run test && npm run test:e2e && npm run test:lighthouse"
  }
}
```

## 📊 Test Coverage Goals

### Coverage Targets
- **Unit Tests**: 80% coverage
- **Integration Tests**: 70% coverage
- **E2E Tests**: All critical user flows
- **Performance**: Lighthouse scores > 80
- **Accessibility**: WCAG 2.1 AA compliance

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

## 🚨 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install Frontend Dependencies
      run: cd frontend && npm install
      
    - name: Install Backend Dependencies
      run: cd backend && npm install
      
    - name: Run Frontend Tests
      run: cd frontend && npm run test:coverage
      
    - name: Run Backend Tests
      run: cd backend && npm test
      
    - name: Run E2E Tests
      run: cd frontend && npm run test:e2e
      
    - name: Run Security Tests
      run: npm audit
      
    - name: Upload Coverage
      uses: codecov/codecov-action@v2
```

## 📋 Manual Testing Checklist

### Pre-Release Testing
- [ ] All automated tests pass
- [ ] Manual wallet connection testing
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness confirmed
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Load testing passed
- [ ] Error handling verified
- [ ] Real-time features working
- [ ] Database operations functional

### Production Smoke Tests
- [ ] Application loads
- [ ] API endpoints respond
- [ ] WebSocket connections work
- [ ] Database queries execute
- [ ] External services integrate
- [ ] Error tracking active
- [ ] Monitoring dashboards updated

## 🎯 Testing Best Practices

1. **Write tests before fixing bugs**
2. **Test user journeys, not just units**
3. **Use realistic test data**
4. **Test error conditions**
5. **Verify responsive design**
6. **Check accessibility compliance**
7. **Monitor performance impact**
8. **Validate security measures**
9. **Test with real blockchain interactions**
10. **Maintain test environment parity**

---

## 📈 Test Results and Metrics

### Current Status
- ✅ Build Tests: PASSING
- ✅ Component Tests: READY
- ✅ Integration Tests: READY
- ⏳ E2E Tests: TO BE IMPLEMENTED
- ⏳ Performance Tests: TO BE IMPLEMENTED
- ⏳ Security Tests: TO BE IMPLEMENTED

### Next Testing Priorities
1. Implement Cypress E2E tests
2. Set up performance monitoring
3. Add security testing suite
4. Configure cross-browser testing
5. Set up load testing

**Ready for comprehensive testing! 🧪**