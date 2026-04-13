# Auth: Forgot Password + Signup Education Fields — Design

**Date:** 2026-04-13
**Scope:** Student auth only. Staff accounts (admin/registrar/accounting) are out of scope.

## Goals

1. Students who forget their password can reset it themselves via an email link.
2. New student signups capture education level (HS / SHS / College) and, for College, department (CCE / CTE / CABE / CCJE / TVET).
3. Existing students with missing education info are prompted once on next login.

Email delivery: Gmail SMTP (credentials supplied by operator at deploy time).

## Non-Goals

- Email verification of new signups.
- Forgot password for staff accounts (they remain manual resets).
- HS grade level / SHS strand capture.
- Multi-factor auth.

---

## 1. Data Model

### 1.1 `users` table — new columns

Migration `002_user_education.sql`:

```sql
ALTER TABLE users ADD COLUMN education_level TEXT NULL;
ALTER TABLE users ADD COLUMN college_department TEXT NULL;
```

Allowed values (enforced in handler, not DB):

- `education_level` ∈ {`HS`, `SHS`, `College`}
- `college_department` ∈ {`CCE`, `CTE`, `CABE`, `CCJE`, `TVET`}
- `college_department` must be `NULL` unless `education_level = 'College'`
- `college_department` must be non-NULL when `education_level = 'College'`

Existing rows remain NULL on both columns; this is the signal for the "complete profile" redirect.

### 1.2 `password_reset_tokens` table — new

Migration `003_password_reset_tokens.sql`:

```sql
CREATE TABLE password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
```

Raw tokens are never stored — only SHA-256 of the token. Single-use enforced by `used_at IS NULL` check. Lifetime: 30 minutes.

---

## 2. Backend Endpoints

### 2.1 New routes (under `/api/auth`)

**`POST /api/auth/forgot-password`** — public
- Request: `{ "email": string }`
- Response: always `200 { "message": "If that email exists, a reset link was sent." }` (no enumeration)
- Behavior:
  1. Look up user by email (students table only).
  2. If found: generate 32 random bytes → base64url-encode → hash SHA-256 → insert row with `expires_at = now + 30m`.
  3. Send email via SMTP with link `${FRONTEND_URL}/reset-password?token=<raw_token>`.
  4. Swallow SMTP errors (log server-side, still return 200).
- Rate limit: 5 requests per email per hour, in-memory map keyed by lowercased email, protected by mutex.

**`POST /api/auth/reset-password`** — public
- Request: `{ "token": string, "new_password": string }`
- Validates `new_password` length ≥ 6 (matches current signup rule).
- Looks up row by `token_hash = SHA256(token)`; rejects if not found, already used, or expired.
- Updates user password (bcrypt) and sets `used_at = now()`.
- Response: `200 { "message": "Password updated." }` on success. `400 { "error": "Invalid or expired reset link." }` otherwise.

**`POST /api/auth/complete-profile`** — authenticated student only
- Request: `{ "education_level": string, "college_department"?: string }`
- Validates enum values and college→department rule.
- Updates the row for the user in the JWT.
- Response: `200 { ...user }` on success; `400` on validation error.

### 2.2 Modified routes

**`POST /api/auth/signup`** — now requires `education_level` and, if College, `college_department`. Validation errors return `400` with a clear field message.

**`GET /api/auth/me`** — response now includes `education_level` and `college_department`, so the frontend knows whether to redirect to `/complete-profile`.

### 2.3 Mail service

New package `internal/services/mail`:

- Thin wrapper around `net/smtp` (no third-party deps).
- Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- One exported function: `SendPasswordReset(to, resetLink string) error`.
- Plain-text body with the reset link and expiry note.
- If `SMTP_HOST` is unset, the sender logs and no-ops (so local dev without SMTP configured still works).

---

## 3. Frontend

### 3.1 Modified pages

**`SignupPage.tsx`** — add:
- Radio group "Education Level": HS / SHS / College.
- Conditional `<select>` "Department" visible only when College is chosen, options: CCE, CTE, CABE, CCJE, TVET.
- Form submission passes the new fields.

**`StudentLoginPage.tsx`** — the existing "Forgot password?" button navigates to `/forgot-password` instead of showing the "contact admin" toast.

### 3.2 New pages

**`/forgot-password`** — single email input, "Send reset link" button. On submit, calls the endpoint and shows a neutral success toast regardless of result.

**`/reset-password?token=...`** — reads token from query string. Two fields: new password, confirm password. On submit, calls the reset endpoint. On success: redirect to `/login` with "password updated" toast. On error: show the backend error.

**`/complete-profile`** — same education-level + department controls as signup (without email/password/name). Submit calls `/api/auth/complete-profile`, then navigates to the student dashboard.

### 3.3 Route guard

In the top-level student shell, after `me` resolves:
- If role is `user` AND `education_level` is null AND current path ≠ `/complete-profile`: navigate to `/complete-profile`.
- Applied to all authenticated student routes.

---

## 4. Error Handling

| Situation | Backend | User-facing |
|---|---|---|
| Forgot-password for unknown email | 200 OK | Neutral success message |
| Forgot-password rate limit | 429 | "Too many requests. Try again later." |
| Reset token missing/expired/used | 400 | "This reset link is invalid or expired. Please request a new one." |
| Reset password too short | 400 | Inline field error |
| Signup missing education level | 400 | Inline field error |
| Signup: College without department | 400 | Inline field error |
| Signup: non-College with department | 400 | Inline field error |
| Complete-profile invalid combo | 400 | Inline field error |
| SMTP failure | 200 (logged server-side) | Neutral success message |

---

## 5. Testing

### 5.1 Automated (Go unit tests)

- `services/auth`: token generation returns 32 random bytes, hash is deterministic.
- `services/auth`: reset token verification — expired, already-used, valid, unknown.
- `services/auth`: signup validation — each education-level / department combination.
- `services/mail`: no-op path when `SMTP_HOST` is empty.

### 5.2 Manual smoke tests

- Signup as HS → no department shown, succeeds.
- Signup as SHS → no department shown, succeeds.
- Signup as College → department required, succeeds with each department.
- Forgot-password with real Gmail account → email arrives → link works → password changed → old password rejected.
- Forgot-password second use of same link → rejected.
- Forgot-password link after 30 min → rejected.
- Existing-user login (NULL education_level) → redirected to `/complete-profile` → completes → lands on dashboard.

---

## 6. Operational Notes

- `.env.example` gains: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- For Gmail: use an App Password (requires 2FA on the account). Host `smtp.gmail.com`, port `587`, STARTTLS.
- In local dev without SMTP, the mail service no-ops; reset tokens still hit the DB so you can copy the raw token from logs for end-to-end testing. The generated raw token is logged at `DEBUG` only when `SMTP_HOST` is empty.
