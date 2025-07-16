# Badge Minting Retry System

This document describes the comprehensive badge minting retry system implemented for HamBaller.xyz, which provides robust handling of XPBadge NFT minting with automatic retries, event recovery, and persistent storage.

## 🎯 Overview

The badge minting retry system addresses several key challenges:

1. **Failed Badge Mints**: Network issues, gas price fluctuations, or contract errors can cause badge minting to fail
2. **Missed Events**: Server restarts can cause RunCompleted events to be missed
3. **Claim Status Tracking**: Players need visibility into their badge claim attempts and status
4. **Automatic Recovery**: The system should automatically retry failed mints and recover missed events

## 🏗️ System Architecture

### Core Components

1. **RetryQueue (`retryQueue.js`)**: Enhanced in-memory queue with Supabase persistence
2. **EventRecovery (`eventRecovery.js`)**: Blockchain event scanning and recovery system
3. **Database Tables**: Persistent storage for claim attempts and status
4. **REST API**: Endpoints for querying claim status and system statistics

### Data Flow

```
RunCompleted Event → Event Listener → Run Logging → RetryQueue.addAttempt()
                                                        ↓
Badge Claim Attempt → Supabase Storage → In-Memory Queue → Minting Process
                                                        ↓
Success/Failure → Status Update → Retry Logic (if failed) → Statistics
```

## 📊 Database Schema

### badge_claim_attempts
Tracks all badge minting attempts with retry logic:

```sql
CREATE TABLE badge_claim_attempts (
    id UUID PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    run_id UUID REFERENCES run_logs(id),
    xp_earned INTEGER NOT NULL,
    season INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'minting', 'completed', 'failed', 'abandoned')),
    tx_hash VARCHAR(66),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### badge_claim_status
Aggregated status per wallet for quick queries:

```sql
CREATE TABLE badge_claim_status (
    player_address VARCHAR(42) PRIMARY KEY,
    total_earned INTEGER DEFAULT 0,
    total_pending INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    last_claim_attempt TIMESTAMPTZ,
    last_successful_claim TIMESTAMPTZ,
    participation_badges INTEGER DEFAULT 0,
    common_badges INTEGER DEFAULT 0,
    rare_badges INTEGER DEFAULT 0,
    epic_badges INTEGER DEFAULT 0,
    legendary_badges INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### missed_run_events
Stores RunCompleted events for recovery processing:

```sql
CREATE TABLE missed_run_events (
    id UUID PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    xp_earned INTEGER NOT NULL,
    cp_earned INTEGER NOT NULL,
    dbp_minted DECIMAL NOT NULL,
    duration INTEGER NOT NULL,
    bonus_throw_used BOOLEAN DEFAULT FALSE,
    boosts_used INTEGER[] DEFAULT '{}',
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
```

## 🔄 Retry Logic

### Configuration
```javascript
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 15000, // 15 seconds (matches frontend polling cadence)
  maxDelay: 300000, // 5 minutes
  backoffMultiplier: 2,
  jitterRange: 0.1 // ±10% random jitter
};
```

### Retry Delay Calculation
The system uses exponential backoff with jitter:
- Retry 1: ~15 seconds
- Retry 2: ~30 seconds  
- Retry 3: ~60 seconds
- Retry 4: ~120 seconds
- Retry 5: ~240 seconds

### Status Lifecycle
```
pending → minting → completed ✅
   ↓         ↓
failed → failed → ... → abandoned ❌
(retry)  (retry)      (max retries)
```

## 🔍 Event Recovery

### Startup Recovery Process

1. **Determine Last Processed Block**: Calculate based on latest run log timestamp
2. **Scan Blockchain**: Query for RunCompleted events in chunks of 1000 blocks
3. **Filter Processed Events**: Check if events already exist in database
4. **Store Missed Events**: Save discovered events to `missed_run_events` table
5. **Process Events**: Create run logs and queue badge minting attempts

### Manual Recovery

Administrators can trigger manual recovery for specific block ranges:

```javascript
POST /api/badges/retry-queue/manual-recovery
{
  "fromBlock": 1000,
  "toBlock": 2000
}
```

## 🛠️ API Endpoints

### Badge Claim Status
```javascript
GET /api/badges/:wallet/claim-status
```

Returns comprehensive claim status including:
- Aggregated statistics (total earned, pending, failed)
- Recent claim attempts with details
- Potential missed claims (runs with XP but no badge)
- Retry queue status

### Retry Queue Statistics
```javascript
GET /api/badges/retry-queue/stats
```

Returns system-wide statistics:
- In-memory queue size and status
- Event recovery statistics
- Database attempt counts by status

### Manual Event Recovery
```javascript
POST /api/badges/retry-queue/manual-recovery
{
  "fromBlock": number,
  "toBlock": number
}
```

Triggers manual recovery for specific block range.

### Pending Badge Claims
```javascript
GET /api/badges/pending?limit=100&offset=0
```

Returns all active/pending badge mint attempts with enhanced metadata:
- Badge metadata (XP awarded, token ID, season, tier)
- Retry metadata (current retry, next retry time)
- Status grouping for easy filtering
- Pagination support (max 100 per request)

## 🔧 Configuration

### Environment Variables

```bash
# Blockchain Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
HODL_MANAGER_ADDRESS=0x...
XPBADGE_ADDRESS=0x...
XPBADGE_MINTER_PRIVATE_KEY=0x...

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### System Initialization

```javascript
// Server startup sequence
1. Initialize RetryQueue with blockchain connection
2. Initialize EventRecovery system
3. Perform startup event recovery
4. Start RunCompleted event listener
5. Load pending attempts from database
6. Begin retry queue processing
```

## 📈 Monitoring and Observability

### Health Metrics

- **Queue Size**: Number of pending badge claims
- **Success Rate**: Percentage of successful badge mints
- **Retry Distribution**: Breakdown of attempts by retry count
- **Processing Status**: Whether systems are actively processing
- **Event Recovery**: Missed events discovered and processed

### Logging

The system provides comprehensive logging:
- ✅ Success indicators for completed operations
- ⚠️ Warnings for retryable failures
- ❌ Errors for system issues
- 🔄 Processing status updates
- 📋 Queue operation logs

## 🚀 Deployment

### Migration Steps

1. **Apply Database Schema**:
   ```bash
   # Run in Supabase SQL editor
   psql -f migrations/add_badge_claim_tracking.sql
   ```

2. **Update Environment Variables**: Ensure all required variables are set

3. **Deploy Backend**: The new system will automatically initialize on startup

4. **Verify Operation**: Check logs for successful initialization

### Rollback Strategy

The system is designed to be backward compatible:
- Original badge minting logic remains as fallback
- New tables don't affect existing functionality
- System gracefully degrades if components aren't available

## 🔒 Security Considerations

### Access Control
- Manual recovery endpoint requires appropriate authentication
- Minter private key is securely stored and access-controlled
- Database operations use parameterized queries

### Rate Limiting
- Blockchain operations include delays to avoid overwhelming RPC
- Retry delays prevent excessive network requests
- Chunk processing prevents timeout issues

## 🧪 Testing

### Unit Tests
- Retry logic and delay calculations
- Token ID generation based on XP
- Status transitions and validations

### Integration Tests
- End-to-end badge minting flow
- Event recovery with mock blockchain data
- Database operations and triggers

### Load Testing
- Multiple concurrent badge claims
- Large event recovery operations
- System behavior under high load

## 📋 Maintenance

### Regular Tasks
1. **Monitor Queue Size**: Alert if queue grows beyond expected size
2. **Check Success Rates**: Investigate if success rate drops significantly
3. **Review Failed Attempts**: Analyze error patterns for improvements
4. **Clean Old Data**: Archive old claim attempts periodically

### Troubleshooting

**Queue Not Processing**:
- Check if RetryQueue is initialized
- Verify blockchain connectivity
- Check minter permissions on XPBadge contract

**High Failure Rate**:
- Check gas price settings
- Verify contract addresses
- Check network congestion

**Missing Events**:
- Run manual recovery for suspected missing blocks
- Check event recovery system status
- Verify HODL Manager contract address

## 🔮 Future Enhancements

1. **Dynamic Gas Management**: Adjust gas prices based on network conditions
2. **Advanced Analytics**: Detailed success/failure pattern analysis
3. **Notification System**: Alert players about badge claim status
4. **Batch Processing**: Group multiple badge mints for efficiency
5. **Cross-Chain Support**: Extend to multiple blockchain networks

## 📞 Support

For issues or questions about the badge retry system:

1. Check system logs for error details
2. Use retry queue stats endpoint for diagnostics
3. Review badge claim status for affected wallets
4. Consider manual recovery if events were missed

The system is designed to be self-healing and should automatically recover from most failure scenarios.