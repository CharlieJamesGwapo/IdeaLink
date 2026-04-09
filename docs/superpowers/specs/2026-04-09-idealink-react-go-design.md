# IdeaLink — React + Go Rewrite Design Spec
**Date:** 2026-04-09  
**Status:** Approved  

---

## Overview

IdeaLink is an E-Suggestion Platform for ASCB school that allows community members (students, faculty, staff) to submit suggestions to specific departments. The platform is being rewritten from PHP + MySQL to **React + Go + PostgreSQL**, deployed on **Vercel (frontend)** and **Render (backend + database)**.

The rewrite maintains all existing features with a modernized UI design.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, TypeScript |
| Backend | Go + Gin |
| Database | PostgreSQL (Render managed) |
| Auth | JWT in httpOnly cookies |
| Frontend hosting | Vercel |
| Backend hosting | Render (web service) |
| DB hosting | Render (PostgreSQL) |

---

## Project Structure

```
idealink/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── public/         # Home, Login, Signup
│   │   │   ├── user/           # Submit, Submissions, Announcements
│   │   │   ├── admin/          # Dashboard, Suggestions, Announcements, Testimonials
│   │   │   ├── registrar/      # Login, Suggestions
│   │   │   └── accounting/     # Login, Suggestions
│   │   ├── components/
│   │   │   ├── layout/         # Header, Footer, Sidebar
│   │   │   ├── ui/             # Button, Card, Badge, Modal, Toast
│   │   │   └── shared/         # AnnouncementCard, SuggestionRow, TestimonialCard
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useAnnouncements.ts
│   │   │   └── useSuggestions.ts
│   │   ├── api/
│   │   │   ├── client.ts       # axios instance with credentials
│   │   │   ├── auth.ts
│   │   │   ├── suggestions.ts
│   │   │   ├── announcements.ts
│   │   │   └── testimonials.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # current user + role state
│   │   ├── router.tsx          # React Router v6 routes + guards
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
│
└── backend/
    ├── cmd/
    │   └── main.go             # entry point, server init
    └── internal/
        ├── handlers/           # thin HTTP handlers, calls service layer
        │   ├── auth.go
        │   ├── suggestions.go
        │   ├── announcements.go
        │   ├── testimonials.go
        │   └── admin.go
        ├── services/           # business logic
        │   ├── auth_service.go
        │   ├── suggestion_service.go
        │   ├── announcement_service.go
        │   └── testimonial_service.go
        ├── repository/         # raw SQL queries against PostgreSQL
        │   ├── user_repo.go
        │   ├── suggestion_repo.go
        │   ├── announcement_repo.go
        │   └── testimonial_repo.go
        ├── models/             # Go structs (DB rows + JSON shapes)
        │   ├── user.go
        │   ├── suggestion.go
        │   ├── announcement.go
        │   └── testimonial.go
        ├── middleware/
        │   ├── auth.go         # JWT validation, role enforcement
        │   └── cors.go         # CORS for Vercel frontend origin
        ├── config/
        │   └── config.go       # env vars: DB_URL, JWT_SECRET, PORT, FRONTEND_URL
        └── migrations/
            └── 001_initial.sql # all table definitions for PostgreSQL
```

---

## Pages & Routes

### Public (no auth required)
| Route | Component | Description |
|---|---|---|
| `/` | `HomePage` | Hero, About, Announcements (paginated), Testimonials carousel |
| `/login` | `LoginPage` | User login form |
| `/signup` | `SignupPage` | User registration form |

### User (role: `user`)
| Route | Component | Description |
|---|---|---|
| `/user/submit` | `SubmitPage` | Suggestion form: department, role, title, description, anonymous toggle |
| `/user/submissions` | `SubmissionsPage` | List of own submissions with status badge |
| `/user/announcements` | `AnnouncementsPage` | All announcements, marks as read on visit |

### Admin (role: `admin`)
| Route | Component | Description |
|---|---|---|
| `/admin/login` | `AdminLoginPage` | Admin credentials login |
| `/admin/dashboard` | `AdminDashboard` | Analytics: user count, total suggestions, this month, unread, student vs faculty breakdown, recent activity |
| `/admin/suggestions` | `AdminSuggestions` | All suggestions table: filter, change status, feature as testimonial |
| `/admin/announcements` | `AdminAnnouncements` | CRUD announcements |
| `/admin/testimonials` | `AdminTestimonials` | Toggle testimonial visibility |

### Registrar (role: `registrar`)
| Route | Component | Description |
|---|---|---|
| `/registrar/login` | `RegistrarLoginPage` | Registrar login |
| `/registrar/suggestions` | `RegistrarSuggestions` | Suggestions filtered to Registrar department, change status |

### Accounting (role: `accounting`)
| Route | Component | Description |
|---|---|---|
| `/accounting/login` | `AccountingLoginPage` | Accounting login |
| `/accounting/suggestions` | `AccountingSuggestions` | Suggestions filtered to Accounting Office, change status |

---

## API Endpoints

### Auth
```
POST   /api/auth/signup             # create user account
POST   /api/auth/login              # user login → sets JWT cookie
POST   /api/auth/admin/login        # admin login → sets JWT cookie
POST   /api/auth/registrar/login    # registrar login → sets JWT cookie
POST   /api/auth/accounting/login   # accounting login → sets JWT cookie
POST   /api/auth/logout             # clears cookie
GET    /api/auth/me                 # returns current user + role from JWT
```

### Announcements
```
GET    /api/announcements           # public, returns all sorted by date desc
POST   /api/announcements           # admin only
PUT    /api/announcements/:id       # admin only
DELETE /api/announcements/:id       # admin only
```

### Testimonials
```
GET    /api/testimonials            # public, returns active=true only
PATCH  /api/testimonials/:id/toggle # admin only — toggle is_active
```

### Suggestions
```
POST   /api/suggestions             # user only — submit suggestion
GET    /api/suggestions             # role-filtered:
                                    #   admin → all
                                    #   registrar → department=Registrar
                                    #   accounting → department=Accounting Office
                                    #   user → own suggestions only
PATCH  /api/suggestions/:id/status  # admin/registrar/accounting — update status
POST   /api/suggestions/:id/feature # admin only — creates testimonial from suggestion
```

### Admin
```
GET    /api/admin/analytics         # admin only — counts for dashboard
```

---

## Authentication & Authorization

- On login, Go generates a signed JWT containing `user_id`, `role`, and `exp`
- JWT is set as an **httpOnly, Secure, SameSite=None** cookie (required for cross-origin Vercel ↔ Render)
- Gin middleware `AuthRequired(roles ...string)` validates the JWT on every protected route
- Frontend `AuthContext` calls `GET /api/auth/me` on mount to restore session state
- Route guards in `router.tsx` redirect unauthenticated users to the appropriate login page per role
- Four role types: `user`, `admin`, `registrar`, `accounting`

---

## Database Schema (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,          -- bcrypt hashed
  fullname VARCHAR(255) NOT NULL,
  last_announcement_view TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin accounts
CREATE TABLE admin_accounts (
  id SERIAL PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,          -- bcrypt hashed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrar accounts
CREATE TABLE registrar_accounts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL           -- bcrypt hashed
);

-- Accounting accounts
CREATE TABLE accounting_accounts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL           -- bcrypt hashed
);

-- Suggestions
CREATE TABLE suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  department VARCHAR(255) NOT NULL,        -- 'Registrar' | 'Accounting Office'
  user_role VARCHAR(50),                   -- 'Student' | 'Faculty Staff'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',    -- 'Pending' | 'Reviewed'
  anonymous BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_accounts(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  date_posted TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials
CREATE TABLE testimonials (
  id SERIAL PRIMARY KEY,
  suggestion_id INTEGER REFERENCES suggestions(id),
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Data Flow

1. **Submit suggestion:** React form → `POST /api/suggestions` (with JWT cookie) → Gin handler → service validates → repository inserts → 201 response → toast shown in UI
2. **Homepage announcements:** React `useEffect` → `GET /api/announcements` → rendered paginated list (5 per page, client-side)
3. **Admin feature testimonial:** Admin clicks "Feature" → `POST /api/suggestions/:id/feature` → service reads suggestion, creates testimonial row → response triggers UI refresh
4. **Auth restore on reload:** `AuthContext` mounts → `GET /api/auth/me` → if 401, user is guest; if 200, sets user + role in context → router guards allow/redirect accordingly

---

## Error Handling

- Go handlers return consistent JSON: `{"error": "message"}` on failure, data object on success
- HTTP status codes used correctly (400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 500 server error)
- Frontend axios client has a response interceptor: 401 → clears auth state and redirects to login
- Form validation: both frontend (required fields, email format) and backend (input sanitization before DB insert)

---

## UI Modernization Notes

The rewrite uses the same color palette (dark navy `#1b2b48`, accent blue) but improves:
- Responsive layout using CSS Grid/Flexbox with Tailwind CSS
- Smooth page transitions with React Router
- Loading skeletons instead of blank states
- Toast notifications for all user actions
- Clean card-based layouts for suggestions and announcements
- Better mobile experience throughout

---

## Deployment

### Backend (Render)
- Go web service: build command `go build ./cmd/main.go`, start command `./main`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`
- Migrations run automatically at startup

### Frontend (Vercel)
- Root directory: `frontend/`
- Build command: `npm run build`
- Environment variable: `VITE_API_URL` = Render backend URL

### CORS
- Go CORS middleware allows origin `FRONTEND_URL` with `credentials: true`
- Vercel frontend sets `axios.defaults.withCredentials = true`
