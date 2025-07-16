-- Add badge claim tracking tables
-- Run this migration to add badge claim status tracking

-- Badge claim attempts table to track all minting attempts
CREATE TABLE IF NOT EXISTS badge_claim_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    run_id UUID REFERENCES run_logs(id) ON DELETE CASCADE,
    xp_earned INTEGER NOT NULL,
    season INTEGER NOT NULL,
    token_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'minting', 'completed', 'failed', 'abandoned')),
    tx_hash VARCHAR(66), -- Transaction hash when successful
    error_message TEXT, -- Error details for failed attempts
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badge claim status per wallet (for quick queries)
CREATE TABLE IF NOT EXISTS badge_claim_status (
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

-- Missed events table for recovery on restart
CREATE TABLE IF NOT EXISTS missed_run_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_badge_claim_attempts_player_address ON badge_claim_attempts(player_address);
CREATE INDEX IF NOT EXISTS idx_badge_claim_attempts_status ON badge_claim_attempts(status);
CREATE INDEX IF NOT EXISTS idx_badge_claim_attempts_created_at ON badge_claim_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_claim_attempts_retry_count ON badge_claim_attempts(retry_count);

CREATE INDEX IF NOT EXISTS idx_missed_run_events_processed ON missed_run_events(processed);
CREATE INDEX IF NOT EXISTS idx_missed_run_events_block_number ON missed_run_events(block_number);
CREATE INDEX IF NOT EXISTS idx_missed_run_events_player_address ON missed_run_events(player_address);

-- Trigger to update badge_claim_status when attempts change
CREATE OR REPLACE FUNCTION update_badge_claim_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert badge claim status
    INSERT INTO badge_claim_status (
        player_address,
        total_earned,
        total_pending,
        total_failed,
        last_claim_attempt,
        last_successful_claim,
        participation_badges,
        common_badges,
        rare_badges,
        epic_badges,
        legendary_badges
    )
    SELECT 
        NEW.player_address,
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status IN ('pending', 'minting')),
        COUNT(*) FILTER (WHERE status = 'failed'),
        MAX(created_at),
        MAX(CASE WHEN status = 'completed' THEN updated_at END),
        COUNT(*) FILTER (WHERE status = 'completed' AND token_id = 0),
        COUNT(*) FILTER (WHERE status = 'completed' AND token_id = 1),
        COUNT(*) FILTER (WHERE status = 'completed' AND token_id = 2),
        COUNT(*) FILTER (WHERE status = 'completed' AND token_id = 3),
        COUNT(*) FILTER (WHERE status = 'completed' AND token_id = 4)
    FROM badge_claim_attempts 
    WHERE player_address = NEW.player_address
    ON CONFLICT (player_address) 
    DO UPDATE SET
        total_earned = EXCLUDED.total_earned,
        total_pending = EXCLUDED.total_pending,
        total_failed = EXCLUDED.total_failed,
        last_claim_attempt = EXCLUDED.last_claim_attempt,
        last_successful_claim = EXCLUDED.last_successful_claim,
        participation_badges = EXCLUDED.participation_badges,
        common_badges = EXCLUDED.common_badges,
        rare_badges = EXCLUDED.rare_badges,
        epic_badges = EXCLUDED.epic_badges,
        legendary_badges = EXCLUDED.legendary_badges,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_badge_claim_status
    AFTER INSERT OR UPDATE OF status ON badge_claim_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_badge_claim_status();

-- Comments for documentation
COMMENT ON TABLE badge_claim_attempts IS 'Tracks all badge minting attempts with retry logic';
COMMENT ON TABLE badge_claim_status IS 'Aggregated badge claim status per wallet for quick queries';
COMMENT ON TABLE missed_run_events IS 'Stores RunCompleted events that need to be processed on restart';

COMMENT ON COLUMN badge_claim_attempts.status IS 'pending: queued, minting: in progress, completed: successful, failed: retry needed, abandoned: max retries exceeded';
COMMENT ON COLUMN badge_claim_attempts.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN missed_run_events.processed IS 'Whether this missed event has been processed';