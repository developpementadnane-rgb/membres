-- ============================================
-- SCOUTISME HASSANIA SAFI - REGISTRATION SCHEMA
-- COMPLETE WITH ALL FORM FIELDS
-- ============================================
-- This schema contains all data collected from the registration form:
-- - Member info (first name, last name, birth date, gender)
-- - Scout assignment (patrol, role, high patrol)
-- - Contact info (user phone, email, password)
-- - Guardian/Parent info (names, relationship, CIN, contacts)
-- - Additional contacts (father, mother, home phones/emails)
-- - Generated PDF links and IDs (E for male, F for female)
--
-- Linked to Supabase Auth for authentication

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PATROLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS patrols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE patrols IS 'Scout Patrols (الدوريات)';
CREATE INDEX idx_patrols_name ON patrols(name);

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Scout Roles/Positions (الأدوار)';
CREATE INDEX idx_roles_name ON roles(name);

-- ============================================
-- USERS TABLE - COMPREHENSIVE REGISTRATION
-- Links to Supabase Auth + contains all form fields
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE, -- Link to Supabase Auth if needed
  generated_id VARCHAR(10) NOT NULL UNIQUE, -- E0001-E9999 (male) or F0001-F9999 (female)
  
  -- ========== MEMBER PERSONAL INFO ==========
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  
  -- ========== SCOUT ASSIGNMENT ==========
  patrol_id UUID REFERENCES patrols(id) ON DELETE RESTRICT,
  role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
  is_high_patrol BOOLEAN DEFAULT FALSE,
  
  -- ========== MEMBER CONTACT INFO ==========
  user_phone VARCHAR(20) NOT NULL,

  -- ========== GUARDIAN/PARENT INFO ==========
  guardian_first_name VARCHAR(100),
  guardian_last_name VARCHAR(100),
  guardian_relationship VARCHAR(50), -- 'père', 'mère', 'tuteur', etc
  guardian_relationship_other VARCHAR(100), -- For custom relationship
  guardian_cin VARCHAR(20),

  -- ========== ADDITIONAL CONTACTS ==========
  father_phone VARCHAR(20),
  mother_phone VARCHAR(20),
  home_phone VARCHAR(20),
  
  -- ========== ADDITIONAL INFO ==========
  additional_info TEXT,
  
  -- ========== GENERATED DOCUMENTS ==========
  pdf_url TEXT, -- URL to generated PDF
  qr_code_data TEXT, -- QR code data (member ID + emergency contacts)
  
  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ========== CONSTRAINTS ==========
  CONSTRAINT valid_age CHECK (
    EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 12 AND 20
  ),
  CONSTRAINT valid_user_phone CHECK (
    user_phone ~ '^(\+212|0)[0-9]{9,}$'
  )
);

COMMENT ON TABLE users IS 'Scout Members - Complete Registration Data';
COMMENT ON COLUMN users.id IS 'Unique member identifier (UUID)';
COMMENT ON COLUMN users.generated_id IS 'Human-readable member ID: E0001-E9999 (male), F0001-F9999 (female)';
COMMENT ON COLUMN users.user_phone IS 'Member phone number (primary contact)';
COMMENT ON COLUMN users.guardian_relationship IS 'Relationship to member: père, mère, tuteur, etc';
COMMENT ON COLUMN users.pdf_url IS 'URL to generated PDF member card';
COMMENT ON COLUMN users.qr_code_data IS 'Data encoded in QR code (member ID + emergency contacts)';

-- Create Indexes for performance
CREATE INDEX idx_users_phone ON users(user_phone);
CREATE INDEX idx_users_patrol_id ON users(patrol_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_generated_id ON users(generated_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ============================================
-- FUNCTION: Generate Member ID
-- Automatically generates E0001/F0001 on insert
-- ============================================
CREATE OR REPLACE FUNCTION generate_member_id()
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
  
  -- Get next counter for this gender
  next_counter := COALESCE(
    (SELECT CAST(SUBSTRING(generated_id, 2) AS INT) 
     FROM users 
     WHERE generated_id LIKE prefix || '%' 
     ORDER BY CAST(SUBSTRING(generated_id, 2) AS INT) DESC 
     LIMIT 1), 
    0
  ) + 1;
  
  -- Ensure we don't exceed 9999
  IF next_counter > 9999 THEN
    RAISE EXCEPTION 'Member ID limit exceeded for gender %', prefix;
  END IF;
  
  -- Generate ID (e.g., E0001, F0001, E0002, F0002)
  NEW.generated_id := prefix || LPAD(next_counter::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_member_id() IS 'Auto-generates member ID based on gender (E or F prefix)';

-- Trigger to auto-generate ID before insert
CREATE TRIGGER trigger_generate_member_id
BEFORE INSERT ON users
FOR EACH ROW
WHEN (NEW.generated_id IS NULL OR NEW.generated_id = '')
EXECUTE FUNCTION generate_member_id();

-- ============================================
-- FUNCTION: Update Timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patrols_updated_at
BEFORE UPDATE ON patrols
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: Complete Member Profile
-- ============================================
CREATE OR REPLACE VIEW member_profiles AS
SELECT
  u.id,
  u.generated_id,
  u.first_name,
  u.last_name,
  u.birth_date,
  EXTRACT(YEAR FROM AGE(u.birth_date))::INT as age,
  u.gender,
  p.name as patrol_name,
  r.name as role_name,
  u.is_high_patrol,
  u.user_phone,
  u.guardian_first_name,
  u.guardian_last_name,
  u.guardian_relationship,
  u.guardian_cin,
  u.father_phone,
  u.mother_phone,
  u.home_phone,
  u.additional_info,
  u.pdf_url,
  u.qr_code_data,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN patrols p ON u.patrol_id = p.id
LEFT JOIN roles r ON u.role_id = r.id;

COMMENT ON VIEW member_profiles IS 'Complete member profile with all registration data';

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================
INSERT INTO patrols (name, description) VALUES
  ('دورية 1', 'First Patrol'),
  ('دورية 2', 'Second Patrol'),
  ('دورية 3', 'Third Patrol'),
  ('دورية 4', 'Fourth Patrol')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('رائد', 'Patrol Leader'),
  ('مساعد', 'Deputy Leader'),
  ('كاتب', 'Secretary'),
  ('مراقب الزي', 'Uniform Monitor'),
  ('عضو 1', 'Member 1'),
  ('عضو 2', 'Member 2'),
  ('عضو 3', 'Member 3')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SAMPLE QUERY: Insert New Member
-- ============================================
-- To insert a new member (example):
/*
INSERT INTO users (
  first_name,
  last_name,
  birth_date,
  gender,
  patrol_id,
  role_id,
  is_high_patrol,
  user_phone,
  guardian_first_name,
  guardian_last_name,
  guardian_relationship,
  guardian_cin,
  father_phone,
  mother_phone,
  home_phone,
  additional_info
) VALUES (
  'أحمد',
  'بن علي',
  '2010-05-15',
  'male',
  (SELECT id FROM patrols WHERE name = 'دورية 1'),
  (SELECT id FROM roles WHERE name = 'عضو 1'),
  FALSE,
  '+212612345678',
  'محمد',
  'بن علي',
  'père',
  'AB123456',
  '+212612111111',
  '+212611111111',
  '+212522222222',
  'Some additional info'
);
-- The generated_id will be auto-generated (e.g., E0001 for male)
*/

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get all members with complete info
-- SELECT * FROM member_profiles ORDER BY created_at DESC;

-- Get members by gender
-- SELECT * FROM member_profiles WHERE gender = 'male';
-- SELECT * FROM member_profiles WHERE gender = 'female';

-- Get members by patrol
-- SELECT * FROM member_profiles WHERE patrol_name = 'دورية 1';

-- Get members count
-- SELECT COUNT(*) as total_members FROM users;
-- SELECT gender, COUNT(*) as count FROM users GROUP BY gender;

-- Find member by ID
-- SELECT * FROM member_profiles WHERE generated_id = 'E0001';

-- Update PDF URL after generation
-- UPDATE users SET pdf_url = 'https://storage.example.com/pdf/E0001.pdf' WHERE generated_id = 'E0001';

-- ============================================
-- END OF SCHEMA
-- ============================================
