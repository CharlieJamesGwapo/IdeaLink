# Group B — Auth & Account

**Date:** 2026-04-26
**Scope:** Three items from the April 21 punch list:

- **Bug B1 (login → immediate logout):** "Pag mo login mo kalit rag log out."
- **Feature B2 (Reset Password works end-to-end):** "Tung reset password og maka send sa email sa password wala pa."
- **Feature B3 (My Account page on User dashboard):** "Wala pa ang 'My Account' sa User dashboard… Full Name, Email, Department or HS/SHS… ma Edit ra ang grade/department, naa sab 'Reset Password' button."

**Out of scope (later groups):**
- Group C: real-time/Facebook-style notifications + announcement notif clearing.
- Group D: service-rating chart, photo attachments visible to staff, office hours editor + history + custom workdays, services catalog editor, slow eye-icon.
- Group E: homepage "Values" → "Core Values", footer phone number, announcement pagination layout, top overflow.

---

## B1 — Login Immediately Logs Out

### Problem

Users report logging in successfully, then being kicked back to the login page within a heartbeat. The toast "Welcome back!" sometimes shows before the page reloads to a logged-out state.

### Likely root cause

`frontend/src/context/AuthContext.tsx:62-87` calls `me()` when the provider mounts. Its catch arm is:

```ts
.catch(() => finish(null, null))
```

`finish(null, null)` clears the cached `currentUser` and `role` and writes `null` to `localStorage`. Any failure of `me()` — including transient errors that have nothing to do with auth — therefore looks identical to "you are not logged in" and logs the user out.

After successful login the page navigates (or `useRedirectIfAuthed` calls `window.location.replace`) which re-mounts AuthProvider. If the cookie has not yet propagated, or the backend returns 502/504/network error, the `.catch()` fires and the user is logged out.

### Design

1. **Distinguish "server says unauthenticated" from "request failed."**
   - Treat HTTP `401` as the only signal that the user is logged out.
   - For any other failure (network error, 5xx, CORS preflight failure, timeout) keep the cached auth and surface a console warning.
   - Implementation: inspect `axios` error → if `err.response?.status === 401` clear; else retain.

2. **Add a regression test** in `frontend/src/context/AuthContext.test.tsx`:
   - `me()` rejects with a network error → cached user MUST persist.
   - `me()` resolves with HTTP 401 → cached user MUST be cleared.
   - `me()` resolves with valid data → cached user is replaced with server data.

3. **Verify cookie attributes for the deployed environment.**
   - Backend sets the cookie via `setTokenCookie` with `SameSiteNoneMode`, `Secure=true`, `HttpOnly=true`. This requires HTTPS at both ends. If the deployed frontend hits the API over a non-HTTPS origin in dev, the cookie is dropped.
   - The fix above already handles this case: `me()` would return 401, which is the correct signal — we just need to make sure that's only used path that clears auth.
   - Document the requirement: in production, FRONTEND_URL and the API origin MUST both be HTTPS.

4. **Stop using `window.location.replace` after login** if the bug repros come from full reloads. The current `useRedirectIfAuthed` in `router.tsx:144-157` does a hard navigation; replacing it with React Router's `useNavigate` keeps the AuthProvider mounted and avoids the second `me()` call entirely. This is a defensive change and only applied if step 1 alone does not reproduce-fix the bug.

### Verification

- Manual: deploy → log in as user / admin / registrar / accounting → confirm dashboard loads and stays loaded across page reloads.
- Automated: regression test in `AuthContext.test.tsx` (above).

---

## B2 — Reset Password End-to-End

### Current state

Backend code is complete:
- `backend/internal/handlers/auth.go:176-218` (handlers `ForgotPassword`, `ResetPassword`).
- `backend/internal/services/auth_service.go:265-328` (`RequestPasswordReset`, `ResetPassword`) — rate-limited 5/hour/email, sha256-hashed token, 30-minute expiry, single-use marker.
- `backend/internal/services/mail/mail.go` — supports both STARTTLS and Gmail port-465 implicit TLS.
- Audit table `email_logs` (migration 013) records every send attempt.

Frontend code is complete:
- `frontend/src/pages/public/ForgotPasswordPage.tsx` — handles 429 / 501 / 502 with explicit toasts.
- `frontend/src/pages/public/ResetPasswordPage.tsx` — token from URL, validates length, posts to `/api/auth/reset-password`.

### Why "wala pa"

The most likely cause is environment configuration, not code:
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` not set on the production server, or
- Gmail App Password not generated (regular password is rejected by SMTP), or
- `FRONTEND_URL` set to a stale origin so the reset link 404s.

### Design

1. **Document required env vars** in `docs/setup/email.md`:
   - `SMTP_HOST` (e.g., `smtp.gmail.com`)
   - `SMTP_PORT` (`465` for implicit TLS, `587` for STARTTLS)
   - `SMTP_USER` (e.g., `noreply@ascb.edu.ph`)
   - `SMTP_PASS` (Gmail App Password — 16 chars, generated from Google account security)
   - `SMTP_FROM` (display From, e.g., `IdeaLink <noreply@ascb.edu.ph>`)
   - `FRONTEND_URL` (canonical base, used to build reset link)

2. **Verify configuration on the deployed environment** as a runbook step. No code change required if env vars are present.

3. **Backend integration test** using a fake mailer:
   - `services/auth_service_test.go` test: `TestPasswordResetRoundTrip` — request reset, intercept the link, post to reset endpoint, log in with new password.
   - Confirms the round-trip works end-to-end without a real SMTP server.

4. **Manual smoke test** (post-deploy checklist):
   - Open `/forgot-password` with a real email.
   - Confirm row appears in `email_logs` with `status='sent'`.
   - Confirm email arrives in inbox.
   - Click link → `/reset-password?token=…` renders.
   - Submit new password → toast → log in succeeds with new password.

5. **No new code surface** beyond test + doc. Flow design (link, not raw password) stays — emailing raw passwords is a credential-disclosure risk and provides no UX win when a one-step in-page change exists (see B3).

### Verification

- Backend: new integration test `TestPasswordResetRoundTrip` passes in CI.
- Production: smoke test checklist runs green end-to-end.
- `email_logs` shows `status='sent'` for the smoke test email.

---

## B3 — My Account Page

### Goal

User can view their profile and edit two narrow fields: their **grade** (HS/SHS) or **department** (College). They can also change their password without leaving the page.

Read-only fields (locked, registrar-controlled): Full Name, Email, Education Level itself.

> Note: the spec restricts editable fields to grade or department because Full Name and Email are issued by the registrar's office, and Education Level transitions (e.g. HS → SHS) typically coincide with promotion events handled administratively. If the registrar's workflow requires students to self-correct Education Level, that is a small extension covered in Open Questions below.

### Data model

New column on `users`:

```sql
-- migration 014_user_grade_level.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level TEXT NULL;
```

Allowed values:
- HS (Junior High School): `'7'`, `'8'`, `'9'`, `'10'`
- SHS (Senior High School): `'11'`, `'12'`
- College: must be `NULL`

Validation rule (extends `validateEducation` in `auth_service.go`):

| education_level | college_department | grade_level |
|---|---|---|
| `HS`            | MUST be NULL       | one of `7,8,9,10` |
| `SHS`           | MUST be NULL       | one of `11,12` |
| `College`       | one of CCE/CTE/CABE/CCJE/TVET | MUST be NULL |

`models.User` gains `GradeLevel *string \`json:"grade_level"\``.
`Me` handler returns `grade_level` alongside `education_level` and `college_department` for `role=user`.

### Backend endpoints (new)

```
PATCH /api/auth/profile
  Auth: cookie-jwt, role=user
  Body: {
    education_level: "HS"|"SHS"|"College",
    college_department: "CCE"|"CTE"|"CABE"|"CCJE"|"TVET" | null,
    grade_level: "7"|"8"|"9"|"10"|"11"|"12" | null
  }
  200 → updated User (incl. grade_level)
  400 → invalid combination

POST /api/auth/change-password
  Auth: cookie-jwt, role=user
  Body: { current_password, new_password }
  200 → { message: "Password updated" }
  400 → password too short (< 6 chars)
  401 → current password incorrect
```

`PATCH /api/auth/profile` reuses validation logic with the existing `CompleteProfile` flow. Internal call: `userRepo.UpdateEducation(userID, level, dept)` extended (or wrapped) to also write `grade_level`. Method becomes `UpdateProfile(userID, level, dept, grade)` — a clean superset of `UpdateEducation`. Existing `CompleteProfile` migrates to the new method, passing `nil` for `grade_level` on first save (the user fills it in afterwards on the My Account page).

`POST /api/auth/change-password` is straightforward:
1. Look up user by ID from JWT.
2. `bcrypt.CompareHashAndPassword(stored, current_password)` → 401 if mismatch.
3. Validate `len(new_password) >= 6` → 400 if not.
4. `userRepo.UpdatePassword(userID, hashed)` → 200.

### Frontend

**Route:** `frontend/src/pages/user/MyAccountPage.tsx`, registered in `router.tsx` under `<RequireAuth role="user">` block at path `/user/account`.

**Nav placement:** add a "My Account" `NavLink` in `Header.tsx` between the "Announcements" item and the Logout button. Mobile menu mirrors. No badge.

**Page layout** — single column, fits inside `PublicLayout` like other user pages:

1. **Profile card**
   - Read-only: Full Name (text), Email (text).
   - Education Level (read-only display — e.g. "Senior High School" / "College"). Editing this is in Open Questions.
   - Conditional editable field:
     - If level is HS → Grade dropdown (7-10).
     - If level is SHS → Grade dropdown (11-12).
     - If level is College → Department dropdown (CCE/CTE/CABE/CCJE/TVET).
   - "Save changes" button → calls `PATCH /api/auth/profile`.
   - On 200: toast success, refresh `currentUser` via `setAuth`.
   - On 400: toast the error message from the server.

2. **Change Password card**
   - Three fields: Current password, New password (≥ 6 chars), Confirm new password.
   - Client-side validate: new === confirm, new.length ≥ 6.
   - Submit → `POST /api/auth/change-password`.
   - On 200: toast "Password updated", clear all three fields.
   - On 401: toast "Current password is incorrect" (do NOT clear fields).
   - On 400: toast the server message.

**API helpers** added to `frontend/src/api/auth.ts`:

```ts
export const updateProfile = (
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
  gradeLevel: string | null,
) => client.patch('/api/auth/profile', { ... })

export const changePassword = (currentPassword: string, newPassword: string) =>
  client.post('/api/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
```

`MeResponse` and `CurrentUser` gain `grade_level: string | null`.

### Components

The grade/department selector reuses `frontend/src/components/auth/EducationFields.tsx` if its API permits an "edit mode" with grade enabled. If not, the spec proposes a small new component `ProfileLevelFields.tsx` that wraps the same dropdown UI and emits `(level, dept, grade)` on change. The existing `CompleteProfilePage` can adopt the new component too — small refactor, same UI.

### Verification

**Backend unit tests** (`auth_service_test.go`):
- `TestUpdateProfile_HS_valid` (level=HS, grade=8 → ok, dept must be nil).
- `TestUpdateProfile_HS_invalidGrade` (grade=11 with level=HS → 400).
- `TestUpdateProfile_College_validDept` (level=College, dept=CCE, grade=nil → ok).
- `TestUpdateProfile_College_withGrade_rejected` (level=College, grade=12 → 400).
- `TestChangePassword_happy`, `TestChangePassword_wrongCurrent`, `TestChangePassword_tooShort`.

**Backend handler tests** — auth required (no cookie → 401) on both endpoints.

**Frontend tests:**
- `MyAccountPage` smoke render at each education level.
- `AuthContext.test.tsx` regression added for B1.

**Manual smoke:**
1. Log in as HS user → /user/account → grade dropdown shows 7-10.
2. Change to grade 9 → save → reload → grade=9 persisted.
3. Change Education Level via Open-Question path (if implemented) → dropdown switches.
4. Change Password with wrong current → toast error, fields keep value.
5. Change Password successfully → log out → log in with new password.

---

## Migration & Rollout

- Migration `014_user_grade_level.sql` is additive (nullable column) — safe to deploy ahead of code.
- Deploy order: migration → backend → frontend.
- No feature flag needed (small surface; missing My Account before deploy is the current state).
- `grade_level` is nullable; existing HS/SHS users pre-deploy will have `grade_level = NULL` and see an empty dropdown until they save once.

## Open Questions

1. **Can users edit their own Education Level?**
   The spec currently locks it (registrar transitions students between HS/SHS/College). If the school allows self-edit, the UI is trivial to extend — just unhide the level dropdown. **Default: locked.**

2. **Grade-range cutoffs.**
   The spec uses HS=7-10, SHS=11-12 (Philippine K-12 standard). If ASCB uses a different convention (e.g. "HS" includes Grade 11-12), the validation tables update; UI is unchanged.

If either matters, raise during implementation review and I will adjust `validateEducation` accordingly.

---

## Summary of changed/added files

**Backend:**
- `backend/internal/migrations/014_user_grade_level.sql` (new)
- `backend/internal/migrations/migrations.go` (embed new SQL)
- `backend/internal/models/user.go` (add `GradeLevel`)
- `backend/internal/repository/user_repo.go` (rename/extend `UpdateEducation` → `UpdateProfile`)
- `backend/internal/services/auth_service.go` (extend `validateEducation`, add `UpdateProfile`, add `ChangePassword`, fix B1 hypothesis if backend-side)
- `backend/internal/handlers/auth.go` (add `UpdateProfile`, `ChangePassword`, return `grade_level` in `Me`)
- `backend/cmd/main.go` (route registration: `PATCH /api/auth/profile`, `POST /api/auth/change-password`)
- `backend/internal/services/auth_service_test.go` (new tests above)
- `docs/setup/email.md` (new — env var docs)

**Frontend:**
- `frontend/src/context/AuthContext.tsx` (B1 fix: distinguish 401 from network error)
- `frontend/src/context/AuthContext.test.tsx` (B1 regression test)
- `frontend/src/api/auth.ts` (new helpers, type updates)
- `frontend/src/pages/user/MyAccountPage.tsx` (new)
- `frontend/src/components/auth/EducationFields.tsx` or new `ProfileLevelFields.tsx`
- `frontend/src/components/layout/Header.tsx` (add "My Account" nav)
- `frontend/src/router.tsx` (route registration; possibly retire `window.location.replace`)
