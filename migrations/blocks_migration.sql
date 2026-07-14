-- Create the schedule_blocks table
-- A "block" is a chunk of time REMOVED from an otherwise-open working day.
-- It is EITHER recurring (day_of_week set) OR one-off (date set), never both.
-- This is additive: it does not touch appointments, work_schedule, or blocked_days.
CREATE TABLE IF NOT EXISTS schedule_blocks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    day_of_week INT,              -- 0=Sunday..6=Saturday. Set for RECURRING breaks.
    date DATE,                    -- YYYY-MM-DD. Set for ONE-OFF blocks.
    start_time TIME NOT NULL,     -- e.g. 13:00
    end_time TIME NOT NULL,       -- e.g. 14:00
    reason TEXT,                  -- optional label ("Lunch", "Dentist")
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Exactly one of (day_of_week, date) must be set.
    CONSTRAINT blocks_one_kind CHECK (
        (day_of_week IS NOT NULL AND date IS NULL) OR
        (day_of_week IS NULL AND date IS NOT NULL)
    ),
    CONSTRAINT blocks_valid_range CHECK (end_time > start_time)
);

-- Indexes for the two lookup paths (by weekday, by date)
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dow ON schedule_blocks (day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks (date);

-- Enable RLS (same pattern as work_schedule)
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON schedule_blocks TO anon, authenticated;
GRANT ALL ON schedule_blocks TO service_role;
GRANT ALL ON schedule_blocks TO "admin";

-- Policies
CREATE POLICY "Public read blocks"
ON schedule_blocks FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin full access blocks"
ON schedule_blocks FOR ALL
TO service_role, "admin"
USING (true)
WITH CHECK (true);
