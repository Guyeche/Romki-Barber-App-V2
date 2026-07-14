-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT SELECT ON app_settings TO anon, authenticated;
GRANT ALL ON app_settings TO service_role;
GRANT ALL ON app_settings TO "admin";

-- Policies
CREATE POLICY "Public read settings" 
ON app_settings FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Admin full access settings" 
ON app_settings FOR ALL 
TO service_role, "admin" 
USING (true) 
WITH CHECK (true);

-- Default: 14 days (2 weeks)
INSERT INTO app_settings (key, value) VALUES ('booking_window_days', '14') ON CONFLICT DO NOTHING;
