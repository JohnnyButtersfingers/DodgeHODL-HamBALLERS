# Phase 8: Achievements System + XPVerifier Integration

## Overview

Phase 8 introduces a comprehensive achievements system with ZK-proof verification for HamBaller.xyz. This implementation includes multi-category achievements, real-time progress tracking, WebSocket notifications, and ZK-SNARK proof verification for high-value badge claims.

## 🏆 Key Features

### Achievements System
- **Multi-Category Achievements**: Gameplay, Collection, Social, and Special achievements
- **Real-time Progress Tracking**: Incremental progress updates and completion detection
- **WebSocket Notifications**: Instant achievement unlock notifications to connected clients
- **Flexible Requirements**: JSON-based requirement definitions for easy expansion
- **Leaderboards**: Category-based achievement leaderboards with pagination

### ZK-Proof Verification
- **XPVerifier Integration**: Smart contract-based ZK-SNARK proof verification
- **Replay Prevention**: Nullifier-based protection against proof reuse
- **High-Value Claims**: Automatic ZK-proof requirement for Epic/Legendary badges
- **Verification Queue**: Async processing with status tracking and cleanup

### Enhanced Badge System
- **Integrated Retry Logic**: ZK-proof verification integrated into badge minting flow
- **Performance Monitoring**: Comprehensive logging and metrics for achievement unlocks
- **Database Optimization**: Proper indexing and triggers for achievement tracking

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Phase 8 Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐│
│  │   Frontend      │    │   Backend       │    │   Blockchain    ││
│  │                 │    │                 │    │                 ││
│  │ • Achievement   │◄──►│ • Achievements  │◄──►│ • XPVerifier    ││
│  │   Dashboard     │    │   Service       │    │   Contract      ││
│  │ • ZK-Proof      │    │ • XPVerifier    │    │ • XPBadge       ││
│  │   Interface     │    │   Service       │    │   Contract      ││
│  │ • WebSocket     │    │ • Enhanced      │    │                 ││
│  │   Client        │    │   RetryQueue    │    │                 ││
│  └─────────────────┘    └─────────────────┘    └─────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                          Database Layer                         │
│                                                                 │
│  ┌───────────────┐ ┌─────────────────┐ ┌──────────────────┐     │
│  │ achievement_  │ │ player_         │ │ zk_proof_       │     │
│  │ types         │ │ achievements    │ │ claims          │     │
│  └───────────────┘ └─────────────────┘ └──────────────────┘     │
│                                                                 │
│  ┌───────────────┐ ┌─────────────────┐                         │
│  │ achievement_  │ │ badge_claim_    │                         │
│  │ progress      │ │ attempts        │                         │
│  └───────────────┘ └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Schema

### Achievement Types Table
```sql
CREATE TABLE achievement_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('gameplay', 'collection', 'social', 'special')),
    requirements JSONB NOT NULL,
    rewards JSONB,
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_secret BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Player Achievements Table
```sql
CREATE TABLE player_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    achievement_type_id UUID REFERENCES achievement_types(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    progress_data JSONB,
    metadata JSONB,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_address, achievement_type_id)
);
```

### ZK-Proof Claims Table
```sql
CREATE TABLE zk_proof_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    nullifier VARCHAR(66) NOT NULL UNIQUE,
    commitment VARCHAR(66) NOT NULL,
    proof_data JSONB NOT NULL,
    claimed_xp INTEGER NOT NULL,
    threshold_met INTEGER NOT NULL,
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
    verification_tx_hash VARCHAR(66),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🏗️ Component Details

### Achievements Service (`services/achievementsService.js`)

**Key Methods:**
- `initialize()` - Load achievement types and setup service
- `checkRunCompletionAchievements(playerAddress, runData)` - Check for achievements after run completion
- `checkBadgeMintAchievements(playerAddress, badgeData)` - Check for achievements after badge minting
- `unlockAchievement(playerAddress, achievementTypeId, metadata)` - Unlock achievement for player
- `emitAchievementUnlocked(playerAddress, achievements)` - Emit WebSocket notifications

**Achievement Categories:**
1. **Gameplay**: Run completion, performance-based achievements
2. **Collection**: Badge collection milestones
3. **Social**: Community participation achievements
4. **Special**: Time-based and hidden achievements

### XPVerifier Service (`services/xpVerifierService.js`)

**Key Methods:**
- `initialize()` - Setup blockchain connection and contract
- `submitProofClaim(playerAddress, proofData)` - Submit ZK-proof for verification
- `validateProofData(proofData)` - Validate proof structure and format
- `isNullifierUsed(nullifier)` - Check for replay attacks
- `updateThreshold(newThreshold)` - Admin function to update verification threshold

**ZK-Proof Structure:**
```javascript
{
  nullifier: "0x...",    // 32-byte unique identifier
  commitment: "0x...",   // ZK commitment hash
  proof: [BigInt, ...],  // 8-element proof array
  claimedXP: Number,     // Amount of XP being claimed
  threshold: Number      // Required threshold for verification
}
```

### Enhanced Retry Queue (`retryQueue.js`)

**Enhanced Features:**
- ZK-proof verification integration for high-value claims
- Badge metadata logging (XP amount, TokenId, Season)
- Achievement checking after successful badge minting
- Configurable ZK-proof requirements based on XP/TokenId

**ZK-Proof Flow:**
```
Badge Claim → Check XP/TokenId → Requires ZK-Proof? → Verify → Mint → Achievement Check
                     ↓                    ↓
                   No ZK                 Yes ZK
                     ↓                    ↓
                  Direct Mint        Proof Required
```

## 🛣️ API Endpoints

### Achievement Endpoints

#### `GET /api/achievements/:wallet`
Get player's achievements and progress
```json
{
  "success": true,
  "wallet": "0x...",
  "achievements": [...],
  "progress": [...],
  "summary": {
    "total_achievements": 5,
    "completion_percentage": 23.8
  }
}
```

#### `GET /api/achievements/types/all`
Get all available achievement types
```json
{
  "success": true,
  "achievementTypes": [...],
  "categorized": {
    "gameplay": [...],
    "collection": [...]
  },
  "totalCount": 21
}
```

#### `POST /api/achievements/check/:wallet`
Manually trigger achievement check
```json
{
  "runData": { ... },
  "badgeData": { ... }
}
```

### ZK-Proof Endpoints

#### `POST /api/achievements/zk-proof/submit`
Submit ZK-proof for verification
```json
{
  "wallet": "0x...",
  "proofData": {
    "nullifier": "0x...",
    "commitment": "0x...",
    "proof": [...],
    "claimedXP": 100,
    "threshold": 75
  }
}
```

#### `GET /api/achievements/zk-proof/:wallet`
Get ZK-proof verification status
```json
{
  "success": true,
  "verifications": [...],
  "summary": {
    "total": 3,
    "verified": 2,
    "pending": 1,
    "failed": 0
  }
}
```

### System Endpoints

#### `GET /api/achievements/stats/system`
Get system-wide statistics
```json
{
  "achievements": {
    "byCategory": [...],
    "totalPlayersWithAchievements": 150
  },
  "zkProofVerification": {
    "queueStatus": {...},
    "verificationStats": {...}
  }
}
```

#### `GET /api/achievements/leaderboard/:category`
Get achievement leaderboard
```json
{
  "success": true,
  "category": "gameplay",
  "leaderboard": [
    {
      "player_address": "0x...",
      "achievement_count": 12,
      "recent_achievements": [...],
      "latest_unlock": "2024-01-15T..."
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

**Required:**
```bash
# Blockchain Configuration
ABSTRACT_RPC_URL=https://...
HODL_MANAGER_ADDRESS=0x...
XPBADGE_ADDRESS=0x...
XPBADGE_MINTER_PRIVATE_KEY=0x...

# Database Configuration
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

**Optional (ZK-Proof Features):**
```bash
# XPVerifier Configuration
XPVERIFIER_ADDRESS=0x...
XPVERIFIER_PRIVATE_KEY=0x...

# Admin Configuration
ADMIN_API_KEY=your_admin_key
```

### Achievement Requirements Format

```json
{
  "runs_completed": 5,           // Number of runs to complete
  "min_xp_single_run": 100,      // Minimum XP in a single run
  "badges_earned": 10,           // Number of badges collected
  "badge_types_collected": 5,    // Number of different badge types
  "legendary_badges": 1,         // Number of legendary badges
  "min_duration": 30,            // Minimum run duration (seconds)
  "max_duration": 300,           // Maximum run duration (seconds)
  "runs_no_bonus": 10,           // Runs without bonus throws
  "night_run": true,             // Run between midnight-6AM
  "runs_on_day_7": 7             // Specific runs on 7th day
}
```

## 🚀 Deployment Guide

### 1. Database Migration
```bash
# Run the achievements system migration
psql -d your_database -f migrations/add_achievements_system.sql
```

### 2. Service Initialization
```javascript
// Initialize in your main application
const { achievementsService } = require('./services/achievementsService');
const { xpVerifierService } = require('./services/xpVerifierService');

await achievementsService.initialize();
await xpVerifierService.initialize();
```

### 3. WebSocket Setup
```javascript
// Ensure WebSocket clients are available globally
global.wsClients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  global.wsClients.add(ws);
  
  ws.on('close', () => {
    global.wsClients.delete(ws);
  });
});
```

### 4. API Route Registration
```javascript
const achievementsRoutes = require('./routes/achievements');
app.use('/api/achievements', achievementsRoutes);
```

## 🧪 Testing

### Run Test Suite
```bash
# Run comprehensive Phase 8 tests
node test-phase8-systems.js

# Test individual components
npm test -- --grep "achievements"
npm test -- --grep "xpverifier"
```

### Test Categories
1. **Achievements Service**: Initialization, requirement checking, progress tracking
2. **XPVerifier Service**: Proof validation, nullifier checking, contract interaction
3. **Enhanced Retry Queue**: ZK-proof integration, badge metadata handling
4. **Database Schema**: Table accessibility, constraint validation
5. **API Endpoints**: All achievement and ZK-proof endpoints
6. **Integration Flow**: End-to-end achievement and verification flows

## 📊 Performance Monitoring

### Key Metrics
- Achievement unlock rate and timing
- ZK-proof verification success rate
- Badge minting retry statistics with ZK integration
- WebSocket notification delivery rate
- Database query performance for achievement checks

### Logging Format
```
🏆 Achievement unlocked: First Steps for 0x1234...
🔍 ZK-proof verification for 0x1234... (100 XP)
📋 RetryQueue: Added badge claim (ZK-Proof Required: Yes)
📡 Broadcasted achievement unlock to 25 WebSocket clients
✅ ZK-proof verified for 0x1234...
```

## 🔒 Security Considerations

### ZK-Proof Security
- **Nullifier Uniqueness**: Prevents replay attacks
- **Proof Validation**: Strict format and component validation
- **Expiration Handling**: 24-hour claim expiration
- **Threshold Management**: Admin-controlled verification thresholds

### Achievement Security
- **Requirement Validation**: Server-side achievement requirement checking
- **Progress Integrity**: Tamper-resistant progress tracking
- **Notification Security**: WebSocket message validation

## 🔮 Future Enhancements

### Planned Features
1. **Achievement NFTs**: Mint achievements as NFTs for verified claims
2. **Social Achievements**: Friend-based and community achievements
3. **Dynamic Requirements**: Time-based and seasonal achievement variations
4. **Advanced ZK-Proofs**: Integration with more complex ZK-SNARK circuits
5. **Achievement Marketplace**: Trading and showcasing achievement NFTs

### Integration Opportunities
- Cross-game achievement compatibility
- Achievement-based rewards and benefits
- Community governance through achievement voting power
- Achievement-gated features and content

## 📚 Resources

### Documentation
- [Achievement Types Reference](./docs/achievement-types.md)
- [ZK-Proof Integration Guide](./docs/zk-proof-guide.md)
- [API Documentation](./docs/api-reference.md)

### Smart Contracts
- [XPVerifier.sol](../contracts/XPVerifier.sol)
- [XPBadge.sol](../contracts/XPBadge.sol)

### Test Examples
- [Achievement Test Data](./test-data/achievements.json)
- [ZK-Proof Test Vectors](./test-data/zk-proofs.json)

---

**Phase 8 Implementation Complete** ✅
- Comprehensive achievements system with 21 default achievements
- ZK-proof verification for high-value claims
- Real-time WebSocket notifications
- Enhanced retry queue with ZK integration
- Complete API suite with 10+ endpoints
- Production-ready monitoring and security features