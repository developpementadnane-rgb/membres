-- ============================================
-- SCOUTISME HASSANIA SAFI - SUPABASE SCHEMA
-- Portail الأعضاء
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PATROLS TABLE (الدوريات)
-- ============================================
CREATE TABLE patrols (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE patrols IS 'الدوريات - Scout Patrols';
COMMENT ON COLUMN patrols.id IS 'معرّف فريد للدورية';
COMMENT ON COLUMN patrols.name IS 'اسم الدورية مثال: دورية 1، دورية 2، الخ';

-- ============================================
-- 2. ROLES TABLE (الأدوار)
-- ============================================
CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'الأدوار - Scout Roles/Positions';
COMMENT ON COLUMN roles.id IS 'معرّف فريد للدور';
COMMENT ON COLUMN roles.name IS 'اسم الدور: رائد، مساعد، كاتب، الخ';
COMMENT ON COLUMN roles.description IS 'وصف مفصل للدور';

-- ============================================
-- 3. USERS TABLE (الأعضاء)
-- ============================================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  
  -- Generated ID (E0001 for male, F0001 for female)
  generated_id VARCHAR(10) NOT NULL UNIQUE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')) NOT NULL,
  
  -- Scout Assignment
  patrol_id BIGINT NOT NULL REFERENCES patrols(id) ON DELETE RESTRICT,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_high_patrol BOOLEAN DEFAULT FALSE,
  
  -- Contact Information
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  
  -- Guardian/Parent Information (Optional)
  parent_first_name VARCHAR(100),
  parent_last_name VARCHAR(100),
  parent_phone VARCHAR(15) UNIQUE,
  parent_email VARCHAR(150) UNIQUE,
  parent_cin VARCHAR(20),
  parent_type VARCHAR(50),
  
  -- Security
  password_hash TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_age CHECK (
    EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 12 AND 20
  ),
  CONSTRAINT valid_phone CHECK (phone LIKE '+212%' OR phone LIKE '0%'),
  CONSTRAINT valid_email CHECK (email LIKE '%@%')
);

COMMENT ON TABLE users IS 'أعضاء الكشافة - Scout Members';
COMMENT ON COLUMN users.generated_id IS 'معرّف مولد تلقائياً (E0001 للذكور، F0001 للإناث)';
COMMENT ON COLUMN users.birth_date IS 'تاريخ الميلاد - يجب أن يكون بين 12 و 15 سنة';
COMMENT ON COLUMN users.phone IS 'رقم الهاتف الشخصي - يجب أن يبدأ بـ +212';
COMMENT ON COLUMN users.parent_cin IS 'رقم بطاقة الهوية الوطنية للولي';

-- Create Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_patrol_id ON users(patrol_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_generated_id ON users(generated_id);

-- ============================================
-- 4. REPORTS TABLE (التقارير)
-- ============================================
CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  
  -- Creator Reference
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report Details
  report_date DATE NOT NULL,
  location VARCHAR(100),
  patrol_stage VARCHAR(50),
  
  -- Statistics
  members_count INT CHECK (members_count >= 0),
  leaders_count INT CHECK (leaders_count >= 0),
  
  -- Content
  activities TEXT,
  objectives TEXT,
  full_report TEXT NOT NULL,
  recommendations TEXT,
  
  -- Attachments
  pdf_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'التقارير - Activity Reports';
COMMENT ON COLUMN reports.created_by IS 'معرّف المستخدم الذي أنشأ التقرير';
COMMENT ON COLUMN reports.report_date IS 'تاريخ النشاط المُقرَّر عنه';
COMMENT ON COLUMN reports.status IS 'حالة التقرير: مسودة، مقدّم، معتمد، مرفوض';
COMMENT ON COLUMN reports.pdf_url IS 'رابط ملف PDF للتقرير';

-- Create Index
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_date ON reports(report_date);
CREATE INDEX idx_reports_status ON reports(status);

-- ============================================
-- 5. IDEAS TABLE (صندوق الأفكار)
-- ============================================
CREATE TABLE ideas (
  id BIGSERIAL PRIMARY KEY,
  
  -- Creator Reference
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Idea Details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  resources TEXT,
  budget INT CHECK (budget >= 0),
  contact_info TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ideas IS 'صندوق الأفكار - Ideas Box';
COMMENT ON COLUMN ideas.created_by IS 'معرّف المستخدم الذي أرسل الفكرة';
COMMENT ON COLUMN ideas.title IS 'عنوان الفكرة';
COMMENT ON COLUMN ideas.budget IS 'الميزانية المقدرة (بالدرهم المغربي)';
COMMENT ON COLUMN ideas.status IS 'حالة الفكرة: مُرسلة، تحت المراجعة، معتمدة، مرفوضة';
COMMENT ON COLUMN ideas.admin_notes IS 'ملاحظات الإدارة على الفكرة';

-- Create Index
CREATE INDEX idx_ideas_created_by ON ideas(created_by);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_date ON ideas(created_at);

-- ============================================
-- 6. ANNOUNCEMENTS TABLE (الإعلانات)
-- ============================================
CREATE TABLE announcements (
  id BIGSERIAL PRIMARY KEY,
  
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
COMMENT ON COLUMN announcements.content IS 'محتوى الإعلان';
COMMENT ON COLUMN announcements.is_published IS 'هل تم نشر الإعلان على الموقع؟';

-- Create Index
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_announcements_date ON announcements(published_at);

-- ============================================
-- 7. AUDIT LOG TABLE (سجل التدقيق)
-- ============================================
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- User Action
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id BIGINT,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'سجل التدقيق - Audit Logs for tracking changes';

-- Create Index
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- PERMISSIONS & ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid()::text = generated_id OR id = (SELECT id FROM users WHERE auth.uid()::text = generated_id LIMIT 1));

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid()::text = generated_id OR id = (SELECT id FROM users WHERE auth.uid()::text = generated_id LIMIT 1));

-- RLS Policy: Users can view reports
CREATE POLICY "Users can view all reports"
ON reports FOR SELECT
USING (true);

-- RLS Policy: Users can only create/edit their own reports
CREATE POLICY "Users can only edit their own reports"
ON reports FOR UPDATE
USING (created_by = (SELECT id FROM users WHERE auth.uid()::text = generated_id LIMIT 1));

-- RLS Policy: Users can view ideas
CREATE POLICY "Users can view all ideas"
ON ideas FOR SELECT
USING (true);

-- RLS Policy: Users can only edit their own ideas
CREATE POLICY "Users can only edit their own ideas"
ON ideas FOR UPDATE
USING (created_by = (SELECT id FROM users WHERE auth.uid()::text = generated_id LIMIT 1));

-- ============================================
-- DEFAULT DATA INSERTS
-- ============================================

-- Insert Patrols
INSERT INTO patrols (name) VALUES
  ('دورية 1'),
  ('دورية 2'),
  ('دورية 3'),
  ('دورية 4')
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
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: User Statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  p.id,
  p.name,
  COUNT(u.id) as total_members,
  COUNT(CASE WHEN u.gender = 'male' THEN 1 END) as male_count,
  COUNT(CASE WHEN u.gender = 'female' THEN 1 END) as female_count,
  COUNT(CASE WHEN u.is_high_patrol = TRUE THEN 1 END) as high_patrol_count
FROM patrols p
LEFT JOIN users u ON p.id = u.patrol_id
GROUP BY p.id, p.name;

COMMENT ON VIEW user_stats IS 'احصائيات الأعضاء حسب الدورية - Member statistics by patrol';

-- View: Recent Activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  'report' as activity_type,
  u.first_name || ' ' || u.last_name as user_name,
  r.full_report as description,
  r.created_at,
  'reports' as table_name
FROM reports r
JOIN users u ON r.created_by = u.id
UNION ALL
SELECT 
  'idea' as activity_type,
  u.first_name || ' ' || u.last_name as user_name,
  i.title as description,
  i.created_at,
  'ideas' as table_name
FROM ideas i
JOIN users u ON i.created_by = u.id
ORDER BY created_at DESC;

COMMENT ON VIEW recent_activity IS 'الأنشطة الأخيرة - Recent activities from users';

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for patrols
CREATE TRIGGER update_patrols_updated_at BEFORE UPDATE ON patrols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for roles
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reports
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ideas
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for announcements
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- END OF SCHEMA
-- ============================================
