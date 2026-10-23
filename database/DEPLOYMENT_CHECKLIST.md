# ✅ Database Deployment Checklist

## 📋 Pre-Deployment Phase

### Setup Verification
- [ ] Supabase project created
- [ ] Project URL and API keys obtained
- [ ] `.env.local` file created with keys
- [ ] `.env.local` added to `.gitignore`
- [ ] SQL schema file (`database/schema.sql`) downloaded

---

## 🗄️ Phase 1: Database Schema Deployment

### Schema Execution
- [ ] Open Supabase SQL Editor
- [ ] Create new query
- [ ] Paste entire content from `database/schema.sql`
- [ ] Execute query successfully
- [ ] No errors in execution log
- [ ] Execution completed without warnings

### Table Verification
In Table Editor, verify all tables exist:
- [ ] `patrols` (4 rows)
- [ ] `roles` (7 rows)
- [ ] `users` (0 rows - empty)
- [ ] `reports` (0 rows - empty)
- [ ] `ideas` (0 rows - empty)
- [ ] `announcements` (0 rows - empty)
- [ ] `audit_logs` (0 rows - empty)

### Column Verification
For each table, verify:
- [ ] Correct column names
- [ ] Correct data types
- [ ] Correct constraints (NOT NULL, UNIQUE, etc.)
- [ ] Default values set correctly

### Index Verification
Execute in SQL Editor:
```sql
SELECT * FROM pg_indexes 
WHERE tablename IN ('users', 'reports', 'ideas');
```
- [ ] 5 indexes on `users` table
- [ ] 3 indexes on `reports` table
- [ ] 3 indexes on `ideas` table

---

## 🔐 Phase 2: Security Configuration

### Row Level Security (RLS)
Execute in SQL Editor:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
```
Verify RLS enabled:
- [ ] `users` RLS enabled
- [ ] `reports` RLS enabled
- [ ] `ideas` RLS enabled

### Storage Buckets (Optional)
In Storage section:
- [ ] `reports-pdfs` bucket created (Private)
- [ ] `announcements-images` bucket created (Private)
- [ ] Bucket policies configured

---

## 📊 Phase 3: Default Data Verification

### Default Patrols
Execute:
```sql
SELECT * FROM patrols ORDER BY id;
```
Verify 4 rows:
- [ ] دورية 1
- [ ] دورية 2
- [ ] دورية 3
- [ ] دورية 4

### Default Roles
Execute:
```sql
SELECT * FROM roles ORDER BY id;
```
Verify 7 rows:
- [ ] رائد
- [ ] مساعد
- [ ] كاتب
- [ ] مراقب الزي
- [ ] عضو 1
- [ ] عضو 2
- [ ] عضو 3

---

## 🧪 Phase 4: Data Validation Tests

### Test 1: Age Constraint (12-15 years only)
```sql
-- This should FAIL (age 11)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'TEST01', 'محمد', 'أحمد', '2013-01-01', 'male',
  1, 1, '+212612345678', 'test1@test.com', 'hash'
);
```
- [ ] Insert fails with age constraint error

### Test 2: Phone Format Validation
```sql
-- This should SUCCEED (+212 format)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'TEST02', 'فاطمة', 'علي', '2012-01-01', 'female',
  1, 1, '+212612345678', 'test2@test.com', 'hash'
);

-- This should SUCCEED (0212 format)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'TEST03', 'عمر', 'حسن', '2011-01-01', 'male',
  1, 1, '0612345678', 'test3@test.com', 'hash'
);

-- This should FAIL (invalid format)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'TEST04', 'ليلى', 'محمد', '2013-01-01', 'female',
  1, 1, '612345678', 'test4@test.com', 'hash'
);
```
- [ ] Valid +212 format succeeds
- [ ] Valid 0212 format succeeds
- [ ] Invalid format fails

### Test 3: Unique Constraints
```sql
-- Insert first user
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0099', 'محمد', 'أحمد', '2012-01-01', 'male',
  1, 1, '+212612345699', 'unique@test.com', 'hash'
);

-- Try to insert duplicate email - should FAIL
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0100', 'فاطمة', 'علي', '2011-01-01', 'female',
  1, 1, '+212612345698', 'unique@test.com', 'hash'
);
```
- [ ] First insert succeeds
- [ ] Duplicate email fails with constraint error

### Test 4: Gender Enum Check
```sql
-- This should SUCCEED (valid gender)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0101', 'محمد', 'أحمد', '2012-01-01', 'male',
  1, 1, '+212612345691', 'gender1@test.com', 'hash'
);

-- This should FAIL (invalid gender)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0102', 'أحمد', 'محمد', '2012-01-01', 'other',
  1, 1, '+212612345692', 'gender2@test.com', 'hash'
);
```
- [ ] Valid gender (male) succeeds
- [ ] Invalid gender (other) fails

### Test 5: Foreign Key Constraints
```sql
-- This should SUCCEED (valid patrol_id)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0103', 'محمد', 'أحمد', '2012-01-01', 'male',
  1, 1, '+212612345693', 'fk1@test.com', 'hash'
);

-- This should FAIL (non-existent patrol_id)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0104', 'فاطمة', 'علي', '2011-01-01', 'female',
  999, 1, '+212612345694', 'fk2@test.com', 'hash'
);
```
- [ ] Valid patrol_id succeeds
- [ ] Invalid patrol_id fails with FK error

---

## 🧬 Phase 5: Relationship Tests

### Test 1: Patrol - User Relationship
```sql
-- Insert user with specific patrol
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0200', 'محمد', 'أحمد', '2012-06-01', 'male',
  2, 1, '+212634567890', 'patrol@test.com', 'hash'
);

-- Query user with patrol info
SELECT u.first_name, u.last_name, p.name as patrol_name
FROM users u
JOIN patrols p ON u.patrol_id = p.id
WHERE u.generated_id = 'E0200';
```
- [ ] User inserted successfully
- [ ] JOIN returns user's patrol name
- [ ] Data relationship verified

### Test 2: Role - User Relationship
```sql
-- Query user with role info
SELECT u.first_name, u.last_name, r.name as role_name
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.generated_id = 'E0200';
```
- [ ] JOIN returns user's role name
- [ ] Role relationship verified

### Test 3: Cascade Delete (Reports)
```sql
-- Get user ID
SELECT id FROM users WHERE generated_id = 'E0200';

-- Insert report for this user
INSERT INTO reports (
  created_by, report_date, full_report, status
) VALUES (
  (SELECT id FROM users WHERE generated_id = 'E0200'),
  NOW()::DATE,
  'Test report',
  'draft'
);

-- Verify report exists
SELECT COUNT(*) FROM reports 
WHERE created_by = (SELECT id FROM users WHERE generated_id = 'E0200');

-- Delete user
DELETE FROM users WHERE generated_id = 'E0200';

-- Verify reports are deleted (cascade)
SELECT COUNT(*) FROM reports 
WHERE created_by = (SELECT id FROM users WHERE generated_id = 'E0200');
```
- [ ] Report inserted successfully
- [ ] User deletion deletes cascade reports
- [ ] Final count is 0

### Test 4: Restrict Delete (Patrol)
```sql
-- Try to delete a patrol that has users - should FAIL
DELETE FROM patrols WHERE id = 1;
```
- [ ] Delete fails with FK constraint error
- [ ] Patrol is protected from deletion

---

## 📈 Phase 6: Test Data Population

### Insert Seed Data
```bash
# Copy seed-data.sql content to SQL Editor
# Execute seed-data.sql
```

- [ ] Seed data script executes without errors
- [ ] 5 test users created
- [ ] 3 test reports created
- [ ] 4 test ideas created
- [ ] 3 test announcements created

### Verify Test Data
```sql
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as report_count FROM reports;
SELECT COUNT(*) as idea_count FROM ideas;
SELECT COUNT(*) as announcement_count FROM announcements;
```

- [ ] Users count: 5
- [ ] Reports count: 3
- [ ] Ideas count: 4
- [ ] Announcements count: 3

---

## 🔍 Phase 7: View & Index Performance

### Test Views
```sql
-- Test user_stats view
SELECT * FROM user_stats;

-- Test recent_activity view
SELECT * FROM recent_activity LIMIT 10;
```
- [ ] `user_stats` view returns patrol statistics
- [ ] `recent_activity` view returns recent activities
- [ ] Query response time < 200ms

### Test Indexes
```sql
-- Explain query plan for user search
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';

-- Explain query plan for phone search
EXPLAIN ANALYZE
SELECT * FROM users WHERE phone = '+212612345678';
```
- [ ] Email index is used (Seq Scan avoided)
- [ ] Phone index is used (Seq Scan avoided)
- [ ] Index scan shows good performance

---

## 🔐 Phase 8: Frontend Integration Setup

### Dependencies Installation
```bash
pnpm add @supabase/supabase-js bcryptjs
pnpm add -D @types/bcryptjs
```
- [ ] Supabase client installed
- [ ] bcryptjs installed
- [ ] Type definitions installed

### Environment Configuration
Create `.env.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```
- [ ] `.env.local` file created
- [ ] Keys configured correctly
- [ ] File added to `.gitignore`

### Supabase Client Created
Create `client/lib/supabase.ts`:
- [ ] Supabase client initialized
- [ ] Environment variables validated
- [ ] Client exported for use

---

## 🧪 Phase 9: Frontend Connection Tests

### Test 1: Fetch Patrols
```typescript
const { data: patrols } = await supabase
  .from('patrols')
  .select('*');
console.log('Patrols:', patrols); // Should show 4 patrols
```
- [ ] Patrols fetched successfully
- [ ] Returns 4 rows

### Test 2: Fetch Roles
```typescript
const { data: roles } = await supabase
  .from('roles')
  .select('*');
console.log('Roles:', roles); // Should show 7 roles
```
- [ ] Roles fetched successfully
- [ ] Returns 7 rows

### Test 3: Fetch Test User
```typescript
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('generated_id', 'E0001')
  .single();
console.log('User:', user); // Should show test user
```
- [ ] Test user fetched successfully
- [ ] User data correct

### Test 4: Register New User
```typescript
// Register flow should:
// 1. Hash password with bcryptjs
// 2. Generate ID (E or F + number)
// 3. Insert user into database
// 4. Return success response
```
- [ ] Password hashed successfully
- [ ] User inserted without errors
- [ ] New user appears in table

### Test 5: Login Verification
```typescript
// Login flow should:
// 1. Find user by email/ID
// 2. Compare password hash
// 3. Return user data if valid
```
- [ ] User found successfully
- [ ] Password validation works
- [ ] Valid password returns user data
- [ ] Invalid password returns error

---

## 📱 Phase 10: Application Workflow Tests

### Registration Flow
- [ ] User can navigate to `/register`
- [ ] Form displays all fields correctly
- [ ] Step 1: Personal info can be filled
- [ ] Step 2: Patrol & role selection works
- [ ] Step 3: Contact info can be entered
- [ ] Password validation works (min 6 chars)
- [ ] Age validation works (12-15 only)
- [ ] Phone format validation works (+212)
- [ ] Email validation works (@domain)
- [ ] Form submits to database
- [ ] New user appears in database
- [ ] User can login with new credentials

### Login Flow
- [ ] User can navigate to `/login`
- [ ] Can enter ID, name, password
- [ ] Valid credentials show success
- [ ] Invalid credentials show error
- [ ] Successful login redirects to dashboard

### Dashboard Access
- [ ] After login, user sees dashboard
- [ ] Navigation tabs visible
- [ ] User's name displayed
- [ ] Can navigate to Reports
- [ ] Can navigate to Ideas
- [ ] Can navigate to Account

---

## 🚀 Phase 11: Production Readiness

### Security Checklist
- [ ] All passwords hashed (bcryptjs)
- [ ] RLS policies implemented
- [ ] No sensitive data in logs
- [ ] API keys in environment variables
- [ ] HTTPS enabled (Supabase default)
- [ ] CORS properly configured

### Performance Checklist
- [ ] All indexes created
- [ ] Views working efficiently
- [ ] Query response time < 200ms
- [ ] No N+1 queries
- [ ] Database size acceptable

### Backup & Recovery
- [ ] Database backup configured
- [ ] Backup frequency set (daily)
- [ ] Backup location verified
- [ ] Recovery procedure documented

### Monitoring Setup
- [ ] Error logging enabled
- [ ] Query performance monitored
- [ ] Storage quota monitored
- [ ] User activity tracked (audit_logs)

---

## ✨ Phase 12: Final Sign-Off

### Code Review
- [ ] Schema follows best practices
- [ ] No circular dependencies
- [ ] Naming conventions consistent
- [ ] Comments/documentation complete

### Documentation
- [ ] Schema documented (SUPABASE_CONFIG.md)
- [ ] Setup instructions clear (SETUP_INSTRUCTIONS.md)
- [ ] API endpoints documented
- [ ] Test data documented (seed-data.sql)

### Testing Summary
- [ ] All validation tests passed
- [ ] All relationship tests passed
- [ ] All integration tests passed
- [ ] Performance targets met

### Sign-Off
- [ ] Database ready for production
- [ ] Frontend successfully connected
- [ ] All workflows tested
- [ ] Team trained on system

---

## 📝 Deployment Date: ______________

**Approved By:** ____________________

**Date:** ____________________

---

## 🎉 Post-Deployment

### Week 1
- [ ] Monitor database performance
- [ ] Check error logs daily
- [ ] Verify backups running
- [ ] Get user feedback

### Week 2-4
- [ ] Optimize slow queries if any
- [ ] Monitor storage growth
- [ ] Review usage statistics
- [ ] Plan for future features

### Ongoing
- [ ] Regular security audits
- [ ] Database maintenance
- [ ] Backup verification
- [ ] Performance optimization

---

**Database Status:** 🟢 READY FOR PRODUCTION

Last Updated: 2024-02-14
