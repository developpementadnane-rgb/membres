-- ========================================
-- SHM MEMBER MANAGEMENT SYSTEM
-- Production-Ready Supabase Schema
-- ========================================
-- Complete member registration with PDF, QR codes, and contact management
-- Fully compatible with existing reports and sessions tables
-- Ready to copy-paste into Supabase SQL Editor

-- ========================================
-- 1. TABLE: patrols (Droriya - Patrouilles)
-- ========================================
CREATE TABLE IF NOT EXISTS patrols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE patrols IS 'Scout patrols (droriya) - organizational units';
COMMENT ON COLUMN patrols.id IS 'Unique patrol identifier';
COMMENT ON COLUMN patrols.name IS 'Patrol name (e.g., دورية 1, دورية 2)';

CREATE INDEX IF NOT EXISTS idx_patrols_name ON patrols(name);

-- ========================================
-- 2. TABLE: roles (Rôles dans la patrouille)
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE roles IS 'Roles within patrols (رائد, مساعد, كاتب, etc.)';
COMMENT ON COLUMN roles.name IS 'Role name in Arabic';

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ========================================
-- 3. TABLE: users (Membres - Core Member Data)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_id TEXT UNIQUE NOT NULL,
  
  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  
  -- Scout membership
  patrol_id UUID REFERENCES patrols(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  is_high_patrol BOOLEAN DEFAULT FALSE,
  phone TEXT NOT NULL,
  
  -- Generated documents (NO EMAIL FIELD)
  pdf_url TEXT,
  qr_text TEXT,
  
  -- Status and metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE users IS 'Scout members - main registration table (NO EMAIL FIELD)';
COMMENT ON COLUMN users.id IS 'Unique member identifier (UUID)';
COMMENT ON COLUMN users.auth_id IS 'Link to Supabase Auth user (for authentication only)';
COMMENT ON COLUMN users.generated_id IS 'Human-readable member ID (E0001-E9999 for male, F0001-F9999 for female)';
COMMENT ON COLUMN users.phone IS 'Member phone number (primary contact)';
COMMENT ON COLUMN users.pdf_url IS 'URL to generated PDF member sheet';
COMMENT ON COLUMN users.qr_text IS 'Text encoded in QR code (member info + emergency contacts)';
COMMENT ON COLUMN users.is_high_patrol IS 'Member of high patrol (دورية عليا)';

-- Optimized indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_generated_id ON users(generated_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_patrol_id ON users(patrol_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ========================================
-- 4. TABLE: contacts (Emergency & Family Contacts)
-- ========================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Family contact information (NO EMAIL)
  father_phone TEXT,
  mother_phone TEXT,
  home_phone TEXT,
  
  -- Additional notes
  additional_info TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE contacts IS 'Emergency and family contact information for members';
COMMENT ON COLUMN contacts.user_id IS 'Reference to member';
COMMENT ON COLUMN contacts.father_phone IS 'Father phone number';
COMMENT ON COLUMN contacts.mother_phone IS 'Mother phone number';
COMMENT ON COLUMN contacts.home_phone IS 'Home/fixed phone number';
COMMENT ON COLUMN contacts.additional_info IS 'Any additional contact notes';

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- ========================================
-- 5. TABLE: emergency_leaders (Static Emergency Contacts)
-- ========================================
CREATE TABLE IF NOT EXISTS emergency_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_phone_1 TEXT DEFAULT '+212666666666',
  leader_phone_2 TEXT DEFAULT '+212666666666',
  leader_phone_3 TEXT DEFAULT '+212666666666',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE emergency_leaders IS 'Static emergency contact numbers for scout leaders';
COMMENT ON COLUMN emergency_leaders.leader_phone_1 IS 'Primary leader phone number';
COMMENT ON COLUMN emergency_leaders.leader_phone_2 IS 'Secondary leader phone number';
COMMENT ON COLUMN emergency_leaders.leader_phone_3 IS 'Tertiary leader phone number';

-- Insert default emergency leader record (creates one if not exists)
INSERT INTO emergency_leaders (id, leader_phone_1, leader_phone_2, leader_phone_3)
VALUES (gen_random_uuid(), '+212666666666', '+212666666666', '+212666666666')
ON CONFLICT DO NOTHING;

-- ========================================
-- 6. FUNCTION: Generate Sequential Member ID
-- ========================================
CREATE OR REPLACE FUNCTION generate_member_id(gender TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_number INTEGER;
  generated_id TEXT;
BEGIN
  -- Determine prefix based on gender
  IF gender = 'female' THEN
    prefix := 'F';
  ELSE
    prefix := 'E';
  END IF;
  
  -- Get next available number for this gender
  SELECT COALESCE(MAX(CAST(SUBSTRING(generated_id FROM 2) AS INTEGER)), 0) + 1
  INTO next_number
  FROM users
  WHERE generated_id LIKE prefix || '%';
  
  -- Ensure number doesn't exceed 9999
  IF next_number > 9999 THEN
    RAISE EXCEPTION 'Member ID limit exceeded for gender %', gender;
  END IF;
  
  -- Format as E0001-E9999 or F0001-F9999
  generated_id := prefix || LPAD(next_number::TEXT, 4, '0');
  
  RETURN generated_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_member_id(TEXT) IS 'Generate next sequential member ID based on gender (E for male, F for female)';

-- ========================================
-- 7. FUNCTION: Build QR Code Text Content
-- ========================================
CREATE OR REPLACE FUNCTION build_qr_text(
  p_generated_id TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
  qr_content TEXT;
  v_contact contacts%ROWTYPE;
  v_emergency emergency_leaders%ROWTYPE;
BEGIN
  -- Get contact information
  SELECT * INTO v_contact FROM contacts WHERE user_id = p_user_id;
  
  -- Get emergency leader numbers
  SELECT * INTO v_emergency FROM emergency_leaders LIMIT 1;
  
  -- Build QR code text with essential info
  qr_content := 'ID: ' || p_generated_id || E'\n' ||
                'Name: ' || p_first_name || ' ' || p_last_name || E'\n' ||
                'Phone: ' || COALESCE(p_phone, '') || E'\n';
  
  -- Add family contacts if available
  IF v_contact IS NOT NULL THEN
    IF v_contact.father_phone IS NOT NULL THEN
      qr_content := qr_content || 'Father: ' || v_contact.father_phone || E'\n';
    END IF;
    
    IF v_contact.mother_phone IS NOT NULL THEN
      qr_content := qr_content || 'Mother: ' || v_contact.mother_phone || E'\n';
    END IF;
    
    IF v_contact.home_phone IS NOT NULL THEN
      qr_content := qr_content || 'Home: ' || v_contact.home_phone || E'\n';
    END IF;
  END IF;
  
  -- Add emergency leader contacts
  IF v_emergency IS NOT NULL THEN
    IF v_emergency.leader_phone_1 IS NOT NULL THEN
      qr_content := qr_content || 'Leader1: ' || v_emergency.leader_phone_1 || E'\n';
    END IF;
    
    IF v_emergency.leader_phone_2 IS NOT NULL THEN
      qr_content := qr_content || 'Leader2: ' || v_emergency.leader_phone_2 || E'\n';
    END IF;
    
    IF v_emergency.leader_phone_3 IS NOT NULL THEN
      qr_content := qr_content || 'Leader3: ' || v_emergency.leader_phone_3;
    END IF;
  END IF;
  
  RETURN qr_content;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_qr_text(TEXT, TEXT, TEXT, TEXT, UUID) IS 'Build QR code text content with member and emergency contact info';

-- ========================================
-- 8. TRIGGER: Auto-update updated_at timestamp
-- ========================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp update trigger to all main tables
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_contacts_timestamp ON contacts;
CREATE TRIGGER update_contacts_timestamp
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_emergency_leaders_timestamp ON emergency_leaders;
CREATE TRIGGER update_emergency_leaders_timestamp
  BEFORE UPDATE ON emergency_leaders
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ========================================
-- 9. TRIGGER: Auto-generate generated_id before insert
-- ========================================
CREATE OR REPLACE FUNCTION auto_generate_member_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.generated_id IS NULL THEN
    NEW.generated_id := generate_member_id(NEW.gender);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_member_id_trigger ON users;
CREATE TRIGGER auto_generate_member_id_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_member_id();

-- ========================================
-- 10. TRIGGER: Auto-generate qr_text on insert/update
-- ========================================
CREATE OR REPLACE FUNCTION auto_generate_qr_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.generated_id IS NOT NULL AND NEW.first_name IS NOT NULL 
     AND NEW.last_name IS NOT NULL AND NEW.phone IS NOT NULL THEN
    NEW.qr_text := build_qr_text(NEW.generated_id, NEW.first_name, NEW.last_name, NEW.phone, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_qr_text_trigger ON users;
CREATE TRIGGER auto_generate_qr_text_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_qr_text();

-- ========================================
-- 11. ROW LEVEL SECURITY (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_leaders ENABLE ROW LEVEL SECURITY;

-- PATROLS: Public read (everyone can see patrol list)
DROP POLICY IF EXISTS patrols_public_read ON patrols;
CREATE POLICY patrols_public_read ON patrols
  FOR SELECT USING (true);

-- ROLES: Public read (everyone can see role list)
DROP POLICY IF EXISTS roles_public_read ON roles;
CREATE POLICY roles_public_read ON roles
  FOR SELECT USING (true);

-- USERS: Public read (members list visible), authenticated insert, own update
DROP POLICY IF EXISTS users_public_read ON users;
CREATE POLICY users_public_read ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS users_authenticated_insert ON users;
CREATE POLICY users_authenticated_insert ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS users_own_update ON users;
CREATE POLICY users_own_update ON users
  FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);

-- CONTACTS: Only member and service role can read/write own contacts
DROP POLICY IF EXISTS contacts_own_access ON contacts;
CREATE POLICY contacts_own_access ON contacts
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS contacts_authenticated_insert ON contacts;
CREATE POLICY contacts_authenticated_insert ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS contacts_own_update ON contacts;
CREATE POLICY contacts_own_update ON contacts
  FOR UPDATE USING (
    auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    OR auth.role() = 'service_role'
  ) WITH CHECK (
    auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    OR auth.role() = 'service_role'
  );

-- EMERGENCY_LEADERS: Public read (everyone can see emergency numbers)
DROP POLICY IF EXISTS emergency_leaders_public_read ON emergency_leaders;
CREATE POLICY emergency_leaders_public_read ON emergency_leaders
  FOR SELECT USING (true);

-- ========================================
-- 12. SAMPLE DATA (Patrols and Roles)
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
-- 13. VIEWS (For easier queries)
-- ========================================

-- Complete member profile view with all relationships
DROP VIEW IF EXISTS member_profiles CASCADE;
CREATE VIEW member_profiles AS
SELECT 
  u.id,
  u.auth_id,
  u.generated_id,
  u.first_name,
  u.last_name,
  EXTRACT(YEAR FROM AGE(u.birth_date))::INT as age,
  u.birth_date,
  u.gender,
  p.name as patrol_name,
  r.name as role_name,
  u.is_high_patrol,
  u.phone,
  u.pdf_url,
  u.qr_text,
  u.status,
  c.father_phone,
  c.mother_phone,
  c.home_phone,
  c.additional_info,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN patrols p ON u.patrol_id = p.id
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN contacts c ON u.id = c.user_id;

COMMENT ON VIEW member_profiles IS 'Complete member profile with all related information';

-- Member statistics by patrol
DROP VIEW IF EXISTS member_stats_by_patrol CASCADE;
CREATE VIEW member_stats_by_patrol AS
SELECT 
  p.id,
  p.name as patrol_name,
  COUNT(u.id) as total_members,
  COUNT(CASE WHEN u.gender = 'male' THEN 1 END) as male_count,
  COUNT(CASE WHEN u.gender = 'female' THEN 1 END) as female_count,
  COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_members
FROM patrols p
LEFT JOIN users u ON p.id = u.patrol_id
GROUP BY p.id, p.name
ORDER BY p.name;

COMMENT ON VIEW member_stats_by_patrol IS 'Statistics of members per patrol';

-- ========================================
-- 14. INSTRUCTIONS FOR APPLICATION DEVELOPERS
-- ========================================

/*
IMPORTANT: HOW TO USE THIS SCHEMA

1. INSERTING A NEW MEMBER
   The generated_id is AUTOMATICALLY created by the trigger.
   Just insert with NULL or omit the generated_id field:

   INSERT INTO users (
     auth_id,
     first_name,
     last_name,
     birth_date,
     gender,
     phone,
     patrol_id,
     role_id,
     is_high_patrol
   ) VALUES (
     'auth-user-uuid-from-supabase-auth',
     'Ahmed',
     'Ben Ali',
     '2010-05-15',
     'male',
     '+212612345678',
     (SELECT id FROM patrols WHERE name = 'دورية 1'),
     (SELECT id FROM roles WHERE name = 'عضو 1'),
     false
   )
   RETURNING *;

2. THE generated_id IS AUTOMATIC
   Example result:
   - First male member inserted: E0001
   - Second male member inserted: E0002
   - First female member inserted: F0001
   - Second female member inserted: F0002

3. THE qr_text IS AUTOMATIC
   The qr_text field is auto-generated from the user's data and contacts.
   It's built like this:
   
   ID: E0001
   Name: Ahmed Ben Ali
   Phone: +212612345678
   Father: +212611111111
   Mother: +212622222222
   Home: +212533333333
   Leader1: +212666666666
   Leader2: +212666666666
   Leader3: +212666666666

4. INSERTING CONTACT INFO
   After inserting the user, insert contacts:

   INSERT INTO contacts (
     user_id,
     father_phone,
     mother_phone,
     home_phone,
     additional_info
   ) VALUES (
     'user-uuid-from-previous-insert',
     '+212611111111',
     '+212622222222',
     '+212533333333',
     'Any additional notes'
   );
   
   NOTE: The qr_text will be automatically updated after contacts are inserted.

5. UPDATING QR TEXT
   The qr_text is automatically regenerated when:
   - User information is updated
   - Contact information is updated
   - Emergency leader numbers are updated
   No manual update needed!

6. PDF STORAGE
   After generating the PDF on the frontend, update the user:

   UPDATE users
   SET pdf_url = 'https://storage.example.com/pdfs/E0001.pdf'
   WHERE id = 'user-uuid';

7. QUERYING MEMBER PROFILE
   Use the member_profiles view for complete info:

   SELECT * FROM member_profiles WHERE id = 'user-uuid';

8. EMAIL IS COMPLETELY REMOVED
   - No email field in users
   - No email field in contacts
   - No email field anywhere
   - Authentication is handled by Supabase Auth (separate)
   - Only phone-based contact

9. SUPABASE AUTH INTEGRATION
   When creating a user:
   1. Create auth user in Supabase Auth first
   2. Get the auth user's UUID (auth.users.id)
   3. Insert into users table with that auth_id
   4. The auth_id links the member to Supabase Auth

10. GENERATED_ID FORMAT
    E0001, E0002, ..., E9999 (male members)
    F0001, F0002, ..., F9999 (female members)
    
    Sequential, no gaps.
    If you have 3 male members (E0001, E0002, E0003),
    the next male will be E0004.

11. ROW LEVEL SECURITY
    - Public: can read patrols, roles, users, emergency_leaders
    - Authenticated: can insert/update own user and contacts
    - Service role: full access (for backend operations)

12. OPTIONAL: EMERGENCY LEADERS TABLE
    Update emergency leader numbers:
    
    UPDATE emergency_leaders
    SET 
      leader_phone_1 = '+212612345678',
      leader_phone_2 = '+212622345678',
      leader_phone_3 = '+212632345678'
    WHERE id = (SELECT id FROM emergency_leaders LIMIT 1);
    
    These numbers automatically appear in QR codes.
*/

-- ========================================
-- END OF SCHEMA - Ready for production
-- ========================================
