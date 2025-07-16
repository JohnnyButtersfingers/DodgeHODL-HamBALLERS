-- Add achievements system tables
-- Run this migration to add achievement tracking and ZK-proof validation

-- Achievement types table to define all possible achievements
CREATE TABLE IF NOT EXISTS achievement_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('gameplay', 'collection', 'social', 'special')),
    requirements JSONB NOT NULL, -- Flexible requirements definition
    rewards JSONB, -- Optional rewards (badges, tokens, etc.)
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_secret BOOLEAN DEFAULT FALSE, -- Hidden achievements
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player achievements table to track unlocked achievements
CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    achievement_type_id UUID REFERENCES achievement_types(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    progress_data JSONB, -- Current progress towards achievement
    metadata JSONB, -- Additional context (run details, etc.)
    notified BOOLEAN DEFAULT FALSE, -- Whether player was notified
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_address, achievement_type_id)
);

-- ZK-proof claims table for XPVerifier integration
CREATE TABLE IF NOT EXISTS zk_proof_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    nullifier VARCHAR(66) NOT NULL UNIQUE, -- Prevents replay attacks
    commitment VARCHAR(66) NOT NULL, -- ZK commitment hash
    proof_data JSONB NOT NULL, -- ZK-SNARK proof components
    claimed_xp INTEGER NOT NULL,
    threshold_met INTEGER NOT NULL, -- Required threshold for claim
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
    verification_tx_hash VARCHAR(66), -- Transaction hash of verification
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement progress tracking for incremental achievements
CREATE TABLE IF NOT EXISTS achievement_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL,
    achievement_type_id UUID REFERENCES achievement_types(id) ON DELETE CASCADE,
    current_progress INTEGER DEFAULT 0,
    target_progress INTEGER NOT NULL,
    progress_data JSONB, -- Detailed progress tracking
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_address, achievement_type_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievement_types_category ON achievement_types(category);
CREATE INDEX IF NOT EXISTS idx_achievement_types_active ON achievement_types(is_active);

CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_address);
CREATE INDEX IF NOT EXISTS idx_player_achievements_unlocked_at ON player_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_achievements_notified ON player_achievements(notified);

CREATE INDEX IF NOT EXISTS idx_zk_proof_claims_player ON zk_proof_claims(player_address);
CREATE INDEX IF NOT EXISTS idx_zk_proof_claims_nullifier ON zk_proof_claims(nullifier);
CREATE INDEX IF NOT EXISTS idx_zk_proof_claims_status ON zk_proof_claims(verification_status);
CREATE INDEX IF NOT EXISTS idx_zk_proof_claims_created_at ON zk_proof_claims(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_player ON achievement_progress(player_address);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_type ON achievement_progress(achievement_type_id);

-- Insert default achievement types
INSERT INTO achievement_types (name, description, category, requirements, rewards, sort_order) VALUES 
-- Gameplay achievements
('First Steps', 'Complete your first run', 'gameplay', '{"runs_completed": 1}', '{"badge_boost": 1.1}', 1),
('Runner', 'Complete 5 runs', 'gameplay', '{"runs_completed": 5}', '{"badge_boost": 1.15}', 2),
('Marathon Runner', 'Complete 25 runs', 'gameplay', '{"runs_completed": 25}', '{"badge_boost": 1.25}', 3),
('Speed Demon', 'Complete a run in under 30 seconds', 'gameplay', '{"min_duration": 30}', '{"special_badge": "speed"}', 4),
('Endurance Master', 'Complete a run lasting over 5 minutes', 'gameplay', '{"max_duration": 300}', '{"special_badge": "endurance"}', 5),
('High Scorer', 'Earn 100+ XP in a single run', 'gameplay', '{"min_xp_single_run": 100}', '{"badge_boost": 1.2}', 6),
('Perfectionist', 'Complete 10 runs without using bonus throws', 'gameplay', '{"runs_no_bonus": 10}', '{"special_badge": "perfect"}', 7),

-- Collection achievements
('Badge Collector', 'Collect your first badge', 'collection', '{"badges_earned": 1}', '{"badge_boost": 1.05}', 10),
('Badge Hunter', 'Collect 5 badges', 'collection', '{"badges_earned": 5}', '{"badge_boost": 1.1}', 11),
('Badge Master', 'Collect 25 badges', 'collection', '{"badges_earned": 25}', '{"badge_boost": 1.2}', 12),
('Legendary Collector', 'Collect a Legendary badge', 'collection', '{"legendary_badges": 1}', '{"special_badge": "legendary_collector"}', 13),
('Full House', 'Collect all 5 badge types', 'collection', '{"badge_types_collected": 5}', '{"special_badge": "completionist"}', 14),

-- Social achievements
('Early Adopter', 'Be among the first 100 players', 'social', '{"player_rank": 100}', '{"special_badge": "early_adopter"}', 20),
('Community Member', 'Connect wallet and complete profile', 'social', '{"profile_complete": true}', '{"badge_boost": 1.05}', 21),

-- Special/Secret achievements
('Lucky Seven', 'Complete exactly 7 runs on your 7th day', 'special', '{"runs_on_day_7": 7}', '{"special_badge": "lucky_seven"}', 30),
('Night Owl', 'Complete a run between midnight and 6 AM', 'special', '{"night_run": true}', '{"special_badge": "night_owl"}', 31)
ON CONFLICT (name) DO NOTHING;

-- Trigger to update achievement_progress when player_achievements are unlocked
CREATE OR REPLACE FUNCTION update_achievement_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove progress tracking when achievement is unlocked
    DELETE FROM achievement_progress 
    WHERE player_address = NEW.player_address 
    AND achievement_type_id = NEW.achievement_type_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_achievement_progress
    AFTER INSERT ON player_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_achievement_progress();

-- Function to get player achievement summary
CREATE OR REPLACE FUNCTION get_player_achievement_summary(player_addr VARCHAR(42))
RETURNS TABLE (
    total_achievements INTEGER,
    achievements_by_category JSONB,
    recent_achievements JSONB,
    completion_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(pa.id)::INTEGER as total_achievements,
        jsonb_object_agg(at.category, COUNT(pa.id)) as achievements_by_category,
        jsonb_agg(
            jsonb_build_object(
                'name', at.name,
                'unlocked_at', pa.unlocked_at,
                'category', at.category
            ) ORDER BY pa.unlocked_at DESC
        ) FILTER (WHERE pa.unlocked_at >= NOW() - INTERVAL '7 days') as recent_achievements,
        (COUNT(pa.id)::DECIMAL / (SELECT COUNT(*) FROM achievement_types WHERE is_active = true) * 100) as completion_percentage
    FROM player_achievements pa
    JOIN achievement_types at ON pa.achievement_type_id = at.id
    WHERE pa.player_address = player_addr;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE achievement_types IS 'Defines all possible achievements with flexible requirements';
COMMENT ON TABLE player_achievements IS 'Tracks unlocked achievements per player';
COMMENT ON TABLE zk_proof_claims IS 'Manages ZK-proof claims and verification status';
COMMENT ON TABLE achievement_progress IS 'Tracks incremental progress towards achievements';

COMMENT ON COLUMN achievement_types.requirements IS 'JSON object defining unlock conditions (e.g., {"runs_completed": 5})';
COMMENT ON COLUMN achievement_types.rewards IS 'JSON object defining achievement rewards (e.g., {"badge_boost": 1.2})';
COMMENT ON COLUMN zk_proof_claims.nullifier IS 'Unique nullifier to prevent replay attacks';
COMMENT ON COLUMN zk_proof_claims.proof_data IS 'ZK-SNARK proof components for verification';