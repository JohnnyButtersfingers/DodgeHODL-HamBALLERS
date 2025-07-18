# Supabase Badge Tracking Schema Notes - Phase 8

This document outlines the database schema considerations for tracking XP badge claims and status in Phase 8.

## Current Schema

The current badge tracking is primarily handled through the `run_logs` table with these relevant columns:

```sql
-- Existing columns in run_logs for badge tracking
xp_badge_token_id        -- The token ID of the minted badge (0-4)
xp_badge_tx_hash         -- Transaction hash of the badge mint
xp_badge_minted_at       -- Timestamp when badge was minted
```

## Phase 8 Enhancements

### 1. Badge Claims Tracking Table (Optional Enhancement)

For more detailed tracking of badge claim status, consider adding:

```sql
-- Optional new table for detailed badge claim tracking
CREATE TABLE badge_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_address TEXT NOT NULL,
  run_id TEXT NOT NULL REFERENCES run_logs(run_id),
  xp_earned INTEGER NOT NULL,
  token_id INTEGER NOT NULL, -- 0-4 for badge tiers
  status TEXT NOT NULL DEFAULT 'pending', -- pending, minting, success, failed, abandoned
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  tx_hash TEXT, -- Transaction hash when successful
  minted_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_badge_claims_player ON badge_claims(player_address);
CREATE INDEX idx_badge_claims_status ON badge_claims(status);
CREATE INDEX idx_badge_claims_run_id ON badge_claims(run_id);
CREATE UNIQUE INDEX idx_badge_claims_unique_run ON badge_claims(run_id);
```

### 2. Badge Collection View

Create a view for easier querying of user badge collections:

```sql
-- View for user badge collections
CREATE VIEW user_badge_collections AS
SELECT 
  player_address,
  xp_badge_token_id as token_id,
  COUNT(*) as badge_count,
  MIN(xp_badge_minted_at) as first_earned,
  MAX(xp_badge_minted_at) as last_earned,
  ARRAY_AGG(run_id ORDER BY xp_badge_minted_at) as run_ids
FROM run_logs 
WHERE xp_badge_token_id IS NOT NULL 
  AND xp_badge_minted_at IS NOT NULL
GROUP BY player_address, xp_badge_token_id;
```

### 3. Badge Statistics View

For leaderboards and analytics:

```sql
-- Badge statistics view
CREATE VIEW badge_statistics AS
SELECT 
  xp_badge_token_id as token_id,
  COUNT(*) as total_minted,
  COUNT(DISTINCT player_address) as unique_holders,
  AVG(xp_earned) as avg_xp,
  MIN(xp_earned) as min_xp,
  MAX(xp_earned) as max_xp
FROM run_logs 
WHERE xp_badge_token_id IS NOT NULL 
  AND xp_badge_minted_at IS NOT NULL
GROUP BY xp_badge_token_id;
```

## Current API Endpoints

Phase 8 introduces these new API endpoints:

- `GET /api/badges/claimable/:wallet` - Get badges ready to be claimed
- `GET /api/badges/check/:wallet` - Check for missing badges and trigger minting

## Badge Status Flow

1. **Run Completed** → `run_logs` entry created with `xp_earned`
2. **Badge Eligible** → XP > 0, `xp_badge_token_id` determined
3. **Minting Process** → Background job attempts to mint badge
4. **Success** → `xp_badge_tx_hash` and `xp_badge_minted_at` updated
5. **Failed** → Retry logic handles failed attempts

## TODO Items for Full Implementation

- [ ] Implement badge retry mechanism with exponential backoff
- [ ] Add badge claim history tracking
- [ ] Create badge analytics dashboard
- [ ] Implement badge verification against blockchain state
- [ ] Add email/webhook notifications for successful badge mints
- [ ] Create badge trading/transfer functionality (if desired)

## Security Considerations

- Ensure wallet address validation on all endpoints
- Rate limit badge checking requests
- Verify on-chain badge ownership before displaying
- Protect against replay attacks in badge claiming

## Performance Notes

- Index all player_address columns for fast lookups
- Consider partitioning large badge tables by date
- Cache badge collection data for frequent requests
- Use views for complex badge analytics queries

## Integration Points

- **Frontend**: `/claim` route displays badge collection and claimable status
- **Backend**: Badge minting handled by background listeners
- **Blockchain**: XPBadge ERC1155 contract for actual NFT storage
- **Analytics**: Badge statistics for game metrics and leaderboards