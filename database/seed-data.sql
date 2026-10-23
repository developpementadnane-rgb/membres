-- ============================================
-- SEED DATA - TEST USERS AND SAMPLE CONTENT
-- ============================================
-- Use this script to populate test data
-- Run AFTER main schema.sql has been executed

-- NOTE: Passwords are bcryptjs hashed versions of "password123"
-- To generate new hashes, use: bcrypt.hash("password123", 10)

-- ============================================
-- PART 1: VERIFY DEFAULT DATA
-- ============================================

-- Check patrols exist
SELECT 'Patrols' as "Entity", COUNT(*) as "Count" FROM patrols;

-- Check roles exist  
SELECT 'Roles' as "Entity", COUNT(*) as "Count" FROM roles;

-- ============================================
-- PART 2: INSERT TEST USERS
-- ============================================

-- Test User 1: Male Admin/Leader
INSERT INTO users (
  generated_id, 
  first_name, 
  last_name, 
  birth_date, 
  gender,
  patrol_id, 
  role_id, 
  is_high_patrol,
  phone, 
  email, 
  password_hash,
  parent_first_name,
  parent_last_name,
  parent_phone,
  parent_email,
  parent_cin,
  parent_type
) VALUES (
  'E0001',
  'محمد',
  'أحمد',
  '2012-05-15',
  'male',
  1,
  1, -- رائد (Leader)
  true,
  '+212612345678',
  'mohammad@example.com',
  '$2b$10$wZy1BaGPDcF8hE9K3L5Nm.H7vQ8R2pX4sM9N5bL0vD2zY1eF4xG6C', -- password123
  'علي',
  'محمد',
  '+212798765432',
  'ali@example.com',
  'AB123456',
  'أب'
) ON CONFLICT (email) DO NOTHING;

-- Test User 2: Female Member
INSERT INTO users (
  generated_id,
  first_name,
  last_name,
  birth_date,
  gender,
  patrol_id,
  role_id,
  is_high_patrol,
  phone,
  email,
  password_hash,
  parent_first_name,
  parent_last_name,
  parent_phone
) VALUES (
  'F0002',
  'فاطمة',
  'علي',
  '2011-08-22',
  'female',
  2,
  5, -- عضو 1 (Member 1)
  false,
  '+212698765432',
  'fatima@example.com',
  '$2b$10$wZy1BaGPDcF8hE9K3L5Nm.H7vQ8R2pX4sM9N5bL0vD2zY1eF4xG6C', -- password123
  'خديجة',
  'محمود',
  '+212788888888'
) ON CONFLICT (email) DO NOTHING;

-- Test User 3: Male Assistant
INSERT INTO users (
  generated_id,
  first_name,
  last_name,
  birth_date,
  gender,
  patrol_id,
  role_id,
  is_high_patrol,
  phone,
  email,
  password_hash
) VALUES (
  'E0003',
  'عمر',
  'حسن',
  '2010-03-10',
  'male',
  3,
  2, -- مساعد (Assistant)
  false,
  '+212656789012',
  'omar@example.com',
  '$2b$10$wZy1BaGPDcF8hE9K3L5Nm.H7vQ8R2pX4sM9N5bL0vD2zY1eF4xG6C' -- password123
) ON CONFLICT (email) DO NOTHING;

-- Test User 4: Female Secretary
INSERT INTO users (
  generated_id,
  first_name,
  last_name,
  birth_date,
  gender,
  patrol_id,
  role_id,
  is_high_patrol,
  phone,
  email,
  password_hash
) VALUES (
  'F0004',
  'ليلى',
  'محمد',
  '2013-11-30',
  'female',
  4,
  3, -- كاتب (Secretary)
  false,
  '+212645678901',
  'layla@example.com',
  '$2b$10$wZy1BaGPDcF8hE9K3L5Nm.H7vQ8R2pX4sM9N5bL0vD2zY1eF4xG6C' -- password123
) ON CONFLICT (email) DO NOTHING;

-- Test User 5: Male Uniform Monitor
INSERT INTO users (
  generated_id,
  first_name,
  last_name,
  birth_date,
  gender,
  patrol_id,
  role_id,
  is_high_patrol,
  phone,
  email,
  password_hash
) VALUES (
  'E0005',
  'إبراهيم',
  'علي',
  '2011-07-18',
  'male',
  1,
  4, -- مراقب الزي (Uniform Monitor)
  false,
  '+212634567890',
  'ibrahim@example.com',
  '$2b$10$wZy1BaGPDcF8hE9K3L5Nm.H7vQ8R2pX4sM9N5bL0vD2zY1eF4xG6C' -- password123
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- PART 3: INSERT TEST REPORTS
-- ============================================

-- Report 1: Draft Report
INSERT INTO reports (
  created_by,
  report_date,
  location,
  patrol_stage,
  members_count,
  leaders_count,
  activities,
  objectives,
  full_report,
  recommendations,
  status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'E0001' LIMIT 1),
  '2024-02-10',
  'ملعب المدينة',
  'مبتدئ',
  12,
  2,
  'تدريبات رياضية وألعاب جماعية',
  'تحسين التناسق والعمل الجماعي',
  'تم إجراء جلسة تدريبية مكثفة للأعضاء الجدد. شارك جميع الأعضاء بنشاط في الأنشطة المخططة. تم التركيز على قيم الكشافة والعمل الجماعي.',
  'الاستمرار في التدريبات المنتظمة، تحضير الأعضاء للمخيم الصيفي',
  'submitted'
) ON CONFLICT DO NOTHING;

-- Report 2: Approved Report
INSERT INTO reports (
  created_by,
  report_date,
  location,
  patrol_stage,
  members_count,
  leaders_count,
  activities,
  objectives,
  full_report,
  recommendations,
  status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'F0002' LIMIT 1),
  '2024-02-05',
  'الحديقة المركزية',
  'متوسط',
  15,
  3,
  'نشاط بيئي وتنظيف الحديقة',
  'الحفاظ على البيئة ونشر الوعي البيئي',
  'نظمنا نشاطاً بيئياً ناجحاً حيث شارك أعضاء الفريق في تنظيف الحديقة المركزية. تم جمع كمية كبيرة من النفايات وتصنيفها. الأعضاء أبدوا التزاماً عالياً وروح عمل فريق ممتازة.',
  'توسيع النشاطات البيئية إلى مناطق أخرى',
  'approved'
);

-- Report 3: Draft Report
INSERT INTO reports (
  created_by,
  report_date,
  location,
  patrol_stage,
  members_count,
  leaders_count,
  activities,
  objectives,
  full_report,
  status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'E0003' LIMIT 1),
  '2024-02-13',
  'مقر الكشافة',
  'متقدم',
  10,
  2,
  'ورشة عمل في الإسعافات الأولية',
  'تعليم أساسيات الإسعافات الأولية',
  'تم تنظيم ورشة عمل تدريبية شاملة في الإسعافات الأولية بقيادة متخصص معتمد.',
  'draft'
);

-- ============================================
-- PART 4: INSERT TEST IDEAS
-- ============================================

-- Idea 1: New Activity Proposal
INSERT INTO ideas (
  created_by,
  title,
  description,
  resources,
  budget,
  contact_info,
  status,
  admin_notes
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'E0001' LIMIT 1),
  'مخيم الصيف التفاعلي',
  'تنظيم مخيم صيفي شامل يجمع بين الأنشطة التقليدية والحديثة لتطوير مهارات الأعضاء.',
  'خيام، معدات رياضية، مواد غذائية، سيارة نقل',
  5000,
  'mohammad@example.com',
  'submitted',
  'فكرة واعدة تحتاج إلى بحث أكثر عن التكاليف والموقع'
);

-- Idea 2: Educational Initiative
INSERT INTO ideas (
  created_by,
  title,
  description,
  resources,
  budget,
  contact_info,
  status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'F0002' LIMIT 1),
  'برنامج التعليم البيئي',
  'إطلاق برنامج تعليمي منتظم حول البيئة والاستدامة للأعضاء الأصغر سناً.',
  'أفلام تعليمية، كتب مرجعية، عينات حقيقية',
  800,
  'fatima@example.com',
  'under_review'
);

-- Idea 3: Technology Initiative
INSERT INTO ideas (
  created_by,
  title,
  description,
  resources,
  budget,
  status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'E0003' LIMIT 1),
  'ورشة البرمجة والتكنولوجيا',
  'تدريب الأعضاء على مبادئ البرمجة والتكنولوجيا الحديثة.',
  'أجهزة كمبيوتر محمولة، برامج تعليمية',
  1200,
  'approved'
);

-- Idea 4: Community Service
INSERT INTO ideas (
  created_by,
  title,
  description,
  resources,
  budget,
  status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'F0004' LIMIT 1),
  'مشروع مساعدة كبار السن',
  'برنامج منتظم لمساعدة كبار السن في المدينة من خلال زيارات أسبوعية.',
  'وسائل نقل، هدايا صغيرة',
  500,
  'rejected'
);

-- ============================================
-- PART 5: INSERT TEST ANNOUNCEMENTS
-- ============================================

-- Announcement 1: Active
INSERT INTO announcements (
  title,
  content,
  is_published,
  published_at
) VALUES (
  'ترحيب بالأعضاء الجدد',
  'نرحب بحرارة بجميع الأعضاء الجدد في فريق الكشافة الحسنية بصفرو. نتطلع إلى معكم ملح عام مليء بالإنجازات والذكريات الجميلة.',
  true,
  NOW() - INTERVAL '7 days'
);

-- Announcement 2: Active
INSERT INTO announcements (
  title,
  content,
  is_published,
  published_at
) VALUES (
  'اجتماع الفريق في يوم السبت',
  'يرجى ملاحظة أن اجتماع الفريق سيكون يوم السبت القادم الساعة 3 مساءً في مقر الكشافة. جميع الأعضاء مطالبون بالحضور.',
  true,
  NOW() - INTERVAL '2 days'
);

-- Announcement 3: Draft (Not published)
INSERT INTO announcements (
  title,
  content,
  is_published
) VALUES (
  'المخيم الصيفي قريباً',
  'جاري الإعداد للمخيم الصيفي الذي سيقام في شهر يوليو. سيتم توزيع التفاصيل قريباً.',
  false
);

-- ============================================
-- PART 6: VERIFICATION QUERIES
-- ============================================

-- Verify all data inserted
SELECT 'Users' as "Entity", COUNT(*) as "Total" FROM users
UNION ALL
SELECT 'Reports', COUNT(*) FROM reports
UNION ALL
SELECT 'Ideas', COUNT(*) FROM ideas
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcements;

-- Show user statistics
SELECT 
  p.name as "Patrol",
  COUNT(u.id) as "Members",
  SUM(CASE WHEN u.gender = 'male' THEN 1 ELSE 0 END) as "Males",
  SUM(CASE WHEN u.gender = 'female' THEN 1 ELSE 0 END) as "Females"
FROM patrols p
LEFT JOIN users u ON p.id = u.patrol_id
GROUP BY p.id, p.name
ORDER BY p.id;

-- Show report status summary
SELECT 
  status as "Status",
  COUNT(*) as "Count"
FROM reports
GROUP BY status
ORDER BY status;

-- Show ideas status summary
SELECT 
  status as "Status",
  COUNT(*) as "Count"
FROM ideas
GROUP BY status
ORDER BY status;

-- Show published announcements
SELECT 
  title as "Title",
  published_at as "Published",
  is_published as "Active"
FROM announcements
WHERE is_published = true
ORDER BY published_at DESC;

-- ============================================
-- NOTES
-- ============================================

/*
PASSWORD FOR ALL TEST USERS: password123

Test users created:
- E0001: محمد أحمد (Male, Leader, High Patrol)
- F0002: فاطمة علي (Female, Member)
- E0003: عمر حسن (Male, Assistant)
- F0004: ليلى محمد (Female, Secretary)
- E0005: إبراهيم علي (Male, Uniform Monitor)

To reset/delete test data, run:
DELETE FROM ideas;
DELETE FROM reports;
DELETE FROM users WHERE generated_id IN ('E0001', 'F0002', 'E0003', 'F0004', 'E0005');
DELETE FROM announcements;

To generate bcrypt hashes for new passwords, use Node.js:
const bcrypt = require('bcryptjs');
bcrypt.hash('yourPassword123', 10).then(hash => console.log(hash));
*/

-- ============================================
-- END OF SEED DATA
-- ============================================
