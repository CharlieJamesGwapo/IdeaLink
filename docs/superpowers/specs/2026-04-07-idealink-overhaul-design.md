# IdeaLink: ASCB E-Suggestion Platform - Full Overhaul Design Spec

**Date:** 2026-04-07
**Approach:** Organized Fix + Polish (Approach B)
**Priority:** Security-first, then bugs, then UI/UX

---

## 1. Security Fixes

### 1.1 Password Hashing
- Replace all plain-text password storage with `password_hash(PASSWORD_DEFAULT)` on signup/account creation
- Replace all `=== password` comparisons with `password_verify()` on login
- Files affected: `signup.php`, `login_process.php`, `admin_login.php`, `registrar_login.php`, `accounting_login.php`
- Create `migrate_passwords.php` one-time script to hash all existing plain-text passwords in `user_accounts`, `admin_accounts`, `registrar_accounts`, `accounting_accounts`

### 1.2 SQL Injection Prevention
- Replace `real_escape_string()` + string concatenation with prepared statements in:
  - `registrar_dash.php` (role filter query)
  - `accounting_dash.php` (role filter query)
- Audit all files; ensure every query uses `prepare()` + `bind_param()`

### 1.3 Session Security
- Add `session_regenerate_id(true)` after successful login in all 4 login handlers
- Validate session existence on every protected page (already done, but standardize)

### 1.4 Output Escaping
- Ensure all user-generated content displayed in HTML uses `htmlspecialchars($var, ENT_QUOTES, 'UTF-8')`
- Fix admin announcement modal quote escaping (replace PHP `addslashes` with proper `json_encode` for JS)

### 1.5 CSRF Protection
- Not adding for this iteration — out of scope for capstone XAMPP deployment

---

## 2. Bug Fixes

### 2.1 Remove Broken/Duplicate Files
- Delete: `get_suggestion.php`, `post_announce.php`, `delete_suggest.php`, `get_notif.php` (reference non-existent `db.php`, use PDO while rest of app uses MySQLi)
- Delete: `dashboard.php` (legacy/unused)
- Delete: `account_login.php` (duplicate of `accounting_login.php`)

### 2.2 Code Bugs
- Fix duplicate event listeners in `homepage.php` (nextBtn/prevBtn listeners added twice at lines ~186-192 and ~259-273)
- Fix admin announcement modal JS escaping — use `JSON.parse()` with `json_encode()` instead of `addslashes()`
- Standardize DB connection: all files use `db_connect.php` (remove `config.php` or merge into `db_connect.php`)
- Add error handling for failed queries (check `$stmt->execute()` return values)

### 2.3 Naming Consistency
- Standardize session variable naming across all roles

---

## 3. File Reorganization

### 3.1 New Directory Structure
```
IdeaLink/
├── assets/
│   ├── css/
│   │   ├── main.css           (global styles, variables, shared components)
│   │   ├── homepage.css       (landing page)
│   │   ├── auth.css           (all login/signup pages)
│   │   ├── user.css           (user dashboard, submit, submissions, announcements)
│   │   ├── admin.css          (admin dashboard)
│   │   └── department.css     (registrar + accounting dashboards)
│   ├── js/
│   │   └── main.js            (shared: hamburger, page transitions, toast, modals)
│   └── images/
│       ├── logo.png
│       └── school_logo.png
├── includes/
│   ├── db_connect.php         (single DB connection file)
│   ├── header.php             (nav component, accepts $role and $currentPage)
│   ├── footer.php             (shared footer)
│   └── functions.php          (flash(), redirect(), isLoggedIn(), sanitize())
├── admin/
│   ├── index.php              (dashboard)
│   ├── login.php
│   ├── logout.php
│   └── announcements.php
├── registrar/
│   ├── index.php              (dashboard)
│   ├── login.php
│   └── logout.php
├── accounting/
│   ├── index.php              (dashboard)
│   ├── login.php
│   └── logout.php
├── user/
│   ├── index.php              (dashboard)
│   ├── submit.php
│   ├── submissions.php
│   ├── announcements.php
│   ├── login.php
│   ├── signup.php
│   └── logout.php
├── api/
│   ├── fetch_announcements.php
│   └── fetch_testimonials.php
├── index.php                  (homepage/landing)
├── migrate_passwords.php      (one-time migration script)
└── suggestion_db.sql
```

### 3.2 Shared Components

**includes/functions.php:**
- `flash($key, $message, $type)` — set/get flash messages
- `redirect($url)` — header redirect + exit
- `isLoggedIn($sessionName)` — check session
- `sanitize($str)` — `htmlspecialchars` wrapper
- `timeAgo($datetime)` — human-readable time differences

**includes/header.php:**
- Accepts `$role` ('user', 'admin', 'registrar', 'accounting', 'public')
- Renders appropriate nav links per role
- Includes hamburger menu for mobile
- Shows notification badge when applicable

**includes/footer.php:**
- Consistent footer with copyright

---

## 4. UI/UX Overhaul

### 4.1 Design System (CSS Variables in main.css)
```css
:root {
    --primary-dark: #0a1628;
    --secondary-dark: #1b2b48;
    --accent-blue: #4db8ff;
    --accent-hover: #3aa0e6;
    --success: #2ecc71;
    --warning: #f39c12;
    --danger: #e74c3c;
    --text-primary: #ffffff;
    --text-secondary: #b0c4de;
    --glass-bg: rgba(255, 255, 255, 0.06);
    --glass-border: rgba(255, 255, 255, 0.1);
    --glass-hover: rgba(255, 255, 255, 0.12);
    --radius: 12px;
    --radius-sm: 8px;
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    --transition: all 0.3s ease;
    --font: 'Poppins', sans-serif;
}
```

### 4.2 Shared UI Components
- **Toast notifications** — slide in from top-right, auto-dismiss after 5s (replace inline success messages)
- **Status badges** — Pending (yellow), Reviewed (green), with pill style
- **Cards** — consistent glass-morphism cards with hover effects
- **Buttons** — primary (accent-blue), danger (red), ghost (transparent border)
- **Tables** — striped rows, hover highlight, horizontal scroll wrapper on mobile
- **Modals** — consistent backdrop + centered card with close button
- **Forms** — floating labels or consistent label-above style, focus glow effect
- **Empty states** — icon + message when no data exists

### 4.3 Responsiveness
- **Breakpoints:** 480px (phone), 768px (tablet), 1024px (desktop)
- **Mobile nav:** hamburger menu on all pages, slide-in overlay
- **Dashboard sidebar:** collapsible on tablet, hidden behind hamburger on mobile
- **Stat cards:** 2-column grid on tablet, single column on mobile
- **Tables:** horizontal scroll wrapper on mobile
- **Forms:** full-width inputs on mobile
- **Touch targets:** minimum 44px height for all interactive elements

### 4.4 Page-Specific Improvements

**Homepage (index.php):**
- Keep hero, about, announcements slider, testimonials carousel
- Fix duplicate JS event listeners
- Improve announcement card design
- Better CTA buttons

**User Dashboard:**
- Welcome message with user name
- Quick stats (total submissions, pending, reviewed)
- Recent submissions preview
- Quick action cards

**Submit Suggestion:**
- Better form layout with visual department selector
- Inline validation feedback
- Styled confirmation dialog (replace native confirm())
- Animated success toast

**Previous Submissions:**
- Status badges (Pending=yellow, Reviewed=green)
- Better table design with card layout on mobile
- Pagination

**Admin Dashboard:**
- Cleaner sidebar with icons and active state
- Better stat cards with icons
- Improved suggestions table with inline actions
- Better announcement management UI
- Testimonial management with toggle switches
- Activity feed improvements

**Department Dashboards (Registrar/Accounting):**
- Same improvements as admin but scoped to department
- Role filter dropdown styled consistently
- Status update actions

**Login/Signup Pages:**
- Keep glassmorphism theme
- Better form validation UX
- Consistent across all 4 login pages (user, admin, registrar, accounting)
- Password visibility toggle on all

---

## 5. Functional Improvements

### 5.1 Notification System
- Unread announcement count badge on user nav (uses existing `last_announcement_view`)
- Update `last_announcement_view` when user visits announcements page

### 5.2 Department Features
- Both department dashboards get consistent filtering
- Mark as reviewed with visual feedback (no page reload — use fetch API)

### 5.3 UX Improvements
- Toast notifications for all actions (submit, delete, review, announce)
- Auto-dismiss toasts after 5 seconds
- Styled confirmation dialogs
- Loading state on form submit buttons
- Smooth page transitions (keep existing fade-out, standardize)

---

## 6. Database Changes

No schema changes needed. The existing schema supports all features. Only data changes:
- `migrate_passwords.php` will hash all existing plain-text passwords in all 4 account tables

---

## 7. Out of Scope

- Email notifications
- Password reset functionality
- User profile editing
- File attachments on suggestions
- CSRF tokens
- MVC framework / routing
- Deployment to production server
