# 🚀 Mainnet Deployment Strategy
## HamBaller.xyz Production Launch Plan

---

## 📋 Contract Deployment Plan

### Core Contracts to Deploy

#### 1. **DBPToken.sol**
- **Purpose**: ERC-20 token for in-game currency (Dodge Ball Points)
- **Constructor Args**: 
  - `name`: "Dodge Ball Points"
  - `symbol`: "DBP"
  - Initial supply: To be determined based on tokenomics
- **Features**: Role-based minting, burning, pausable for emergencies
- **Gas Estimate**: ~2.5M gas

#### 2. **BoostNFT.sol**
- **Purpose**: ERC-1155 for power-ups and game enhancements
- **Constructor Args**: 
  - `uri`: IPFS/Arweave metadata URI template
- **Features**: 5 boost types, one-time use mechanics, supply tracking
- **Gas Estimate**: ~3.2M gas

#### 3. **HODLManager.sol**
- **Purpose**: Core game logic and state management
- **Constructor Args**:
  - `dbpToken`: Address of deployed DBPToken
  - `boostNft`: Address of deployed BoostNFT
- **Features**: Game runs, CP conversion, Bonus Throw mechanics, RNG
- **Gas Estimate**: ~4.8M gas

### Deployment Order
1. Deploy **DBPToken** first (standalone)
2. Deploy **BoostNFT** second (standalone)
3. Deploy **HODLManager** with token addresses
4. Configure roles and permissions
5. Initialize game parameters

---

## 🔧 Configuration Changes Required

### Contract Environment (.env)
```bash
# Production mainnet configuration
PRIVATE_KEY=<deployer_private_key>
ABSTRACT_RPC_URL=https://api.abs.xyz
ETHERSCAN_API_KEY=<abstract_explorer_api_key>

# Deployment configuration
DEPLOY_VERIFY=true
DEPLOY_MAINNET=true
GAS_PRICE_GWEI=2
DEPLOYMENT_SALT=<unique_deployment_salt>
```

### Hardhat Configuration Updates
```javascript
// Add to hardhat.config.js networks
abstractMainnet: {
  url: process.env.ABSTRACT_MAINNET_RPC_URL || "https://api.abs.xyz",
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  chainId: 570, // Abstract mainnet chain ID
  gasPrice: "auto",
  verify: {
    etherscan: {
      apiUrl: "https://api.abs.xyz/api",
      apiKey: process.env.ETHERSCAN_API_KEY
    }
  }
}
```

---

## 🔍 Verification Process

### Via Abstract Mainnet Explorer

#### Automated Verification (Recommended)
```bash
# Deploy with automatic verification
npx hardhat run scripts/deploy_all.js --network abstractMainnet

# Manual verification if needed
npx hardhat verify --network abstractMainnet <DBP_TOKEN_ADDRESS>
npx hardhat verify --network abstractMainnet <BOOST_NFT_ADDRESS> "<metadata_uri>"
npx hardhat verify --network abstractMainnet <HODL_MANAGER_ADDRESS> <DBP_TOKEN_ADDRESS> <BOOST_NFT_ADDRESS>
```

#### Verification Checklist
- [ ] Contract source code matches deployed bytecode
- [ ] Constructor arguments correctly verified
- [ ] Read/Write functions accessible in explorer
- [ ] Contract events showing in explorer
- [ ] Proxy patterns (if any) properly configured

---

## 🔄 Migration Steps

### Data Migration from Testnet

#### XP Thresholds & Badge Rules
```javascript
// Create migration script: scripts/migrate-game-config.js
const gameConfig = {
  xpThresholds: {
    bronze: 1000,
    silver: 5000,
    gold: 15000,
    platinum: 50000,
    diamond: 100000
  },
  
  cpConversionRate: 10, // 10 CP = 1 DBP
  bonusThrowMultiplier: 2,
  
  boostConfigs: [
    { id: 0, name: "Speed Boost", effect: 20, duration: 30 },
    { id: 1, name: "Shield", effect: 100, duration: 10 },
    { id: 2, name: "Double Points", effect: 200, duration: 15 },
    { id: 3, name: "Time Freeze", effect: 0, duration: 5 },
    { id: 4, name: "Magnet", effect: 50, duration: 20 }
  ]
};
```

#### Initial NFT Minting
```javascript
// Mint initial boost NFTs for launch
const initialMints = [
  { id: 0, amount: 1000 }, // Speed Boost
  { id: 1, amount: 500 },  // Shield
  { id: 2, amount: 300 },  // Double Points
  { id: 3, amount: 200 },  // Time Freeze
  { id: 4, amount: 400 }   // Magnet
];

// Execute via HODLManager.initializeBoosts()
```

#### Player Stats Migration (Optional)
- **Decision**: Start fresh on mainnet vs. migrate testnet stats
- **If migrating**: Create snapshot script for high-value players
- **Recommended**: Fresh start with genesis leaderboard events

---

## 🌐 Frontend Configuration

### Contract Address Updates

#### 1. Update `frontend/src/config/networks.js`
```javascript
// Add Abstract Mainnet configuration
export const abstractMainnet = {
  id: 570,
  name: 'Abstract',
  network: 'abstract',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://api.abs.xyz'],
      webSocket: ['wss://api.abs.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Abstract Explorer',
      url: 'https://explorer.abs.xyz',
    },
  },
  testnet: false,
};

// Update contract addresses
export const CONTRACT_ADDRESSES = {
  [abstractTestnet.id]: {
    DBP_TOKEN: process.env.VITE_TESTNET_DBP_TOKEN_ADDRESS || '',
    BOOST_NFT: process.env.VITE_TESTNET_BOOST_NFT_ADDRESS || '',
    HODL_MANAGER: process.env.VITE_TESTNET_HODL_MANAGER_ADDRESS || '',
  },
  [abstractMainnet.id]: {
    DBP_TOKEN: process.env.VITE_MAINNET_DBP_TOKEN_ADDRESS || '',
    BOOST_NFT: process.env.VITE_MAINNET_BOOST_NFT_ADDRESS || '',
    HODL_MANAGER: process.env.VITE_MAINNET_HODL_MANAGER_ADDRESS || '',
  },
};
```

#### 2. Environment Variables
```bash
# Production frontend .env
VITE_ENABLE_MAINNET=true
VITE_DEFAULT_NETWORK=abstractMainnet

# Mainnet contract addresses
VITE_MAINNET_DBP_TOKEN_ADDRESS=<deployed_address>
VITE_MAINNET_BOOST_NFT_ADDRESS=<deployed_address>
VITE_MAINNET_HODL_MANAGER_ADDRESS=<deployed_address>

# Keep testnet for development
VITE_TESTNET_DBP_TOKEN_ADDRESS=<testnet_address>
VITE_TESTNET_BOOST_NFT_ADDRESS=<testnet_address>
VITE_TESTNET_HODL_MANAGER_ADDRESS=<testnet_address>
```

#### 3. Network Switching UI
```javascript
// Add network switching component
const NetworkSwitcher = () => {
  const networks = [abstractTestnet, abstractMainnet];
  
  return (
    <select onChange={handleNetworkSwitch}>
      <option value="testnet">Abstract Testnet</option>
      <option value="mainnet">Abstract Mainnet</option>
    </select>
  );
};
```

---

## ✅ Final QA Checklist

### Pre-Launch Testing Suite

#### Contract Testing on Mainnet
- [ ] **Deploy to mainnet with minimal gas**
  - Test transaction: 0.001 ETH game run
  - Verify gas costs are reasonable (<0.01 ETH per game)
  
- [ ] **Badge Eligibility Testing**
  - [ ] Complete game run and verify CP calculation
  - [ ] Test CP to DBP conversion (10:1 ratio)
  - [ ] Verify XP thresholds trigger correctly
  - [ ] Test boost NFT usage and burning

- [ ] **ZK Proof Handling** (if implemented)
  - [ ] Generate valid ZK proof for game completion
  - [ ] Verify proof validation on-chain
  - [ ] Test invalid proof rejection
  - [ ] Check proof generation time (<30 seconds)

#### Frontend Integration Testing
- [ ] **Wallet Connection**
  - [ ] MetaMask connection to Abstract mainnet
  - [ ] WalletConnect integration
  - [ ] Network switching functionality
  
- [ ] **Game Flow Testing**
  - [ ] Start game run with mainnet contracts
  - [ ] Use boost NFTs during gameplay
  - [ ] Complete run and claim rewards
  - [ ] Check real-time leaderboard updates

#### Backend API Testing
- [ ] **Database Operations**
  - [ ] Player registration and stats tracking
  - [ ] Game session logging
  - [ ] Leaderboard calculations
  - [ ] WebSocket real-time updates

- [ ] **Contract Interactions**
  - [ ] Event listening for mainnet contracts
  - [ ] Transaction status tracking
  - [ ] Error handling for failed transactions

---

## 🔒 Security & Post-Launch Monitoring

### ZK Proof Logging Strategy
```javascript
// Enhanced logging for mainnet ZK proof attempts
const zkProofLogger = {
  logAttempt: (playerAddress, gameSession, proofData) => {
    console.log({
      timestamp: new Date().toISOString(),
      player: playerAddress,
      sessionId: gameSession.id,
      proofSize: proofData.length,
      validationTime: performance.now(),
      network: 'mainnet',
      gasUsed: transaction.gasUsed,
      success: validation.success
    });
  },
  
  alertSuspiciousActivity: (pattern) => {
    // Alert if unusual proof patterns detected
    if (pattern.failureRate > 0.1) {
      sendDiscordAlert(`High ZK proof failure rate: ${pattern.failureRate}`);
    }
  }
};
```

### Monitoring & Alerts Setup

#### Supabase Analytics
```sql
-- Create monitoring views
CREATE VIEW mainnet_game_analytics AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as games_played,
  AVG(cp_earned) as avg_cp,
  COUNT(DISTINCT player_address) as unique_players
FROM game_sessions 
WHERE network = 'mainnet'
GROUP BY hour
ORDER BY hour DESC;
```

#### Discord Alert Integration
```javascript
// Alert webhook configuration
const alertWebhook = process.env.DISCORD_WEBHOOK_URL;

const alerts = {
  highGasUsage: (gasUsed) => {
    if (gasUsed > 1000000) { // >1M gas
      sendAlert(`🚨 High gas usage detected: ${gasUsed.toLocaleString()}`);
    }
  },
  
  contractError: (error, contractAddress) => {
    sendAlert(`❌ Contract error on ${contractAddress}: ${error.message}`);
  },
  
  unusualActivity: (pattern) => {
    sendAlert(`⚠️ Unusual activity pattern: ${JSON.stringify(pattern)}`);
  }
};
```

#### Key Metrics to Monitor
- **Contract Health**: Transaction success rate, gas usage patterns
- **Game Performance**: Average game time, completion rates
- **Economic Metrics**: DBP circulation, boost NFT usage
- **Player Engagement**: Daily/weekly active users, retention rates
- **Security**: Failed transaction patterns, unusual proof attempts

---

## 🚨 Rollback/Fallback Plan

### Emergency Procedures

#### Contract Pause Mechanism
```solidity
// All contracts implement Pausable
function emergencyPause() external onlyOwner {
    _pause();
    emit EmergencyPause(msg.sender, block.timestamp);
}

function emergencyUnpause() external onlyOwner {
    _unpause();
    emit EmergencyUnpause(msg.sender, block.timestamp);
}
```

#### Badge Minting Rollback
```javascript
// Emergency admin functions for reward correction
const emergencyAdmin = {
  // Reverse accidental DBP minting
  burnExcessDBP: async (playerAddress, amount) => {
    const tx = await dbpToken.burn(playerAddress, amount);
    await logEmergencyAction('DBP_BURN', playerAddress, amount, tx.hash);
  },
  
  // Restore accidentally burned boost NFTs
  restoreBoostNFT: async (playerAddress, boostId, amount) => {
    const tx = await boostNFT.mint(playerAddress, boostId, amount, "0x");
    await logEmergencyAction('BOOST_RESTORE', playerAddress, {boostId, amount}, tx.hash);
  }
};
```

#### XP Claims Correction
```javascript
// XP adjustment procedures
const xpCorrection = {
  adjustPlayerXP: async (playerAddress, newXP, reason) => {
    // Update database record
    await supabase.from('player_stats')
      .update({ total_xp: newXP, last_updated: new Date() })
      .eq('player_address', playerAddress);
    
    // Log correction
    await supabase.from('admin_actions').insert({
      action_type: 'XP_CORRECTION',
      player_address: playerAddress,
      old_value: oldXP,
      new_value: newXP,
      reason: reason,
      admin_address: adminAddress
    });
  }
};
```

### Fallback Strategies

#### 1. **Contract Upgrade Path**
- Deploy new contract versions with proxy pattern
- Migrate critical state data
- Update frontend to new contract addresses
- Maintain backward compatibility for 30 days

#### 2. **Frontend Rollback**
- Maintain testnet as fallback environment
- Instant deployment rollback via Vercel
- Database state preservation during rollback

#### 3. **Database Recovery**
- Hourly Supabase backups
- Point-in-time recovery capability
- Critical data export procedures

---

## 📅 Launch Timeline

### Phase 1: Pre-Launch (Days -7 to -1)
- [ ] Deploy contracts to mainnet
- [ ] Verify all contracts on Abstract Explorer
- [ ] Update frontend with mainnet configuration
- [ ] Complete QA testing suite
- [ ] Set up monitoring and alerts

### Phase 2: Soft Launch (Day 0)
- [ ] Enable mainnet access for limited beta users
- [ ] Monitor initial transactions and game sessions
- [ ] Verify real-time analytics and alerts
- [ ] Test emergency procedures

### Phase 3: Public Launch (Day +1)
- [ ] Open mainnet access to all users
- [ ] Launch marketing campaign
- [ ] Monitor scaling and performance
- [ ] Begin regular reporting and optimization

---

## 🎯 Success Metrics

### Week 1 Targets
- **Users**: 100+ unique players
- **Games**: 1,000+ completed runs
- **Transactions**: 99%+ success rate
- **Performance**: <3 second transaction confirmations

### Month 1 Targets
- **Users**: 1,000+ unique players
- **Revenue**: Self-sustaining gas costs
- **Engagement**: 30%+ player retention
- **Stability**: 99.9%+ uptime

---

*This deployment plan ensures a secure, monitored, and scalable launch of HamBaller.xyz on Abstract mainnet while maintaining fallback options and emergency procedures.*