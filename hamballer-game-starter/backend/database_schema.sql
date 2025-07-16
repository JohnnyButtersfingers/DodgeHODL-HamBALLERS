-- HamBaller.xyz Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run logs table
CREATE TABLE IF NOT EXISTS run_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_address VARCHAR(42) NOT NULL, -- Ethereum address
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    cp_earned INTEGER DEFAULT 0,
    dbp_minted DECIMAL DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
    bonus_throw_used BOOLEAN DEFAULT FALSE,
    boosts_used INTEGER[] DEFAULT '{}',
    seed VARCHAR(66), -- Hex string for random seed
    duration INTEGER DEFAULT 0, -- Duration in seconds
    xp_badge_token_id INTEGER, -- XPBadge NFT token ID (if minted)
    xp_badge_tx_hash VARCHAR(66), -- Transaction hash for XPBadge mint
    xp_badge_minted_at TIMESTAMPTZ, -- When the XPBadge was minted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Replays table for storing game replay data
CREATE TABLE IF NOT EXISTS replays (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    run_id UUID REFERENCES run_logs(id) ON DELETE CASCADE,
    player_address VARCHAR(42) NOT NULL,
    replay_data JSONB NOT NULL, -- Store game state snapshots
    duration INTEGER NOT NULL,
    cp_earned INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player statistics aggregate table (optional optimization)
CREATE TABLE IF NOT EXISTS player_stats (
    player_address VARCHAR(42) PRIMARY KEY,
    total_runs INTEGER DEFAULT 0,
    completed_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    total_cp_earned BIGINT DEFAULT 0,
    total_dbp_earned DECIMAL DEFAULT 0,
    best_run_cp INTEGER DEFAULT 0,
    longest_run_time INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    first_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event logs table for tracking all game events
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    player_address VARCHAR(42),
    event_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_run_logs_player_address ON run_logs(player_address);
CREATE INDEX IF NOT EXISTS idx_run_logs_created_at ON run_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_logs_status ON run_logs(status);
CREATE INDEX IF NOT EXISTS idx_run_logs_cp_earned ON run_logs(cp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_run_logs_duration ON run_logs(duration DESC);

CREATE INDEX IF NOT EXISTS idx_replays_player_address ON replays(player_address);
CREATE INDEX IF NOT EXISTS idx_replays_created_at ON replays(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replays_run_id ON replays(run_id);

CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_player_address ON event_logs(player_address);
CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs(timestamp DESC);

-- Trigger to update player stats automatically
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update player_stats when a run is completed or failed
    INSERT INTO player_stats (
        player_address,
        total_runs,
        completed_runs,
        failed_runs,
        total_cp_earned,
        total_dbp_earned,
        best_run_cp,
        longest_run_time,
        first_run_at,
        last_run_at
    )
    SELECT 
        NEW.player_address,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        COALESCE(SUM(cp_earned), 0),
        COALESCE(SUM(dbp_minted), 0),
        COALESCE(MAX(cp_earned), 0),
        COALESCE(MAX(duration), 0),
        MIN(created_at),
        MAX(created_at)
    FROM run_logs 
    WHERE player_address = NEW.player_address
    ON CONFLICT (player_address) 
    DO UPDATE SET
        total_runs = EXCLUDED.total_runs,
        completed_runs = EXCLUDED.completed_runs,
        failed_runs = EXCLUDED.failed_runs,
        total_cp_earned = EXCLUDED.total_cp_earned,
        total_dbp_earned = EXCLUDED.total_dbp_earned,
        best_run_cp = GREATEST(player_stats.best_run_cp, EXCLUDED.best_run_cp),
        longest_run_time = GREATEST(player_stats.longest_run_time, EXCLUDED.longest_run_time),
        last_run_at = EXCLUDED.last_run_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_player_stats ON run_logs;
CREATE TRIGGER trigger_update_player_stats
    AFTER INSERT OR UPDATE ON run_logs
    FOR EACH ROW
    WHEN (NEW.status IN ('completed', 'failed'))
    EXECUTE FUNCTION update_player_stats();

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard(
    order_by TEXT DEFAULT 'cp_earned',
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    player_address VARCHAR(42),
    cp_earned INTEGER,
    dbp_minted DECIMAL,
    duration INTEGER,
    created_at TIMESTAMPTZ,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rl.player_address,
        rl.cp_earned,
        rl.dbp_minted,
        rl.duration,
        rl.created_at,
        ROW_NUMBER() OVER (ORDER BY 
            CASE 
                WHEN order_by = 'cp_earned' THEN rl.cp_earned 
                WHEN order_by = 'duration' THEN rl.duration
                ELSE rl.cp_earned
            END DESC
        ) as rank
    FROM run_logs rl
    WHERE rl.status = 'completed'
    ORDER BY 
        CASE 
            WHEN order_by = 'cp_earned' THEN rl.cp_earned 
            WHEN order_by = 'duration' THEN rl.duration
            ELSE rl.cp_earned
        END DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get player statistics
CREATE OR REPLACE FUNCTION get_player_dashboard(
    input_player_address VARCHAR(42)
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'stats', (
            SELECT json_build_object(
                'totalRuns', COALESCE(total_runs, 0),
                'completedRuns', COALESCE(completed_runs, 0),
                'failedRuns', COALESCE(failed_runs, 0),
                'totalCPEarned', COALESCE(total_cp_earned, 0),
                'totalDBPEarned', COALESCE(total_dbp_earned, 0),
                'bestRunCP', COALESCE(best_run_cp, 0),
                'longestRunTime', COALESCE(longest_run_time, 0),
                'currentStreak', COALESCE(current_streak, 0),
                'bestStreak', COALESCE(best_streak, 0),
                'winRate', CASE 
                    WHEN COALESCE(total_runs, 0) > 0 
                    THEN ROUND((COALESCE(completed_runs, 0)::DECIMAL / total_runs) * 100, 1)
                    ELSE 0 
                END
            )
            FROM player_stats ps 
            WHERE ps.player_address = input_player_address
        ),
        'recentRuns', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'cpEarned', cp_earned,
                    'dbpMinted', dbp_minted,
                    'duration', duration,
                    'status', status,
                    'bonusThrowUsed', bonus_throw_used,
                    'createdAt', created_at
                )
                ORDER BY created_at DESC
            )
            FROM (
                SELECT * FROM run_logs 
                WHERE player_address = input_player_address 
                ORDER BY created_at DESC 
                LIMIT 10
            ) recent
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Policies for public read access (adjust based on your security needs)
CREATE POLICY "Public read access" ON run_logs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON replays FOR SELECT USING (true);
CREATE POLICY "Public read access" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON event_logs FOR SELECT USING (true);

-- Insert policies (you may want to restrict these in production)
CREATE POLICY "Public insert access" ON run_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON replays FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON event_logs FOR INSERT WITH CHECK (true);

-- Sample data for testing (optional)
-- INSERT INTO run_logs (player_address, start_time, end_time, cp_earned, dbp_minted, status, duration) VALUES
-- ('0x742d35Cc6634C0532925a3b8D5c3Ba4F8b0A87F6', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '58 minutes', 450, 45, 'completed', 120),
-- ('0x8ba1f109551bD432803012645Hac136c60B1bb0f', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '118 minutes', 320, 32, 'completed', 98),
-- ('0x742d35Cc6634C0532925a3b8D5c3Ba4F8b0A87F6', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '177 minutes', 180, 18, 'failed', 45);

-- Views for common queries
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_runs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
    AVG(cp_earned) FILTER (WHERE status = 'completed') as avg_cp,
    AVG(duration) FILTER (WHERE status = 'completed') as avg_duration,
    COUNT(DISTINCT player_address) as unique_players
FROM run_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW top_players AS
SELECT 
    player_address,
    total_runs,
    completed_runs,
    total_cp_earned,
    total_dbp_earned,
    best_run_cp,
    ROUND((completed_runs::DECIMAL / NULLIF(total_runs, 0)) * 100, 1) as win_rate,
    ROW_NUMBER() OVER (ORDER BY total_cp_earned DESC) as rank
FROM player_stats
WHERE total_runs > 0
ORDER BY total_cp_earned DESC
LIMIT 100;
