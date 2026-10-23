-- ========================================
-- MEMBER MANAGEMENT SCHEMA
-- ========================================
-- Complete SQL schema for storing all member registration data
-- Compatible with existing reports and sessions tables
-- Includes RLS policies for public access and data integrity

-- ========================================
-- 1. TABLE: patrols (Droriya / Patrouilles)
-- ========================================
CREATE TABLE IF NOT EXISTS patrols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  leader_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE patrols IS 'Scout patrols (droriya) - organizational units';
COMMENT ON COLUMN patrols.id IS 'Unique patrol identifier';
COMMENT ON COLUMN patrols.name IS 'Patrol name (e.g., دورية 1)';
COMMENT ON COLUMN patrols.leader_id IS 'Reference to patrol leader (member)';

-- ========================================
-- 2. TABLE: roles (Rôles dans la patrouille)
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  patrol_id UUID REFERENCES patrols(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Roles available within patrols (رائد, مساعد, كاتب, etc.)';
COMMENT ON COLUMN roles.name IS 'Role name';
COMMENT ON COLUMN roles.patrol_id IS 'Optional patrol-specific role';

-- ========================================
-- 3. TABLE: users (Membres / Members)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  -- Core authentication
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID UNIQUE,
  
  -- Member identification
  generated_id TEXT UNIQUE NOT NULL,
  
  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'ذكر', 'أنثى')),
  
  -- Scout membership
  patrol_id UUID REFERENCES patrols(id),
  role_id UUID REFERENCES roles(id),
  is_high_patrol BOOLEAN DEFAULT FALSE,
  
  -- Contact information
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  
  -- Metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Scout members - main registration table';
COMMENT ON COLUMN users.auth_id IS 'Link to Supabase Auth user';
COMMENT ON COLUMN users.generated_id IS 'Member ID (E0001-E9999 or F0001-F9999)';
COMMENT ON COLUMN users.phone IS 'Member phone number';
COMMENT ON COLUMN users.patrol_id IS 'Associated patrol';
COMMENT ON COLUMN users.role_id IS 'Role within the patrol';
COMMENT ON COLUMN users.is_high_patrol IS 'Member of high patrol (دورية عليا)';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_generated_id ON users(generated_id);
CREATE INDEX idx_users_patrol_id ON users(patrol_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ========================================
-- 4. TABLE: guardians (Tuteurs / Guardians)
-- ========================================
CREATE TABLE IF NOT EXISTS guardians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Guardian information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'other', 'أب', 'أم', 'آخر')),
  relationship_other TEXT,
  
  -- Identification
  national_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE guardians IS 'Guardian/parent information for members';
COMMENT ON COLUMN guardians.user_id IS 'Reference to member';
COMMENT ON COLUMN guardians.relationship IS 'Relationship to member (father, mother, other)';
COMMENT ON COLUMN guardians.relationship_other IS 'Clarification if relationship is "other" (uncle, grandmother, etc.)';
COMMENT ON COLUMN guardians.national_id IS 'Guardian national ID card number';

CREATE INDEX idx_guardians_user_id ON guardians(user_id);

-- ========================================
-- 5. TABLE: contacts (Contact Information)
-- ========================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Member contact
  user_phone TEXT NOT NULL,
  user_email TEXT NOT NULL,
  
  -- Father contact
  father_phone TEXT,
  father_email TEXT,
  
  -- Mother contact
  mother_phone TEXT,
  mother_email TEXT,
  
  -- Home contact
  home_phone TEXT,
  
  -- Additional information
  additional_info TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contacts IS 'Extended contact information for member and family';
COMMENT ON COLUMN contacts.user_id IS 'Reference to member';
COMMENT ON COLUMN contacts.user_phone IS 'Member phone number (primary contact)';
COMMENT ON COLUMN contacts.user_email IS 'Member email (primary contact)';
COMMENT ON COLUMN contacts.father_phone IS 'Father phone number';
COMMENT ON COLUMN contacts.mother_phone IS 'Mother phone number';
COMMENT ON COLUMN contacts.home_phone IS 'Home/fixed phone number';
COMMENT ON COLUMN contacts.additional_info IS 'Any additional contact notes';

CREATE INDEX idx_contacts_user_id ON contacts(user_id);

-- ========================================
-- 6. TRIGGERS - Auto Update Timestamps
-- ========================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_patrols_timestamp BEFORE UPDATE ON patrols
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_guardians_timestamp BEFORE UPDATE ON guardians
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_contacts_timestamp BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ========================================
-- 7. ROW LEVEL SECURITY (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- PATROLS: Public read, authenticated write
CREATE POLICY patrols_public_read ON patrols
  FOR SELECT USING (true);

CREATE POLICY patrols_authenticated_write ON patrols
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ROLES: Public read, authenticated write
CREATE POLICY roles_public_read ON roles
  FOR SELECT USING (true);

CREATE POLICY roles_authenticated_write ON roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- USERS: Public read, authenticated own write, service role full access
CREATE POLICY users_public_read ON users
  FOR SELECT USING (true);

CREATE POLICY users_authenticated_insert ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY users_own_update ON users
  FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- GUARDIANS: Authenticated own member guardian read
CREATE POLICY guardians_own_access ON guardians
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
  );

CREATE POLICY guardians_authenticated_insert ON guardians
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CONTACTS: Authenticated own member contact read
CREATE POLICY contacts_own_access ON contacts
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
  );

CREATE POLICY contacts_authenticated_insert ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- 8. VIEWS - Useful for data retrieval
-- ========================================

-- Complete member profile view
CREATE OR REPLACE VIEW member_profiles AS
SELECT 
  u.id,
  u.generated_id,
  u.first_name,
  u.last_name,
  EXTRACT(YEAR FROM AGE(u.birth_date))::INT as age,
  u.birth_date,
  u.gender,
  p.name as patrol_name,
  r.name as role_name,
  u.is_high_patrol,
  u.email,
  u.phone,
  g.first_name as guardian_first_name,
  g.last_name as guardian_last_name,
  g.relationship as guardian_relationship,
  c.user_phone,
  c.user_email,
  c.father_phone,
  c.father_email,
  c.mother_phone,
  c.mother_email,
  c.home_phone,
  c.additional_info,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN patrols p ON u.patrol_id = p.id
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN guardians g ON u.id = g.user_id
LEFT JOIN contacts c ON u.id = c.user_id;

COMMENT ON VIEW member_profiles IS 'Complete member profile with all related information';

-- Active members count by patrol
CREATE OR REPLACE VIEW active_members_by_patrol AS
SELECT 
  p.id,
  p.name as patrol_name,
  COUNT(u.id) as member_count,
  COUNT(CASE WHEN u.gender IN ('male', 'ذكر') THEN 1 END) as male_count,
  COUNT(CASE WHEN u.gender IN ('female', 'أنثى') THEN 1 END) as female_count
FROM patrols p
LEFT JOIN users u ON p.id = u.patrol_id AND u.status = 'active'
GROUP BY p.id, p.name
ORDER BY p.name;

COMMENT ON VIEW active_members_by_patrol IS 'Statistics of active members per patrol';

-- ========================================
-- 9. SAMPLE DATA (PATROLS - Optional)
-- ========================================

-- Insert sample patrols if they don't exist
INSERT INTO patrols (name, description) VALUES
  ('دورية 1', 'First patrol'),
  ('دورية 2', 'Second patrol'),
  ('دورية 3', 'Third patrol'),
  ('دورية 4', 'Fourth patrol')
ON CONFLICT (name) DO NOTHING;

-- Insert sample roles if they don't exist
INSERT INTO roles (name, description) VALUES
  ('رائد', 'Patrol leader'),
  ('مساعد', 'Deputy leader'),
  ('كاتب', 'Secretary'),
  ('مراقب الزي', 'Uniform monitor'),
  ('عضو 1', 'Member 1'),
  ('عضو 2', 'Member 2'),
  ('عضو 3', 'Member 3')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- END OF SCHEMA
-- ========================================
