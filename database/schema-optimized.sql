-- ============================================
-- SCOUTISME HASSANIA SAFI - OPTIMIZED SCHEMA
-- Complete relational database for Scout Portal
-- Version: 3.0.0 - Production Ready
-- ============================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PART 1: PATROLS TABLE (الدوريات)
-- ============================================
CREATE TABLE IF NOT EXISTS patrols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE patrols IS 'الدوريات - Scout Patrols';
CREATE INDEX idx_patrols_name ON patrols(name);

-- ============================================
-- PART 2: ROLES TABLE (الأدوار)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'الأدوار - Scout Roles/Positions';
CREATE INDEX idx_roles_name ON roles(name);

-- ============================================
-- PART 3: USERS TABLE (الأعضاء)
-- Core user table with auto-generated ID
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_id VARCHAR(10) NOT NULL UNIQUE,
  
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')) NOT NULL,
  
  patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE RESTRICT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_high_patrol BOOLEAN DEFAULT FALSE,
  
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_age CHECK (
    EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 12 AND 20
  ),
  CONSTRAINT valid_phone CHECK (
    phone ~ '^(\+212|0)[567]\d{8}$'
  ),
  CONSTRAINT valid_email CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@(gmail|yahoo|hotmail)\.[a-z]{2,}$'
  )
);

COMMENT ON TABLE users IS 'أعضاء الكشافة - Scout Members';
COMMENT ON COLUMN users.generated_id IS 'معرّف مولد: E0001-E9999 (ذكور)، F0001-F9999 (إناث)';
COMMENT ON COLUMN users.birth_date IS 'تاريخ الميلاد - يجب أن يكون بين 10 و 17 سنة';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_patrol_id ON users(patrol_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================
-- PART 4: FUNCTION TO GENERATE USER ID
-- ============================================
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS TRIGGER AS $$
DECLARE
  next_counter INT;
  prefix VARCHAR(1);
BEGIN
  prefix := CASE 
    WHEN NEW.gender = 'male' THEN 'E'
    WHEN NEW.gender = 'female' THEN 'F'
    ELSE 'E'
  END;
  
  next_counter := COALESCE(
    (SELECT CAST(SUBSTRING(generated_id, 2) AS INT) 
     FROM users 
     WHERE generated_id LIKE prefix || '%' 
     ORDER BY CAST(SUBSTRING(generated_id, 2) AS INT) DESC 
     LIMIT 1), 
    0
  ) + 1;
  
  NEW.generated_id := prefix || LPAD(next_counter::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_user_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION generate_user_id();

-- ============================================
-- PART 5: GUARDIANS TABLE (الأولياء)
-- Parent/Guardian information
-- ============================================
CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) CHECK (relationship IN ('father', 'mother', 'other')) NOT NULL,
  relationship_other VARCHAR(100),
  national_id VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE guardians IS 'أولياء الأمور - Parents/Guardians';
CREATE INDEX idx_guardians_user_id ON guardians(user_id);

-- ============================================
-- PART 6: CONTACTS TABLE (معلومات الاتصال)
-- Contact information for users and guardians
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  user_phone VARCHAR(15) NOT NULL UNIQUE,
  user_email VARCHAR(150) NOT NULL UNIQUE,
  
  father_phone VARCHAR(15),
  mother_phone VARCHAR(15),
  home_phone VARCHAR(15),
  
  father_email VARCHAR(150),
  mother_email VARCHAR(150),
  
  additional_info TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE contacts IS 'معلومات الاتصال - Contact Information';
CREATE INDEX idx_contacts_user_id ON contacts(user_id);

-- ============================================
-- PART 7: REPORTS TABLE (التقارير)
-- Activity reports
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  report_date DATE NOT NULL,
  location VARCHAR(255),
  objectives TEXT,
  
  members_count INT DEFAULT 0 CHECK (members_count >= 0),
  leaders_count INT DEFAULT 0 CHECK (leaders_count >= 0),
  male_count INT DEFAULT 0 CHECK (male_count >= 0),
  female_count INT DEFAULT 0 CHECK (female_count >= 0),
  
  activity_details TEXT NOT NULL,
  recommendations TEXT,
  
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE reports IS 'التقارير - Activity Reports';
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_date ON reports(report_date DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- ============================================
-- PART 8: PROGRAMS TABLE (البرنامج)
-- Scheduled activities/programs
-- ============================================
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  summary VARCHAR(500),
  
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  
  image_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE programs IS 'البرنامج - Scheduled Programs/Activities';
CREATE INDEX idx_programs_start_date ON programs(start_date DESC);
CREATE INDEX idx_programs_created_at ON programs(created_at DESC);

-- ============================================
-- PART 9: IDEAS TABLE (صندوق الأفكار)
-- Anonymous ideas submission
-- ============================================
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget_estimate INT,
  requirements TEXT,
  
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ideas IS 'صندوق الأفكار - Ideas Box (Anonymous)';
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_submitted_at ON ideas(submitted_at DESC);

-- ============================================
-- PART 10: ANNOUNCEMENTS TABLE (الإعلانات)
-- Portal announcements
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE announcements IS 'الإعلانات - Announcements';
CREATE INDEX idx_announcements_published ON announcements(is_published);
CREATE INDEX idx_announcements_published_at ON announcements(published_at DESC);

-- ============================================
-- PART 11: UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patrols_updated_at BEFORE UPDATE ON patrols FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guardians_updated_at BEFORE UPDATE ON guardians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
-- END OF SCHEMA
-- ============================================
