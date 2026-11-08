# HYBA – Hifz Campus Management System: Role-Based Architecture, Campus Management & RBAC Security Hardening

HYBA is a centralized Hifz Campus Management System built for Islamic educational institutions (Markazul Hidayathil Islamiyya). This plan defines the end-to-end audit, role-separation overhaul, and feature completion to ensure airtight security, complete multi-campus administration, Usthad faculty lifecycle management, scoped student enrollment, robust CSV processing, and resilient profile photo storage.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Key product decisions confirmed through user clarification:
> - **Usthad Student Enrollment Scope**: Usthad mentors are permitted to add/enroll students, strictly scoped to their assigned classes. Super Admins retain institution-wide enrollment capabilities.
> - **Profile Photo Storage**: Dual-mode storage architecture featuring Cloudinary CDN as primary with an automatic, resilient local server filesystem fallback (`/uploads`) and static asset streaming.
> - **Usthad Password Workflow**: Super Admin sets a standard initial password during account creation, with optional password updates available in the profile settings.
> - **Role Separation & Read-Only Enforcements**: Parents and Students are strictly restricted from marking or editing attendance, creating or editing Hifz records, or accessing unlinked/unauthorized students across all frontend views and backend API routes.

---

### 1. Overview & Core Concept

- **What It Does**: HYBA provides a high-density, role-isolated web platform for managing Hifz campuses, tracking Quranic memorization (Sabq, Murajath, Manzil), recording daily attendance across numbered session hours, managing faculty and student records, and offering transparent read-only portals for guardians.
- **Target Audience / Personas**:
  1. **Super Admin (Mudir)**: Highest institutional administrator managing campuses, academic years, classes, teachers, student rosters, system audits, and global reports.
  2. **Usthad (Teacher)**: Faculty mentor handling daily Sabq recitations, Manzil revisions, hourly attendance, and class roster management within assigned batches.
  3. **Student**: Tahfeez learner monitoring personal 30-Juz progress, recitation feedback, attendance percentage, and digital student ID card.
  4. **Parent (Guardian)**: Family stakeholder with read-only multi-child switching, real-time memorization tracking, and direct faculty contacts.
- **Key Value**: Replaces scattered paper registers and role-confused interfaces with a hardened, institutional-grade management platform that guarantees absolute data privacy and campus isolation.

---

### 2. User Experience & Visual Design

- **Layout Structure**:
  - Desktop baseline (1440px): Sticky institutional top bar with brand mark, role badge, quick utility triggers (Timetable, Digital ID, Role Switcher), and primary role-specific navigation links.
  - Mobile baseline: Responsive top header, bottom thumb-navigation bar featuring role-filtered tabs, and a quick drawer menu for supplementary tools.
- **Visual Identity & Theme**:
  - *Color Discipline (60-30-10)*: 60% neutral canvas (`bg-slate-50`), 30% structural surfaces (`bg-white`, subtle hairline borders `border-slate-200`), and 10% purposeful Islamic deep emerald & gold accents (`bg-emerald-800`, `text-emerald-900`, `border-amber-300`).
  - *Zero-Pill Discipline*: Clean unboxed metadata separated by quiet typographical bullets (`·` or `/`) instead of clunky pill wrappers.
  - *Typography*: High-legibility modern sans hierarchy paired with tabular monospace numerals (`tabular-nums font-mono`) for roll numbers, admission codes, timestamps, and Ayah/Juz metrics.
- **Key User Flows**:
  - *Super Admin Flow*: Campus Overview & Creation $\rightarrow$ Usthad Account Provisioning (with class assignments & credentials) $\rightarrow$ Class Batch Management $\rightarrow$ CSV Bulk Import/Export with validation preview $\rightarrow$ Global Audit Inspection.
  - *Usthad Flow*: Login $\rightarrow$ Scoped Dashboard $\rightarrow$ My Classes & Students $\rightarrow$ Touch-Optimized Attendance Register $\rightarrow$ Sabq/Murajath/Manzil Entry Modal $\rightarrow$ Local & Cloudinary Photo Upload.
  - *Parent Flow*: Login $\rightarrow$ Guardian Portal $\rightarrow$ Multi-Child Selector $\rightarrow$ Read-Only 30-Juz Progress Ledger $\rightarrow$ Daily Attendance History $\rightarrow$ Usthad Contact Card.
  - *Student Flow*: Login $\rightarrow$ Personal Learning Dashboard $\rightarrow$ 30-Juz Visual Completion Grid $\rightarrow$ Recitation Feedback Log $\rightarrow$ Personal Profile Photo Update.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Centralized Role-Based Access Control (RBAC) & Scoped Query Middleware**
  - *Chosen Approach*: Implement robust, explicit backend middleware (`authorize('SUPER_ADMIN')`, `validateUsthadClassScope`, `validateParentChildScope`) on every API route, accompanied by synchronous frontend route guard logic in `App.tsx` and `Navbar.tsx`.
  - *Why*: Eliminates the critical bug where parents and students were exposed to the attendance marking grid or could mutate database records via direct API calls.
  - *Alternatives Considered*: Client-only conditional rendering was rejected because unauthorized users could still forge HTTP requests.
- **Decision 2: Dual-Mode Media Storage (Cloudinary + Local Filesystem Fallback)**
  - *Chosen Approach*: Check Cloudinary environment availability at runtime. If credentials are functional, upload to Cloudinary; otherwise, safely persist to `/public/uploads` with unique hashes, static routing via Express, and MIME-type validation.
  - *Why*: Guarantees zero broken image uploads and 100% functionality even in offline sandboxes or environments without external Cloudinary API keys.
- **Decision 3: Complete Campus & Institution Hierarchy Model**
  - *Chosen Approach*: Introduce a dedicated `Campus` schema (`id`, `name`, `code`, `arabicName`, `address`, `phone`, `email`, `logo`, `status`) and link it to existing `Student.campusId`, `Teacher.assignedCampusId`, and `ClassBatch.campusId`.
  - *Why*: Extends the existing database structure safely without migrations that could break legacy documents.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React 19 + Vite)                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     App.tsx (Role Guard Router)                  │  │
│  │                                                                  │  │
│  │  [SUPER_ADMIN]          [USTHAD]         [PARENT]     [STUDENT]  │  │
│  │  · AdminDashboard       · TeacherDash    · ParentDash · Student  │  │
│  │  · CampusManagement     · MyStudents     (Read-Only)    Dash     │  │
│  │  · TeacherManagement    · Attendance     (Child Only) (Self Only)│  │
│  │  · StudentManagement    · HifzTracker                            │  │
│  │  · ClassManagement                                               │  │
│  │  · CSV Import/Export                                             │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │ Bearer JWT Auth Header           │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼──────────────────────────────────┐
│                      EXPRESS SERVER (server.ts)                        │
│                                                                        │
│  Middlewares: authenticate | authorize(roles) | validateScope          │
│                                                                        │
│  Routes:                                                               │
│  ├── /api/auth          (Login, Me, User Creation, Password Reset)     │
│  ├── /api/campuses      (Full CRUD, status toggling, campus rosters)   │
│  ├── /api/teachers      (Super Admin create, class & campus link)      │
│  ├── /api/students      (Scoped Usthad create/edit, CSV import/export) │
│  ├── /api/classes       (Batch CRUD, Usthad & Student assignments)     │
│  ├── /api/attendance    (Mark attendance [Admin/Usthad], View history) │
│  ├── /api/hifz          (Sabq/Murajath [Admin/Usthad], Scoped views)   │
│  └── /api/upload        (Dual-mode: Cloudinary with Local Fallback)    │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼──────────────────────────────────┐
│                   PERSISTENCE LAYER (MongoDB Mongoose)                 │
│                                                                        │
│  ├── Campus               ├── Student            ├── HifzRecord        │
│  ├── User (RBAC + Hash)   ├── Teacher            ├── AttendanceSession │
│  ├── ClassBatch           ├── AuditLog           ├── AttendanceItem    │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Implementation Phases:

1. **Phase 1: Existing Codebase Audit & Data Modeling**
   - Add `Campus` model in `server/models/Campus.ts` and export from `server/models/index.ts`.
   - Update `User`, `Teacher`, and `Student` interfaces to support complete campus linking, phone, status, and role integrity.
   - Seed default main and secondary campuses if absent.

2. **Phase 2: RBAC & Permission Bug Fixes**
   - Fix `attendanceRoutes.ts`: Require auth on `/session` and `/student/:id`. Enforce that Usthad can only mark attendance for their assigned classes. Disallow Parent and Student roles from `POST /session`.
   - Fix `hifzRoutes.ts`: Require auth on `/api/hifz`. Restrict Usthad to assigned students/classes, Students to their own `studentId`, and Parents to their `linkedStudentIds`.
   - Fix `studentRoutes.ts`: Validate that Usthad can only update students belonging to their assigned classes.

3. **Phase 3: Institution & Campus Management Module**
   - Create `server/routes/campusRoutes.ts` with endpoints: `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, and `GET /:id/roster`.
   - Create frontend `src/components/CampusManagement.tsx` component allowing Super Admin to add, edit, toggle active status, and view campus-wise student/teacher statistics.

4. **Phase 4: Usthad Account Creation & Authentication**
   - Implement `POST /api/teachers` in `teacherRoutes.ts`:
     - Creates Teacher profile.
     - Creates linked `User` authentication record with hashed password, username, email, and `assignedClassIds`.
     - Validates against duplicate usernames and emails.
   - Update `TeacherManagement.tsx` to include an "Add Usthad Faculty" modal with Full Name, Teacher ID, Phone, Email, Username, Password, Campus, and Class assignments.

5. **Phase 5: Scoped Student Management for Usthad**
   - Update `StudentManagement.tsx` so when logged in as Usthad, it displays "My Students", automatically pre-filters to their assigned classes, and permits adding/editing students strictly for their assigned classes.

6. **Phase 6: CSV Import and Export**
   - Backend: Add `/api/students/import-csv` and `/api/students/export-csv` in `studentRoutes.ts`.
   - Implement streaming/parsing of CSV rows: validates required columns (`student_id`, `full_name`, `date_of_birth`, `gender`, `phone`, `parent_name`, `parent_phone`, `campus`, `class`), checks duplicates against existing DB records, and returns preview stats before committing.
   - Frontend: Add CSV Import modal with drag-and-drop, sample template download, validation preview table, error report download, and export button respecting active filters and role scopes.

7. **Phase 7: Student Profile Photo Upload (Dual-Mode)**
   - Update `uploadRoutes.ts` to test Cloudinary and fallback to local disk (`public/uploads`) if Cloudinary credentials are not active.
   - Serve `/uploads` statically in `server.ts`.
   - Allow Students to upload their own photo, Usthad for their students, and Super Admin for all students.

8. **Phase 8: Role-Specific Dashboard & Navigation Overhaul**
   - Update `Navbar.tsx` and `App.tsx`:
     - Ensure Parent sees only: Dashboard, My Children, Progress, Attendance (Read-Only History), Academic Records, Profile.
     - Ensure Student sees only: Dashboard, My Profile, My Progress, Sabq, Murajath, Manzil, Attendance (Read-Only History), Profile.
     - Ensure Usthad sees only: Dashboard, My Classes, My Students, Daily Attendance, Hifz Records, Reports, Profile.
     - Ensure Super Admin has full administrative suite including Campuses, Teachers, Students, Classes, Attendance, Hifz, Reports, and System Settings.
   - Guard `AttendanceModule.tsx`: If rendered in read-only mode for Parent/Student, display attendance calendars and summaries without interactive status cycling or submission buttons.

9. **Phase 9: Comprehensive Testing & Verification**
   - Role-by-role security matrix testing (Super Admin, Usthad, Student, Parent).
   - Build compilation and lint validation.
