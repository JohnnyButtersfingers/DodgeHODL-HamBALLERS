-- Migration: Create XP and Leaderboard Tables
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- XP tracking table
CREATE TABLE IF NOT EXISTS player_xp (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    xp BIGINT NOT NULL DEFAULT 0,
    xp_source VARCHAR(50) DEFAULT 'game', -- 'game', 'contract', 'manual', etc.
    last_xp_update TIMESTAMPTZ DEFAULT NOW(),
    total_xp_earned BIGINT DEFAULT 0, -- Cumulative XP ever earned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_address CHECK (player_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT positive_xp CHECK (xp >= 0),
    CONSTRAINT positive_total_xp CHECK (total_xp_earned >= 0)
);

-- XP history table for tracking changes over time
CREATE TABLE IF NOT EXISTS xp_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    xp_change BIGINT NOT NULL, -- Can be positive or negative
    previous_xp BIGINT NOT NULL,
    new_xp BIGINT NOT NULL,
    change_reason VARCHAR(100), -- 'game_completion', 'bonus', 'penalty', etc.
    metadata JSONB, -- Additional context about the XP change
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key
    CONSTRAINT fk_player_xp FOREIGN KEY (player_address) REFERENCES player_xp(player_address) ON DELETE CASCADE
);

-- Leaderboard cache table for performance
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    xp BIGINT NOT NULL,
    rank INTEGER NOT NULL,
    percentile DECIMAL(5,2), -- e.g., 95.50 for top 4.5%
    tier VARCHAR(20), -- 'legend', 'master', 'diamond', 'gold', 'silver', 'bronze'
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key
    CONSTRAINT fk_player_leaderboard FOREIGN KEY (player_address) REFERENCES player_xp(player_address) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT unique_leaderboard_entry UNIQUE (player_address)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS xp_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    achievement_key VARCHAR(50) UNIQUE NOT NULL, -- 'first_100_xp', 'top_10', etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    xp_threshold BIGINT, -- XP required to unlock
    rank_threshold INTEGER, -- Rank required to unlock
    icon_url TEXT,
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player achievements junction table
CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    achievement_key VARCHAR(50) NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_player_achievements FOREIGN KEY (player_address) REFERENCES player_xp(player_address) ON DELETE CASCADE,
    CONSTRAINT fk_achievement FOREIGN KEY (achievement_key) REFERENCES xp_achievements(achievement_key) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT unique_player_achievement UNIQUE (player_address, achievement_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_xp_address ON player_xp(player_address);
CREATE INDEX IF NOT EXISTS idx_player_xp_xp_desc ON player_xp(xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_xp_updated_at ON player_xp(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_history_address ON xp_history(player_address);
CREATE INDEX IF NOT EXISTS idx_xp_history_created_at ON xp_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_cache(rank ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp_desc ON leaderboard_cache(xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_tier ON leaderboard_cache(tier);

CREATE INDEX IF NOT EXISTS idx_player_achievements_address ON player_achievements(player_address);
CREATE INDEX IF NOT EXISTS idx_player_achievements_earned ON player_achievements(earned_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_xp_updated_at BEFORE UPDATE ON player_xp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create XP history entries
CREATE OR REPLACE FUNCTION create_xp_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if XP actually changed
    IF OLD.xp IS DISTINCT FROM NEW.xp THEN
        INSERT INTO xp_history (
            player_address, 
            xp_change, 
            previous_xp, 
            new_xp, 
            change_reason,
            metadata
        ) VALUES (
            NEW.player_address,
            NEW.xp - OLD.xp,
            OLD.xp,
            NEW.xp,
            COALESCE(NEW.xp_source, 'unknown'),
            jsonb_build_object(
                'timestamp', CURRENT_TIMESTAMP,
                'trigger', 'auto_history'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_xp_history_trigger AFTER UPDATE ON player_xp
    FOR EACH ROW EXECUTE FUNCTION create_xp_history();

-- Function to recalculate leaderboard ranks
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void AS $$
BEGIN
    -- Clear existing cache
    DELETE FROM leaderboard_cache;
    
    -- Recalculate ranks and insert
    INSERT INTO leaderboard_cache (player_address, xp, rank, percentile, tier)
    SELECT 
        player_address,
        xp,
        ROW_NUMBER() OVER (ORDER BY xp DESC) as rank,
        ROUND(
            100.0 * (
                (SELECT COUNT(*) FROM player_xp p2 WHERE p2.xp < p1.xp)::decimal / 
                GREATEST((SELECT COUNT(*) FROM player_xp), 1)
            ), 2
        ) as percentile,
        CASE 
            WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) = 1 THEN 'legend'
            WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 10 THEN 'master'
            WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 50 THEN 'diamond'
            WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 100 THEN 'gold'
            WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 500 THEN 'silver'
            ELSE 'bronze'
        END as tier
    FROM player_xp p1
    WHERE xp > 0
    ORDER BY xp DESC;
    
    RAISE NOTICE 'Leaderboard cache refreshed with % entries', (SELECT COUNT(*) FROM leaderboard_cache);
END;
$$ language 'plpgsql';

-- Insert sample achievements
INSERT INTO xp_achievements (achievement_key, name, description, xp_threshold, rank_threshold, rarity) VALUES
    ('first_xp', 'First Steps', 'Earn your first XP point', 1, NULL, 'common'),
    ('century_club', 'Century Club', 'Reach 100 XP', 100, NULL, 'common'),
    ('top_1000', 'Rising Star', 'Reach top 1000 players', NULL, 1000, 'rare'),
    ('top_100', 'Elite Player', 'Reach top 100 players', NULL, 100, 'epic'),
    ('top_10', 'Master Tier', 'Reach top 10 players', NULL, 10, 'legendary'),
    ('champion', 'Champion', 'Reach #1 on the leaderboard', NULL, 1, 'legendary'),
    ('xp_master', 'XP Master', 'Accumulate 10,000 XP', 10000, NULL, 'epic'),
    ('xp_legend', 'XP Legend', 'Accumulate 100,000 XP', 100000, NULL, 'legendary')
ON CONFLICT (achievement_key) DO NOTHING;

-- RLS (Row Level Security) policies
ALTER TABLE player_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to player_xp" ON player_xp FOR SELECT USING (true);
CREATE POLICY "Allow read access to xp_history" ON xp_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to leaderboard_cache" ON leaderboard_cache FOR SELECT USING (true);
CREATE POLICY "Allow read access to player_achievements" ON player_achievements FOR SELECT USING (true);
CREATE POLICY "Allow read access to xp_achievements" ON xp_achievements FOR SELECT USING (true);

-- Allow insert/update for service role (backend)
CREATE POLICY "Allow service role to manage player_xp" ON player_xp FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    auth.jwt() ->> 'role' = 'authenticated'
);

CREATE POLICY "Allow service role to manage xp_history" ON xp_history FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    auth.jwt() ->> 'role' = 'authenticated'
);

CREATE POLICY "Allow service role to manage leaderboard_cache" ON leaderboard_cache FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    auth.jwt() ->> 'role' = 'authenticated'
);

CREATE POLICY "Allow service role to manage player_achievements" ON player_achievements FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR 
    auth.jwt() ->> 'role' = 'authenticated'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Initial data migration from JSON (run separately after table creation)
COMMENT ON TABLE player_xp IS 'Stores player XP data with history tracking';
COMMENT ON TABLE xp_history IS 'Audit trail for all XP changes';
COMMENT ON TABLE leaderboard_cache IS 'Precomputed leaderboard rankings for performance';
COMMENT ON TABLE xp_achievements IS 'Available achievements based on XP and rank';
COMMENT ON TABLE player_achievements IS 'Tracks which achievements each player has earned';