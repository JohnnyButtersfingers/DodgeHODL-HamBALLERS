-- Migration: Add XPBadge NFT support to run_logs table
-- Run this SQL in your Supabase SQL editor to add XPBadge tracking

-- Add XPBadge-related columns to run_logs table
ALTER TABLE run_logs 
ADD COLUMN IF NOT EXISTS xp_badge_token_id INTEGER,
ADD COLUMN IF NOT EXISTS xp_badge_tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS xp_badge_minted_at TIMESTAMPTZ;

-- Add index for querying by badge token ID
CREATE INDEX IF NOT EXISTS idx_run_logs_xp_badge_token_id 
ON run_logs(xp_badge_token_id) 
WHERE xp_badge_token_id IS NOT NULL;

-- Add index for querying by player and badge status
CREATE INDEX IF NOT EXISTS idx_run_logs_player_badge_status 
ON run_logs(player_address, xp_badge_token_id) 
WHERE xp_badge_token_id IS NOT NULL;

-- Update the updated_at trigger to include new columns
-- (This assumes you have an update trigger for updated_at column)

-- Comments for clarity
COMMENT ON COLUMN run_logs.xp_badge_token_id IS 'XPBadge NFT token ID (0-4: Participation, Common, Rare, Epic, Legendary)';
COMMENT ON COLUMN run_logs.xp_badge_tx_hash IS 'Ethereum transaction hash for XPBadge mint transaction';
COMMENT ON COLUMN run_logs.xp_badge_minted_at IS 'Timestamp when the XPBadge NFT was successfully minted';

-- Create a view for easy badge analytics
CREATE OR REPLACE VIEW xp_badge_summary AS
SELECT 
    player_address,
    COUNT(*) as total_badges_earned,
    COUNT(CASE WHEN xp_badge_token_id = 0 THEN 1 END) as participation_badges,
    COUNT(CASE WHEN xp_badge_token_id = 1 THEN 1 END) as common_badges,
    COUNT(CASE WHEN xp_badge_token_id = 2 THEN 1 END) as rare_badges,
    COUNT(CASE WHEN xp_badge_token_id = 3 THEN 1 END) as epic_badges,
    COUNT(CASE WHEN xp_badge_token_id = 4 THEN 1 END) as legendary_badges,
    MIN(xp_badge_minted_at) as first_badge_earned,
    MAX(xp_badge_minted_at) as latest_badge_earned
FROM run_logs 
WHERE xp_badge_token_id IS NOT NULL 
GROUP BY player_address;

-- Add RLS policy for the new view (optional, based on your security needs)
-- ALTER VIEW xp_badge_summary ENABLE ROW LEVEL SECURITY;

COMMENT ON VIEW xp_badge_summary IS 'Aggregated view of XPBadge NFT earnings per player';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'run_logs' 
    AND column_name IN ('xp_badge_token_id', 'xp_badge_tx_hash', 'xp_badge_minted_at')
ORDER BY column_name;