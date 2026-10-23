# 🗄️ Supabase Configuration - Scoutisme Hassania Safi Portal

## 📋 Table of Contents
1. [Database Overview](#database-overview)
2. [Table Structures](#table-structures)
3. [Supabase Setup Instructions](#supabase-setup-instructions)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Testing Checklist](#testing-checklist)

---

## 📊 Database Overview

### Tables Architecture
```
┌─────────────┐         ┌──────────┐
│   patrols   │◄────────┤  users   │────────┐
│  (الدوريات)  │         │ (الأعضاء) │        │
└─────────────┘         └──────────┘        │
                              ▲              │
                              │              │
┌──────────┐                  │              │
│  roles   │──────────────────┘              │
│ (الأدوار) │                                │
└──────────┘                                │
                                            │
         ┌──────────────────────────────────┘
         │
    ┌────▼─────────┐
    │   reports    │
    │  (التقارير)   │
    └──────────────┘

    ┌──────────────┐
    │    ideas     │
    │ (صندوق الأفكار)│
    └──────────────┘

    ┌───────────────────┐
    │  announcements    │
    │   (الإعلانات)     │
    └───────────────────┘
```

---

## 📄 Table Structures

### 1️⃣ PATROLS (الدوريات)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد للدورية |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | اسم الدورية (دورية 1-4) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | آخر تحديث |

**Default Values:**
```
- دورية 1
- دورية 2
- دورية 3
- دورية 4
```

**Supabase Configuration:**
```
Column: name
- Type: varchar
- Max Length: 50
- Required: Yes
- Unique: Yes
```

---

### 2️⃣ ROLES (الأدوار)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد للدور |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | اسم الدور |
| `description` | TEXT | NULLABLE | وصف الدور |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | آخر تحديث |

**Default Values:**
```
- رائد (Scout Leader)
- مساعد (Assistant Leader)
- كاتب (Secretary)
- مراقب الزي (Uniform Monitor)
- عضو 1 (Member 1)
- عضو 2 (Member 2)
- عضو 3 (Member 3)
```

**Supabase Configuration:**
```
Column: name
- Type: varchar
- Max Length: 50
- Required: Yes
- Unique: Yes

Column: description
- Type: text
- Required: No
```

---

### 3️⃣ USERS (الأعضاء)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد للمستخدم |
| `generated_id` | VARCHAR(10) | NOT NULL, UNIQUE | معرّف مولد: E0001 (ذكر)، F0001 (أنثى) |
| `first_name` | VARCHAR(100) | NOT NULL | الاسم الأول |
| `last_name` | VARCHAR(100) | NOT NULL | النسب |
| `birth_date` | DATE | NOT NULL | تاريخ الميلاد (12-15 سنة فقط) |
| `gender` | VARCHAR(10) | CHECK (male\|female) | الجنس: ذكر أو أنثى |
| `patrol_id` | BIGINT | FK → patrols(id) | معرّف الدورية |
| `role_id` | BIGINT | FK → roles(id) | معرّف الدور |
| `is_high_patrol` | BOOLEAN | DEFAULT FALSE | عضو في الدورية العليا؟ |
| `phone` | VARCHAR(15) | NOT NULL, UNIQUE | رقم الهاتف (+212...) |
| `email` | VARCHAR(150) | NOT NULL, UNIQUE | البريد الإلكتروني |
| `parent_first_name` | VARCHAR(100) | NULLABLE | اسم الولي الأول |
| `parent_last_name` | VARCHAR(100) | NULLABLE | نسب الولي |
| `parent_phone` | VARCHAR(15) | UNIQUE, NULLABLE | هاتف الولي |
| `parent_email` | VARCHAR(150) | UNIQUE, NULLABLE | بريد الولي |
| `parent_cin` | VARCHAR(20) | NULLABLE | رقم بطاقة الولي |
| `parent_type` | VARCHAR(50) | NULLABLE | نوع الولي (أب، أم، وصي...) |
| `password_hash` | TEXT | NOT NULL | كلمة المرور (مشفرة) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | آخر تحديث |

**Validation Constraints:**
```
- birth_date: العمر بين 12 و 15 سنة
- phone: يبدأ بـ +212 أو 0 (رقم مغربي)
- email: يحتوي على @ و نقطة
- gender: ذكر أو أنثى فقط
```

**Supabase Configuration:**
```
Foreign Keys:
- patrol_id → patrols(id) ON DELETE RESTRICT
- role_id → roles(id) ON DELETE RESTRICT

Indexes (Performance):
- idx_users_email
- idx_users_phone
- idx_users_patrol_id
- idx_users_role_id
- idx_users_generated_id
```

---

### 4️⃣ REPORTS (التقارير)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد للتقرير |
| `created_by` | BIGINT | FK → users(id) | معرّف المستخدم الذي أنشأ التقرير |
| `report_date` | DATE | NOT NULL | تاريخ النشاط |
| `location` | VARCHAR(100) | NULLABLE | موقع النشاط |
| `patrol_stage` | VARCHAR(50) | NULLABLE | مرحلة الفريق |
| `members_count` | INT | ≥ 0 | عدد الأعضاء |
| `leaders_count` | INT | ≥ 0 | عدد القادة |
| `activities` | TEXT | NULLABLE | تفاصيل النشاطات |
| `objectives` | TEXT | NULLABLE | الأهداف المحققة |
| `full_report` | TEXT | NOT NULL | التقرير الكامل |
| `recommendations` | TEXT | NULLABLE | التوصيات |
| `pdf_url` | TEXT | NULLABLE | رابط ملف PDF |
| `status` | VARCHAR(20) | draft/submitted/approved/rejected | حالة التقرير |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | آخر تحديث |

**Status Values:**
- `draft` - مسودة (غير مقدم)
- `submitted` - مقدم للموافقة
- `approved` - معتمد
- `rejected` - مرفوض

---

### 5️⃣ IDEAS (صندوق الأفكار)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد للفكرة |
| `created_by` | BIGINT | FK → users(id) | معرّف المستخدم الذي أرسل الفكرة |
| `title` | VARCHAR(200) | NOT NULL | عنوان الفكرة |
| `description` | TEXT | NOT NULL | وصف الفكرة |
| `resources` | TEXT | NULLABLE | الموارد المطلوبة |
| `budget` | INT | ≥ 0 | الميزانية المقدرة (درهم) |
| `contact_info` | TEXT | NULLABLE | معلومات الاتصال |
| `status` | VARCHAR(20) | submitted/under_review/approved/rejected | حالة الفكرة |
| `admin_notes` | TEXT | NULLABLE | ملاحظات الإدارة |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | آخر تحديث |

**Status Values:**
- `submitted` - مرسلة
- `under_review` - تحت المراجعة
- `approved` - معتمدة
- `rejected` - مرفوضة

---

### 6️⃣ ANNOUNCEMENTS (الإعلانات)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد للإعلان |
| `title` | VARCHAR(200) | NOT NULL | عنوان الإعلان |
| `content` | TEXT | NOT NULL | محتوى الإعلان |
| `image_url` | TEXT | NULLABLE | رابط الصورة |
| `is_published` | BOOLEAN | DEFAULT FALSE | هل تم النشر؟ |
| `published_at` | TIMESTAMP | NULLABLE | وقت النشر |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإنشاء |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | آخر تحديث |

---

### 7️⃣ AUDIT_LOGS (سجل التدقيق)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | معرّف فريد |
| `user_id` | BIGINT | FK → users(id) | معرّف المستخدم |
| `action` | VARCHAR(50) | NOT NULL | نوع الإجراء |
| `table_name` | VARCHAR(50) | NULLABLE | اسم الجدول |
| `record_id` | BIGINT | NULLABLE | معرّف السجل |
| `old_values` | JSONB | NULLABLE | القيم القديمة |
| `new_values` | JSONB | NULLABLE | القيم الجديدة |
| `ip_address` | VARCHAR(45) | NULLABLE | عنوان IP |
| `user_agent` | TEXT | NULLABLE | معلومات المتصفح |
| `created_at` | TIMESTAMP | DEFAULT NOW() | وقت الإجراء |

---

## 🚀 Supabase Setup Instructions

### Step 1: Create Supabase Project
1. Go to https://supabase.com
2. Sign in or create account
3. Create new project
4. Wait for project to be ready

### Step 2: Execute SQL Schema
1. Go to SQL Editor in your Supabase dashboard
2. Create new query
3. Copy entire content from `database/schema.sql`
4. Run query
5. Verify all tables are created

### Step 3: Configure Environment Variables
Create `.env.local` file in project root:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from Supabase:
- Settings → API → Project URL
- Settings → API → anon/public key

### Step 4: Enable Row Level Security (RLS)
```sql
-- In Supabase SQL Editor, run these commands:

-- For users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- For reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- For ideas table
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
```

### Step 5: Create Storage Bucket (Optional)
1. Go to Storage in Supabase
2. Create new bucket: `reports-pdfs`
3. Create new bucket: `announcements-images`
4. Set both to "Private"

---

## 🔌 API Endpoints

### Authentication
```bash
# Sign Up
POST https://xxxxx.supabase.co/auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "user_metadata": {
    "generated_id": "E0001"
  }
}

# Sign In
POST https://xxxxx.supabase.co/auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### REST API Examples
```bash
# Get all patrols
GET https://xxxxx.supabase.co/rest/v1/patrols

# Get specific user
GET https://xxxxx.supabase.co/rest/v1/users?generated_id=eq.E0001

# Create report
POST https://xxxxx.supabase.co/rest/v1/reports
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "created_by": 1,
  "report_date": "2024-02-14",
  "full_report": "...",
  "status": "draft"
}

# Submit idea
POST https://xxxxx.supabase.co/rest/v1/ideas
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "created_by": 1,
  "title": "...",
  "description": "...",
  "status": "submitted"
}
```

---

## 🎯 Frontend Integration

### Install Supabase Client
```bash
pnpm add @supabase/supabase-js
```

### Create Supabase Client (New File)
Create `client/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type-safe database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          generated_id: string;
          first_name: string;
          last_name: string;
          birth_date: string;
          gender: 'male' | 'female';
          patrol_id: number;
          role_id: number;
          phone: string;
          email: string;
          created_at: string;
        };
      };
      patrols: {
        Row: {
          id: number;
          name: string;
        };
      };
      roles: {
        Row: {
          id: number;
          name: string;
        };
      };
      reports: {
        Row: {
          id: number;
          created_by: number;
          report_date: string;
          full_report: string;
          status: string;
          created_at: string;
        };
      };
      ideas: {
        Row: {
          id: number;
          created_by: number;
          title: string;
          description: string;
          status: string;
          created_at: string;
        };
      };
    };
  };
};
```

### Register User Example
```typescript
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

async function registerUser(formData) {
  try {
    // Generate ID based on gender
    const prefix = formData.gender === 'male' ? 'E' : 'F';
    const counter = '0001'; // TODO: Get from database
    const generatedId = `${prefix}${counter}`;

    // Hash password
    const passwordHash = await bcrypt.hash(formData.password, 10);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        generated_id: generatedId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        birth_date: formData.birthDate,
        gender: formData.gender,
        patrol_id: formData.patrolId,
        role_id: formData.roleId,
        is_high_patrol: formData.isHighPatrol,
        phone: formData.phone,
        email: formData.email,
        password_hash: passwordHash,
        parent_first_name: formData.guardianFirstName,
        parent_last_name: formData.guardianLastName,
      }])
      .select();

    if (error) throw error;
    return { success: true, user: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## ✅ Testing Checklist

### Phase 1: Database Structure
- [ ] All tables created successfully
- [ ] Primary keys on all tables
- [ ] Foreign keys configured correctly
- [ ] Constraints applied (CHECK, UNIQUE, NOT NULL)
- [ ] Indexes created for performance
- [ ] RLS policies enabled on sensitive tables
- [ ] Default data inserted (patrols, roles)

### Phase 2: Data Validation
- [ ] Insert test user and verify age constraint (12-15)
- [ ] Test phone validation (+212 format)
- [ ] Test email uniqueness
- [ ] Test gender constraint (male/female only)
- [ ] Test generated_id uniqueness
- [ ] Test negative number constraints (members_count, budget)

### Phase 3: Relationships
- [ ] Insert user with patrol_id and verify FK
- [ ] Insert user with role_id and verify FK
- [ ] Insert report with created_by and verify FK
- [ ] Insert idea with created_by and verify FK
- [ ] Try deleting patrol with users (should fail - RESTRICT)
- [ ] Delete user and verify reports are deleted (CASCADE)

### Phase 4: Views & Queries
- [ ] Query `user_stats` view
- [ ] Query `recent_activity` view
- [ ] Filter users by patrol
- [ ] Filter reports by status
- [ ] Filter ideas by status
- [ ] Search users by email

### Phase 5: RLS Policies
- [ ] Create two test users
- [ ] User1 cannot view User2's profile
- [ ] User1 can only edit their own profile
- [ ] Both users can view all reports
- [ ] User1 can only edit their own reports
- [ ] User1 can only edit their own ideas

### Phase 6: Frontend Integration
- [ ] Supabase client initialized
- [ ] Can fetch patrols list
- [ ] Can fetch roles list
- [ ] Can register new user
- [ ] Can login with email/password
- [ ] Authenticated user can create report
- [ ] Authenticated user can submit idea
- [ ] Dashboard shows user's data

### Phase 7: Performance
- [ ] Query response time < 200ms
- [ ] No N+1 queries
- [ ] Indexes used for filtering
- [ ] Full-text search working (if implemented)

### Phase 8: Security
- [ ] Passwords are hashed (bcrypt)
- [ ] No passwords visible in logs
- [ ] RLS enforces row-level access
- [ ] JWT tokens properly validated
- [ ] Rate limiting configured (future)
- [ ] SQL injection prevented (parameterized queries)

---

## 📊 Example Test Data

### SQL to Insert Test Data
```sql
-- Insert test patrols (already done)
-- Insert test roles (already done)

-- Insert test user (E0001 - Male)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash, is_high_patrol
) VALUES (
  'E0001', 'أحمد', 'محمد', '2012-05-15', 'male',
  1, 1, '+212612345678', 'ahmed@example.com', 
  '$2b$10$...hashed_password...', false
);

-- Insert test user (F0002 - Female)
INSERT INTO users (
  generated_id, first_name, last_name, birth_date, gender,
  patrol_id, role_id, phone, email, password_hash
) VALUES (
  'F0002', 'فاطمة', 'علي', '2011-08-22', 'female',
  2, 3, '+212698765432', 'fatima@example.com',
  '$2b$10$...hashed_password...'
);

-- Insert test report
INSERT INTO reports (
  created_by, report_date, location, full_report, status, members_count, leaders_count
) VALUES (
  1, '2024-02-14', 'ملعب المدينة', 'تقرير نشاط اليوم...', 'draft', 15, 2
);

-- Insert test idea
INSERT INTO ideas (
  created_by, title, description, status
) VALUES (
  1, 'فكرة لنشاط جديد', 'وصف الفكرة...', 'submitted'
);
```

---

## 🔐 Security Reminders

✅ **DO:**
- Hash passwords using bcrypt
- Use environment variables for secrets
- Enable RLS on all user tables
- Validate input on both frontend and backend
- Use HTTPS only
- Keep Supabase keys secure

❌ **DON'T:**
- Expose Supabase keys in version control
- Store plain text passwords
- Trust client-side validation only
- Use anon key for sensitive operations
- Log sensitive data
- Commit .env files

---

## 📚 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎉 Ready to Deploy!

Your Supabase database is now configured and ready for:
- ✅ User registration and authentication
- ✅ Report submission and management
- ✅ Ideas submission and management
- ✅ Announcements display
- ✅ Audit logging
- ✅ Full-featured portal

**Next Steps:**
1. Execute schema.sql in Supabase
2. Configure environment variables
3. Install Supabase client in frontend
4. Connect registration form to database
5. Test registration and login
6. Deploy to production!

---

**Last Updated:** 2024-02-14
**Status:** Ready for Production ✅
