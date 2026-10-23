-- ============================================
-- TEST SCRIPT FOR SHM REGISTRATION SCHEMA
-- Vérifier que tout fonctionne correctement
-- ============================================

-- ============================================
-- 1. VÉRIFIER QUE LES TABLES EXISTENT
-- ============================================
SELECT 'TEST 1: Check tables exist' AS test_name;

SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('patrols', 'roles', 'users')
ORDER BY table_name;

-- Expected: 3 rows (patrols, roles, users)

-- ============================================
-- 2. VÉRIFIER LES COLONNES DE LA TABLE USERS
-- ============================================
SELECT 'TEST 2: Check users table columns' AS test_name;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected: All columns including pdf_url, qr_code_url, documents_generated_at

-- ============================================
-- 3. VÉRIFIER LES COLONNES PDF & QR CODE
-- ============================================
SELECT 'TEST 3: Check PDF and QR code columns' AS test_name;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('pdf_url', 'qr_code_url', 'documents_generated_at');

-- Expected: 3 rows with correct data types

-- ============================================
-- 4. VÉRIFIER QUE LES INDEX EXISTENT
-- ============================================
SELECT 'TEST 4: Check indexes' AS test_name;

SELECT indexname FROM pg_indexes 
WHERE tablename IN ('patrols', 'roles', 'users')
ORDER BY indexname;

-- Expected: Multiple indexes including idx_users_phone, idx_users_patrol_id, etc

-- ============================================
-- 5. VÉRIFIER QUE LES TRIGGERS EXISTENT
-- ============================================
SELECT 'TEST 5: Check triggers' AS test_name;

SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE event_object_table IN ('users', 'patrols', 'roles')
ORDER BY trigger_name;

-- Expected: Multiple triggers (update_users_updated_at, trigger_generate_member_id, etc)

-- ============================================
-- 6. VÉRIFIER QUE LES FONCTIONS EXISTENT
-- ============================================
SELECT 'TEST 6: Check functions' AS test_name;

SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('generate_member_id', 'update_updated_at_column');

-- Expected: 2 rows

-- ============================================
-- 7. INSÉRER DES DONNÉES DE TEST
-- ============================================
SELECT 'TEST 7: Insert test data' AS test_name;

-- Vérifier que les patrols et roles existent déjà
SELECT COUNT(*) as patrol_count FROM patrols;
SELECT COUNT(*) as role_count FROM roles;

-- ============================================
-- 8. TESTER L'INSERTION D'UN UTILISATEUR MALE
-- ============================================
SELECT 'TEST 8: Insert male user (should get E0001)' AS test_name;

INSERT INTO users (
  first_name,
  last_name,
  birth_date,
  gender,
  user_phone,
  patrol_id,
  role_id,
  guardian_first_name,
  guardian_last_name,
  guardian_relationship
) 
SELECT
  'محمد',
  'علي',
  '2010-05-15'::DATE,
  'male',
  '+212612345678',
  id as patrol_id,
  (SELECT id FROM roles LIMIT 1) as role_id,
  'أحمد',
  'علي',
  'father'
FROM patrols
LIMIT 1
RETURNING id, generated_id, first_name, gender;

-- Expected: User with generated_id starting with 'E' (e.g., E0001)

-- ============================================
-- 9. TESTER L'INSERTION D'UN UTILISATEUR FEMALE
-- ============================================
SELECT 'TEST 9: Insert female user (should get F0001)' AS test_name;

INSERT INTO users (
  first_name,
  last_name,
  birth_date,
  gender,
  user_phone,
  patrol_id,
  role_id,
  guardian_first_name,
  guardian_last_name,
  guardian_relationship
)
SELECT
  'فاطمة',
  'عبدالله',
  '2012-08-20'::DATE,
  'female',
  '+212687654321',
  id as patrol_id,
  (SELECT id FROM roles LIMIT 1) as role_id,
  'عائشة',
  'عبدالله',
  'mother'
FROM patrols
LIMIT 1
RETURNING id, generated_id, first_name, gender;

-- Expected: User with generated_id starting with 'F' (e.g., F0001)

-- ============================================
-- 10. VÉRIFIER QUE LES DONNÉES SONT INSÉRÉES
-- ============================================
SELECT 'TEST 10: Verify inserted users' AS test_name;

SELECT 
  generated_id,
  first_name,
  last_name,
  gender,
  user_phone,
  created_at,
  updated_at,
  pdf_url,
  qr_code_url
FROM users
WHERE first_name IN ('محمد', 'فاطمة')
ORDER BY created_at DESC;

-- Expected: 2 rows with correct data

-- ============================================
-- 11. TESTER LA MISE À JOUR (updated_at trigger)
-- ============================================
SELECT 'TEST 11: Test updated_at trigger' AS test_name;

-- Get the first user's updated_at before update
WITH before_update AS (
  SELECT id, updated_at 
  FROM users 
  WHERE first_name = 'محمد'
  LIMIT 1
)
SELECT 
  id,
  updated_at as updated_at_before,
  NOW() as current_time
FROM before_update;

-- Now update the user
UPDATE users 
SET additional_info = 'تم الاختبار'
WHERE first_name = 'محمد'
RETURNING id, updated_at;

-- Expected: updated_at should be updated to NOW()

-- ============================================
-- 12. TESTER LA VUE member_profiles
-- ============================================
SELECT 'TEST 12: Test member_profiles view' AS test_name;

SELECT 
  generated_id,
  first_name,
  last_name,
  age,
  gender,
  patrol_name,
  role_name,
  user_phone
FROM member_profiles
WHERE first_name IN ('محمد', 'فاطمة')
ORDER BY generated_id;

-- Expected: 2 rows with complete profile info

-- ============================================
-- 13. TESTER L'INSERTION DE PDF ET QR CODE
-- ============================================
SELECT 'TEST 13: Test PDF and QR code insertion' AS test_name;

UPDATE users
SET 
  pdf_url = 'https://example.com/pdf/member_E0001.pdf',
  qr_code_url = 'https://example.com/qr/member_E0001.png',
  documents_generated_at = NOW()
WHERE generated_id = 'E0001'
RETURNING 
  generated_id,
  pdf_url,
  qr_code_url,
  documents_generated_at;

-- Expected: Row with PDF and QR code URLs populated

-- ============================================
-- 14. VÉRIFIER LES CONTRAINTES D'ÂGE
-- ============================================
SELECT 'TEST 14: Test age constraint (should fail - too young)' AS test_name;

-- This should fail because age < 10
INSERT INTO users (
  first_name,
  last_name,
  birth_date,
  gender,
  user_phone,
  patrol_id,
  role_id
)
SELECT
  'صغير',
  'جداً',
  '2020-01-01'::DATE,
  'male',
  '+212699999999',
  id as patrol_id,
  (SELECT id FROM roles LIMIT 1) as role_id
FROM patrols
LIMIT 1;

-- Expected: ERROR due to age constraint

-- ============================================
-- 15. VÉRIFIER LES CONTRAINTES DE TÉLÉPHONE
-- ============================================
SELECT 'TEST 15: Test phone constraint (should fail - invalid)' AS test_name;

-- This should fail because phone format is invalid
INSERT INTO users (
  first_name,
  last_name,
  birth_date,
  gender,
  user_phone,
  patrol_id,
  role_id
)
SELECT
  'تيسير',
  'محمد',
  '2011-06-10'::DATE,
  'male',
  '123456789', -- Invalid format
  id as patrol_id,
  (SELECT id FROM roles LIMIT 1) as role_id
FROM patrols
LIMIT 1;

-- Expected: ERROR due to phone constraint

-- ============================================
-- 16. RÉSUMÉ FINAL
-- ============================================
SELECT 'TEST 16: Final summary' AS test_name;

SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE gender = 'male') as male_users,
  (SELECT COUNT(*) FROM users WHERE gender = 'female') as female_users,
  (SELECT COUNT(*) FROM users WHERE pdf_url IS NOT NULL) as users_with_pdf,
  (SELECT COUNT(*) FROM users WHERE qr_code_url IS NOT NULL) as users_with_qr
FROM (SELECT 1) as dummy;

-- Expected: Summary of all inserted data

-- ============================================
-- 17. AFFICHER TOUS LES UTILISATEURS AVEC DÉTAILS COMPLETS
-- ============================================
SELECT 'TEST 17: Display all users with complete details' AS test_name;

SELECT 
  generated_id,
  first_name || ' ' || last_name as full_name,
  gender,
  EXTRACT(YEAR FROM AGE(birth_date))::INT as age,
  user_phone,
  pdf_url,
  qr_code_url,
  documents_generated_at,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- FIN DES TESTS
-- ============================================
SELECT 'ALL TESTS COMPLETED - Vérifiez les résultats ci-dessus' AS final_message;
