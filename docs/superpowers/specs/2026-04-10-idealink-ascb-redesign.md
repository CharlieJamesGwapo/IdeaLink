# IdeaLink: ASCB Web-based Feedback Management System — Redesign Spec

**Date:** 2026-04-10  
**Status:** Approved  
**School:** Andres Soriano Colleges of Bislig (ASCB)

---

## 1. Overview

Full frontend redesign with ASCB branding + backend feature additions to the existing Go + React + PostgreSQL system. The system collects student feedback/suggestions for the Registrar and Accounting offices, with role-based dashboards, real-time notifications, and analytics reports.

**System Title:** `IdeaLink: ASCB Web-based Feedback Management System`  
**Tagline:** "ASCB, Ascending!" — Bislig's Pioneer in Private Education

---

## 2. Scope Changes

- **Users:** Students only (remove faculty role from submission form — `user_role` field removed from UI)
- **Staff portals:** Registrar, Accounting (feedback management)
- **Admin:** Full analytics + system management
- **No faculty submission** — the `user_role` field in the DB is kept but hidden in UI

---

## 3. Branding & Design System

### Colors
```css
--ascb-navy:    #1B3A6E   /* primary */
--ascb-orange:  #F47C20   /* accent */
--ascb-gold:    #FFB81C   /* highlight */
--ascb-white:   #FFFFFF
--ascb-light:   #F0F4FF   /* backgrounds */
--ascb-dark:    #0D1F3C   /* deep navy for text */
```

### Typography
- Display/Headings: **Cormorant Garamond** (Google Fonts — prestigious, academic)
- Body: **Lora** (Google Fonts — readable serif)
- UI/Labels: **DM Sans** (clean, modern sans-serif)

### Visual Identity
- `bg.jpg` (school building photo) used as hero background on Homepage and all Login pages
- ASCB logo (shield with torch, book, cogwheel) — prominent in navbar, hero, and login pages
- IdeaLink logo — secondary sub-brand placement (navbar alongside ASCB logo)
- Overlay: semi-transparent navy gradient over `bg.jpg` for text legibility
- Core values strip: "A · Accountability | S · Stewardship | C · Compassion | B · Brilliance"

---

## 4. Pages & Features

### 4.1 Public Homepage (`/`)
- **Hero section:** `bg.jpg` full-screen background, ASCB logo centered, system title, CTA buttons (Student Login, Staff Login)
- **About ASCB section:** Philosophy, Vision, Mission cards with scroll-reveal animations
- **Core Values strip:** ASCB acronym highlighted with colored icons
- **Goals section:** 5 institutional goals
- **How It Works:** 3-step student feedback flow
- **Announcements carousel:** Latest admin announcements
- **Testimonials:** Active featured feedback
- **Footer:** ASCB contact info, IdeaLink credit

### 4.2 Login Page (`/login`)
- **Background:** `bg.jpg` with navy overlay
- **Single page** with 4 role selection cards:
  - Student Login (email + password)
  - Admin Login (email + password)
  - Registrar Login (username + password)
  - Accounting Login (username + password)
- Each card styled with ASCB colors, role icon, and distinct visual treatment
- ASCB logo prominent at top, IdeaLink logo small below

### 4.3 Student Feedback Form (`/user/submit`)
- **Office Hours Banner** at top of form: live OPEN/CLOSED status for selected department
  - Green badge "OPEN" if within office hours (Mon–Fri 8AM–5PM)
  - Red badge "CLOSED" if outside hours OR admin has posted a closure notice
  - Closure notice shows: reason + expected reopening time
- **Form fields:**
  - Department selector: Registrar | Accounting
  - Service Category (dynamic based on department):
    - **Registrar:** Enrollment/Registration, Transcript of Records, Certificate of Enrollment, Good Moral Certificate, Diploma & Authentication, ID Issuance, Shifting/Cross-enrollment, Other Registrar Concern
    - **Accounting:** Tuition Fee Payment, Scholarship/Financial Aid, Fee Assessment, Clearance Processing, Refund Request, Receipt Re-issuance, Billing Dispute, Other Accounting Concern
  - Subject/Title
  - Feedback description (textarea)
  - Anonymous toggle
- Form submits even when office is closed (students can submit anytime)

### 4.4 Student Submissions (`/user/submissions`)
- List of own submissions with status badges (Pending / Under Review / Resolved)
- Filter by department and status
- Service category shown per submission

### 4.5 Student Announcements (`/user/announcements`)
- Grid of announcements with ASCB-branded cards
- Unread indicator

### 4.6 Admin Dashboard (`/admin/dashboard`)
- **Summary cards:** Total students, total feedback, this month, unread
- **Charts (using Recharts):**
  - Monthly feedback trend (line chart, last 6 months)
  - Submissions by department (pie chart)
  - Submissions by service category (bar chart)
  - Status distribution (donut chart: Pending/Under Review/Resolved)
- **Export button:** Download PDF report or CSV of filtered data
- **Real-time notification bell:** Unread count badge, polling every 30s
- **Recent submissions table:** Latest 10 with quick-action buttons

### 4.7 Registrar Dashboard (`/registrar/suggestions`)
- **Notification bell** with unread count (polls every 30s)
- **Summary cards:** Total received, pending, under review, resolved
- **Analytics charts:** Category breakdown, monthly trend for Registrar
- **Submissions table:** Filter by status, category, date range
- **Export:** CSV/PDF of Registrar submissions
- **Status update:** Pending → Under Review → Resolved
- **Office Hours control:** Toggle open/closed, post closure notice with reason + until-when

### 4.8 Accounting Dashboard (`/accounting/suggestions`)
- Same structure as Registrar Dashboard but scoped to Accounting

### 4.9 Admin Suggestions (`/admin/suggestions`)
- All submissions across both departments
- Filter by department, category, status, date
- Mark as read, feature as testimonial
- Export CSV/PDF

### 4.10 Admin Announcements (`/admin/announcements`)
- Create/edit/delete announcements
- Rich text-style textarea, date posted shown

### 4.11 Admin Testimonials (`/admin/testimonials`)
- Toggle active/inactive
- Preview card shown

---

## 5. Real-time Notifications

**Implementation:** Polling (30-second interval) — no WebSocket needed for MVP

- Frontend polls `GET /api/notifications/unread-count` every 30s
- Bell icon in sidebar/header shows red badge with count
- Clicking bell navigates to submissions list (filtered to unread)
- Backend returns count of unread submissions for the authenticated role's department
- Admin sees count across all departments

---

## 6. Office Hours Feature

**Database:** New `office_hours` table:
```sql
office_hours
├── id (SERIAL PK)
├── department (VARCHAR: 'registrar' | 'accounting')
├── is_open (BOOLEAN) -- manual override
├── closure_reason (TEXT, nullable)
├── closed_until (TIMESTAMPTZ, nullable)
├── updated_by (INT, nullable)
└── updated_at (TIMESTAMPTZ)
```

**Logic:**
- Default schedule: Mon–Fri 8:00 AM – 5:00 PM (Philippine time, Asia/Manila)
- System auto-determines OPEN/CLOSED based on current time
- Staff can manually override: post closure notice (reason + until-when)
- Manual override expires automatically when `closed_until` is passed
- `GET /api/office-hours/:department` — public endpoint for students
- `POST /api/office-hours/:department` — staff only (registrar/accounting for their own dept, admin for both)

---

## 7. Enhanced Analytics & Reports

**New endpoint:** `GET /api/admin/reports?dept=all&from=2026-01-01&to=2026-04-10&format=json`

**Data returned:**
- Total submissions (with delta from previous period)
- By department breakdown
- By service category breakdown
- By status breakdown
- Monthly trend (last 12 months)
- Average resolution time

**Export:**
- CSV: raw data table
- PDF: formatted report with ASCB header, charts summary, date range

**Libraries:** `recharts` (already in similar React projects) for charts, `jspdf` + `html2canvas` for PDF export

---

## 8. New Backend Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/office-hours/:dept` | Public | Get open/closed status + closure notice |
| POST | `/api/office-hours/:dept` | Staff/Admin | Set closure notice or reopen |
| GET | `/api/notifications/unread-count` | Staff/Admin | Count of unread submissions for role |
| GET | `/api/admin/reports` | Admin | Full analytics data with filters |
| GET | `/api/registrar/reports` | Registrar | Registrar-scoped analytics |
| GET | `/api/accounting/reports` | Accounting | Accounting-scoped analytics |

---

## 9. Database Changes

```sql
-- New table
CREATE TABLE office_hours (
  id SERIAL PRIMARY KEY,
  department VARCHAR(50) NOT NULL UNIQUE,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  closure_reason TEXT,
  closed_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial rows
INSERT INTO office_hours (department) VALUES ('registrar'), ('accounting');

-- Add service_category to suggestions
ALTER TABLE suggestions ADD COLUMN service_category VARCHAR(100);
```

---

## 10. Dummy Accounts (Seed Data)

| Role | Username/Email | Password |
|------|---------------|----------|
| Admin | admin@ascb.edu.ph | Admin@123 |
| Student | student@ascb.edu.ph | Student@123 |
| Student 2 | juan.delacruz@ascb.edu.ph | Student@123 |
| Registrar | registrar | Registrar@123 |
| Accounting | accounting | Accounting@123 |

Seed also includes 10 sample feedback submissions across both departments and all service categories, with mixed statuses.

---

## 11. Frontend Dependencies to Add

```json
"recharts": "^2.x",
"jspdf": "^2.x",
"html2canvas": "^1.x"
```

---

## 12. File Structure Changes

**Frontend new/modified files:**
- `src/styles/ascb-theme.css` — CSS variables and global ASCB styles
- `src/pages/LoginPage.tsx` — unified 4-role login
- `src/pages/HomePage.tsx` — full ASCB redesign
- `src/pages/SubmitPage.tsx` — service categories + office hours banner
- `src/pages/admin/AdminDashboard.tsx` — analytics charts
- `src/pages/registrar/RegistrarDashboard.tsx` — enhanced with charts + notifications
- `src/pages/accounting/AccountingDashboard.tsx` — enhanced with charts + notifications
- `src/components/OfficeHoursBanner.tsx` — reusable open/closed component
- `src/components/NotificationBell.tsx` — reusable polling bell
- `src/components/charts/` — chart components
- `src/api/officeHours.ts` — office hours API calls
- `src/api/notifications.ts` — notification polling
- `src/api/reports.ts` — analytics/export API calls

**Backend new/modified files:**
- `internal/handlers/office_hours.go`
- `internal/handlers/notifications.go`
- `internal/handlers/reports.go`
- `internal/models/office_hours.go`
- `internal/repository/office_hours_repo.go`
- `internal/services/office_hours_service.go`
- `internal/migrations/002_office_hours.sql`
- `cmd/seed/main.go` — updated with all dummy accounts + sample data

---

## 13. Success Criteria

- [ ] All pages use ASCB navy/orange branding with `bg.jpg` on hero/login
- [ ] ASCB logo prominent, IdeaLink logo secondary
- [ ] Student feedback form has service category dropdown (8 per dept)
- [ ] Office hours banner shows live OPEN/CLOSED on feedback form
- [ ] Staff can post closure notice with reason + until-when
- [ ] Notification bell polls every 30s and shows unread count
- [ ] Admin/Registrar/Accounting dashboards show analytics charts
- [ ] Export to CSV and PDF works
- [ ] All dummy accounts log in and demonstrate full role functionality
- [ ] Fully responsive (mobile, tablet, desktop)
- [ ] Faculty role removed from submission form UI
