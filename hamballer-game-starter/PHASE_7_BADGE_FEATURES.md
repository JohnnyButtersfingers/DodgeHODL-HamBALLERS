# Phase 7+ Advanced Badge Features

## 📋 Overview

This document outlines advanced badge features for HamBaller.xyz Phase 7+ development, including retry mechanisms, duplicate prevention, and ERC-998 composability.

## 🔄 Retry-Eligible Badges ("Pending" State)

### Concept
Implement a badge state system where failed mints can be automatically retried, ensuring players don't lose earned badges due to temporary network issues.

### Database Schema Extensions

```sql
-- Add retry tracking columns to run_logs
ALTER TABLE run_logs 
ADD COLUMN IF NOT EXISTS xp_badge_status VARCHAR(20) DEFAULT 'pending' CHECK (
  xp_badge_status IN ('pending', 'minting', 'minted', 'failed', 'retry_pending', 'abandoned')
),
ADD COLUMN IF NOT EXISTS xp_badge_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_badge_retry_after TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS xp_badge_failure_reason TEXT;

-- Create retry queue table for better management
CREATE TABLE IF NOT EXISTS badge_retry_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    run_log_id UUID REFERENCES run_logs(id) ON DELETE CASCADE,
    player_address VARCHAR(42) NOT NULL,
    token_id INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL,
    season INTEGER NOT NULL,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient retry processing
CREATE INDEX IF NOT EXISTS idx_badge_retry_queue_next_retry 
ON badge_retry_queue(next_retry_at) 
WHERE retry_count < 5; -- Max 5 retries
```

### Implementation Strategy

```javascript
// Enhanced minting with retry logic
async function mintXPBadgeWithRetry(playerAddress, xpEarned, season, runLogId) {
  const maxRetries = 5;
  const baseDelay = 60000; // 1 minute base delay
  
  try {
    // Update status to 'minting'
    await updateBadgeStatus(runLogId, 'minting');
    
    const result = await mintXPBadge(playerAddress, xpEarned, season);
    
    if (result.success) {
      // Success - update database
      await updateBadgeStatus(runLogId, 'minted', {
        tokenId: result.tokenId,
        txHash: result.txHash,
        mintedAt: new Date().toISOString()
      });
      
      // Remove from retry queue if exists
      await removeFromRetryQueue(runLogId);
      
      return result;
    } else {
      // Failed - queue for retry
      await queueForRetry(runLogId, playerAddress, xpEarned, season, result.error);
    }
    
  } catch (error) {
    await queueForRetry(runLogId, playerAddress, xpEarned, season, error.message);
  }
}

// Retry queue management
async function queueForRetry(runLogId, playerAddress, xpEarned, season, failureReason) {
  const { data: existingRetry, error } = await db
    .from('badge_retry_queue')
    .select('retry_count')
    .eq('run_log_id', runLogId)
    .single();
  
  const retryCount = existingRetry ? existingRetry.retry_count + 1 : 1;
  const maxRetries = 5;
  
  if (retryCount > maxRetries) {
    // Too many retries - abandon
    await updateBadgeStatus(runLogId, 'abandoned', { failureReason });
    await removeFromRetryQueue(runLogId);
    return;
  }
  
  // Calculate exponential backoff delay
  const delay = baseDelay * Math.pow(2, retryCount - 1);
  const nextRetryAt = new Date(Date.now() + delay);
  
  const tokenId = await generateBadgeTokenId(xpEarned);
  
  await db
    .from('badge_retry_queue')
    .upsert({
      run_log_id: runLogId,
      player_address: playerAddress,
      token_id: tokenId,
      xp_earned: xpEarned,
      season,
      retry_count: retryCount,
      next_retry_at: nextRetryAt.toISOString(),
      failure_reason: failureReason,
      updated_at: new Date().toISOString()
    });
  
  await updateBadgeStatus(runLogId, 'retry_pending', { 
    failureReason,
    nextRetryAt: nextRetryAt.toISOString()
  });
}

// Retry processor (runs periodically)
async function processRetryQueue() {
  const { data: retryItems, error } = await db
    .from('badge_retry_queue')
    .select('*')
    .lte('next_retry_at', new Date().toISOString())
    .lt('retry_count', 5)
    .order('next_retry_at', { ascending: true })
    .limit(10); // Process 10 at a time
  
  for (const item of retryItems) {
    await mintXPBadgeWithRetry(
      item.player_address,
      item.xp_earned,
      item.season,
      item.run_log_id
    );
    
    // Delay between retries to avoid overwhelming network
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

## 🚫 Duplicate Prevention

### Claimed Levels System

```sql
-- Track claimed badge levels per player per season
CREATE TABLE IF NOT EXISTS badge_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    season INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    claimed_count INTEGER DEFAULT 1,
    first_claimed_at TIMESTAMPTZ DEFAULT NOW(),
    last_claimed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate claims
    UNIQUE(player_address, season, token_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_badge_claims_player_season 
ON badge_claims(player_address, season);
```

### Nullifier System

```javascript
// Generate unique nullifier for badge claim
function generateBadgeNullifier(playerAddress, tokenId, season, runId) {
  const data = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'bytes32'],
    [playerAddress, tokenId, season, runId]
  );
  return data;
}

// Check if badge can be claimed
async function canClaimBadge(playerAddress, tokenId, season, runId) {
  const nullifier = generateBadgeNullifier(playerAddress, tokenId, season, runId);
  
  // Check if this specific claim already exists
  const { data: existingClaim, error } = await db
    .from('run_logs')
    .select('xp_badge_token_id')
    .eq('player_address', playerAddress.toLowerCase())
    .eq('xp_badge_token_id', tokenId)
    .eq('id', runId)
    .single();
  
  if (existingClaim) {
    return {
      canClaim: false,
      reason: 'Already claimed for this run',
      nullifier
    };
  }
  
  // Additional business logic for duplicate prevention
  const seasonLimit = getSeasonBadgeLimit(tokenId);
  const { data: seasonClaims } = await db
    .from('badge_claims')
    .select('claimed_count')
    .eq('player_address', playerAddress.toLowerCase())
    .eq('season', season)
    .eq('token_id', tokenId)
    .single();
  
  if (seasonClaims && seasonClaims.claimed_count >= seasonLimit) {
    return {
      canClaim: false,
      reason: 'Season limit reached',
      nullifier
    };
  }
  
  return {
    canClaim: true,
    nullifier
  };
}

// Season badge limits configuration
function getSeasonBadgeLimit(tokenId) {
  const limits = {
    0: 100,  // Participation badges - high limit
    1: 50,   // Common badges
    2: 25,   // Rare badges
    3: 10,   // Epic badges
    4: 5     // Legendary badges - very limited
  };
  return limits[tokenId] || 1;
}
```

## 🧩 ERC-998 Composability Check

### Composable NFT Integration

```javascript
// ERC-998 compatibility interface
const ERC998_ABI = [
  'function childExists(address childContract, uint256 childTokenId) view returns (bool)',
  'function childOf(uint256 tokenId) view returns (address parentContract, uint256 parentTokenId)',
  'function rootOwnerOf(uint256 tokenId) view returns (bytes32 rootOwner)',
  'function getChildCount(uint256 tokenId, address childContract) view returns (uint256)',
  'function getChildByIndex(uint256 tokenId, address childContract, uint256 index) view returns (uint256)'
];

// Check if badge is part of a composable NFT
async function checkComposability(badgeContractAddress, tokenId) {
  try {
    // Check if this is a child token
    const childResult = await xpBadgeContract.childOf(tokenId);
    
    if (childResult.parentContract !== ethers.ZeroAddress) {
      return {
        isComposable: true,
        type: 'child',
        parentContract: childResult.parentContract,
        parentTokenId: childResult.parentTokenId.toString()
      };
    }
    
    // Check if this token has children
    const childCount = await xpBadgeContract.getChildCount(tokenId, badgeContractAddress);
    
    if (childCount > 0) {
      const children = [];
      for (let i = 0; i < Math.min(childCount, 10); i++) { // Limit to 10 for gas
        const childTokenId = await xpBadgeContract.getChildByIndex(tokenId, badgeContractAddress, i);
        children.push(childTokenId.toString());
      }
      
      return {
        isComposable: true,
        type: 'parent',
        childCount: childCount.toString(),
        children
      };
    }
    
    return {
      isComposable: false,
      type: 'standalone'
    };
    
  } catch (error) {
    console.warn('Composability check failed:', error.message);
    return {
      isComposable: false,
      type: 'unknown',
      error: error.message
    };
  }
}

// Enhanced badge metadata with composability info
async function getBadgeMetadataWithComposability(tokenId) {
  const [basicMetadata, composabilityInfo] = await Promise.all([
    getBadgeInfo(tokenId),
    checkComposability(process.env.XPBADGE_ADDRESS, tokenId)
  ]);
  
  return {
    ...basicMetadata,
    composability: composabilityInfo,
    metadata: {
      ...basicMetadata.metadata,
      isComposable: composabilityInfo.isComposable,
      composabilityType: composabilityInfo.type
    }
  };
}
```

## 🔧 Implementation Roadmap

### Phase 7.1: Retry System
- [ ] Implement badge status tracking
- [ ] Create retry queue infrastructure
- [ ] Add exponential backoff logic
- [ ] Create retry processor daemon
- [ ] Add monitoring and alerting

### Phase 7.2: Duplicate Prevention
- [ ] Implement nullifier system
- [ ] Add claimed levels tracking
- [ ] Create season-based limits
- [ ] Add claim validation middleware
- [ ] Implement admin override system

### Phase 7.3: ERC-998 Composability
- [ ] Research and design composable badge system
- [ ] Implement ERC-998 interfaces
- [ ] Add parent-child relationship tracking
- [ ] Create composability metadata APIs
- [ ] Design badge combination mechanics

### Phase 7.4: Cross-App Badge Validation
- [ ] Design cross-platform badge verification
- [ ] Implement badge proof generation
- [ ] Create universal badge registry
- [ ] Add external verification APIs
- [ ] Implement badge portability features

## 🧪 Testing Strategy

### Retry System Tests
```javascript
// Test retry queue functionality
describe('Badge Retry System', () => {
  it('should queue failed mints for retry', async () => {
    // Mock failed mint
    const result = await mintXPBadgeWithRetry(testAddress, 50, 1, testRunId);
    
    // Verify queued for retry
    const queueItem = await getRetryQueueItem(testRunId);
    expect(queueItem).toBeDefined();
    expect(queueItem.retry_count).toBe(1);
  });
  
  it('should abandon after max retries', async () => {
    // Simulate 5 failed retries
    for (let i = 0; i < 5; i++) {
      await queueForRetry(testRunId, testAddress, 50, 1, 'Test failure');
    }
    
    // Verify abandoned status
    const status = await getBadgeStatus(testRunId);
    expect(status).toBe('abandoned');
  });
});
```

### Duplicate Prevention Tests
```javascript
describe('Duplicate Prevention', () => {
  it('should prevent duplicate badge claims', async () => {
    // First claim should succeed
    const result1 = await claimBadge(testAddress, 2, 1, testRunId);
    expect(result1.canClaim).toBe(true);
    
    // Second claim should fail
    const result2 = await claimBadge(testAddress, 2, 1, testRunId);
    expect(result2.canClaim).toBe(false);
    expect(result2.reason).toBe('Already claimed for this run');
  });
  
  it('should enforce season limits', async () => {
    // Test legendary badge limit (5 per season)
    for (let i = 0; i < 6; i++) {
      const result = await claimBadge(testAddress, 4, 1, `run-${i}`);
      if (i < 5) {
        expect(result.canClaim).toBe(true);
      } else {
        expect(result.canClaim).toBe(false);
        expect(result.reason).toBe('Season limit reached');
      }
    }
  });
});
```

## 📊 Monitoring and Analytics

### Retry System Metrics
- Retry success rate by failure type
- Average retry delay times
- Abandoned badge count and reasons
- Network congestion impact on retries

### Duplicate Prevention Metrics
- Attempted duplicate claims per day
- Season badge distribution
- Most claimed badge types
- Player badge collection completion rates

### Composability Metrics
- Parent-child badge relationships
- Most composed badge combinations
- Composability adoption rate
- Cross-app badge usage statistics

## 🚀 Deployment Considerations

### Database Migrations
```sql
-- Run these migrations in sequence for Phase 7+ features
\i phase7_1_retry_system.sql
\i phase7_2_duplicate_prevention.sql
\i phase7_3_composability_tracking.sql
```

### Environment Variables
```bash
# Phase 7+ configuration
BADGE_RETRY_ENABLED=true
BADGE_RETRY_MAX_ATTEMPTS=5
BADGE_RETRY_BASE_DELAY=60000
BADGE_SEASON_LIMITS_ENABLED=true
BADGE_COMPOSABILITY_ENABLED=true
ERC998_PARENT_CONTRACT=0x...
```

### Performance Optimization
- Index optimization for retry queries
- Batch processing for large retry queues
- Caching for frequently accessed badge metadata
- Rate limiting for retry processing

---

**🎯 Phase 7+ features will transform HamBaller.xyz badges into a robust, scalable, and interoperable NFT ecosystem with enterprise-grade reliability and cross-platform compatibility.**