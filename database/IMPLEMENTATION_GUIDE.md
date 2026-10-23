# SHM (Scout Management System) - Implementation Guide

## Overview

The Scout Management System is split into **TWO separate websites** connected to the **SAME Supabase database**:

- **SITE 1**: Admin Writing Interface (private, internal use)
- **SITE 2**: Public Website (public-facing, read-only for reports/sessions, member profiles)

---

## Database Setup

### Step 1: Execute SQL Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database/schema-shm-complete.sql`
3. Click "Run" to execute all SQL commands

This will create:
- ✅ `reports` table with full CRUD structure
- ✅ `sessions` table with full CRUD structure
- ✅ `members` table for member profiles
- ✅ Row Level Security policies for proper access control
- ✅ Views for easy data querying
- ✅ Indexes for performance optimization
- ✅ Auto-update timestamp triggers

### Step 2: Create Storage Bucket for PDFs

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `reports-pdfs`
3. Set it to public (so PDFs can be accessed)
4. Create another bucket named `members-photos` (for profile photos)

### Step 3: Configure Environment Variables

Create `.env` file with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## SITE 1: Admin Writing Interface

### Purpose
Internal dashboard for Scout leaders to:
- Create reports
- Edit reports
- Delete reports
- Create training sessions
- Edit training sessions
- Delete sessions
- Upload PDF files

### Technology Stack (Recommended)
- React + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Supabase client with service role authentication
- React Hook Form (form management)

### Database Permissions
- Uses `SUPABASE_SERVICE_ROLE_KEY` (full access)
- Can INSERT, UPDATE, DELETE on reports and sessions tables
- No RLS restrictions (service role bypasses RLS)

### Key Pages to Build

#### 1. Reports Management Page
- **List view**: Display all reports with filters (category, date, responsible)
- **Create form**: Full form with all report fields
- **Edit form**: Update existing reports
- **Delete action**: Remove reports with confirmation
- **PDF upload**: Upload PDF files to storage bucket

**Form Fields:**
```
- title (required, text)
- location (text)
- time (date/time)
- objective (text)
- participants_boys (number)
- participants_girls (number)
- leaders_count (number)
- responsible (text)
- category (dropdown)
- beneficiary (text)
- description_original (textarea)
- description_reformulated (textarea)
- evaluation_positive (textarea)
- evaluation_negative (textarea)
- recommendations (textarea)
- pdf_url (file upload)
```

#### 2. Sessions Management Page
- **List view**: Display all sessions
- **Create form**: Full form with session fields
- **Edit form**: Update existing sessions
- **Delete action**: Remove sessions
- **PDF upload**: Upload session PDFs

**Form Fields:**
```
- title (required, text)
- date_time (date/time)
- location (text)
- target_audience (text)
- objective (text)
- methodology_original (textarea)
- methodology_reformulated (textarea)
- pdf_url (file upload)
```

#### 3. Dashboard
- Summary statistics (total reports, total sessions, etc.)
- Recent activities
- Quick access to create new content

### Implementation Tips
1. Use Supabase client with service role key for database operations
2. Implement form validation before submission
3. Add loading states during upload
4. Show success/error messages for user feedback
5. Add confirmation dialogs before delete operations

---

## SITE 2: Public Website (Current Project)

### Purpose
Public-facing website for:
- Displaying reports
- Displaying sessions
- Showing upcoming training sessions
- Showing past sessions
- Managing member profiles
- Viewing other members' profiles

### Technology Stack
- React + TypeScript (already in place)
- Supabase client with anon key
- Vite + Tailwind CSS

### Database Permissions (via RLS)
- Uses `VITE_SUPABASE_ANON_KEY`
- Public users: Can only SELECT (read) reports and sessions
- Authenticated users: Can create/update their own member profile
- RLS policies enforce these restrictions

### Pages to Implement

#### 1. Home Page (`/`)
- ✅ Already exists with header and footer
- Add cards/sections for:
  - Latest reports
  - Upcoming sessions
  - Member highlights

#### 2. Reports List Page (`/reports`)
- Display all reports in a table or card view
- Filter options: category, date range, responsible
- Sort options: newest first, oldest first
- Show summary info: title, date, participants count, PDF link
- Click to view report details

#### 3. Report Detail Page (`/reports/:id`)
- Full report information
- Display all fields
- Download PDF button
- Related sessions (if applicable)
- Share buttons (optional)

#### 4. Sessions Page (`/sessions`)
- Display all sessions
- Split into "Upcoming" and "Past"
- Show key info: date, location, target audience
- Filter options: location, audience, date range
- PDF download links

#### 5. Upcoming Sessions Page (`/upcoming-sessions`)
- List only future sessions
- Show countdown to next session
- Register button (future feature)
- Calendar view (optional)

#### 6. Members Directory Page (`/members`)
- List all member profiles
- Search by name
- Filter by team/role
- Show profile photo and basic info
- Link to individual member profiles

#### 7. Member Profile Page (`/members/:id`)
- Display full member information:
  - Name, role, team
  - Contact info (phone, email)
  - Profile photo
  - Bio
- Edit button (only for own profile)

#### 8. My Profile Page (`/my-profile`)
- Authenticated users only
- Form to edit own profile:
  - Full name
  - Role
  - Phone
  - Email
  - Team
  - Profile photo upload
  - Bio
- Save button with validation

### Implementation Steps

#### Phase 1: Database Integration
1. Create Supabase client service (`client/lib/supabase.ts`)
2. Create data fetching hooks for reports, sessions, members
3. Implement RLS-compliant queries

#### Phase 2: Reports & Sessions Display
1. Create `ReportsList` component
2. Create `ReportDetail` page
3. Create `SessionsList` component
4. Create filters and sorting

#### Phase 3: Member Management
1. Create `MembersList` component
2. Create `MemberProfile` page
3. Create `MyProfile` edit form
4. Implement authentication with Supabase

#### Phase 4: Polish
1. Add loading states
2. Add error handling
3. Add pagination for large lists
4. Mobile responsive design

### Component Structure (Recommended)

```
client/
├── pages/
│   ├── Index.tsx (home)
│   ├── Reports.tsx (list)
│   ├── ReportDetail.tsx (single report)
│   ├── Sessions.tsx (all sessions)
│   ├── UpcomingSessions.tsx
│   ├── Members.tsx (directory)
│   ├── MemberProfile.tsx (single member)
│   ├── MyProfile.tsx (authenticated user profile)
│   └── ...
├── components/
│   ├── ReportCard.tsx
│   ├── SessionCard.tsx
│   ├── MemberCard.tsx
│   ├── ReportFilter.tsx
│   └── ...
└── lib/
    ├── supabase.ts (client initialization)
    ├── api.ts (data fetching hooks)
    └── ...
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│           SUPABASE DATABASE (Shared)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   reports    │  │   sessions   │  │   members    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
          ▲                                        ▲
          │ (Writes)                              │ (Reads & Writes)
          │                                       │
    ┌─────┴──────────┐                  ┌────────┴──────────┐
    │                │                  │                   │
    │  SITE 1        │                  │   SITE 2 (Current)│
    │  ADMIN         │                  │   PUBLIC WEBSITE  │
    │  INTERFACE     │                  │                   │
    │                │                  │ - View Reports    │
    │ - Create       │                  │ - View Sessions   │
    │ - Edit Reports │                  │ - Manage Profiles │
    │ - Edit Sessions│                  │ - Browse Members  │
    │ - Upload PDFs  │                  │                   │
    └────────────────┘                  └───────────────────┘
```

---

## RLS Security Model

### Reports & Sessions
- **Public SELECT**: Anyone can read (no login required)
- **Authenticated INSERT/UPDATE/DELETE**: Only authenticated users (admin) can modify
- **Enforced at database level**: No way to bypass via frontend

### Members
- **Public SELECT**: Anyone can view profiles
- **Authenticated INSERT**: Users can create their own profile
- **Own profile UPDATE**: Users can only update their own profile
- **UID enforcement**: `auth.uid() = user_id` ensures users can't edit others' profiles

---

## Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Public read access for reports/sessions
- ✅ Admin-only write access (via authentication)
- ✅ Member data protected (users edit only their own)
- ✅ Service role key used only on admin site (never in frontend)
- ✅ Anon key used on public site (safe, RLS-protected)
- ✅ PDF files in public storage bucket (accessible via URL)

---

## Next Actions

1. **Execute SQL schema** in Supabase
2. **Create `.env` file** with Supabase credentials
3. **Build admin interface** (Site 1) - separate project
4. **Implement pages** in public site (Site 2) - this project
5. **Test RLS policies** to ensure proper access control
6. **Deploy both sites** separately

---

## Support & References

- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Client Library](https://supabase.com/docs/reference/javascript/introduction)
