-- Create tables for match results and standings

-- Live Match table
CREATE TABLE IF NOT EXISTS live_match (
    id TEXT PRIMARY KEY,
    home_team_id TEXT,
    home_team_name TEXT,
    home_team_short_code TEXT,
    home_team_logo_bg TEXT,
    home_team_logo_text TEXT,
    away_team_id TEXT,
    away_team_name TEXT,
    away_team_short_code TEXT,
    away_team_logo_bg TEXT,
    away_team_logo_text TEXT,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    home_penalties INTEGER DEFAULT 0,
    away_penalties INTEGER DEFAULT 0,
    home_penalty_attempts JSONB DEFAULT '[]'::jsonb,
    away_penalty_attempts JSONB DEFAULT '[]'::jsonb,
    minute TEXT DEFAULT '0''',
    period TEXT,
    is_live BOOLEAN DEFAULT false,
    status TEXT,
    stopwatch INTEGER DEFAULT 0,
    stopwatch_start_time BIGINT,
    stats JSONB DEFAULT '{}'::jsonb,
    events JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match History table
CREATE TABLE IF NOT EXISTS match_history (
    id TEXT PRIMARY KEY,
    home_team_id TEXT,
    home_team_name TEXT,
    home_team_short_code TEXT,
    home_team_logo_bg TEXT,
    home_team_logo_text TEXT,
    away_team_id TEXT,
    away_team_name TEXT,
    away_team_short_code TEXT,
    away_team_logo_bg TEXT,
    away_team_logo_text TEXT,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    home_penalties INTEGER DEFAULT 0,
    away_penalties INTEGER DEFAULT 0,
    status TEXT,
    events JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Matches table
CREATE TABLE IF NOT EXISTS scheduled_matches (
    id TEXT PRIMARY KEY,
    home_team_id TEXT,
    home_team_name TEXT,
    home_team_short_code TEXT,
    home_team_logo_bg TEXT,
    home_team_logo_text TEXT,
    away_team_id TEXT,
    away_team_name TEXT,
    away_team_short_code TEXT,
    away_team_logo_bg TEXT,
    away_team_logo_text TEXT,
    match_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standings table
CREATE TABLE IF NOT EXISTS standings (
    team_id TEXT PRIMARY KEY,
    team_name TEXT,
    pos INTEGER,
    mp INTEGER DEFAULT 0,
    w INTEGER DEFAULT 0,
    d INTEGER DEFAULT 0,
    l INTEGER DEFAULT 0,
    gf INTEGER DEFAULT 0,
    ga INTEGER DEFAULT 0,
    gd INTEGER DEFAULT 0,
    pts INTEGER DEFAULT 0,
    form JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
