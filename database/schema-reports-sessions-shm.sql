-- ============================================
-- SCOUTISME HASSANIA SAFI - REPORTS & SESSIONS SCHEMA
-- SITE 2: Reports and Sessions Management
-- Version: 2.0.0
-- ============================================
-- This schema manages:
-- - Activity reports (with evaluation and recommendations)
-- - Training sessions (with methodology)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ========== BASIC INFO ==========
  title TEXT NOT NULL,
  location TEXT,
  time TEXT,
  objective TEXT,
  category TEXT,
  beneficiary TEXT,
  responsible TEXT,
  
  -- ========== PARTICIPANTS ==========
  participants_boys INTEGER DEFAULT 0,
  participants_girls INTEGER DEFAULT 0,
  leaders_count INTEGER DEFAULT 0,
  
  -- ========== CONTENT ==========
  description_original TEXT,
  description_reformulated TEXT,
  
  -- ========== EVALUATION ==========
  evaluation_positive TEXT,
  evaluation_negative TEXT,
  recommendations TEXT,
  
  -- ========== GENERATED DOCUMENT ==========
  pdf_url TEXT,
  
  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'Activity Reports (التقارير)';
COMMENT ON COLUMN reports.id IS 'Unique report identifier (UUID)';
COMMENT ON COLUMN reports.title IS 'Report title';
COMMENT ON COLUMN reports.objective IS 'Activity objective';
COMMENT ON COLUMN reports.description_original IS 'Original description (raw input)';
COMMENT ON COLUMN reports.description_reformulated IS 'Reformulated description (cleaned/improved)';
COMMENT ON COLUMN reports.evaluation_positive IS 'Positive aspects of the activity';
COMMENT ON COLUMN reports.evaluation_negative IS 'Negative aspects of the activity';
COMMENT ON COLUMN reports.recommendations IS 'Recommendations for improvement';
COMMENT ON COLUMN reports.pdf_url IS 'URL to generated PDF report';

CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_responsible ON reports(responsible);
CREATE INDEX idx_reports_location ON reports(location);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ========== BASIC INFO ==========
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ,
  location TEXT,
  target_audience TEXT,
  objective TEXT,
  
  -- ========== METHODOLOGY ==========
  methodology_original TEXT,
  methodology_reformulated TEXT,
  
  -- ========== GENERATED DOCUMENT ==========
  pdf_url TEXT,
  
  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Training Sessions (الجلسات التدريبية)';
COMMENT ON COLUMN sessions.id IS 'Unique session identifier (UUID)';
COMMENT ON COLUMN sessions.title IS 'Session title';
COMMENT ON COLUMN sessions.target_audience IS 'Target audience for the session';
COMMENT ON COLUMN sessions.objective IS 'Session learning objective';
COMMENT ON COLUMN sessions.methodology_original IS 'Original methodology description';
COMMENT ON COLUMN sessions.methodology_reformulated IS 'Reformulated methodology (improved)';
COMMENT ON COLUMN sessions.pdf_url IS 'URL to generated PDF session document';

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_date_time ON sessions(date_time DESC);
CREATE INDEX idx_sessions_location ON sessions(location);

-- ============================================
-- FUNCTION: Update Timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column_reports()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_reports();

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_reports();

-- ============================================
-- VIEW: Reports with Statistics
-- ============================================
CREATE OR REPLACE VIEW reports_with_stats AS
SELECT
  r.id,
  r.title,
  r.location,
  r.time,
  r.category,
  r.responsible,
  r.participants_boys,
  r.participants_girls,
  (r.participants_boys + r.participants_girls) as total_participants,
  r.leaders_count,
  r.objective,
  r.evaluation_positive,
  r.evaluation_negative,
  r.recommendations,
  r.pdf_url,
  r.created_at,
  r.updated_at
FROM reports r;

COMMENT ON VIEW reports_with_stats IS 'Reports with calculated participant statistics';

-- ============================================
-- VIEW: Sessions Overview
-- ============================================
CREATE OR REPLACE VIEW sessions_overview AS
SELECT
  s.id,
  s.title,
  s.date_time,
  s.location,
  s.target_audience,
  s.objective,
  s.methodology_original,
  s.methodology_reformulated,
  s.pdf_url,
  s.created_at,
  s.updated_at,
  EXTRACT(EPOCH FROM (NOW() - s.date_time))/3600 as hours_since_session
FROM sessions s;

COMMENT ON VIEW sessions_overview IS 'Overview of all training sessions with time calculations';

-- ============================================
-- END OF REPORTS & SESSIONS SCHEMA
-- ============================================
