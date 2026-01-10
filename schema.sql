
-- Create the appointments table
CREATE TABLE appointments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status TEXT DEFAULT 'pending',
    event_id TEXT, -- For Google Calendar Event ID
    UNIQUE (date, time) -- Prevent double booking
);

-- Create the blocked_days table
CREATE TABLE blocked_days (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    date DATE NOT NULL UNIQUE,
    reason TEXT
);

-- Enable Row Level Security (RLS) on the tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;

-- Create roles
CREATE ROLE "admin";


-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO "admin";
GRANT SELECT, INSERT ON appointments TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON blocked_days TO "admin";
GRANT SELECT ON blocked_days TO "anon"; -- Allow anon users to see blocked days

-- RLS Policies for appointments table
CREATE POLICY "Public can insert appointments"
ON appointments
FOR INSERT
TO "anon"
WITH CHECK (true);

CREATE POLICY "Admin can do everything on appointments"
ON appointments
FOR ALL
TO "admin"
USING (true)
WITH CHECK (true);

-- RLS Policies for blocked_days table
CREATE POLICY "Admin can do everything on blocked_days"
ON blocked_days
FOR ALL
TO "admin"
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
ON blocked_days
FOR SELECT
TO "anon"
USING (true);
