-- Row Level Security (RLS) Setup for HamBaller.xyz
-- Run this in Supabase SQL Editor after importing the main schema

-- Enable RLS on all tables
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for leaderboards and game data
CREATE POLICY "Public read access for run_logs" ON run_logs 
FOR SELECT USING (true);

CREATE POLICY "Public read access for replays" ON replays 
FOR SELECT USING (true);

CREATE POLICY "Public read access for player_stats" ON player_stats 
FOR SELECT USING (true);

-- Service role full access (for backend API)
CREATE POLICY "Service role full access to run_logs" ON run_logs 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to replays" ON replays 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to player_stats" ON player_stats 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to event_logs" ON event_logs 
FOR ALL USING (auth.role() = 'service_role');

-- Optional: Allow authenticated users to insert their own game data
-- Uncomment if you want player-initiated data writes
/*
CREATE POLICY "Users can insert their own runs" ON run_logs 
FOR INSERT WITH CHECK (auth.uid()::text = player_address);

CREATE POLICY "Users can view their own stats" ON player_stats 
FOR SELECT USING (auth.uid()::text = player_address);
*/
