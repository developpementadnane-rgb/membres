-- ============================================
-- REGISTRATION DATA - USEFUL QUERIES
-- Scoutisme Hassania Safi
-- ============================================

-- ============================================
-- 1. INSERT NEW MEMBER (Complete Registration)
-- ============================================
-- This is how the form submission will insert a new member

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
  guardian_relationship_other,
  guardian_cin,
  father_phone,
  mother_phone,
  home_phone,
  additional_info,
  qr_code_data
) VALUES (
  'أحمد',                                -- first_name
  'بن علي',                              -- last_name
  '2010-05-15',                         -- birth_date (must be 12-20 years old)
  'male',                               -- gender (male or female)
  (SELECT id FROM patrols WHERE name = 'دورية 1'),  -- patrol_id
  (SELECT id FROM roles WHERE name = 'عضو 1'),      -- role_id
  FALSE,                                -- is_high_patrol
  '+212612345678',                      -- user_phone
  'محمد',                               -- guardian_first_name
  'بن علي',                             -- guardian_last_name
  'père',                               -- guardian_relationship
  NULL,                                 -- guardian_relationship_other
  'AB123456',                           -- guardian_cin
  '+212612111111',                      -- father_phone
  '+212611111111',                      -- mother_phone
  '+212522222222',                      -- home_phone
  'Notes or additional information',    -- additional_info
  'ID: E0001\nName: أحمد بن علي\nFather: +212612111111\n...'  -- qr_code_data
);
-- The generated_id (E0001, E0002, etc.) will be auto-generated!

-- ============================================
-- 2. UPDATE PDF URL AFTER GENERATION
-- ============================================
-- After generating a PDF, update the user record with the PDF URL

UPDATE users
SET pdf_url = 'https://storage.supabase.co/object/public/reports-pdfs/E0001.pdf'
WHERE generated_id = 'E0001';

-- Update QR code data (if generated separately)
UPDATE users
SET qr_code_data = 'ID: E0001\nName: أحمد بن علي\nFather: +212612111111\nMother: +212611111111\nHome: +212522222222'
WHERE generated_id = 'E0001';

-- ============================================
-- 3. RETRIEVE ALL MEMBERS
-- ============================================

-- All members with complete info
SELECT * FROM member_profiles
ORDER BY created_at DESC;

-- All members as JSON (for API responses)
SELECT 
  generated_id,
  first_name,
  last_name,
  birth_date,
  gender,
  patrol_name,
  role_name,
  user_phone,
  guardian_first_name,
  guardian_last_name,
  guardian_relationship,
  guardian_cin,
  father_phone,
  mother_phone,
  home_phone,
  additional_info,
  pdf_url,
  created_at
FROM member_profiles
ORDER BY created_at DESC;

-- ============================================
-- 4. SEARCH AND FILTER
-- ============================================

-- Find member by generated ID
SELECT * FROM member_profiles WHERE generated_id = 'E0001';

-- Find all members by gender
SELECT * FROM member_profiles WHERE gender = 'male';
SELECT * FROM member_profiles WHERE gender = 'female';

-- Find all members by patrol
SELECT * FROM member_profiles WHERE patrol_name = 'دورية 1';

-- Find all members with a specific role
SELECT * FROM member_profiles WHERE role_name = 'عضو 1';

-- Find all members of high patrol
SELECT * FROM member_profiles WHERE is_high_patrol = TRUE;

-- Find member by phone
SELECT * FROM member_profiles WHERE user_phone = '+212612345678';

-- Find members by age
SELECT * FROM member_profiles 
WHERE age BETWEEN 12 AND 20
ORDER BY age DESC;

-- Find members created in last 7 days
SELECT * FROM member_profiles 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================
-- 5. STATISTICS AND COUNTS
-- ============================================

-- Total members
SELECT COUNT(*) as total_members FROM users;

-- Members by gender
SELECT 
  gender,
  COUNT(*) as count
FROM users
GROUP BY gender;

-- Members by patrol
SELECT 
  p.name as patrol,
  COUNT(u.id) as count,
  COUNT(CASE WHEN u.gender = 'male' THEN 1 END) as males,
  COUNT(CASE WHEN u.gender = 'female' THEN 1 END) as females
FROM patrols p
LEFT JOIN users u ON p.id = u.patrol_id
GROUP BY p.id, p.name
ORDER BY p.name;

-- Members by role
SELECT 
  r.name as role,
  COUNT(u.id) as count
FROM roles r
LEFT JOIN users u ON r.id = u.role_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- High patrol members
SELECT COUNT(*) as high_patrol_members FROM users WHERE is_high_patrol = TRUE;

-- Members with PDF generated
SELECT COUNT(*) as pdf_count FROM users WHERE pdf_url IS NOT NULL;

-- Average age of members
SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(birth_date))), 2) as avg_age FROM users;

-- Age distribution
SELECT 
  EXTRACT(YEAR FROM AGE(birth_date))::INT as age,
  COUNT(*) as count
FROM users
GROUP BY age
ORDER BY age;

-- ============================================
-- 6. EXPORT DATA FOR REPORTS
-- ============================================

-- Export all member data as CSV-friendly format
SELECT 
  generated_id as 'ID',
  first_name as 'First Name',
  last_name as 'Last Name',
  birth_date as 'Birth Date',
  gender as 'Gender',
  patrol_name as 'Patrol',
  role_name as 'Role',
  user_phone as 'Phone',
  guardian_first_name as 'Guardian First',
  guardian_last_name as 'Guardian Last',
  guardian_relationship as 'Relation',
  guardian_cin as 'Guardian CIN',
  father_phone as 'Father Phone',
  mother_phone as 'Mother Phone',
  additional_info as 'Notes',
  pdf_url as 'PDF Link',
  created_at as 'Registration Date'
FROM member_profiles
ORDER BY created_at DESC;

-- Export only members with PDF generated
SELECT 
  generated_id,
  first_name,
  last_name,
  patrol_name,
  user_phone,
  pdf_url
FROM member_profiles
WHERE pdf_url IS NOT NULL
ORDER BY created_at DESC;

-- ============================================
-- 7. UPDATE OPERATIONS
-- ============================================

-- Update member information
UPDATE users
SET 
  first_name = 'محمد',
  last_name = 'علي',
  updated_at = NOW()
WHERE generated_id = 'E0001';

-- Update guardian information
UPDATE users
SET 
  guardian_first_name = 'علي',
  guardian_last_name = 'محمد',
  guardian_relationship = 'mère',
  guardian_cin = 'AB654321',
  updated_at = NOW()
WHERE generated_id = 'E0001';

-- Update contact information
UPDATE users
SET 
  father_phone = '+212612222222',
  mother_phone = '+212611222222',
  home_phone = '+212522333333',
  updated_at = NOW()
WHERE generated_id = 'E0001';

-- Update patrol assignment
UPDATE users
SET 
  patrol_id = (SELECT id FROM patrols WHERE name = 'دورية 2'),
  updated_at = NOW()
WHERE generated_id = 'E0001';

-- Update role assignment
UPDATE users
SET 
  role_id = (SELECT id FROM roles WHERE name = 'مساعد'),
  is_high_patrol = TRUE,
  updated_at = NOW()
WHERE generated_id = 'E0001';

-- ============================================
-- 8. DELETE OPERATIONS
-- ============================================

-- Delete a member (cascades to related records)
DELETE FROM users WHERE generated_id = 'E0001';

-- Soft delete by marking a field (if you want to keep data for audit)
UPDATE users
SET 
  user_phone = NULL,
  updated_at = NOW()
WHERE generated_id = 'E0001';

-- ============================================
-- 9. DATA INTEGRITY CHECKS
-- ============================================

-- Check for duplicate phone numbers
SELECT user_phone, COUNT(*) 
FROM users 
GROUP BY user_phone 
HAVING COUNT(*) > 1;

-- Check for invalid generated IDs
SELECT generated_id FROM users 
WHERE NOT (generated_id ~ '^[EF][0-9]{4}$');

-- Check for members outside age range
SELECT * FROM users 
WHERE EXTRACT(YEAR FROM AGE(birth_date)) NOT BETWEEN 12 AND 20;

-- Check for missing patrol assignments
SELECT * FROM users WHERE patrol_id IS NULL;

-- Check for missing role assignments
SELECT * FROM users WHERE role_id IS NULL;

-- Check for missing PDF URLs
SELECT generated_id, first_name, last_name FROM users 
WHERE pdf_url IS NULL;

-- ============================================
-- 10. BACKUP AND RESTORE
-- ============================================

-- Backup: Get all users data
SELECT 
  u.*,
  p.name as patrol_name,
  r.name as role_name
FROM users u
LEFT JOIN patrols p ON u.patrol_id = p.id
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at;

-- Get creation date for export filename
SELECT NOW()::DATE as backup_date;

-- ============================================
-- NOTES FOR DEVELOPERS
-- ============================================

/*
1. NO EMAIL FIELDS:
   - Email has been completely removed from the system
   - No email field in the users table
   - No email in the registration form
   - No email validation
   - No email field in member profiles

2. FORM SUBMISSION FLOW:
   a) User fills registration form (no email field)
   b) Frontend validates all fields
   c) Frontend sends POST /api/register with data
   d) Server validates again (never trust client)
   e) Server inserts into users table
   f) generated_id auto-generates (E0001, F0001, etc.)
   
3. PDF GENERATION:
   a) User fills form and sees confirmation page
   b) Frontend generates PDF with jsPDF
   c) Frontend generates QR code with qrcode library
   d) Frontend uploads PDF to Supabase storage
   e) Frontend gets public URL from storage
   f) Frontend updates users.pdf_url with the URL
   
4. QUERYING:
   - Use member_profiles VIEW for most queries
   - It joins users → patrols → roles automatically
   - Makes queries simpler and more readable
   
5. PERFORMANCE:
   - All important columns have indexes
   - Avoid N+1 queries by using views
   - Paginate results (LIMIT 20 OFFSET 0)
   - Select only needed columns

6. SECURITY:
   - Always validate input on server side
   - Use prepared statements (Supabase handles this)
   - Never expose raw data in logs
   - Use RLS policies in Supabase
   
7. TIMESTAMPS:
   - created_at: Set once, never changes
   - updated_at: Auto-updated on every change
   - Always use UTC/ISO format for dates
   - Never manually set timestamps

8. GENERATED ID FORMAT:
   - E0001 to E9999 for males
   - F0001 to F9999 for females
   - Auto-generated on insert (don't set manually)
   - Used as primary identifier for members
   - Printed on PDF and embedded in QR code
*/
