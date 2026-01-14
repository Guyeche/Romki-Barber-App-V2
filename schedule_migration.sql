-- Create the work_schedule table
CREATE TABLE IF NOT EXISTS work_schedule (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    day_of_week INT NOT NULL UNIQUE, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '19:00',
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE work_schedule ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON work_schedule TO anon, authenticated;
GRANT ALL ON work_schedule TO service_role;
GRANT ALL ON work_schedule TO "admin";

-- Policies
CREATE POLICY "Public read schedule" 
ON work_schedule FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Admin full access schedule" 
ON work_schedule FOR ALL 
TO service_role, "admin"
USING (true) 
WITH CHECK (true);

-- Seed data (Default: Sun-Thu 09:00-19:00, Fri 09:00-14:00, Sat Closed)
INSERT INTO work_schedule (day_of_week, start_time, end_time, is_active) 
VALUES 
(0, '09:00', '19:00', true),
(1, '09:00', '19:00', true),
(2, '09:00', '19:00', true),
(3, '09:00', '19:00', true),
(4, '09:00', '19:00', true),
(5, '09:00', '14:00', true),
(6, '09:00', '19:00', false)
ON CONFLICT (day_of_week) DO NOTHING;
