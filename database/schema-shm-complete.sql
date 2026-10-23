-- ========================================================================
-- SHM (Scout Management System) - Complete Database Schema
-- Designed for split architecture: Admin writing + Public reading
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================================
-- 1. REPORTS TABLE
-- ========================================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT,
  time TIMESTAMPTZ,
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_responsible ON reports(responsible);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(location);
CREATE INDEX IF NOT EXISTS idx_reports_time ON reports(time DESC);

-- Add table comment
COMMENT ON TABLE reports IS 'Stores Scout activity reports with participants, evaluation, and recommendations';

-- ========================================================================
-- 2. SESSIONS TABLE
-- ========================================================================
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_date_time ON sessions(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_location ON sessions(location);
CREATE INDEX IF NOT EXISTS idx_sessions_target_audience ON sessions(target_audience);

-- Add table comment
COMMENT ON TABLE sessions IS 'Stores Scout training sessions with methodology and objectives';

-- ========================================================================
-- 3. MEMBERS TABLE (for public website)
-- ========================================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  team TEXT,
  profile_photo TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_team ON members(team);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- Add table comment
COMMENT ON TABLE members IS 'Stores Scout member profiles with contact and team information';

-- ========================================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER FUNCTION
-- ========================================================================
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

-- Apply trigger to members table
DROP TRIGGER IF EXISTS update_members_timestamp ON members;
CREATE TRIGGER update_members_timestamp
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ========================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

-- Enable RLS on all tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ---- REPORTS TABLE POLICIES ----
-- Policy 1: Allow public users to SELECT (read) all reports
CREATE POLICY "reports_select_public" ON reports
  FOR SELECT USING (true);

-- Policy 2: Allow INSERT only for authenticated users (will be admin in practice)
CREATE POLICY "reports_insert_authenticated" ON reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow UPDATE for report owner/admin
CREATE POLICY "reports_update_authenticated" ON reports
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow DELETE for authenticated users (will be admin in practice)
CREATE POLICY "reports_delete_authenticated" ON reports
  FOR DELETE USING (auth.role() = 'authenticated');

-- ---- SESSIONS TABLE POLICIES ----
-- Policy 1: Allow public users to SELECT (read) all sessions
CREATE POLICY "sessions_select_public" ON sessions
  FOR SELECT USING (true);

-- Policy 2: Allow INSERT only for authenticated users (will be admin)
CREATE POLICY "sessions_insert_authenticated" ON sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow UPDATE for authenticated users
CREATE POLICY "sessions_update_authenticated" ON sessions
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow DELETE for authenticated users
CREATE POLICY "sessions_delete_authenticated" ON sessions
  FOR DELETE USING (auth.role() = 'authenticated');

-- ---- MEMBERS TABLE POLICIES ----
-- Policy 1: Allow public SELECT for member profiles
CREATE POLICY "members_select_public" ON members
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to create their own profile
CREATE POLICY "members_insert_authenticated" ON members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Policy 3: Allow users to update their own profile
CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow users to view their own profile
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (auth.uid() = user_id OR true);

-- ========================================================================
-- 6. VIEWS FOR EASIER QUERYING
-- ========================================================================

-- View: Reports Summary with total participants count
CREATE OR REPLACE VIEW reports_summary AS
SELECT 
  id,
  title,
  location,
  time,
  objective,
  (participants_boys + participants_girls + leaders_count) as total_participants,
  participants_boys,
  participants_girls,
  leaders_count,
  category,
  responsible,
  created_at,
  updated_at,
  pdf_url
FROM reports
ORDER BY time DESC NULLS LAST;

-- View: Upcoming Sessions (future sessions only)
CREATE OR REPLACE VIEW upcoming_sessions AS
SELECT 
  id,
  title,
  location,
  date_time,
  target_audience,
  objective,
  pdf_url,
  created_at
FROM sessions
WHERE date_time >= NOW()
ORDER BY date_time ASC;

-- View: Past Sessions (historical sessions)
CREATE OR REPLACE VIEW past_sessions AS
SELECT 
  id,
  title,
  location,
  date_time,
  target_audience,
  objective,
  pdf_url,
  created_at
FROM sessions
WHERE date_time < NOW()
ORDER BY date_time DESC;

-- View: Active Members (with complete profile info)
CREATE OR REPLACE VIEW active_members AS
SELECT 
  id,
  user_id,
  full_name,
  role,
  phone,
  email,
  team,
  profile_photo,
  bio,
  created_at
FROM members
ORDER BY team, full_name;

-- ========================================================================
-- 7. SAMPLE DATA (OPTIONAL - For Testing)
-- ========================================================================
-- Uncomment to insert sample data

/*
-- Insert sample reports
INSERT INTO reports (title, location, time, objective, participants_boys, participants_girls, leaders_count, responsible, category, description_original)
VALUES 
  ('نشاط التخييم الصيفي', 'الشاطئ', NOW() - INTERVAL '7 days', 'تدريب مهارات التخييم', 15, 12, 3, 'أحمد محمد', 'تدريب', 'نشاط تخييم ناجح مع جميع الكشافين'),
  ('جلسة تعليمية عن العقد', 'مركز الكشافة', NOW() - INTERVAL '3 days', 'تعليم العقد والحبال', 20, 18, 2, 'فاطمة علي', 'تعليم', 'جلسة تعليمية عن أنواع العقد المختلفة');

-- Insert sample sessions
INSERT INTO sessions (title, date_time, location, target_audience, objective, methodology_original)
VALUES 
  ('برنامج تطوير القيادة', NOW() + INTERVAL '15 days', 'مركز التدريب', 'الكشافين المتقدمين', 'تطوير مهارات القيادة', 'محاضرة وورش عملية تفاعلية'),
  ('برنامج البيئة والاستدامة', NOW() + INTERVAL '30 days', 'الحديقة العامة', 'جميع الكشافين', 'نشر الوعي البيئي', 'نشاط عملي في الطبيعة');

-- Insert sample members
INSERT INTO members (full_name, role, phone, email, team, bio)
VALUES 
  ('أحمد محمد', 'قائد الفريق', '+212 612345678', 'ahmed@example.com', 'الفريق الأول', 'قائد الفريق الأول مع خبرة 5 سنوات'),
  ('فاطمة علي', 'مسؤول التدريب', '+212 698765432', 'fatima@example.com', 'التدريب', 'مسؤول التدريب والتطوير');
*/

-- ========================================================================
-- 8. STORAGE BUCKET CONFIGURATION (for PDF files)
-- ========================================================================
-- Note: Execute this in Supabase dashboard > Storage section
-- Create a bucket for PDFs with public access for reading

/*
-- SQL to create storage bucket (execute in Supabase SQL Editor):
-- Note: Buckets are usually created via Supabase UI, not SQL
-- But you can manage their policies with SQL:

-- Create policy to allow public read access to PDF files
CREATE POLICY "Public read access to PDFs" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports-pdfs');

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated upload to PDFs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reports-pdfs' AND auth.role() = 'authenticated');
*/

-- ========================================================================
-- NOTES FOR IMPLEMENTATION
-- ========================================================================
/*
ARCHITECTURE OVERVIEW:

SITE 1 - ADMIN INTERFACE (Writing):
- Uses Supabase service role key or authenticated admin users
- Can perform full CRUD on reports and sessions
- No restrictions - direct database access for admin users
- Private, not publicly accessible

SITE 2 - PUBLIC WEBSITE (Reading + Member Management):
- Uses Supabase anon key with RLS policies
- Can read reports and sessions (public SELECT allowed)
- Can create/update member profiles (authenticated users only)
- Publicly accessible with read-only restrictions

DATABASE FLOW:
1. Admin creates/edits reports and sessions in Site 1
2. Data is stored in Supabase database
3. Site 2 queries and displays this data via RLS policies
4. Users on Site 2 can manage their own member profiles

NEXT STEPS:
1. Execute this SQL in Supabase SQL Editor
2. Create admin panel interface (Site 1)
3. Create public-facing pages in Site 2 to display reports/sessions
4. Implement member profile management in Site 2
5. Set up storage bucket for PDF files
*/
