# Phase 8: Claim System, Badge UX, and Supabase Integration

## Overview
Phase 8 implements a comprehensive badge claim system with Supabase integration, retry logic, and fallback mechanisms for HamBaller.xyz.

## Key Components Implemented

### 1. Frontend Components

#### ClaimPanel Component (`/frontend/src/components/ClaimPanel.jsx`)
- **State Management**: Tracks badge states (claimable, claiming, minted, failed, pending_retry)
- **Supabase Sync**: Auto-syncs every 30 seconds with manual refresh option
- **Retry Logic**: Exponential backoff with max 5 retries
- **Fallback Support**: Uses mock data when Supabase unavailable
- **Multi-source Data**: Merges data from XPBadge contract and Supabase

Key features:
- Real-time sync status indicator
- Grouped badge display by state
- Countdown timers for retry attempts
- Transaction links for minted badges
- Error messages with retry information

### 2. Backend Endpoints

#### GET `/api/badges/claimable/:wallet`
Returns all claimable badges for a wallet including:
- Unclaimed badges from completed runs
- Failed badges eligible for retry
- Pending badges in retry queue

Response includes:
```json
{
  "success": true,
  "wallet": "0x...",
  "badges": [...],
  "totalClaimable": 2,
  "totalPending": 1,
  "totalFailed": 1,
  "byTier": { "Common": 1, "Rare": 1 }
}
```

#### POST `/api/badges/claim`
Handles badge claiming with automatic retry queue integration:
- Validates claim eligibility
- Creates/updates claim attempts in database
- Integrates with XPBadge minting system
- Automatically queues failed attempts for retry

Request body:
```json
{
  "playerAddress": "0x...",
  "badgeId": "badge-123",
  "tokenId": 2,
  "xpEarned": 65,
  "season": 1,
  "runId": "run-123",
  "verificationData": {...}
}
```

### 3. Navigation Updates
- Added `/claim` route to main navigation
- Icon: 🎁 "Claim"
- Maintains existing `/badges` route for backward compatibility

### 4. Database Integration
Utilizes existing Supabase tables:
- `run_logs`: Source for unclaimed badges
- `badge_claim_attempts`: Tracks claim attempts and failures
- `xp_badge_summary`: Player badge statistics

### 5. Retry System Integration

#### Automatic Retry Queue
- Failed claims automatically added to retry queue
- Exponential backoff: 15s, 30s, 60s, 120s, 300s
- Max 5 retry attempts per badge
- Integrates with existing `retryQueue` module

#### Manual Retry
- Users can manually retry failed claims
- Retry button appears when countdown expires
- Clear error messages for each failure

### 6. Error Handling

Comprehensive error handling for:
- Gas estimation failures
- Network timeouts
- Invalid proofs (ZK verification)
- Nullifier reuse
- Contract unavailability

Each error type has specific UI feedback via `useZKToasts`.

## State Flow Diagram

```
CLAIMABLE → CLAIMING → MINTED (success)
     ↓         ↓
     ↓    PENDING_RETRY → (auto-retry) → CLAIMING
     ↓         ↓
     ↓      FAILED (max retries reached)
     ↓
  (manual claim)
```

## Testing

Run the test script:
```bash
./test-claim-system.js
```

Tests cover:
- Claimable badges endpoint
- Badge claim process
- Retry queue integration
- Frontend route configuration

## Development Mode Features

When `import.meta.env.DEV` is true:
- Mock data returned when Supabase unavailable
- Development panel in existing ClaimBadge component
- Console logging for debugging

## Future Enhancements (Phase 9)

1. **ZKVerifier Integration**
   - Full proof generation for high-value badges
   - Nullifier tracking in database
   - Replay-proof verification

2. **Claim Authentication**
   - Signature verification for claims
   - Rate limiting per wallet
   - Anti-bot measures

3. **Advanced UI Features**
   - Badge rarity animations
   - Claim progress visualization
   - Batch claiming support

## File Changes Summary

### New Files:
- `/frontend/src/components/ClaimPanel.jsx` - Main claim UI component
- `/test-claim-system.js` - Test script for validation
- `/PHASE8_CLAIM_SYSTEM.md` - This documentation

### Modified Files:
- `/frontend/src/App.jsx` - Added ClaimPanel import and route
- `/frontend/src/components/Layout.jsx` - Added /claim to navigation
- `/backend/routes/badges.js` - Added claimable and claim endpoints

## Environment Variables

No new environment variables required. Uses existing:
- `VITE_API_URL` - Frontend API endpoint
- `SUPABASE_URL` - Supabase instance URL
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `XPBADGE_ADDRESS` - XPBadge contract address
- `XPBADGE_MINTER_PRIVATE_KEY` - Minter wallet key

## Deployment Checklist

- [ ] Ensure Supabase tables have proper indexes on `player_address`
- [ ] Verify XPBadge contract is deployed and configured
- [ ] Test retry queue processing is running
- [ ] Confirm API endpoints are accessible
- [ ] Check frontend build includes new routes
- [ ] Monitor initial claim attempts for errors

## Support & Monitoring

Key metrics to monitor:
- Badge claim success rate
- Average retry attempts per badge
- Supabase sync failures
- Gas estimation errors
- User engagement with /claim vs /badges

Log analysis queries:
```sql
-- Failed claims by error type
SELECT error_message, COUNT(*) 
FROM badge_claim_attempts 
WHERE status = 'failed' 
GROUP BY error_message;

-- Retry effectiveness
SELECT retry_count, COUNT(*) 
FROM badge_claim_attempts 
GROUP BY retry_count;
```

---

Phase 8 successfully implements a robust badge claim system with comprehensive error handling, retry logic, and seamless Supabase integration. The system is designed to be resilient, user-friendly, and ready for Phase 9 enhancements.