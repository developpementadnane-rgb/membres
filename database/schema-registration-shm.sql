-- ============================================
-- SCOUTISME HASSANIA SAFI - REGISTRATION SCHEMA
-- SITE 1: Member Registration Portal
-- Version: 2.0.0
-- ============================================
-- This schema contains all data collected from the registration form:
-- - Member info (first name, last name, birth date, gender)
-- - Scout assignment (patrol, role, high patrol)
-- - Contact info (user phone)
-- - Guardian/Parent info (names, relationship, CIN, contacts)
-- - Additional contacts (father, mother, home phones)
-- - Generated PDF links and IDs (E for male, F for female)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PATROLS TABLE (الدوريات)
-- ============================================
CREATE TABLE IF NOT EXISTS patrols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE patrols IS 'Scout Patrols (الدوريات)';
COMMENT ON COLUMN patrols.id IS 'Unique patrol identifier (UUID)';
COMMENT ON COLUMN patrols.name IS 'Patrol name (الدورية)';

CREATE INDEX idx_patrols_name ON patrols(name);

-- ============================================
-- ROLES TABLE (الأدوار)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Scout Roles/Positions (الأدوار)';
COMMENT ON COLUMN roles.id IS 'Unique role identifier (UUID)';
COMMENT ON COLUMN roles.name IS 'Role name (الدور)';

CREATE INDEX idx_roles_name ON roles(name);

-- ============================================
-- USERS TABLE - COMPREHENSIVE REGISTRATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  generated_id VARCHAR(10) NOT NULL UNIQUE,

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
  guardian_relationship VARCHAR(50),
  guardian_relationship_other VARCHAR(100),
  guardian_cin VARCHAR(20),

  -- ========== ADDITIONAL CONTACTS ==========
  father_phone VARCHAR(20),
  mother_phone VARCHAR(20),
  home_phone VARCHAR(20),

  -- ========== ADDITIONAL INFO ==========
  additional_info TEXT,

  -- ========== AUTHENTICATION ==========
  password VARCHAR(255) NOT NULL,

  -- ========== GENERATED DOCUMENTS ==========
  pdf_url TEXT,
  qr_code_url TEXT,
  documents_generated_at TIMESTAMP WITH TIME ZONE,

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
COMMENT ON COLUMN users.auth_id IS 'Linked to Supabase Auth (optional)';
COMMENT ON COLUMN users.generated_id IS 'Human-readable member ID: E0001-E9999 (male), F0001-F9999 (female)';
COMMENT ON COLUMN users.user_phone IS 'Member phone number (primary contact)';
COMMENT ON COLUMN users.guardian_relationship IS 'Relationship to member: père, mère, tuteur, etc';
COMMENT ON COLUMN users.password IS 'User password for authentication';
COMMENT ON COLUMN users.pdf_url IS 'URL to generated PDF member card';
COMMENT ON COLUMN users.qr_code_url IS 'URL to generated QR code image';
COMMENT ON COLUMN users.documents_generated_at IS 'Timestamp when PDF and QR code were generated';

CREATE INDEX idx_users_phone ON users(user_phone);
CREATE INDEX idx_users_patrol_id ON users(patrol_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_generated_id ON users(generated_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ============================================
-- FUNCTION: Generate Member ID
-- ============================================
CREATE OR REPLACE FUNCTION generate_member_id()
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

  IF next_counter > 9999 THEN
    RAISE EXCEPTION 'Member ID limit exceeded for gender %', prefix;
  END IF;

  NEW.generated_id := prefix || LPAD(next_counter::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_member_id() IS 'Auto-generates member ID based on gender (E or F prefix)';

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
  u.qr_code_url,
  u.documents_generated_at,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN patrols p ON u.patrol_id = p.id
LEFT JOIN roles r ON u.role_id = r.id;

COMMENT ON VIEW member_profiles IS 'Complete member profile with all registration data and generated documents';

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
-- END OF REGISTRATION SCHEMA
-- ============================================
