-- Additional Supabase Functions for Enhanced XP Store
-- Run this after the main migration

-- Function to get player rank efficiently
CREATE OR REPLACE FUNCTION get_player_rank(player_addr TEXT)
RETURNS TABLE(rank BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT ROW_NUMBER() OVER (ORDER BY xp DESC) as rank
    FROM player_xp 
    WHERE player_address = player_addr;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive leaderboard stats
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalPlayers', COUNT(*),
        'totalXP', COALESCE(SUM(xp), 0),
        'averageXP', COALESCE(ROUND(AVG(xp)), 0),
        'highestXP', COALESCE(MAX(xp), 0),
        'lowestXP', COALESCE(MIN(xp), 0),
        'medianXP', COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY xp), 0),
        'topTenThreshold', COALESCE((
            SELECT xp FROM player_xp ORDER BY xp DESC OFFSET 9 LIMIT 1
        ), 0),
        'distributionByTier', (
            SELECT json_object_agg(tier, count) FROM (
                SELECT 
                    CASE 
                        WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) = 1 THEN 'legend'
                        WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 10 THEN 'master'
                        WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 50 THEN 'diamond'
                        WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 100 THEN 'gold'
                        WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 500 THEN 'silver'
                        ELSE 'bronze'
                    END as tier,
                    COUNT(*) as count
                FROM player_xp 
                WHERE xp > 0
                GROUP BY tier
            ) tier_counts
        ),
        'lastUpdated', NOW()
    ) INTO result
    FROM player_xp
    WHERE xp > 0;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get player achievements
CREATE OR REPLACE FUNCTION get_player_achievements(player_addr TEXT)
RETURNS TABLE(
    achievement_key VARCHAR(50),
    name VARCHAR(100),
    description TEXT,
    rarity VARCHAR(20),
    earned_at TIMESTAMPTZ,
    icon_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.achievement_key,
        a.name,
        a.description,
        a.rarity,
        pa.earned_at,
        a.icon_url
    FROM player_achievements pa
    JOIN xp_achievements a ON pa.achievement_key = a.achievement_key
    WHERE pa.player_address = player_addr
    ORDER BY pa.earned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(player_addr TEXT)
RETURNS TABLE(
    achievement_key VARCHAR(50),
    newly_earned BOOLEAN
) AS $$
DECLARE
    player_xp_amount BIGINT;
    player_rank_num INTEGER;
    achievement RECORD;
    already_earned BOOLEAN;
BEGIN
    -- Get player's current XP and rank
    SELECT xp INTO player_xp_amount FROM player_xp WHERE player_address = player_addr;
    
    SELECT rank INTO player_rank_num FROM (
        SELECT ROW_NUMBER() OVER (ORDER BY xp DESC) as rank, player_address
        FROM player_xp
    ) ranked WHERE player_address = player_addr;
    
    -- Check each achievement
    FOR achievement IN 
        SELECT * FROM xp_achievements WHERE is_active = true
    LOOP
        -- Check if player qualifies for this achievement
        IF (achievement.xp_threshold IS NOT NULL AND player_xp_amount >= achievement.xp_threshold) OR
           (achievement.rank_threshold IS NOT NULL AND player_rank_num <= achievement.rank_threshold) THEN
            
            -- Check if already earned
            SELECT EXISTS(
                SELECT 1 FROM player_achievements 
                WHERE player_address = player_addr AND achievement_key = achievement.achievement_key
            ) INTO already_earned;
            
            IF NOT already_earned THEN
                -- Award the achievement
                INSERT INTO player_achievements (player_address, achievement_key)
                VALUES (player_addr, achievement.achievement_key);
                
                RETURN QUERY SELECT achievement.achievement_key, true;
            ELSE
                RETURN QUERY SELECT achievement.achievement_key, false;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get XP history with pagination
CREATE OR REPLACE FUNCTION get_xp_history(
    player_addr TEXT,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    xp_change BIGINT,
    previous_xp BIGINT,
    new_xp BIGINT,
    change_reason VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    offset_amount INTEGER;
BEGIN
    offset_amount := (page_num - 1) * page_size;
    
    RETURN QUERY
    SELECT 
        h.id,
        h.xp_change,
        h.previous_xp,
        h.new_xp,
        h.change_reason,
        h.metadata,
        h.created_at
    FROM xp_history h
    WHERE h.player_address = player_addr
    ORDER BY h.created_at DESC
    OFFSET offset_amount
    LIMIT page_size;
END;
$$ LANGUAGE plpgsql;

-- Function to get top players by time period
CREATE OR REPLACE FUNCTION get_top_players_by_period(
    time_period INTERVAL DEFAULT '7 days',
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    player_address VARCHAR(42),
    xp BIGINT,
    xp_gained BIGINT,
    rank_change INTEGER,
    current_rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_changes AS (
        SELECT 
            h.player_address,
            SUM(h.xp_change) as xp_gained
        FROM xp_history h
        WHERE h.created_at >= NOW() - time_period
        GROUP BY h.player_address
    ),
    current_rankings AS (
        SELECT 
            p.player_address,
            p.xp,
            ROW_NUMBER() OVER (ORDER BY p.xp DESC) as current_rank
        FROM player_xp p
    )
    SELECT 
        cr.player_address,
        cr.xp,
        COALESCE(rc.xp_gained, 0) as xp_gained,
        0 as rank_change, -- TODO: Calculate rank change
        cr.current_rank
    FROM current_rankings cr
    LEFT JOIN recent_changes rc ON cr.player_address = rc.player_address
    WHERE COALESCE(rc.xp_gained, 0) > 0
    ORDER BY rc.xp_gained DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate JSON data (helper for migration script)
CREATE OR REPLACE FUNCTION migrate_json_player(
    addr TEXT,
    xp_amount BIGINT,
    last_update TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO player_xp (player_address, xp, xp_source, last_xp_update, total_xp_earned)
    VALUES (addr, xp_amount, 'migration', last_update, xp_amount)
    ON CONFLICT (player_address) DO UPDATE SET
        xp = EXCLUDED.xp,
        xp_source = 'migration_update',
        last_xp_update = EXCLUDED.last_xp_update;
    
    -- Check and award achievements for migrated player
    PERFORM check_and_award_achievements(addr);
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk refresh leaderboard with better performance
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache_optimized()
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Use a more efficient approach with CTE
    WITH ranked_players AS (
        SELECT 
            player_address,
            xp,
            ROW_NUMBER() OVER (ORDER BY xp DESC) as rank,
            ROUND(
                100.0 * (RANK() OVER (ORDER BY xp ASC) - 1)::decimal / 
                GREATEST(COUNT(*) OVER (), 1)
            , 2) as percentile,
            CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) = 1 THEN 'legend'
                WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 10 THEN 'master'
                WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 50 THEN 'diamond'
                WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 100 THEN 'gold'
                WHEN ROW_NUMBER() OVER (ORDER BY xp DESC) <= 500 THEN 'silver'
                ELSE 'bronze'
            END as tier
        FROM player_xp
        WHERE xp > 0
    )
    INSERT INTO leaderboard_cache (player_address, xp, rank, percentile, tier, last_calculated)
    SELECT 
        player_address, 
        xp, 
        rank, 
        percentile, 
        tier, 
        NOW()
    FROM ranked_players
    ON CONFLICT (player_address) DO UPDATE SET
        xp = EXCLUDED.xp,
        rank = EXCLUDED.rank,
        percentile = EXCLUDED.percentile,
        tier = EXCLUDED.tier,
        last_calculated = EXCLUDED.last_calculated;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    RAISE NOTICE 'Leaderboard cache updated: % rows affected', rows_affected;
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for new functions
CREATE INDEX IF NOT EXISTS idx_xp_history_player_created ON xp_history(player_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_xp_xp_updated ON player_xp(xp DESC, updated_at);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_player_rank(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_leaderboard_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_player_achievements(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_and_award_achievements(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_xp_history(TEXT, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_players_by_period(INTERVAL, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION migrate_json_player(TEXT, BIGINT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard_cache_optimized() TO authenticated;