# 🚀 Supabase Setup - Step by Step

## Prerequisites
- Supabase account (free at https://supabase.com)
- Project created in Supabase
- SQL schema file ready (database/schema.sql)

---

## ✅ STEP 1: Create Project on Supabase

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in project details:
   - **Name:** `shm-safi-portal`
   - **Database Password:** Create strong password (save it!)
   - **Region:** `Europe (Ireland)` or nearest to your location
4. Click **"Create new project"**
5. Wait 2-3 minutes for database to be ready ⏳

---

## ✅ STEP 2: Get Connection Keys

Once project is created:

1. Go to **Settings** → **API**
2. Copy these values to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Location in Supabase:**
- URL: Settings → API → Project URL
- Anon Key: Settings → API → anon public (NOT service_role_key!)

---

## ✅ STEP 3: Execute SQL Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"** (top right)
3. Open file: `database/schema.sql`
4. Copy **entire content**
5. Paste in SQL Editor
6. Click **"Run"** button (top right)
7. Wait for execution ⏳ (Should take 10-30 seconds)

### Verify Tables Created:
Go to **Table Editor** → You should see:
- ✅ patrols
- ✅ roles
- ✅ users
- ✅ reports
- ✅ ideas
- ✅ announcements
- ✅ audit_logs

If all tables exist, **STEP 3 is complete!**

---

## ✅ STEP 4: Verify Default Data

Execute this query in SQL Editor to confirm default data:

```sql
SELECT * FROM patrols;
SELECT * FROM roles;
```

**Expected Output:**

Patrols:
```
id | name
1  | دورية 1
2  | دورية 2
3  | دورية 3
4  | دورية 4
```

Roles:
```
id | name
1  | رائد
2  | مساعد
3  | كاتب
4  | مراقب الزي
5  | عضو 1
6  | عضو 2
7  | عضو 3
```

---

## ✅ STEP 5: Enable Row Level Security (RLS)

In SQL Editor, execute:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ideas table
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'reports', 'ideas');
```

**Expected Output:**
```
tablename | rowsecurity
users     | true
reports   | true
ideas     | true
```

---

## ✅ STEP 6: Create Storage Buckets (Optional but Recommended)

1. Go to **Storage** in left menu
2. Click **"New bucket"**

### Bucket 1: Reports PDFs
- **Name:** `reports-pdfs`
- **Privacy:** Private
- Click **"Create bucket"**

### Bucket 2: Announcements Images
- **Name:** `announcements-images`
- **Privacy:** Private
- Click **"Create bucket"**

---

## ✅ STEP 7: Set Up Environment Variables

Create file: `.env.local` in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# Optional: Backend API (if using Express)
VITE_API_URL=http://localhost:3000
```

**⚠️ Important:**
- Do NOT commit `.env.local` to git
- Add `.env.local` to `.gitignore` ✓

---

## ✅ STEP 8: Install Dependencies

```bash
# Install Supabase client
pnpm add @supabase/supabase-js

# Install password hashing library
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

---

## ✅ STEP 9: Create Supabase Client File

Create file: `client/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## ✅ STEP 10: Test Connection

Create file: `test-supabase.ts` in project root:

```typescript
import { supabase } from './client/lib/supabase';

async function testConnection() {
  try {
    // Test 1: Fetch patrols
    const { data: patrols, error: patrolError } = await supabase
      .from('patrols')
      .select('*');

    if (patrolError) throw patrolError;
    console.log('✅ Patrols:', patrols);

    // Test 2: Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');

    if (rolesError) throw rolesError;
    console.log('✅ Roles:', roles);

    console.log('✅ All tests passed! Supabase is connected.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection();
```

Run test:
```bash
npx ts-node test-supabase.ts
```

---

## ✅ STEP 11: Integration with Frontend

Update `client/pages/Register.tsx` to connect to Supabase:

```typescript
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // Generate ID
    const prefix = formData.gender === 'male' ? 'E' : 'F';
    const generatedId = `${prefix}0001`; // TODO: Get next ID from DB
    
    // Hash password
    const passwordHash = await bcrypt.hash(formData.password, 10);
    
    // Get patrol and role IDs
    const { data: patrol } = await supabase
      .from('patrols')
      .select('id')
      .eq('name', formData.patrol)
      .single();
    
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', formData.role)
      .single();
    
    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        generated_id: generatedId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birth_date: formData.birthDate,
        gender: formData.gender,
        patrol_id: patrol?.id,
        role_id: role?.id,
        is_high_patrol: formData.isHighPatrol,
        phone: formData.phone,
        email: formData.email,
        password_hash: passwordHash,
        parent_first_name: formData.guardianFirstName,
        parent_last_name: formData.guardianLastName,
      }])
      .select();
    
    if (error) throw error;
    
    console.log('✅ User registered:', user);
    navigate('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

---

## ✅ STEP 12: Update Login Flow

Update `client/pages/Login.tsx`:

```typescript
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // Find user by ID
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('generated_id', formData.id)
      .single();
    
    if (fetchError || !user) {
      throw new Error('المستخدم غير موجود');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(
      formData.password,
      user.password_hash
    );
    
    if (!isValidPassword) {
      throw new Error('كلمة المرور غير صحيحة');
    }
    
    // Store user data in localStorage/session
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      generated_id: user.generated_id,
      first_name: user.first_name,
      last_name: user.last_name,
    }));
    
    console.log('✅ Login successful');
    navigate('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

---

## ✅ TESTING CHECKLIST

Execute this in SQL Editor to test everything:

```sql
-- Test 1: Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Check patrols
SELECT COUNT(*) as patrol_count FROM patrols;

-- Test 3: Check roles
SELECT COUNT(*) as role_count FROM roles;

-- Test 4: Insert test user
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'E0001', 'محمد', 'أحمد', '2012-05-15', 'male',
  1, 1, '+212612345678', 'test@example.com',
  '$2b$10$test'
) RETURNING *;

-- Test 5: Verify user created
SELECT * FROM users WHERE generated_id = 'E0001';

-- Test 6: Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'users';

-- Test 7: Verify RLS
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('users', 'reports', 'ideas');
```

---

## 🎉 Success Indicators

✅ You should see:
- [ ] All 7 tables created
- [ ] Default patrols (4 rows)
- [ ] Default roles (7 rows)
- [ ] RLS enabled on users, reports, ideas
- [ ] Storage buckets created
- [ ] Environment variables set
- [ ] Supabase client working
- [ ] Test user can be inserted
- [ ] Test user can be fetched

---

## 🐛 Troubleshooting

### Error: "Table does not exist"
- Make sure SQL schema was executed completely
- Check SQL Editor for errors
- Try refreshing the page

### Error: "UNIQUE constraint violation"
- The data already exists
- Check Table Editor to see existing data
- Use UPDATE instead of INSERT

### Error: "Permission denied"
- RLS policy might be blocking access
- Check RLS policies in Authentication tab
- Make sure anon key has correct permissions

### Error: "Environment variable not found"
- Verify `.env.local` exists in project root
- Restart dev server after creating `.env.local`
- Check spelling: VITE_SUPABASE_URL (not VITE_SUPABASE_url)

---

## 📞 Support

If you encounter issues:

1. Check Supabase documentation: https://supabase.com/docs
2. Check PostgreSQL docs: https://www.postgresql.org/docs/
3. Review error messages in Supabase logs
4. Try test queries in SQL Editor

---

## 🎯 What's Next?

After setup is complete:

1. ✅ Implement user registration
2. ✅ Implement login/logout
3. ✅ Connect report submission form
4. ✅ Connect ideas submission form
5. ✅ Add user authentication tokens
6. ✅ Implement role-based access control (RBAC)
7. ✅ Add N8N automation for PDFs
8. ✅ Deploy to production

---

**Status:** Ready to Connect to Frontend 🚀

Last Updated: 2024-02-14
