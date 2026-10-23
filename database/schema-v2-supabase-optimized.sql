-- ============================================
-- SCOUTISME HASSANIA SAFI - SUPABASE SCHEMA V2
-- OPTIMIZED FOR SUPABASE AUTH & PRODUCTION
-- Version: 2.0.0
-- ============================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PART 1: PATROLS TABLE (الدوريات)
-- ============================================
CREATE TABLE patrols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE patrols IS 'الدوريات - Scout Patrols';
COMMENT ON COLUMN patrols.id IS 'معرّف فريد (UUID)';
COMMENT ON COLUMN patrols.name IS 'اسم الدورية';

CREATE INDEX idx_patrols_name ON patrols(name);

-- ============================================
-- PART 2: ROLES TABLE (الأدوار)
-- ============================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'الأدوار - Scout Roles/Positions';
COMMENT ON COLUMN roles.id IS 'معرّف فريد (UUID)';
COMMENT ON COLUMN roles.name IS 'اسم الدور';

CREATE INDEX idx_roles_name ON roles(name);

-- ============================================
-- PART 3: USERS TABLE (الأعضاء)
-- Linked directly to Supabase Auth
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(), -- Linked to Supabase Auth
  
  -- Generated ID (E0001 for male, F0001 for female)
  generated_id VARCHAR(10) NOT NULL UNIQUE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')) NOT NULL,
  
  -- Scout Assignment
  patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE RESTRICT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_high_patrol BOOLEAN DEFAULT FALSE,
  
  -- Contact Information
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  
  -- Guardian/Parent Information (Optional - NO UNIQUE constraints)
  parent_first_name VARCHAR(100),
  parent_last_name VARCHAR(100),
  parent_phone VARCHAR(15), -- NOT UNIQUE - Multiple children can share parent phone
  parent_email VARCHAR(150), -- NOT UNIQUE - Multiple children can share parent email
  parent_cin VARCHAR(20),
  parent_type VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_age CHECK (
    EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 12 AND 20
  ),
  CONSTRAINT valid_phone CHECK (
    phone ~ '^(\+212|0)[0-9]{9}$'
  ),
  CONSTRAINT valid_email CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

COMMENT ON TABLE users IS 'أعضاء الكشافة - Scout Members (Linked to Supabase Auth)';
COMMENT ON COLUMN users.id IS 'معرّف مطابق لـ auth.uid()';
COMMENT ON COLUMN users.generated_id IS 'معرّف مولد: E0001-E9999 (ذكور)، F0001-F9999 (إناث)';
COMMENT ON COLUMN users.birth_date IS 'تاريخ الميلاد - يجب أن يكون بين 12 و 15 سنة';
COMMENT ON COLUMN users.phone IS 'رقم الهاتف بصيغة مغربية +212 أو 0212';
COMMENT ON COLUMN users.email IS 'البريد الإلكتروني بصيغة صحيحة';
COMMENT ON COLUMN users.parent_phone IS 'هاتف الولي (ليس فريد - قد يشترك عدة أطفال)';

-- Create Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_patrol_id ON users(patrol_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_generated_id ON users(generated_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_updated_at ON users(updated_at DESC);

-- ============================================
-- PART 4: FUNCTION TO GENERATE USER ID
-- Automatically generates E0001/F0001 on insert
-- ============================================
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS TRIGGER AS $$
DECLARE
  next_counter INT;
  prefix VARCHAR(1);
BEGIN
  -- Determine prefix based on gender
  prefix := CASE 
    WHEN NEW.gender = 'male' THEN 'E'
    WHEN NEW.gender = 'female' THEN 'F'
    ELSE 'E'
  END;
  
  -- Get next counter
  next_counter := COALESCE(
    (SELECT CAST(SUBSTRING(generated_id, 2) AS INT) 
     FROM users 
     WHERE generated_id LIKE prefix || '%' 
     ORDER BY CAST(SUBSTRING(generated_id, 2) AS INT) DESC 
     LIMIT 1), 
    0
  ) + 1;
  
  -- Generate ID
  NEW.generated_id := prefix || LPAD(next_counter::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_user_id() IS 'تولد معرّف العضو تلقائياً (E0001, F0001, الخ)';

-- Trigger to auto-generate ID
CREATE TRIGGER trigger_generate_user_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION generate_user_id();

-- ============================================
-- PART 5: REPORTS TABLE (التقارير)
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Creator Reference
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report Details
  report_date DATE NOT NULL,
  location VARCHAR(100),
  patrol_stage VARCHAR(50),
  
  -- Statistics (with defaults)
  members_count INT DEFAULT 0 CHECK (members_count >= 0),
  leaders_count INT DEFAULT 0 CHECK (leaders_count >= 0),
  
  -- Content
  activities TEXT,
  objectives TEXT,
  full_report TEXT NOT NULL,
  recommendations TEXT,
  
  -- Attachments
  pdf_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected')
  ),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'التقارير - Activity Reports';
COMMENT ON COLUMN reports.created_by IS 'معرّف المستخدم (UUID)';
COMMENT ON COLUMN reports.status IS 'حالة التقرير';
COMMENT ON COLUMN reports.members_count IS 'عدد الأعضاء (افتراضي: 0)';
COMMENT ON COLUMN reports.leaders_count IS 'عدد القادة (افتراضي: 0)';

-- Create Indexes
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_date ON reports(report_date DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_updated_at ON reports(updated_at DESC);

-- ============================================
-- PART 6: IDEAS TABLE (صندوق الأفكار)
-- ============================================
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Creator Reference
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Idea Details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  resources TEXT,
  budget INT DEFAULT 0 CHECK (budget >= 0),
  contact_info TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'under_review', 'approved', 'rejected')
  ),
  admin_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ideas IS 'صندوق الأفكار - Ideas Box';
COMMENT ON COLUMN ideas.created_by IS 'معرّف المستخدم (UUID)';
COMMENT ON COLUMN ideas.status IS 'حالة الفكرة';
COMMENT ON COLUMN ideas.budget IS 'الميزانية المقدرة (افتراضي: 0)';

-- Create Indexes
CREATE INDEX idx_ideas_created_by ON ideas(created_by);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_updated_at ON ideas(updated_at DESC);

-- ============================================
-- PART 7: ANNOUNCEMENTS TABLE (الإعلانات)
-- ============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Content
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  
  -- Publishing
  published_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE announcements IS 'الإعلانات - Announcements';
COMMENT ON COLUMN announcements.title IS 'عنوان الإعلان';
COMMENT ON COLUMN announcements.is_published IS 'هل تم النشر على الموقع؟';

-- Create Indexes
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_announcements_date ON announcements(published_at DESC);
CREATE INDEX idx_announcements_updated_at ON announcements(updated_at DESC);

-- ============================================
-- PART 8: AUDIT_LOGS TABLE (سجل التدقيق)
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Action
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'سجل التدقيق - Audit Logs for tracking changes';
COMMENT ON COLUMN audit_logs.user_id IS 'معرّف المستخدم الذي أجرى التغيير';
COMMENT ON COLUMN audit_logs.action IS 'نوع الإجراء (INSERT, UPDATE, DELETE)';

-- Create Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- ============================================
-- PART 9: UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_patrols_updated_at
BEFORE UPDATE ON patrols
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at
BEFORE UPDATE ON ideas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 10: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- USERS RLS: Users can view and edit their own profile
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- REPORTS RLS: Users can view all reports, but only edit their own
CREATE POLICY "Users can view all reports"
ON reports FOR SELECT
USING (true);

CREATE POLICY "Users can only insert their own reports"
ON reports FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can only update their own reports"
ON reports FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can only delete their own reports"
ON reports FOR DELETE
USING (auth.uid() = created_by);

-- IDEAS RLS: Users can view all ideas, but only edit their own
CREATE POLICY "Users can view all ideas"
ON ideas FOR SELECT
USING (true);

CREATE POLICY "Users can only insert their own ideas"
ON ideas FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can only update their own ideas"
ON ideas FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can only delete their own ideas"
ON ideas FOR DELETE
USING (auth.uid() = created_by);

-- AUDIT_LOGS RLS: Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON audit_logs FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
  SELECT id FROM users WHERE role_id = (
    SELECT id FROM roles WHERE name = 'رائد'
  )
));

-- ============================================
-- PART 11: VIEWS FOR ANALYTICS
-- ============================================

-- View: User Statistics by Patrol
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id,
  p.name,
  COUNT(u.id) as total_members,
  COUNT(CASE WHEN u.gender = 'male' THEN 1 END) as male_count,
  COUNT(CASE WHEN u.gender = 'female' THEN 1 END) as female_count,
  COUNT(CASE WHEN u.is_high_patrol = TRUE THEN 1 END) as high_patrol_count,
  AVG(EXTRACT(YEAR FROM AGE(u.birth_date)))::INT as avg_age
FROM patrols p
LEFT JOIN users u ON p.id = u.patrol_id
GROUP BY p.id, p.name
ORDER BY p.name;

COMMENT ON VIEW user_stats IS 'احصائيات الأعضاء حسب الدورية';

-- View: Recent Activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  'report' as activity_type,
  u.first_name || ' ' || u.last_name as user_name,
  r.full_report as description,
  r.created_at,
  r.id as record_id
FROM reports r
JOIN users u ON r.created_by = u.id
UNION ALL
SELECT 
  'idea' as activity_type,
  u.first_name || ' ' || u.last_name as user_name,
  i.title as description,
  i.created_at,
  i.id as record_id
FROM ideas i
JOIN users u ON i.created_by = u.id
ORDER BY created_at DESC
LIMIT 50;

COMMENT ON VIEW recent_activity IS 'الأنشطة الأخيرة من المستخدمين';

-- View: Report Statistics
CREATE OR REPLACE VIEW report_stats AS
SELECT 
  status,
  COUNT(*) as count,
  AVG(members_count)::INT as avg_members,
  AVG(leaders_count)::INT as avg_leaders,
  MAX(created_at) as latest_report
FROM reports
GROUP BY status;

COMMENT ON VIEW report_stats IS 'احصائيات التقارير حسب الحالة';

-- View: Ideas Statistics
CREATE OR REPLACE VIEW ideas_stats AS
SELECT 
  status,
  COUNT(*) as count,
  SUM(budget) as total_budget,
  AVG(budget)::INT as avg_budget,
  MAX(created_at) as latest_idea
FROM ideas
GROUP BY status;

COMMENT ON VIEW ideas_stats IS 'احصائيات الأفكار حسب الحالة';

-- ============================================
-- PART 12: DEFAULT DATA
-- ============================================

-- Insert Patrols
INSERT INTO patrols (name, description) VALUES
  ('دورية 1', 'الدورية الأولى من فريق الكشافة'),
  ('دورية 2', 'الدورية الثانية من فريق الكشافة'),
  ('دورية 3', 'الدورية الثالثة من فريق الكشافة'),
  ('دورية 4', 'الدورية الرابعة من فريق الكشافة')
ON CONFLICT (name) DO NOTHING;

-- Insert Roles
INSERT INTO roles (name, description) VALUES
  ('رائد', 'قائد الفريق الرئيسي - Scout Leader'),
  ('مساعد', 'مساعد القائد - Assistant Leader'),
  ('كاتب', 'مسؤول الكتابة والتوثيق - Secretary'),
  ('مراقب الزي', 'مسؤول الزي والنظام - Uniform Monitor'),
  ('عضو 1', 'عضو في الفريق - Member 1'),
  ('عضو 2', 'عضو في الفريق - Member 2'),
  ('عضو 3', 'عضو في الفريق - Member 3')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the schema:
-- SELECT COUNT(*) FROM patrols;   -- Should return 4
-- SELECT COUNT(*) FROM roles;     -- Should return 7
-- SELECT table_name FROM information_schema.tables 
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- ============================================
-- END OF SCHEMA V2
-- ============================================
