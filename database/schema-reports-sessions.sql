-- SQL Schema for SHM Reports and Sessions (Optimized for Supabase)
-- This schema is designed for a read-only interface that displays reports and sessions
-- Write operations are handled by a separate admin interface

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Table: reports
-- ==========================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT,
  time TEXT,
  objective TEXT,
  participants_boys INTEGER DEFAULT 0,
  participants_girls INTEGER DEFAULT 0,
  leaders_count INTEGER DEFAULT 0,
  responsible TEXT,
  category TEXT,
  beneficiary TEXT,
  description_original TEXT,
  description_reformulated TEXT,
  evaluation_positive TEXT,
  evaluation_negative TEXT,
  recommendations TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_responsible ON reports(responsible);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(location);

-- Add comment to table
COMMENT ON TABLE reports IS 'Stores all Scout activity reports with details about participants, evaluation, and recommendations';

-- ==========================================
-- 2. Table: sessions
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ,
  location TEXT,
  target_audience TEXT,
  objective TEXT,
  methodology_original TEXT,
  methodology_reformulated TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_date_time ON sessions(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_location ON sessions(location);
CREATE INDEX IF NOT EXISTS idx_sessions_target_audience ON sessions(target_audience);

-- Add comment to table
COMMENT ON TABLE sessions IS 'Stores Scout training sessions with methodology and objectives';

-- ==========================================
-- 3. Auto-update timestamps trigger function
-- ==========================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to reports table
DROP TRIGGER IF EXISTS update_reports_timestamp ON reports;
CREATE TRIGGER update_reports_timestamp
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Apply trigger to sessions table
DROP TRIGGER IF EXISTS update_sessions_timestamp ON sessions;
CREATE TRIGGER update_sessions_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ==========================================
-- 4. Row Level Security (RLS) Policies
-- ==========================================
-- Enable RLS on both tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Reports: Allow public read access
CREATE POLICY "Enable read access for all users" ON reports
  FOR SELECT USING (true);

-- Reports: Restrict write operations (only service role can write)
CREATE POLICY "Enable insert for service role only" ON reports
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Enable update for service role only" ON reports
  FOR UPDATE USING (false);

CREATE POLICY "Enable delete for service role only" ON reports
  FOR DELETE USING (false);

-- Sessions: Allow public read access
CREATE POLICY "Enable read access for all users" ON sessions
  FOR SELECT USING (true);

-- Sessions: Restrict write operations (only service role can write)
CREATE POLICY "Enable insert for service role only" ON sessions
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Enable update for service role only" ON sessions
  FOR UPDATE USING (false);

CREATE POLICY "Enable delete for service role only" ON sessions
  FOR DELETE USING (false);

-- ==========================================
-- 5. Sample Data (Optional - for testing)
-- ==========================================
-- Uncomment below to add sample data

/*
INSERT INTO reports (title, location, objective, participants_boys, participants_girls, leaders_count, responsible, category, description_original)
VALUES 
  ('نشاط التخييم الصيفي', 'الشاطئ', 'تدريب مهارات التخييم', 15, 12, 3, 'أحمد', 'تدريب', 'نشاط تخييم ناجح مع جميع الكشافين'),
  ('جلسة تعليمية', 'مركز الكشافة', 'تعليم العقد', 20, 18, 2, 'فاطمة', 'تعليم', 'جلسة تعليمية عن العقد والحبال');

INSERT INTO sessions (title, location, objective, target_audience, methodology_original)
VALUES 
  ('برنامج القيادة', 'مركز التدريب', 'تطوير مهارات القيادة', 'الكشافين المتقدمين', 'محاضرة وورش عملية');
*/

-- ==========================================
-- 6. Views for easier querying (Optional)
-- ==========================================

-- View for reports with participant totals
CREATE OR REPLACE VIEW reports_summary AS
SELECT 
  id,
  title,
  location,
  objective,
  (participants_boys + participants_girls + leaders_count) as total_participants,
  participants_boys,
  participants_girls,
  leaders_count,
  category,
  responsible,
  created_at,
  pdf_url
FROM reports
ORDER BY created_at DESC;

-- View for upcoming sessions
CREATE OR REPLACE VIEW upcoming_sessions AS
SELECT 
  id,
  title,
  location,
  date_time,
  target_audience,
  objective,
  pdf_url
FROM sessions
WHERE date_time >= NOW()
ORDER BY date_time ASC;

-- View for past sessions
CREATE OR REPLACE VIEW past_sessions AS
SELECT 
  id,
  title,
  location,
  date_time,
  target_audience,
  objective,
  pdf_url
FROM sessions
WHERE date_time < NOW()
ORDER BY date_time DESC;
