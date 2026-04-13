# Auth: Forgot Password + Signup Education Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let students (1) reset forgotten passwords via emailed link, (2) provide education level + department at signup, and (3) be prompted to complete education info on first login if missing.

**Architecture:** Go/Gin backend with raw SQL Postgres + JWT cookies; React/TypeScript frontend with react-router + axios + sonner. Two new DB migrations embed cleanly into the existing `migrations.go` pattern. A small `services/mail` package wraps `net/smtp` (no third-party dep) with a no-op fallback when `SMTP_HOST` is unset. A new `password_reset_tokens` table stores SHA-256 hashes of tokens; raw tokens are only emailed. The `AuthServicer` interface gains three methods; handlers get three new routes plus updated signup/me.

**Tech Stack:** Go 1.x, Gin, `database/sql` + lib/pq, bcrypt, JWT, net/smtp (stdlib), godotenv; React 18, react-router, axios, sonner, Tailwind; TDD via testify.

**Spec:** `docs/superpowers/specs/2026-04-13-auth-forgot-password-and-signup-fields-design.md`

**Note on migration numbering:** The spec calls the new migrations `002_*` and `003_*`, but `001_initial.sql` and `002_additions.sql` already exist. This plan uses `003_user_education.sql` and `004_password_reset_tokens.sql`.

---

## File Structure

### Backend — create
- `backend/internal/migrations/003_user_education.sql` — adds `education_level`, `college_department` to `users`.
- `backend/internal/migrations/004_password_reset_tokens.sql` — creates `password_reset_tokens` table + indexes.
- `backend/internal/services/mail/mail.go` — `SendPasswordReset(to, resetLink)` over SMTP, no-op when unconfigured.
- `backend/internal/services/mail/mail_test.go` — tests the no-op path.
- `backend/internal/repository/password_reset_repo.go` — `PasswordResetRepo` with `Create`, `FindValidByHash`, `MarkUsed`.
- `backend/internal/services/rate_limiter.go` — in-memory sliding-window limiter keyed by string.
- `backend/internal/services/rate_limiter_test.go`.

### Backend — modify
- `backend/internal/migrations/migrations.go` — embed new SQL files.
- `backend/internal/config/db.go` — run new migrations.
- `backend/internal/config/config.go` — load `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- `backend/.env.example` — document new vars.
- `backend/internal/models/user.go` — add `EducationLevel`, `CollegeDepartment` (nullable strings).
- `backend/internal/repository/interfaces.go` — extend `UserRepository`; add `PasswordResetRepository`.
- `backend/internal/repository/user_repo.go` — update scans, add `UpdateEducation`, update `CreateUser` signature.
- `backend/internal/repository/compile_checks.go` — add compile check for `PasswordResetRepo`.
- `backend/internal/services/interfaces.go` — extend `AuthServicer` with 3 methods.
- `backend/internal/services/auth_service.go` — implement forgot/reset/complete-profile; update SignupUser.
- `backend/internal/services/auth_service_test.go` — new unit tests.
- `backend/internal/handlers/auth.go` — new handlers + signup input changes; update `Me` response.
- `backend/internal/handlers/auth_test.go` — update mock + new tests.
- `backend/cmd/main.go` — wire new repo/service, register new routes.

### Frontend — create
- `frontend/src/pages/public/ForgotPasswordPage.tsx`
- `frontend/src/pages/public/ResetPasswordPage.tsx`
- `frontend/src/pages/user/CompleteProfilePage.tsx`
- `frontend/src/components/auth/EducationFields.tsx` — reusable education-level + department controls.

### Frontend — modify
- `frontend/src/api/auth.ts` — add `forgotPassword`, `resetPassword`, `completeProfile`; extend `signup` + `me` types.
- `frontend/src/context/AuthContext.tsx` — carry `education_level` and `college_department`.
- `frontend/src/pages/public/SignupPage.tsx` — integrate `EducationFields`.
- `frontend/src/pages/public/StudentLoginPage.tsx` — forgot-password button → `/forgot-password`.
- `frontend/src/router.tsx` — register new routes + profile-completion guard.

---

## Task 1: Add DB migration for users education fields

**Files:**
- Create: `backend/internal/migrations/003_user_education.sql`
- Modify: `backend/internal/migrations/migrations.go`
- Modify: `backend/internal/config/db.go`

- [ ] **Step 1: Write the migration SQL**

Create `backend/internal/migrations/003_user_education.sql`:
```sql
-- 003_user_education.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS college_department TEXT NULL;
```

- [ ] **Step 2: Embed the migration**

Edit `backend/internal/migrations/migrations.go` to append:
```go
//go:embed 003_user_education.sql
var UserEducationSQL string
```

- [ ] **Step 3: Run it at startup**

Edit `backend/internal/config/db.go` function `runMigrations` to add after the AdditionsSQL Exec (before the `log.Println`):
```go
if _, err := db.Exec(migrations.UserEducationSQL); err != nil {
    log.Fatalf("failed to run user education migration: %v", err)
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/migrations/003_user_education.sql backend/internal/migrations/migrations.go backend/internal/config/db.go
git commit -m "feat(db): add education_level and college_department to users"
```

---

## Task 2: Add DB migration for password_reset_tokens

**Files:**
- Create: `backend/internal/migrations/004_password_reset_tokens.sql`
- Modify: `backend/internal/migrations/migrations.go`
- Modify: `backend/internal/config/db.go`

- [ ] **Step 1: Write the migration SQL**

Create `backend/internal/migrations/004_password_reset_tokens.sql`:
```sql
-- 004_password_reset_tokens.sql

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
```

- [ ] **Step 2: Embed the migration**

Append to `backend/internal/migrations/migrations.go`:
```go
//go:embed 004_password_reset_tokens.sql
var PasswordResetTokensSQL string
```

- [ ] **Step 3: Run at startup**

In `backend/internal/config/db.go` `runMigrations`, after the UserEducationSQL Exec:
```go
if _, err := db.Exec(migrations.PasswordResetTokensSQL); err != nil {
    log.Fatalf("failed to run password_reset_tokens migration: %v", err)
}
```

- [ ] **Step 4: Verify the build**

Run: `cd backend && go build ./...`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/migrations/004_password_reset_tokens.sql backend/internal/migrations/migrations.go backend/internal/config/db.go
git commit -m "feat(db): add password_reset_tokens table"
```

---

## Task 3: Extend User model + repo with education fields

**Files:**
- Modify: `backend/internal/models/user.go`
- Modify: `backend/internal/repository/interfaces.go`
- Modify: `backend/internal/repository/user_repo.go`

- [ ] **Step 1: Update the User struct**

Edit `backend/internal/models/user.go`. Replace the `User` struct with:
```go
type User struct {
    ID                   int       `json:"id"`
    Email                string    `json:"email"`
    Password             string    `json:"-"`
    Fullname             string    `json:"fullname"`
    EducationLevel       *string   `json:"education_level"`
    CollegeDepartment    *string   `json:"college_department"`
    LastAnnouncementView time.Time `json:"last_announcement_view"`
    CreatedAt            time.Time `json:"created_at"`
}
```

- [ ] **Step 2: Extend UserRepository interface**

Edit `backend/internal/repository/interfaces.go`. Replace the `CreateUser` line and add three new methods inside `UserRepository`:
```go
type UserRepository interface {
    CreateUser(email, hashedPassword, fullname, educationLevel string, collegeDepartment *string) (*models.User, error)
    FindUserByEmail(email string) (*models.User, error)
    FindUserByID(id int) (*models.User, error)
    UpdatePassword(userID int, hashedPassword string) error
    UpdateEducation(userID int, educationLevel string, collegeDepartment *string) error
    FindAdminByEmail(email string) (*models.AdminAccount, error)
    FindRegistrarByUsername(username string) (*models.RegistrarAccount, error)
    FindAccountingByUsername(username string) (*models.AccountingAccount, error)
    UpdateLastAnnouncementView(userID int) error
    CountUsers() (int, error)
}
```

- [ ] **Step 3: Update `CreateUser` in user_repo.go**

Edit `backend/internal/repository/user_repo.go`. Replace `CreateUser`:
```go
func (r *UserRepo) CreateUser(email, hashedPassword, fullname, educationLevel string, collegeDepartment *string) (*models.User, error) {
    var u models.User
    err := r.db.QueryRow(
        `INSERT INTO users (email, password, fullname, education_level, college_department)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, fullname, education_level, college_department, last_announcement_view, created_at`,
        email, hashedPassword, fullname, educationLevel, collegeDepartment,
    ).Scan(&u.ID, &u.Email, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.LastAnnouncementView, &u.CreatedAt)
    return &u, err
}
```

- [ ] **Step 4: Update `FindUserByEmail` to scan new fields**

In the same file, replace `FindUserByEmail`:
```go
func (r *UserRepo) FindUserByEmail(email string) (*models.User, error) {
    var u models.User
    err := r.db.QueryRow(
        `SELECT id, email, password, fullname, education_level, college_department, last_announcement_view, created_at
         FROM users WHERE email = $1`,
        email,
    ).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.LastAnnouncementView, &u.CreatedAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return &u, err
}
```

- [ ] **Step 5: Add `FindUserByID`, `UpdatePassword`, `UpdateEducation`**

Append to `backend/internal/repository/user_repo.go`:
```go
func (r *UserRepo) FindUserByID(id int) (*models.User, error) {
    var u models.User
    err := r.db.QueryRow(
        `SELECT id, email, password, fullname, education_level, college_department, last_announcement_view, created_at
         FROM users WHERE id = $1`,
        id,
    ).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.LastAnnouncementView, &u.CreatedAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return &u, err
}

func (r *UserRepo) UpdatePassword(userID int, hashedPassword string) error {
    _, err := r.db.Exec(`UPDATE users SET password = $1 WHERE id = $2`, hashedPassword, userID)
    return err
}

func (r *UserRepo) UpdateEducation(userID int, educationLevel string, collegeDepartment *string) error {
    _, err := r.db.Exec(
        `UPDATE users SET education_level = $1, college_department = $2 WHERE id = $3`,
        educationLevel, collegeDepartment, userID,
    )
    return err
}
```

- [ ] **Step 6: Verify the build**

Run: `cd backend && go build ./...`
Expected: this will FAIL because `services.SignupUser` and existing tests call the old `CreateUser` signature. That's OK — Task 6 fixes SignupUser. For now, check that ONLY those failures appear (no syntax errors in the files you edited).

Run: `cd backend && go vet ./internal/repository/... ./internal/models/...`
Expected: no errors in these two packages.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/models/user.go backend/internal/repository/interfaces.go backend/internal/repository/user_repo.go
git commit -m "feat(users): add education fields and profile update helpers"
```

---

## Task 4: Add PasswordResetRepo

**Files:**
- Create: `backend/internal/repository/password_reset_repo.go`
- Modify: `backend/internal/repository/interfaces.go`
- Modify: `backend/internal/repository/compile_checks.go`

- [ ] **Step 1: Define the interface**

Append to `backend/internal/repository/interfaces.go`:
```go
type PasswordResetRepository interface {
    Create(userID int, tokenHash string, expiresAt time.Time) error
    FindValidByHash(tokenHash string) (userID int, id int, err error)
    MarkUsed(id int) error
}
```
Add `"time"` to the imports of `interfaces.go` if not already present.

- [ ] **Step 2: Write the repo**

Create `backend/internal/repository/password_reset_repo.go`:
```go
package repository

import (
    "database/sql"
    "errors"
    "time"
)

// ErrResetTokenNotFound indicates no valid (unexpired, unused) token matches.
var ErrResetTokenNotFound = errors.New("reset token not found or expired")

type PasswordResetRepo struct {
    db *sql.DB
}

func NewPasswordResetRepo(db *sql.DB) *PasswordResetRepo {
    return &PasswordResetRepo{db: db}
}

func (r *PasswordResetRepo) Create(userID int, tokenHash string, expiresAt time.Time) error {
    _, err := r.db.Exec(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        userID, tokenHash, expiresAt,
    )
    return err
}

// FindValidByHash returns (userID, rowID) for a token that is unused and not expired.
func (r *PasswordResetRepo) FindValidByHash(tokenHash string) (int, int, error) {
    var userID, id int
    err := r.db.QueryRow(
        `SELECT id, user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
        tokenHash,
    ).Scan(&id, &userID)
    if err == sql.ErrNoRows {
        return 0, 0, ErrResetTokenNotFound
    }
    if err != nil {
        return 0, 0, err
    }
    return userID, id, nil
}

func (r *PasswordResetRepo) MarkUsed(id int) error {
    _, err := r.db.Exec(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, id)
    return err
}
```

- [ ] **Step 3: Add compile-time interface check**

Edit `backend/internal/repository/compile_checks.go` to add after the existing `var _ UserRepository = (*UserRepo)(nil)` line:
```go
var _ PasswordResetRepository = (*PasswordResetRepo)(nil)
```

- [ ] **Step 4: Verify the build**

Run: `cd backend && go build ./internal/repository/...`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/repository/password_reset_repo.go backend/internal/repository/interfaces.go backend/internal/repository/compile_checks.go
git commit -m "feat(repo): add password_reset_tokens repository"
```

---

## Task 5: Mail service (SMTP wrapper with no-op fallback)

**Files:**
- Create: `backend/internal/services/mail/mail.go`
- Create: `backend/internal/services/mail/mail_test.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/services/mail/mail_test.go`:
```go
package mail_test

import (
    "testing"

    "idealink/internal/services/mail"

    "github.com/stretchr/testify/assert"
)

func TestSender_NoOpWhenHostEmpty(t *testing.T) {
    s := mail.NewSender(mail.Config{Host: ""})
    err := s.SendPasswordReset("alice@example.com", "https://example.com/reset?token=abc")
    assert.NoError(t, err, "no-op sender must not error when host is unset")
}

func TestSender_ErrorsWhenHostSetButUnreachable(t *testing.T) {
    s := mail.NewSender(mail.Config{
        Host: "127.0.0.1", Port: "1", From: "noreply@example.com",
    })
    err := s.SendPasswordReset("alice@example.com", "https://example.com/reset?token=abc")
    assert.Error(t, err, "real SMTP dial must fail for port 1")
}
```

- [ ] **Step 2: Run the test (expected to fail with compile error)**

Run: `cd backend && go test ./internal/services/mail/...`
Expected: build failure because the package doesn't exist yet.

- [ ] **Step 3: Implement the sender**

Create `backend/internal/services/mail/mail.go`:
```go
package mail

import (
    "fmt"
    "log"
    "net/smtp"
)

type Config struct {
    Host string
    Port string
    User string
    Pass string
    From string
}

type Sender struct {
    cfg Config
}

func NewSender(cfg Config) *Sender {
    return &Sender{cfg: cfg}
}

// SendPasswordReset sends a plain-text password reset email.
// If Host is empty, it logs and returns nil (local dev without SMTP).
func (s *Sender) SendPasswordReset(to, resetLink string) error {
    if s.cfg.Host == "" {
        log.Printf("[mail] SMTP_HOST unset — skipping send. Reset link for %s: %s", to, resetLink)
        return nil
    }
    subject := "Reset your IdeaLink password"
    body := fmt.Sprintf(
        "Hi,\r\n\r\nSomeone requested a password reset for your IdeaLink account.\r\n"+
            "Click the link below to choose a new password. The link expires in 30 minutes and can only be used once.\r\n\r\n"+
            "%s\r\n\r\n"+
            "If you didn't request this, you can safely ignore this email.\r\n",
        resetLink,
    )
    msg := []byte(
        "From: " + s.cfg.From + "\r\n" +
            "To: " + to + "\r\n" +
            "Subject: " + subject + "\r\n" +
            "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
            body,
    )
    addr := s.cfg.Host + ":" + s.cfg.Port
    auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Pass, s.cfg.Host)
    return smtp.SendMail(addr, auth, s.cfg.From, []string{to}, msg)
}
```

- [ ] **Step 4: Run the tests**

Run: `cd backend && go test ./internal/services/mail/... -v`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/services/mail/mail.go backend/internal/services/mail/mail_test.go
git commit -m "feat(mail): add SMTP sender with no-op fallback"
```

---

## Task 6: Rate limiter utility

**Files:**
- Create: `backend/internal/services/rate_limiter.go`
- Create: `backend/internal/services/rate_limiter_test.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/services/rate_limiter_test.go`:
```go
package services_test

import (
    "testing"
    "time"

    "idealink/internal/services"

    "github.com/stretchr/testify/assert"
)

func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
    rl := services.NewRateLimiter(3, time.Hour)
    assert.True(t, rl.Allow("alice@example.com"))
    assert.True(t, rl.Allow("alice@example.com"))
    assert.True(t, rl.Allow("alice@example.com"))
}

func TestRateLimiter_BlocksOverLimit(t *testing.T) {
    rl := services.NewRateLimiter(2, time.Hour)
    assert.True(t, rl.Allow("bob@example.com"))
    assert.True(t, rl.Allow("bob@example.com"))
    assert.False(t, rl.Allow("bob@example.com"))
}

func TestRateLimiter_IndependentKeys(t *testing.T) {
    rl := services.NewRateLimiter(1, time.Hour)
    assert.True(t, rl.Allow("a@example.com"))
    assert.True(t, rl.Allow("b@example.com"))
    assert.False(t, rl.Allow("a@example.com"))
}

func TestRateLimiter_ExpiresOldEntries(t *testing.T) {
    rl := services.NewRateLimiter(1, 10*time.Millisecond)
    assert.True(t, rl.Allow("c@example.com"))
    assert.False(t, rl.Allow("c@example.com"))
    time.Sleep(20 * time.Millisecond)
    assert.True(t, rl.Allow("c@example.com"))
}
```

- [ ] **Step 2: Run the test (expect failure)**

Run: `cd backend && go test ./internal/services/ -run TestRateLimiter`
Expected: build failure (`NewRateLimiter` undefined).

- [ ] **Step 3: Implement**

Create `backend/internal/services/rate_limiter.go`:
```go
package services

import (
    "strings"
    "sync"
    "time"
)

type RateLimiter struct {
    mu     sync.Mutex
    limit  int
    window time.Duration
    hits   map[string][]time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        limit:  limit,
        window: window,
        hits:   make(map[string][]time.Time),
    }
}

// Allow records a hit for key and returns true if under the limit.
// Keys are lowercased and trimmed to normalize e.g. email inputs.
func (r *RateLimiter) Allow(key string) bool {
    key = strings.ToLower(strings.TrimSpace(key))
    r.mu.Lock()
    defer r.mu.Unlock()

    cutoff := time.Now().Add(-r.window)
    kept := r.hits[key][:0]
    for _, t := range r.hits[key] {
        if t.After(cutoff) {
            kept = append(kept, t)
        }
    }
    if len(kept) >= r.limit {
        r.hits[key] = kept
        return false
    }
    r.hits[key] = append(kept, time.Now())
    return true
}
```

- [ ] **Step 4: Run tests**

Run: `cd backend && go test ./internal/services/ -run TestRateLimiter -v`
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/services/rate_limiter.go backend/internal/services/rate_limiter_test.go
git commit -m "feat(services): add in-memory rate limiter"
```

---

## Task 7: Extend AuthServicer interface + update AuthService.SignupUser

**Files:**
- Modify: `backend/internal/services/interfaces.go`
- Modify: `backend/internal/services/auth_service.go`

- [ ] **Step 1: Extend the interface**

Edit `backend/internal/services/interfaces.go`. Replace the whole file:
```go
// backend/internal/services/interfaces.go
package services

import "idealink/internal/models"

// AuthServicer defines the auth operations used by handlers.
type AuthServicer interface {
    SignToken(userID int, role string) (string, error)
    ParseToken(tokenStr string) (*Claims, error)
    HashPassword(password string) (string, error)
    CheckPassword(hash, password string) bool
    SignupUser(email, password, fullname, educationLevel string, collegeDepartment *string) (*models.User, string, error)
    LoginUser(email, password string) (*models.User, string, error)
    LoginAdmin(email, password string) (*models.AdminAccount, string, error)
    LoginRegistrar(username, password string) (*models.RegistrarAccount, string, error)
    LoginAccounting(username, password string) (*models.AccountingAccount, string, error)

    GetUserByID(userID int) (*models.User, error)
    RequestPasswordReset(email string) error
    ResetPassword(rawToken, newPassword string) error
    CompleteProfile(userID int, educationLevel string, collegeDepartment *string) (*models.User, error)
}
```

- [ ] **Step 2: Validate helpers + update constructor**

Edit `backend/internal/services/auth_service.go`. Add imports (append to the existing block):
```go
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/hex"
    "strings"

    "idealink/internal/repository"
    "idealink/internal/services/mail"
```
(`repository` is already imported — don't duplicate.)

Replace the `AuthService` struct + `NewAuthService`:
```go
type AuthService struct {
    userRepo       repository.UserRepository
    resetRepo      repository.PasswordResetRepository
    mailer         PasswordResetMailer
    rateLimiter    *RateLimiter
    jwtSecret      string
    frontendURL    string
    resetTokenTTL  time.Duration
}

// PasswordResetMailer is the narrow dependency AuthService needs from mail.Sender.
type PasswordResetMailer interface {
    SendPasswordReset(to, resetLink string) error
}

func NewAuthService(
    userRepo repository.UserRepository,
    resetRepo repository.PasswordResetRepository,
    mailer PasswordResetMailer,
    jwtSecret, frontendURL string,
) *AuthService {
    return &AuthService{
        userRepo:      userRepo,
        resetRepo:     resetRepo,
        mailer:        mailer,
        rateLimiter:   NewRateLimiter(5, time.Hour),
        jwtSecret:     jwtSecret,
        frontendURL:   frontendURL,
        resetTokenTTL: 30 * time.Minute,
    }
}

// Compile-time check that mail.Sender satisfies the mailer interface.
var _ PasswordResetMailer = (*mail.Sender)(nil)
```

- [ ] **Step 3: Add validation helpers**

Append to `backend/internal/services/auth_service.go`:
```go
var allowedEducationLevels = map[string]bool{"HS": true, "SHS": true, "College": true}
var allowedCollegeDepartments = map[string]bool{
    "CCE": true, "CTE": true, "CABE": true, "CCJE": true, "TVET": true,
}

// ErrInvalidEducation indicates the education_level/college_department combo is invalid.
var ErrInvalidEducation = errors.New("invalid education level or department")

// validateEducation enforces the rules from the spec:
// - education_level must be one of HS/SHS/College
// - college_department must be set iff education_level == "College"
// - college_department must be one of the allowed codes
func validateEducation(educationLevel string, collegeDepartment *string) error {
    if !allowedEducationLevels[educationLevel] {
        return ErrInvalidEducation
    }
    if educationLevel == "College" {
        if collegeDepartment == nil || !allowedCollegeDepartments[*collegeDepartment] {
            return ErrInvalidEducation
        }
    } else {
        if collegeDepartment != nil {
            return ErrInvalidEducation
        }
    }
    return nil
}
```

- [ ] **Step 4: Update `SignupUser`**

In `backend/internal/services/auth_service.go`, replace the existing `SignupUser`:
```go
func (s *AuthService) SignupUser(email, password, fullname, educationLevel string, collegeDepartment *string) (*models.User, string, error) {
    if err := validateEducation(educationLevel, collegeDepartment); err != nil {
        return nil, "", err
    }
    existing, err := s.userRepo.FindUserByEmail(email)
    if err != nil {
        return nil, "", err
    }
    if existing != nil {
        return nil, "", ErrEmailTaken
    }
    hashed, err := s.HashPassword(password)
    if err != nil {
        return nil, "", err
    }
    user, err := s.userRepo.CreateUser(email, hashed, fullname, educationLevel, collegeDepartment)
    if err != nil {
        return nil, "", err
    }
    token, err := s.SignToken(user.ID, RoleUser)
    return user, token, err
}
```

- [ ] **Step 5: Add `GetUserByID`, `CompleteProfile`, `RequestPasswordReset`, `ResetPassword`**

Append to `backend/internal/services/auth_service.go`:
```go
// ErrInvalidResetToken is returned when a reset token is missing, expired, or already used.
var ErrInvalidResetToken = errors.New("invalid or expired reset token")

// ErrRateLimited is returned when the caller has exceeded the password-reset rate limit.
var ErrRateLimited = errors.New("too many requests")

// ErrPasswordTooShort mirrors the signup rule (min 6 chars).
var ErrPasswordTooShort = errors.New("password must be at least 6 characters")

func (s *AuthService) GetUserByID(userID int) (*models.User, error) {
    return s.userRepo.FindUserByID(userID)
}

func (s *AuthService) CompleteProfile(userID int, educationLevel string, collegeDepartment *string) (*models.User, error) {
    if err := validateEducation(educationLevel, collegeDepartment); err != nil {
        return nil, err
    }
    if err := s.userRepo.UpdateEducation(userID, educationLevel, collegeDepartment); err != nil {
        return nil, err
    }
    return s.userRepo.FindUserByID(userID)
}

func hashResetToken(raw string) string {
    sum := sha256.Sum256([]byte(raw))
    return hex.EncodeToString(sum[:])
}

func (s *AuthService) RequestPasswordReset(email string) error {
    email = strings.ToLower(strings.TrimSpace(email))
    if !s.rateLimiter.Allow(email) {
        return ErrRateLimited
    }
    user, err := s.userRepo.FindUserByEmail(email)
    if err != nil {
        return err
    }
    if user == nil {
        // Silent success — do not reveal non-existence.
        return nil
    }
    rawBytes := make([]byte, 32)
    if _, err := rand.Read(rawBytes); err != nil {
        return err
    }
    rawToken := base64.RawURLEncoding.EncodeToString(rawBytes)
    tokenHash := hashResetToken(rawToken)
    expiresAt := time.Now().Add(s.resetTokenTTL)
    if err := s.resetRepo.Create(user.ID, tokenHash, expiresAt); err != nil {
        return err
    }
    link := strings.TrimRight(s.frontendURL, "/") + "/reset-password?token=" + rawToken
    if err := s.mailer.SendPasswordReset(user.Email, link); err != nil {
        // Log and swallow — we still return nil so the handler returns a neutral 200.
        fmt.Printf("[auth] password-reset mail send failed for %s: %v\n", user.Email, err)
    }
    return nil
}

func (s *AuthService) ResetPassword(rawToken, newPassword string) error {
    if len(newPassword) < 6 {
        return ErrPasswordTooShort
    }
    tokenHash := hashResetToken(rawToken)
    userID, rowID, err := s.resetRepo.FindValidByHash(tokenHash)
    if err != nil {
        if errors.Is(err, repository.ErrResetTokenNotFound) {
            return ErrInvalidResetToken
        }
        return err
    }
    hashed, err := s.HashPassword(newPassword)
    if err != nil {
        return err
    }
    if err := s.userRepo.UpdatePassword(userID, hashed); err != nil {
        return err
    }
    return s.resetRepo.MarkUsed(rowID)
}
```

- [ ] **Step 6: Verify the service package compiles**

Run: `cd backend && go build ./internal/services/...`
Expected: no errors in the `services` package itself. (Handlers/tests may still fail — those are fixed in the next tasks.)

- [ ] **Step 7: Commit**

```bash
git add backend/internal/services/interfaces.go backend/internal/services/auth_service.go
git commit -m "feat(auth): add password reset + complete profile + education validation"
```

---

## Task 8: Unit tests for auth_service new behavior

**Files:**
- Modify: `backend/internal/services/auth_service_test.go`

Read the top of this file first to see how the existing mock UserRepository is defined (it's a type `mockUserRepo` implementing `repository.UserRepository`). You need to (a) extend that mock to cover the new methods, (b) add a mock `PasswordResetRepository`, (c) add a mock mailer, (d) add new tests.

- [ ] **Step 1: Read the existing test file for structure**

Run: `cd backend && sed -n '1,60p' internal/services/auth_service_test.go`
Identify the mock type name and where its methods end. The goal is to add the new methods in the same style (likely inline stubs).

- [ ] **Step 2: Extend `mockUserRepo`**

In `backend/internal/services/auth_service_test.go`, add these fields to the existing `mockUserRepo` struct (or equivalent):
```go
    // Added for education/password reset tests:
    updatedEducation map[int]struct{ Level string; Dept *string }
    updatedPassword  map[int]string
    byIDUser         *models.User
```

Add these methods to `mockUserRepo`:
```go
func (m *mockUserRepo) FindUserByID(id int) (*models.User, error) {
    return m.byIDUser, nil
}
func (m *mockUserRepo) UpdatePassword(userID int, hashedPassword string) error {
    if m.updatedPassword == nil {
        m.updatedPassword = map[int]string{}
    }
    m.updatedPassword[userID] = hashedPassword
    return nil
}
func (m *mockUserRepo) UpdateEducation(userID int, level string, dept *string) error {
    if m.updatedEducation == nil {
        m.updatedEducation = map[int]struct{ Level string; Dept *string }{}
    }
    m.updatedEducation[userID] = struct{ Level string; Dept *string }{level, dept}
    return nil
}
```

Update the existing `CreateUser` method signature on the mock to match the new interface:
```go
func (m *mockUserRepo) CreateUser(email, hashed, fullname, educationLevel string, collegeDepartment *string) (*models.User, error) {
    // preserve existing mock semantics; just record the new fields if the test needs them
    return &models.User{
        ID: 1, Email: email, Fullname: fullname,
        EducationLevel:    &educationLevel,
        CollegeDepartment: collegeDepartment,
    }, nil
}
```

- [ ] **Step 3: Add mock `PasswordResetRepo` + mock mailer**

Append to `backend/internal/services/auth_service_test.go` (above the tests, below the existing mocks):
```go
type mockResetRepo struct {
    created    []string // captured token_hashes
    validHash  string
    validUser  int
    validID    int
    used       []int
}

func (m *mockResetRepo) Create(userID int, tokenHash string, expiresAt time.Time) error {
    m.created = append(m.created, tokenHash)
    return nil
}
func (m *mockResetRepo) FindValidByHash(tokenHash string) (int, int, error) {
    if tokenHash == m.validHash {
        return m.validUser, m.validID, nil
    }
    return 0, 0, repository.ErrResetTokenNotFound
}
func (m *mockResetRepo) MarkUsed(id int) error {
    m.used = append(m.used, id)
    return nil
}

type mockMailer struct {
    sent []struct{ To, Link string }
}

func (m *mockMailer) SendPasswordReset(to, link string) error {
    m.sent = append(m.sent, struct{ To, Link string }{to, link})
    return nil
}
```

Also add imports at the top of the file if missing: `"time"`, `"idealink/internal/repository"`.

- [ ] **Step 4: Update the `NewAuthService` call-sites in existing tests**

Search the test file for `NewAuthService(` and update each call to pass the new args:
```go
svc := services.NewAuthService(userRepo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
```

- [ ] **Step 5: Add the new tests**

Append the following test functions to `backend/internal/services/auth_service_test.go`:
```go
func TestAuthService_SignupUser_RejectsMissingEducation(t *testing.T) {
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    _, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "", nil)
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_SignupUser_RejectsCollegeWithoutDept(t *testing.T) {
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    _, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "College", nil)
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_SignupUser_RejectsNonCollegeWithDept(t *testing.T) {
    dept := "CCE"
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    _, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "HS", &dept)
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_SignupUser_AcceptsHS(t *testing.T) {
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    u, tok, err := svc.SignupUser("a@b.com", "pass123", "Alice", "HS", nil)
    assert.NoError(t, err)
    assert.NotEmpty(t, tok)
    assert.NotNil(t, u)
}

func TestAuthService_SignupUser_AcceptsCollegeWithDept(t *testing.T) {
    dept := "CTE"
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    u, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "College", &dept)
    assert.NoError(t, err)
    assert.NotNil(t, u)
}

func TestAuthService_RequestPasswordReset_UnknownEmailSucceedsSilently(t *testing.T) {
    resetRepo := &mockResetRepo{}
    mailer := &mockMailer{}
    svc := services.NewAuthService(&mockUserRepo{}, resetRepo, mailer, "s", "https://f")
    err := svc.RequestPasswordReset("nobody@example.com")
    assert.NoError(t, err)
    assert.Empty(t, resetRepo.created)
    assert.Empty(t, mailer.sent)
}

func TestAuthService_RequestPasswordReset_KnownEmailSendsMail(t *testing.T) {
    userRepo := &mockUserRepo{byEmail: &models.User{ID: 42, Email: "u@e.com"}}
    resetRepo := &mockResetRepo{}
    mailer := &mockMailer{}
    svc := services.NewAuthService(userRepo, resetRepo, mailer, "s", "https://f.test")
    err := svc.RequestPasswordReset("u@e.com")
    assert.NoError(t, err)
    assert.Len(t, resetRepo.created, 1)
    assert.Len(t, mailer.sent, 1)
    assert.Contains(t, mailer.sent[0].Link, "https://f.test/reset-password?token=")
}

func TestAuthService_RequestPasswordReset_RateLimits(t *testing.T) {
    userRepo := &mockUserRepo{byEmail: &models.User{ID: 42, Email: "u@e.com"}}
    svc := services.NewAuthService(userRepo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    var lastErr error
    for i := 0; i < 10; i++ {
        lastErr = svc.RequestPasswordReset("u@e.com")
        if lastErr != nil {
            break
        }
    }
    assert.ErrorIs(t, lastErr, services.ErrRateLimited)
}

func TestAuthService_ResetPassword_InvalidToken(t *testing.T) {
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    err := svc.ResetPassword("bogus", "newpass123")
    assert.ErrorIs(t, err, services.ErrInvalidResetToken)
}

func TestAuthService_ResetPassword_ShortPassword(t *testing.T) {
    svc := services.NewAuthService(&mockUserRepo{}, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    err := svc.ResetPassword("anytoken", "short")
    assert.ErrorIs(t, err, services.ErrPasswordTooShort)
}

func TestAuthService_ResetPassword_ValidFlow(t *testing.T) {
    // Arrange: create a token via the service so we know the hash is right.
    userRepo := &mockUserRepo{byEmail: &models.User{ID: 42, Email: "u@e.com"}}
    resetRepo := &mockResetRepo{}
    mailer := &mockMailer{}
    svc := services.NewAuthService(userRepo, resetRepo, mailer, "s", "https://f")
    _ = svc.RequestPasswordReset("u@e.com")
    require.Len(t, resetRepo.created, 1)

    // Use the raw token embedded in the emailed link.
    link := mailer.sent[0].Link
    rawToken := link[len("https://f/reset-password?token="):]
    // Seed the mock so FindValidByHash returns success for this token.
    resetRepo.validHash = resetRepo.created[0]
    resetRepo.validUser = 42
    resetRepo.validID = 7

    err := svc.ResetPassword(rawToken, "newpass123")
    assert.NoError(t, err)
    assert.Equal(t, []int{7}, resetRepo.used)
    assert.NotEmpty(t, userRepo.updatedPassword[42])
}

func TestAuthService_CompleteProfile_ValidatesAndPersists(t *testing.T) {
    userRepo := &mockUserRepo{byIDUser: &models.User{ID: 42, Email: "u@e.com"}}
    svc := services.NewAuthService(userRepo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")

    dept := "CCE"
    u, err := svc.CompleteProfile(42, "College", &dept)
    assert.NoError(t, err)
    assert.NotNil(t, u)

    _, err = svc.CompleteProfile(42, "Bogus", nil)
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}
```

Note: if the existing `mockUserRepo` does not have a `byEmail` field, add one and have `FindUserByEmail` return it.

- [ ] **Step 6: Run the tests**

Run: `cd backend && go test ./internal/services/... -v`
Expected: all tests (existing + new) PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/services/auth_service_test.go
git commit -m "test(auth): unit tests for reset, education, complete profile"
```

---

## Task 9: Update config to load SMTP vars

**Files:**
- Modify: `backend/internal/config/config.go`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add SMTP fields to Config**

Edit `backend/internal/config/config.go`. Add fields to `Config`:
```go
type Config struct {
    DatabaseURL string
    JWTSecret   string
    Port        string
    FrontendURL string

    SMTPHost string
    SMTPPort string
    SMTPUser string
    SMTPPass string
    SMTPFrom string
}
```

In `Load()`, before the `return`, read them with `getOr`:
```go
    return &Config{
        DatabaseURL: databaseURL,
        JWTSecret:   jwtSecret,
        Port:        getOr("PORT", "8080"),
        FrontendURL: getOr("FRONTEND_URL", "http://localhost:5173"),
        SMTPHost:    os.Getenv("SMTP_HOST"),
        SMTPPort:    getOr("SMTP_PORT", "587"),
        SMTPUser:    os.Getenv("SMTP_USER"),
        SMTPPass:    os.Getenv("SMTP_PASS"),
        SMTPFrom:    os.Getenv("SMTP_FROM"),
    }, nil
```

- [ ] **Step 2: Update `.env.example`**

Edit `backend/.env.example`. Append:
```
# Gmail SMTP (leave SMTP_HOST unset in local dev — mail becomes a no-op)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=IdeaLink <your-account@gmail.com>
```

- [ ] **Step 3: Verify build**

Run: `cd backend && go build ./internal/config/...`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/config/config.go backend/.env.example
git commit -m "feat(config): load SMTP settings for password reset mail"
```

---

## Task 10: Update auth handlers — signup, me, and new routes

**Files:**
- Modify: `backend/internal/handlers/auth.go`

- [ ] **Step 1: Extend `signupInput`**

In `backend/internal/handlers/auth.go`, replace the `signupInput` struct:
```go
type signupInput struct {
    Email             string  `json:"email" binding:"required,email"`
    Password          string  `json:"password" binding:"required,min=6"`
    Fullname          string  `json:"fullname" binding:"required"`
    EducationLevel    string  `json:"education_level" binding:"required"`
    CollegeDepartment *string `json:"college_department"`
}
```

- [ ] **Step 2: Update `Signup` to pass new fields**

In `Signup`, replace the `h.svc.SignupUser(...)` call:
```go
    user, token, err := h.svc.SignupUser(input.Email, input.Password, input.Fullname, input.EducationLevel, input.CollegeDepartment)
    if err != nil {
        switch {
        case errors.Is(err, services.ErrEmailTaken):
            c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
        case errors.Is(err, services.ErrInvalidEducation):
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid education level or department"})
        default:
            c.JSON(http.StatusInternalServerError, gin.H{"error": "registration failed"})
        }
        return
    }
```

- [ ] **Step 3: Replace `Me` to return the full user**

Replace the existing `Me` handler:
```go
func (h *AuthHandler) Me(c *gin.Context) {
    userIDVal, _ := c.Get(middleware.CtxKeyUserID)
    roleVal, _ := c.Get(middleware.CtxKeyRole)

    role, _ := roleVal.(string)
    userID, _ := userIDVal.(int)

    resp := gin.H{"user_id": userID, "role": role}
    // For student role, include education fields so the frontend can redirect to /complete-profile.
    if role == services.RoleUser {
        user, err := h.svc.GetUserByID(userID)
        if err == nil && user != nil {
            resp["education_level"] = user.EducationLevel
            resp["college_department"] = user.CollegeDepartment
        }
    }
    c.JSON(http.StatusOK, resp)
}
```

- [ ] **Step 4: Add forgot/reset/complete-profile handlers**

Append to `backend/internal/handlers/auth.go`:
```go
type forgotPasswordInput struct {
    Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
    var input forgotPasswordInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    err := h.svc.RequestPasswordReset(input.Email)
    if errors.Is(err, services.ErrRateLimited) {
        c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please try again later"})
        return
    }
    // Neutral response regardless of success/not-found/SMTP failure.
    c.JSON(http.StatusOK, gin.H{"message": "If that email exists, a reset link was sent."})
}

type resetPasswordInput struct {
    Token       string `json:"token" binding:"required"`
    NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
    var input resetPasswordInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    err := h.svc.ResetPassword(input.Token, input.NewPassword)
    if err != nil {
        if errors.Is(err, services.ErrPasswordTooShort) {
            c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 6 characters"})
            return
        }
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired reset link"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Password updated."})
}

type completeProfileInput struct {
    EducationLevel    string  `json:"education_level" binding:"required"`
    CollegeDepartment *string `json:"college_department"`
}

func (h *AuthHandler) CompleteProfile(c *gin.Context) {
    var input completeProfileInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    userIDVal, _ := c.Get(middleware.CtxKeyUserID)
    userID, _ := userIDVal.(int)
    user, err := h.svc.CompleteProfile(userID, input.EducationLevel, input.CollegeDepartment)
    if err != nil {
        if errors.Is(err, services.ErrInvalidEducation) {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid education level or department"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update profile"})
        return
    }
    c.JSON(http.StatusOK, user)
}
```

- [ ] **Step 5: Verify build**

Run: `cd backend && go build ./internal/handlers/...`
Expected: the `handlers` package builds, but tests in `auth_test.go` won't compile yet (mock is missing new methods). That's OK — Task 11 fixes the tests.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handlers/auth.go
git commit -m "feat(auth): handlers for forgot/reset/complete-profile and updated signup"
```

---

## Task 11: Update handler tests

**Files:**
- Modify: `backend/internal/handlers/auth_test.go`

- [ ] **Step 1: Extend `mockAuthSvc`**

In `backend/internal/handlers/auth_test.go`, add fields to `mockAuthSvc`:
```go
    // added for forgot/reset/complete-profile tests
    getUserErr       error
    getUserResult    *models.User
    forgotErr        error
    resetErr         error
    completeErr      error
    completeResult   *models.User
```

Update the existing `SignupUser` mock method signature to match the new interface:
```go
func (m *mockAuthSvc) SignupUser(email, password, fullname, educationLevel string, collegeDepartment *string) (*models.User, string, error) {
    if m.signupErr != nil {
        return nil, "", m.signupErr
    }
    return m.signedUser, m.token, nil
}
```

Append four new methods to `mockAuthSvc`:
```go
func (m *mockAuthSvc) GetUserByID(userID int) (*models.User, error) {
    return m.getUserResult, m.getUserErr
}
func (m *mockAuthSvc) RequestPasswordReset(email string) error { return m.forgotErr }
func (m *mockAuthSvc) ResetPassword(tok, newPw string) error   { return m.resetErr }
func (m *mockAuthSvc) CompleteProfile(userID int, level string, dept *string) (*models.User, error) {
    if m.completeErr != nil {
        return nil, m.completeErr
    }
    return m.completeResult, nil
}
```

- [ ] **Step 2: Update existing signup test bodies**

Find every request body in the file that posts to `/api/auth/signup` and add `"education_level":"HS"`. The main ones are `TestAuthHandler_Signup_Success` and `TestAuthHandler_Signup_DuplicateEmail`. Example:
```go
body := `{"email":"alice@test.com","password":"pass123","fullname":"Alice","education_level":"HS"}`
```

- [ ] **Step 3: Register the new routes in `setupAuthRouter`**

In `setupAuthRouter`, add:
```go
    r.POST("/api/auth/forgot-password", h.ForgotPassword)
    r.POST("/api/auth/reset-password", h.ResetPassword)
    r.POST("/api/auth/complete-profile", func(c *gin.Context) {
        c.Set(middleware.CtxKeyUserID, 1)
        c.Set(middleware.CtxKeyRole, services.RoleUser)
        h.CompleteProfile(c)
    })
```

- [ ] **Step 4: Add new tests**

Append to `backend/internal/handlers/auth_test.go`:
```go
func TestAuthHandler_ForgotPassword_AlwaysNeutral(t *testing.T) {
    r := setupAuthRouter(&mockAuthSvc{})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/forgot-password", bytes.NewBufferString(`{"email":"x@y.com"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
    assert.Contains(t, w.Body.String(), "If that email exists")
}

func TestAuthHandler_ForgotPassword_RateLimited(t *testing.T) {
    r := setupAuthRouter(&mockAuthSvc{forgotErr: services.ErrRateLimited})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/forgot-password", bytes.NewBufferString(`{"email":"x@y.com"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestAuthHandler_ResetPassword_Success(t *testing.T) {
    r := setupAuthRouter(&mockAuthSvc{})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/reset-password", bytes.NewBufferString(`{"token":"t","new_password":"pass1234"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_ResetPassword_InvalidToken(t *testing.T) {
    r := setupAuthRouter(&mockAuthSvc{resetErr: services.ErrInvalidResetToken})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/reset-password", bytes.NewBufferString(`{"token":"bad","new_password":"pass1234"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusBadRequest, w.Code)
    assert.Contains(t, w.Body.String(), "invalid or expired")
}

func TestAuthHandler_CompleteProfile_Success(t *testing.T) {
    level := "College"
    dept := "CCE"
    svc := &mockAuthSvc{completeResult: &models.User{ID: 1, Email: "u@e.com", EducationLevel: &level, CollegeDepartment: &dept}}
    r := setupAuthRouter(svc)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBufferString(`{"education_level":"College","college_department":"CCE"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusOK, w.Code)
    assert.Contains(t, w.Body.String(), "CCE")
}

func TestAuthHandler_CompleteProfile_Invalid(t *testing.T) {
    r := setupAuthRouter(&mockAuthSvc{completeErr: services.ErrInvalidEducation})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBufferString(`{"education_level":"Bogus"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)
    assert.Equal(t, http.StatusBadRequest, w.Code)
}
```

- [ ] **Step 5: Run the full handler + services test suite**

Run: `cd backend && go test ./internal/handlers/... ./internal/services/... -v`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handlers/auth_test.go
git commit -m "test(auth): handler tests for forgot/reset/complete-profile"
```

---

## Task 12: Wire new dependencies into main.go

**Files:**
- Modify: `backend/cmd/main.go`

- [ ] **Step 1: Update the imports + wiring**

In `backend/cmd/main.go`, after `userRepo := repository.NewUserRepo(db)`, add:
```go
    passwordResetRepo := repository.NewPasswordResetRepo(db)
```

Replace the existing `authSvc := services.NewAuthService(...)` line with:
```go
    mailer := mail.NewSender(mail.Config{
        Host: cfg.SMTPHost,
        Port: cfg.SMTPPort,
        User: cfg.SMTPUser,
        Pass: cfg.SMTPPass,
        From: cfg.SMTPFrom,
    })
    authSvc := services.NewAuthService(userRepo, passwordResetRepo, mailer, cfg.JWTSecret, cfg.FrontendURL)
```

Add to the imports block:
```go
    "idealink/internal/services/mail"
```

- [ ] **Step 2: Register the new routes**

In the `auth := r.Group("/api/auth")` block, add routes so it reads:
```go
    auth := r.Group("/api/auth")
    {
        auth.POST("/signup", authH.Signup)
        auth.POST("/login", authH.Login)
        auth.POST("/admin/login", authH.AdminLogin)
        auth.POST("/registrar/login", authH.RegistrarLogin)
        auth.POST("/accounting/login", authH.AccountingLogin)
        auth.POST("/logout", authH.Logout)
        auth.POST("/forgot-password", authH.ForgotPassword)
        auth.POST("/reset-password", authH.ResetPassword)
        auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authH.Me)
        auth.POST("/complete-profile", middleware.AuthRequired(cfg.JWTSecret, "user"), authH.CompleteProfile)
    }
```

- [ ] **Step 3: Build and run the full test suite**

Run: `cd backend && go build ./... && go test ./...`
Expected: build + all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/cmd/main.go
git commit -m "feat(main): wire password reset repo, mailer, and new auth routes"
```

---

## Task 13: Frontend API client additions

**Files:**
- Modify: `frontend/src/api/auth.ts`

- [ ] **Step 1: Update signup signature + me type + add three new calls**

Replace the entire `frontend/src/api/auth.ts`:
```typescript
import client from './client'

export type EducationLevel = 'HS' | 'SHS' | 'College'
export type CollegeDepartment = 'CCE' | 'CTE' | 'CABE' | 'CCJE' | 'TVET'

export interface MeResponse {
  user_id: number
  role: string
  education_level?: string | null
  college_department?: string | null
}

export const signup = (
  email: string,
  password: string,
  fullname: string,
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
) =>
  client.post('/api/auth/signup', {
    email,
    password,
    fullname,
    education_level: educationLevel,
    college_department: collegeDepartment,
  })

export const login = (email: string, password: string) =>
  client.post('/api/auth/login', { email, password })

export const adminLogin = (email: string, password: string) =>
  client.post('/api/auth/admin/login', { email, password })

export const registrarLogin = (username: string, password: string) =>
  client.post('/api/auth/registrar/login', { username, password })

export const accountingLogin = (username: string, password: string) =>
  client.post('/api/auth/accounting/login', { username, password })

export const logout = () => client.post('/api/auth/logout')

export const me = () => client.get<MeResponse>('/api/auth/me')

export const forgotPassword = (email: string) =>
  client.post('/api/auth/forgot-password', { email })

export const resetPassword = (token: string, newPassword: string) =>
  client.post('/api/auth/reset-password', { token, new_password: newPassword })

export const completeProfile = (
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
) =>
  client.post('/api/auth/complete-profile', {
    education_level: educationLevel,
    college_department: collegeDepartment,
  })
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npm run typecheck 2>/dev/null || npx tsc --noEmit`
Expected: `SignupPage.tsx` will show an error (too few args to `signup`). That's OK — Task 15 fixes it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.ts
git commit -m "feat(api): forgot/reset/complete-profile clients + typed me response"
```

---

## Task 14: AuthContext — carry education fields

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Update the context shape**

Edit `frontend/src/context/AuthContext.tsx`. Replace the `AuthContextValue` interface and related state shape:
```typescript
export interface CurrentUser {
  id: number
  education_level: string | null
  college_department: string | null
}

interface AuthContextValue {
  currentUser: CurrentUser | null
  role: string | null
  isLoading: boolean
  setAuth: (user: CurrentUser | null, role: string | null) => void
  clearAuth: () => void
}
```

Update the cache helpers to include the new fields (replace `readCache` + `writeCache`):
```typescript
function readCache(): { user: CurrentUser; role: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as { user: CurrentUser; role: string }) : null
  } catch { return null }
}

function writeCache(user: CurrentUser | null, role: string | null) {
  try {
    if (user && role) localStorage.setItem(CACHE_KEY, JSON.stringify({ user, role }))
    else localStorage.removeItem(CACHE_KEY)
  } catch { /* storage unavailable */ }
}
```

Update the `useState` types inside `AuthProvider`:
```typescript
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(cached?.user ?? null)
```

Update the `finish` callback to take a `CurrentUser` instead of `{id:number}`:
```typescript
    const finish = (user: CurrentUser | null, roleVal: string | null) => {
```

Update the `me()` `.then` to build a full `CurrentUser`:
```typescript
      .then(res => {
        const userId = res.data?.user_id
        const role   = res.data?.role
        if (typeof userId === 'number' && typeof role === 'string') {
          finish({
            id: userId,
            education_level: (res.data?.education_level as string | null | undefined) ?? null,
            college_department: (res.data?.college_department as string | null | undefined) ?? null,
          }, role)
        } else {
          finish(null, null)
        }
      })
```

Update `setAuth`'s parameter type:
```typescript
  const setAuth = (user: CurrentUser | null, newRole: string | null) => {
```

- [ ] **Step 2: Verify typecheck catches callers**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors in `SignupPage.tsx` and possibly `StudentLoginPage.tsx`/`StaffLoginPage.tsx` where `setAuth({id: ...})` is called without education fields. Those are fixed in Task 15 and a small update here.

- [ ] **Step 3: Update `setAuth` call-sites outside SignupPage**

Search for `setAuth(` across `frontend/src`:
```bash
grep -rn "setAuth(" frontend/src
```
For login pages that do `setAuth({ id: res.data.id }, 'user')`, update to:
```typescript
setAuth({
  id: res.data.id,
  education_level: res.data.education_level ?? null,
  college_department: res.data.college_department ?? null,
}, 'user')
```
Apply to `StudentLoginPage.tsx`, `StaffLoginPage.tsx` (for the admin/registrar/accounting role branches — those get `education_level: null, college_department: null` since staff have no education fields). Leave SignupPage for Task 15.

- [ ] **Step 4: Typecheck again**

Run: `cd frontend && npx tsc --noEmit`
Expected: only SignupPage errors remain.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/pages/public/StudentLoginPage.tsx frontend/src/pages/public/StaffLoginPage.tsx
git commit -m "feat(auth): AuthContext carries education fields"
```

---

## Task 15: Reusable EducationFields component + SignupPage integration

**Files:**
- Create: `frontend/src/components/auth/EducationFields.tsx`
- Modify: `frontend/src/pages/public/SignupPage.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/auth/EducationFields.tsx`:
```typescript
import type { EducationLevel, CollegeDepartment } from '../../api/auth'

const DEPARTMENTS: { value: CollegeDepartment; label: string }[] = [
  { value: 'CCE', label: 'CCE — College of Computing Education' },
  { value: 'CTE', label: 'CTE — College of Teacher Education' },
  { value: 'CABE', label: 'CABE — College of Accountancy & Business Education' },
  { value: 'CCJE', label: 'CCJE — College of Criminal Justice Education' },
  { value: 'TVET', label: 'TVET — Technical & Vocational Education' },
]

interface Props {
  level: EducationLevel | ''
  department: CollegeDepartment | ''
  onLevelChange: (level: EducationLevel) => void
  onDepartmentChange: (dept: CollegeDepartment | '') => void
}

export function EducationFields({ level, department, onLevelChange, onDepartmentChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-400 font-ui">Education Level</label>
        <div className="grid grid-cols-3 gap-2">
          {(['HS', 'SHS', 'College'] as EducationLevel[]).map(opt => {
            const selected = level === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onLevelChange(opt)
                  if (opt !== 'College') onDepartmentChange('')
                }}
                className={`h-11 rounded-xl font-ui text-sm font-semibold transition-all duration-200 border ${
                  selected
                    ? 'bg-ascb-orange/15 border-ascb-orange text-white'
                    : 'bg-white/[0.04] border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {level === 'College' && (
        <div className="space-y-1.5 animate-fade-in">
          <label className="block text-xs font-semibold text-gray-400 font-ui">Department</label>
          <select
            value={department}
            onChange={e => onDepartmentChange(e.target.value as CollegeDepartment | '')}
            className="input-field h-11 w-full"
          >
            <option value="">Select department…</option>
            {DEPARTMENTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire it into SignupPage**

Edit `frontend/src/pages/public/SignupPage.tsx`. Add imports:
```typescript
import { EducationFields } from '../../components/auth/EducationFields'
import type { EducationLevel, CollegeDepartment } from '../../api/auth'
```

Add state (next to the other `useState` hooks):
```typescript
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('')
  const [collegeDepartment, setCollegeDepartment] = useState<CollegeDepartment | ''>('')
```

Update `handleSubmit` validation + signup call:
```typescript
    if (!educationLevel) { toast.error('Please select your education level'); return }
    if (educationLevel === 'College' && !collegeDepartment) { toast.error('Please select your department'); return }
    setIsLoading(true)
    try {
      const res = await signup(
        email,
        password,
        fullname,
        educationLevel,
        educationLevel === 'College' ? collegeDepartment as CollegeDepartment : null,
      )
      setAuth({
        id: res.data.id,
        education_level: res.data.education_level ?? educationLevel,
        college_department: res.data.college_department ?? (educationLevel === 'College' ? collegeDepartment : null),
      }, 'user')
      toast.success('Account created! Welcome to IdeaLink.')
      navigate('/user/submit')
```

Insert the component inside the `<form>` — after the Password field block (the `</div>` closing the password section) and before the CTA button:
```tsx
            <EducationFields
              level={educationLevel}
              department={collegeDepartment}
              onLevelChange={setEducationLevel}
              onDepartmentChange={setCollegeDepartment}
            />
```

- [ ] **Step 3: Typecheck + manual smoke test**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

Start dev: `cd frontend && npm run dev` (background) and open `/signup`. Verify:
- Education selector shows HS / SHS / College as three pill buttons.
- Picking College reveals the department dropdown.
- Picking HS hides it and clears any previously selected department.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/auth/EducationFields.tsx frontend/src/pages/public/SignupPage.tsx
git commit -m "feat(signup): education level + college department selector"
```

---

## Task 16: ForgotPasswordPage

**Files:**
- Create: `frontend/src/pages/public/ForgotPasswordPage.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/public/ForgotPasswordPage.tsx`:
```typescript
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Mail, ArrowLeft } from 'lucide-react'
import { forgotPassword } from '../../api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email'); return }
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
      toast.success('If that email exists, a reset link was sent.')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error('Too many requests. Please try again later.')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Forgot password</h2>
        <p className="text-gray-500 text-sm font-body mt-1.5">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-7">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Email Address</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <Mail size={15} />
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@ascb.edu.ph"
                className="input-field pl-10 h-11"
                autoComplete="email"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || sent}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : sent ? 'Link sent' : 'Send reset link'}
          </button>
        </form>

        <Link to="/login" className="mt-7 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ascb-orange transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/public/ForgotPasswordPage.tsx
git commit -m "feat(frontend): forgot-password page"
```

---

## Task 17: ResetPasswordPage

**Files:**
- Create: `frontend/src/pages/public/ResetPasswordPage.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/public/ResetPasswordPage.tsx`:
```typescript
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '../../api/auth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) { toast.error('This reset link is invalid.'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setIsLoading(true)
    try {
      await resetPassword(token, password)
      toast.success('Password updated. Please sign in.')
      navigate('/login')
    } catch (err) {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? 'This reset link is invalid or expired. Please request a new one.')
          : 'Something went wrong.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Reset password</h2>
        <p className="text-gray-500 text-sm font-body mt-1.5">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-7">
          {/* New password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">New password</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field pl-10 pr-11 h-11"
                autoComplete="new-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-0.5">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Confirm password</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="input-field pl-10 h-11"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : 'Update password'}
          </button>
        </form>

        <Link to="/login" className="mt-7 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-ascb-orange transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/public/ResetPasswordPage.tsx
git commit -m "feat(frontend): reset-password page"
```

---

## Task 18: CompleteProfilePage

**Files:**
- Create: `frontend/src/pages/user/CompleteProfilePage.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/user/CompleteProfilePage.tsx`:
```typescript
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { EducationFields } from '../../components/auth/EducationFields'
import { completeProfile, type EducationLevel, type CollegeDepartment } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const { currentUser, role, setAuth } = useAuth()
  const [level, setLevel] = useState<EducationLevel | ''>('')
  const [dept, setDept] = useState<CollegeDepartment | ''>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!level) { toast.error('Please select your education level'); return }
    if (level === 'College' && !dept) { toast.error('Please select your department'); return }
    if (!currentUser) return
    setIsLoading(true)
    try {
      const res = await completeProfile(level, level === 'College' ? (dept as CollegeDepartment) : null)
      setAuth({
        id: currentUser.id,
        education_level: res.data.education_level ?? level,
        college_department: res.data.college_department ?? (level === 'College' ? dept : null),
      }, role)
      toast.success('Profile updated')
      navigate('/user/submit')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not save profile') : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h2 className="text-[2rem] font-bold text-white font-display leading-tight">Complete your profile</h2>
        <p className="text-gray-500 text-sm font-body mt-1.5">
          Tell us about your education so we can route your feedback correctly.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-7">
          <EducationFields
            level={level}
            department={dept}
            onLevelChange={setLevel}
            onDepartmentChange={setDept}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="relative mt-2 w-full h-11 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
          >
            {isLoading
              ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/user/CompleteProfilePage.tsx
git commit -m "feat(frontend): complete-profile page"
```

---

## Task 19: Router integration + profile-completion guard + forgot-password link

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/pages/public/StudentLoginPage.tsx`

- [ ] **Step 1: Lazy-import the new pages**

In `frontend/src/router.tsx`, after the existing lazy imports, add:
```typescript
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage  = lazy(() => import('./pages/public/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const CompleteProfilePage = lazy(() => import('./pages/user/CompleteProfilePage').then(m => ({ default: m.CompleteProfilePage })))
```

- [ ] **Step 2: Register public routes for forgot/reset**

Inside the `<Route element={<PublicLayout />}>` block (where `/login`, `/signup` live), add:
```tsx
          <Route path="/forgot-password" element={<PublicLayout />} />
```
Actually — these should be siblings of `/login` inside the same PublicLayout block. Replace the block so it reads:
```tsx
        <Route element={<PublicLayout />}>
          <Route path="/"                 element={<AuthGatedPage><HomePage /></AuthGatedPage>} />
          <Route path="/login"            element={<AuthGatedPage><StudentLoginPage /></AuthGatedPage>} />
          <Route path="/staff-login"      element={<AuthGatedPage><StaffLoginPage /></AuthGatedPage>} />
          <Route path="/signup"           element={<AuthGatedPage><SignupPage /></AuthGatedPage>} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />
        </Route>
```
(`/forgot-password` and `/reset-password` are deliberately NOT wrapped in `AuthGatedPage` so logged-in users can still use a reset link.)

- [ ] **Step 3: Add profile-completion guard**

Replace the existing `RequireAuth` component in `router.tsx`:
```tsx
function RequireAuth({ role }: { role: string }) {
  const { currentUser, role: userRole, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <AuthLoader />
  if (!currentUser || userRole !== role) {
    const target = role === 'user' ? '/login' : '/staff-login'
    return <Navigate to={target} replace />
  }
  if (
    role === 'user'
    && currentUser.education_level == null
    && location.pathname !== '/user/complete-profile'
  ) {
    return <Navigate to="/user/complete-profile" replace />
  }
  return <Outlet />
}
```

Inside the `<Route element={<RequireAuth role="user" />}>` block, add the complete-profile route:
```tsx
        <Route element={<RequireAuth role="user" />}>
          <Route element={<PublicLayout />}>
            <Route path="/user/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/user/submit"           element={<SubmitPage />} />
            <Route path="/user/submissions"      element={<SubmissionsPage />} />
            <Route path="/user/announcements"    element={<AnnouncementsPage />} />
          </Route>
        </Route>
```

- [ ] **Step 4: Update the forgot-password button**

Edit `frontend/src/pages/public/StudentLoginPage.tsx`. Replace the "Forgot password?" button around line 148-154 with a `Link`:
```tsx
<Link
  to="/forgot-password"
  className="text-[11px] text-ascb-orange hover:text-ascb-gold font-ui transition-colors"
>
  Forgot password?
</Link>
```
Ensure `Link` is imported from `react-router-dom` (it likely already is).

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/router.tsx frontend/src/pages/public/StudentLoginPage.tsx
git commit -m "feat(router): register forgot/reset/complete-profile + guard stale profiles"
```

---

## Task 20: Full verification + manual smoke test

**Files:** none (verification-only)

- [ ] **Step 1: Backend build + tests**

Run: `cd backend && go build ./... && go test ./...`
Expected: all packages build, all tests PASS.

- [ ] **Step 2: Frontend build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: type-check clean, production build succeeds.

- [ ] **Step 3: Manual smoke tests (dev servers)**

Start both servers:
```bash
cd backend && go run ./cmd &
cd frontend && npm run dev
```

Exercise each case from spec §5.2:
- Sign up as HS → no department shown → succeeds → lands on `/user/submit`.
- Sign up as SHS → no department shown → succeeds.
- Sign up as College → department required → succeeds with each option.
- On the login page, click "Forgot password?" → lands on `/forgot-password`.
- Submit a real student email → look at backend logs (if `SMTP_HOST` unset, the raw reset link is printed there). Visit that link → set a new password → redirected to `/login` → old password rejected, new password works.
- Visit the same reset link a second time → error toast.
- Wait 30 minutes past an issued token → error toast (optionally accelerate by editing `resetTokenTTL` in `auth_service.go` to 30 seconds for the test and reverting).
- Manually `UPDATE users SET education_level = NULL, college_department = NULL WHERE email = '<your-test-user>'` in psql → log out → log back in → you should be forced onto `/user/complete-profile` → complete → land on `/user/submit`.

- [ ] **Step 4: Stop dev servers and commit nothing (this task is verification only)**

---

## Self-Review Notes

**Spec coverage checklist:**
- §1.1 users columns → Task 1 ✅
- §1.2 password_reset_tokens → Task 2 ✅
- §2.1 forgot-password route → Tasks 7, 10, 12 ✅
- §2.1 reset-password route → Tasks 7, 10, 12 ✅
- §2.1 complete-profile route → Tasks 7, 10, 12 ✅
- §2.2 signup education fields → Tasks 3, 7, 10 ✅
- §2.2 /me response education fields → Task 10 ✅
- §2.3 mail service + no-op fallback → Task 5 ✅
- §3.1 SignupPage education fields → Task 15 ✅
- §3.1 StudentLoginPage forgot link → Task 19 ✅
- §3.2 ForgotPasswordPage → Task 16 ✅
- §3.2 ResetPasswordPage → Task 17 ✅
- §3.2 CompleteProfilePage → Task 18 ✅
- §3.3 route guard for null education → Task 19 ✅
- §4 error handling → covered in handler tasks ✅
- §5 testing → Tasks 5, 6, 8, 11, 20 ✅
- §6 env vars → Task 9 ✅

**Naming consistency check:** `EducationLevel`, `CollegeDepartment` used as both TS types and JSON keys `education_level` / `college_department` consistently across backend and frontend. `validateEducation` is the single source of validation truth. `RequestPasswordReset` / `ResetPassword` / `CompleteProfile` / `GetUserByID` are the service methods used in the handler.
