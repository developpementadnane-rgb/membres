-- ========================================
-- SHM MEMBER MANAGEMENT SYSTEM
-- Complete Schema - Supabase Ready
-- ========================================
-- Full member identification system with PDF, QR codes, and contact management
-- Fully compatible with existing reports and sessions tables
-- Production-ready with triggers, indexes, and RLS policies

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

-- ========================================
-- 2. TABLE: roles (Rôles dans la patrouille)
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE roles IS 'Roles within patrols (رائد, مساعد, etc.)';

-- ========================================
-- 3. TABLE: users (Membres - Core Member Data)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  -- Primary key and identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_id TEXT UNIQUE NOT NULL,
  
  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  
  -- Scout membership
  patrol_id UUID REFERENCES patrols(id),
  role_id UUID REFERENCES roles(id),
  is_high_patrol BOOLEAN DEFAULT FALSE,
  
  -- Contact information (member only - no email)
  phone TEXT NOT NULL,
  
  -- Generated documents
  pdf_url TEXT,
  qr_text TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE users IS 'Scout members - main registration table';
COMMENT ON COLUMN users.id IS 'Unique member identifier (UUID)';
COMMENT ON COLUMN users.generated_id IS 'Human-readable member ID (E0001-E9999 for male, F0001-F9999 for female)';
COMMENT ON COLUMN users.phone IS 'Member phone number (primary contact)';
COMMENT ON COLUMN users.pdf_url IS 'URL to generated PDF member sheet';
COMMENT ON COLUMN users.qr_text IS 'Text encoded in QR code (member info + emergency contacts)';
COMMENT ON COLUMN users.is_high_patrol IS 'Member of high patrol (دورية عليا)';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_generated_id ON users(generated_id);
CREATE INDEX IF NOT EXISTS idx_users_patrol_id ON users(patrol_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ========================================
-- 4. TABLE: contacts (Emergency & Family Contacts)
-- ========================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Family contact information
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

-- Insert default emergency leader record (only once)
INSERT INTO emergency_leaders (id, leader_phone_1, leader_phone_2, leader_phone_3)
VALUES (gen_random_uuid(), '+212666666666', '+212666666666', '+212666666666')
ON CONFLICT DO NOTHING;

-- ========================================
-- 6. FUNCTION: Generate Member ID Sequentially
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

COMMENT ON FUNCTION generate_member_id(TEXT) IS 'Generate next sequential member ID based on gender';

-- ========================================
-- 7. FUNCTION: Build QR Code Text
-- ========================================
CREATE OR REPLACE FUNCTION build_qr_text(
  p_generated_id TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
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
  
  -- Build QR code text
  qr_content := 'ID: ' || p_generated_id || E'\n' ||
                'Name: ' || p_first_name || ' ' || p_last_name || E'\n';
  
  -- Add family contacts if available
  IF v_contact.father_phone IS NOT NULL THEN
    qr_content := qr_content || 'Father: ' || v_contact.father_phone || E'\n';
  END IF;
  
  IF v_contact.mother_phone IS NOT NULL THEN
    qr_content := qr_content || 'Mother: ' || v_contact.mother_phone || E'\n';
  END IF;
  
  IF v_contact.home_phone IS NOT NULL THEN
    qr_content := qr_content || 'Home: ' || v_contact.home_phone || E'\n';
  END IF;
  
  -- Add emergency leader contacts
  IF v_emergency.leader_phone_1 IS NOT NULL THEN
    qr_content := qr_content || 'Leader 1: ' || v_emergency.leader_phone_1 || E'\n';
  END IF;
  
  IF v_emergency.leader_phone_2 IS NOT NULL THEN
    qr_content := qr_content || 'Leader 2: ' || v_emergency.leader_phone_2 || E'\n';
  END IF;
  
  IF v_emergency.leader_phone_3 IS NOT NULL THEN
    qr_content := qr_content || 'Leader 3: ' || v_emergency.leader_phone_3;
  END IF;
  
  RETURN qr_content;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_qr_text(TEXT, TEXT, TEXT, UUID) IS 'Build QR code text content with member and emergency info';

-- ========================================
-- 8. TRIGGER: Auto-update timestamp
-- ========================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_contacts_timestamp
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_emergency_leaders_timestamp
  BEFORE UPDATE ON emergency_leaders
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ========================================
-- 9. TRIGGER: Auto-generate QR text on insert/update
-- ========================================
CREATE OR REPLACE FUNCTION auto_generate_qr_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.generated_id IS NOT NULL AND NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.qr_text := build_qr_text(NEW.generated_id, NEW.first_name, NEW.last_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_qr_text_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_qr_text();

-- ========================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_leaders ENABLE ROW LEVEL SECURITY;

-- PATROLS: Public read
CREATE POLICY patrols_public_read ON patrols
  FOR SELECT USING (true);

-- ROLES: Public read
CREATE POLICY roles_public_read ON roles
  FOR SELECT USING (true);

-- USERS: Public read, service role full access
CREATE POLICY users_public_read ON users
  FOR SELECT USING (true);

-- CONTACTS: Service role only (authenticated inserts allowed)
CREATE POLICY contacts_authenticated_insert ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- EMERGENCY_LEADERS: Public read
CREATE POLICY emergency_leaders_public_read ON emergency_leaders
  FOR SELECT USING (true);

-- ========================================
-- 11. SAMPLE DATA (Initial Setup)
-- ========================================

-- Insert sample patrols
INSERT INTO patrols (name, description) VALUES
  ('دورية 1', 'First patrol'),
  ('دورية 2', 'Second patrol'),
  ('دورية 3', 'Third patrol'),
  ('دورية 4', 'Fourth patrol')
ON CONFLICT (name) DO NOTHING;

-- Insert sample roles
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
-- 12. VIEWS (Optional - for easier queries)
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
  u.phone,
  u.pdf_url,
  u.qr_text,
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

-- ========================================
-- 13. NOTES FOR APPLICATION IMPLEMENTATION
-- ========================================

-- IMPORTANT NOTES FOR DEVELOPERS:
--
-- 1. GENERATED_ID AUTO-GENERATION
--    When inserting a new user, use the generate_member_id(gender) function:
--    
--    INSERT INTO users (generated_id, first_name, last_name, birth_date, gender, phone, patrol_id, role_id)
--    VALUES (
--      generate_member_id('male'),  -- or 'female'
--      'Ahmed',
--      'Ben Ali',
--      '2010-05-15',
--      'male',
--      '+212612345678',
--      (SELECT id FROM patrols WHERE name = 'دورية 1'),
--      (SELECT id FROM roles WHERE name = 'عضو 1')
--    );
--
-- 2. QR_TEXT AUTO-GENERATION
--    The qr_text field is automatically populated by the trigger.
--    You don't need to manually set it.
--
-- 3. CONTACTS INSERTION
--    After inserting a user, insert contact information:
--    
--    INSERT INTO contacts (user_id, father_phone, mother_phone, home_phone, additional_info)
--    VALUES (
--      'user-uuid-here',
--      '+212612345678',
--      '+212611111111',
--      '+212522222222',
--      'Any additional notes'
--    );
--
-- 4. PDF_URL STORAGE
--    After generating the PDF on the frontend, update the user record:
--    
--    UPDATE users
--    SET pdf_url = 'https://storage.example.com/path/to/pdf'
--    WHERE id = 'user-uuid-here';
--
-- 5. EMAIL REMOVAL
--    Email is completely removed from this schema.
--    Authentication is handled by Supabase Auth separately.
--    No email field exists in users, contacts, or any other table.
--
-- 6. QR CODE ENCODING
--    Frontend generates QR code from the qr_text field.
--    Example:
--    ID: E0001
--    Name: Ahmed Ben Ali
--    Father: +212612345678
--    Mother: +212611111111
--    Home: +212522222222
--    Leader 1: +212666666666
--    Leader 2: +212666666666
--    Leader 3: +212666666666
--
-- 7. DATABASE COMPATIBILITY
--    This schema is fully compatible with existing tables:
--    - reports
--    - sessions
--    No modifications needed to those tables.

-- ========================================
-- END OF SCHEMA
-- ========================================
