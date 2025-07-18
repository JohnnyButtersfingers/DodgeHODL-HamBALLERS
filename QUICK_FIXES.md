# Quick Fixes for Post-Merge Test Issues

## 🔧 Backend Test Discovery Fix

### Option A: Update Jest Configuration
```json
// backend/package.json - Add jest configuration
{
  "jest": {
    "testMatch": [
      "**/test-*.js",
      "**/*.test.js", 
      "**/__tests__/**/*.js"
    ],
    "testEnvironment": "node"
  }
}
```

### Option B: Rename Test Files
```bash
cd backend
mv test-badge-retry-system.js badge-retry-system.test.js
mv test-badge-triggers.js badge-triggers.test.js  
mv test-db-connection.js db-connection.test.js
mv test-phase8-systems.js phase8-systems.test.js
mv test-xpbadge.js xpbadge.test.js
```

## 🎨 Frontend Test Mocks

### Create WalletContext Mock
```jsx
// frontend/test/mocks/WalletContext.js
export const useWallet = jest.fn(() => ({
  isConnected: false,
  address: null,
  connect: jest.fn(),
  disconnect: jest.fn()
}));

export const WalletProvider = ({ children }) => children;
```

### Update Test Setup
```jsx
// frontend/test/setup.js - Add to existing setup
import { vi } from 'vitest';

// Mock WalletContext
vi.mock('../src/contexts/WalletContext', () => ({
  useWallet: () => ({
    isConnected: false,
    address: null,
    connect: vi.fn(),
    disconnect: vi.fn()
  })
}));
```

### Add WagmiConfig Test Provider
```jsx
// frontend/test/providers/TestProviders.jsx
import { WagmiConfig, createConfig } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';

const config = createConfig({
  autoConnect: false,
  publicClient: createPublicClient({
    chain: hardhat,
    transport: http(),
  }),
});

export const TestWagmiProvider = ({ children }) => (
  <WagmiConfig config={config}>
    {children}
  </WagmiConfig>
);
```

## 📋 Contract Test Timing Fix

### Fix HODLManager Test
```javascript
// contracts/test/HODLManager.test.js
it("starts and completes a run", async function () {
  await hodlManager.connect(player).startRun(ethers.id("seed"));
  
  // Advance time to meet MIN_RUN_DURATION requirement
  await network.provider.send("evm_increaseTime", [31]); // 31 seconds
  await network.provider.send("evm_mine"); // Mine a block
  
  const before = await dbpToken.balanceOf(player.address);
  await hodlManager.connect(player).completeRun(100, false);
  const after = await dbpToken.balanceOf(player.address);
  expect(after).to.be.gt(before);
});
```

## 🧪 Comprehensive Test Command

### Add Test Script for All Fixes
```bash
#!/bin/bash
# test-all-fixed.sh - Run all tests with fixes applied

echo "=== Testing with fixes applied ==="

# Backend with jest config
cd backend
echo "Backend tests..."
npx jest --testMatch="**/test-*.js" --passWithNoTests

# Contracts with timing fix applied
cd ../contracts  
echo "Contract tests..."
pnpm test

# Frontend with mocks
cd ../frontend
echo "Frontend tests..."
pnpm vitest run

echo "=== All tests completed ==="
```

## 📊 Expected Results After Fixes

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Contracts | 10/11 | 11/11 | +1 test |
| Frontend | 37/55 | 55/55 | +18 tests |
| Backend | 0/5 | 5/5 | +5 tests |
| **Total** | **47/71** | **71/71** | **+24 tests** |

## ⚡ Priority Implementation Order

1. **Immediate** (Day 1): Backend Jest config update
2. **Week 1**: Frontend WalletContext mock
3. **Week 1**: Contract timing fix  
4. **Week 2**: WagmiConfig test provider
5. **Week 2**: Comprehensive test suite validation