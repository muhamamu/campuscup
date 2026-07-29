-- Add missing columns to standings table
ALTER TABLE standings ADD COLUMN IF NOT EXISTS team_short_code TEXT;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS team_logo_bg TEXT;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS team_logo_text TEXT;
