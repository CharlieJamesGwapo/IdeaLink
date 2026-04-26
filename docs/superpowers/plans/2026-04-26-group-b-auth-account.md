# Group B — Auth & Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the immediate-logout-after-login bug, verify the password reset flow works end-to-end, and ship a `/user/account` page where users can edit grade or department and change their password in-page.

**Architecture:**
- Backend: extend the existing auth service (`auth_service.go`), repository (`user_repo.go`), and handler (`auth.go`) with a new `UpdateProfile` and `ChangePassword`. Add a nullable `grade_level` column on `users` via migration 014. Reuse the existing JWT/cookie/middleware stack.
- Frontend: new `MyAccountPage` mounted under `RequireAuth role="user"`. Fix `AuthContext` to clear cached auth only on explicit HTTP 401 instead of any error. Reuse `EducationFields` with a new grade dropdown.
- Reset-password flow has no code changes — verification is documentation + a backend round-trip test + a deploy smoke checklist.

**Tech Stack:** Go 1.21+, Gin, PostgreSQL, JWT (golang-jwt/jwt/v5), bcrypt; React 18 + TypeScript + axios + react-router-dom + sonner toasts; Vitest for frontend unit tests; Go testify for backend.

**Spec:** [`docs/superpowers/specs/2026-04-26-group-b-auth-account-design.md`](../specs/2026-04-26-group-b-auth-account-design.md)

---

## File Map

**Backend (new files):**
- `backend/internal/migrations/014_user_grade_level.sql` — adds `grade_level` column to `users`.
- `docs/setup/email.md` — required SMTP env vars + Gmail App Password instructions + smoke checklist.

**Backend (modified):**
- `backend/internal/migrations/migrations.go` — embed new SQL.
- `backend/cmd/main.go` — execute migration + register two new routes.
- `backend/internal/models/user.go` — add `GradeLevel *string`.
- `backend/internal/repository/interfaces.go` — rename `UpdateEducation` → `UpdateProfile` (superset).
- `backend/internal/repository/user_repo.go` — implement `UpdateProfile`; SELECTs scan `grade_level`.
- `backend/internal/services/interfaces.go` — extend `AuthServicer`.
- `backend/internal/services/auth_service.go` — extend validation, add `UpdateProfile`, add `ChangePassword`.
- `backend/internal/services/auth_service_test.go` — new tests + adapt mock `UserRepo` to satisfy interface.
- `backend/internal/handlers/auth.go` — add `UpdateProfile` + `ChangePassword` handlers; include `grade_level` in `Me`.
- `backend/internal/handlers/auth_test.go` — new tests + adapt mock service.

**Frontend (new files):**
- `frontend/src/pages/user/MyAccountPage.tsx` — profile + change password.

**Frontend (modified):**
- `frontend/src/context/AuthContext.tsx` — distinguish 401 from network error.
- `frontend/src/context/AuthContext.test.tsx` — regression tests.
- `frontend/src/api/auth.ts` — add `updateProfile`, `changePassword`; extend types with `grade_level`.
- `frontend/src/components/auth/EducationFields.tsx` — add optional grade selector for HS/SHS.
- `frontend/src/components/layout/Header.tsx` — "My Account" nav link (desktop + mobile).
- `frontend/src/router.tsx` — register `/user/account` route.

---

## Conventions for this plan

- **Run from the repo root** (`/Users/a1234/IdeaLink`) unless otherwise specified.
- **Backend tests:** `cd backend && go test ./...`
- **Frontend tests:** `cd frontend && npm test`
- **Commit after each Task** (one logical unit). Use the same style as recent commits — short imperative subject, optional 1-2 line body.
- **TDD discipline:** for any logic-bearing task, the failing test comes before the implementation. Steps that just rename or move things skip the test step.
- After each task, run only the **changed package's** tests for fast iteration. The final task runs the full suite.

---

## Section 1 — Migration & Model

### Task 1: Add migration 014 and embed it

**Files:**
- Create: `backend/internal/migrations/014_user_grade_level.sql`
- Modify: `backend/internal/migrations/migrations.go`

- [ ] **Step 1: Create the migration file**

Path: `backend/internal/migrations/014_user_grade_level.sql`

```sql
-- 014_user_grade_level.sql
-- Adds an optional grade level for HS/SHS students. NULL is allowed and is
-- the only valid value when education_level = 'College'. Allowed string
-- values for HS/SHS: '7','8','9','10','11','12'.

ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level TEXT NULL;
```

- [ ] **Step 2: Embed the SQL in `migrations.go`**

Append to `backend/internal/migrations/migrations.go` (after line 42, the `EmailLogsSQL` block):

```go
//go:embed 014_user_grade_level.sql
var UserGradeLevelSQL string
```

- [ ] **Step 3: Wire the migration into `main.go`**

Find this block in `backend/cmd/main.go` (right after the `EmailLogsSQL` Exec — search for `EmailLogsSQL` to locate; the existing pattern repeats the same shape):

```go
if _, err := db.Exec(migrations.EmailLogsSQL); err != nil {
    log.Fatalf("failed to run email_logs migration: %v", err)
}
```

Add immediately after it:

```go
if _, err := db.Exec(migrations.UserGradeLevelSQL); err != nil {
    log.Fatalf("failed to run user_grade_level migration: %v", err)
}
```

- [ ] **Step 4: Verify the backend still compiles**

```bash
cd backend && go build ./...
```

Expected: clean build, no output.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/migrations/014_user_grade_level.sql \
        backend/internal/migrations/migrations.go \
        backend/cmd/main.go
git commit -m "feat(db): migration 014 — users.grade_level column"
```

---

### Task 2: Add `GradeLevel` to the `User` model

**Files:**
- Modify: `backend/internal/models/user.go`

- [ ] **Step 1: Add the field**

In `backend/internal/models/user.go`, change the `User` struct to:

```go
type User struct {
    ID                   int       `json:"id"`
    Email                string    `json:"email"`
    Password             string    `json:"-"`
    Fullname             string    `json:"fullname"`
    EducationLevel       *string   `json:"education_level"`
    CollegeDepartment    *string   `json:"college_department"`
    GradeLevel           *string   `json:"grade_level"`
    LastAnnouncementView time.Time `json:"last_announcement_view"`
    CreatedAt            time.Time `json:"created_at"`
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && go build ./...
```

Expected: errors in `user_repo.go` are normal at this stage — those get fixed in Task 4. Other packages should build.

If unrelated packages break, stop and read the error.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/models/user.go
git commit -m "feat(models): User.GradeLevel"
```

---

## Section 2 — Repository

### Task 3: Update `UserRepository` interface — `UpdateProfile` supersedes `UpdateEducation`

**Files:**
- Modify: `backend/internal/repository/interfaces.go`
- Modify: `backend/internal/services/auth_service.go` (call site)
- Modify: `backend/internal/services/auth_service_test.go` (mock)

- [ ] **Step 1: Update the interface**

In `backend/internal/repository/interfaces.go`, replace:

```go
UpdateEducation(userID int, educationLevel string, collegeDepartment *string) error
```

with:

```go
UpdateProfile(userID int, educationLevel string, collegeDepartment *string, gradeLevel *string) error
```

- [ ] **Step 2: Update the call site in `auth_service.go`**

In `backend/internal/services/auth_service.go`, find `CompleteProfile` (around line 250) and change:

```go
if err := s.userRepo.UpdateEducation(userID, educationLevel, collegeDepartment); err != nil {
```

to:

```go
if err := s.userRepo.UpdateProfile(userID, educationLevel, collegeDepartment, nil); err != nil {
```

- [ ] **Step 3: Update the mock in `auth_service_test.go`**

In `backend/internal/services/auth_service_test.go`, find the `UpdateEducation` method on `mockUserRepo` (around line 98) and replace it with:

```go
func (m *mockUserRepo) UpdateProfile(userID int, level string, dept *string, grade *string) error {
    for _, u := range m.users {
        if u.ID == userID {
            u.EducationLevel = &level
            u.CollegeDepartment = dept
            u.GradeLevel = grade
            return nil
        }
    }
    return nil
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd backend && go build ./... 2>&1 | head -30
```

Expected: errors only in `user_repo.go` (still references the old name). That's fixed in Task 4.

- [ ] **Step 5: Commit (skip if Task 4 will be done immediately — combine commits)**

Hold the commit; combine with Task 4's commit so the repo never lands in a broken state.

---

### Task 4: Implement `UpdateProfile` in `user_repo.go` and scan `grade_level` in SELECTs

**Files:**
- Modify: `backend/internal/repository/user_repo.go`

- [ ] **Step 1: Replace the `UpdateEducation` method**

In `backend/internal/repository/user_repo.go`, replace this method (around line 110):

```go
func (r *UserRepo) UpdateEducation(userID int, educationLevel string, collegeDepartment *string) error {
    _, err := r.db.Exec(
        `UPDATE users SET education_level = $1, college_department = $2 WHERE id = $3`,
        educationLevel, collegeDepartment, userID,
    )
    return err
}
```

with:

```go
func (r *UserRepo) UpdateProfile(userID int, educationLevel string, collegeDepartment *string, gradeLevel *string) error {
    _, err := r.db.Exec(
        `UPDATE users SET education_level = $1, college_department = $2, grade_level = $3 WHERE id = $4`,
        educationLevel, collegeDepartment, gradeLevel, userID,
    )
    return err
}
```

- [ ] **Step 2: Scan `grade_level` in `CreateUser`**

Replace `CreateUser` with:

```go
func (r *UserRepo) CreateUser(email, hashedPassword, fullname, educationLevel string, collegeDepartment *string) (*models.User, error) {
    var u models.User
    err := r.db.QueryRow(
        `INSERT INTO users (email, password, fullname, education_level, college_department)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, fullname, education_level, college_department, grade_level, last_announcement_view, created_at`,
        email, hashedPassword, fullname, educationLevel, collegeDepartment,
    ).Scan(&u.ID, &u.Email, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.GradeLevel, &u.LastAnnouncementView, &u.CreatedAt)
    return &u, err
}
```

- [ ] **Step 3: Scan `grade_level` in `FindUserByEmail`**

Replace with:

```go
func (r *UserRepo) FindUserByEmail(email string) (*models.User, error) {
    var u models.User
    err := r.db.QueryRow(
        `SELECT id, email, password, fullname, education_level, college_department, grade_level, last_announcement_view, created_at
         FROM users WHERE email = $1`,
        email,
    ).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.GradeLevel, &u.LastAnnouncementView, &u.CreatedAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return &u, err
}
```

- [ ] **Step 4: Scan `grade_level` in `FindUserByID`**

Replace with:

```go
func (r *UserRepo) FindUserByID(id int) (*models.User, error) {
    var u models.User
    err := r.db.QueryRow(
        `SELECT id, email, password, fullname, education_level, college_department, grade_level, last_announcement_view, created_at
         FROM users WHERE id = $1`,
        id,
    ).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.GradeLevel, &u.LastAnnouncementView, &u.CreatedAt)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    return &u, err
}
```

- [ ] **Step 5: Verify the whole backend builds**

```bash
cd backend && go build ./...
```

Expected: clean build.

- [ ] **Step 6: Run existing tests to confirm we didn't break anything**

```bash
cd backend && go test ./internal/services/... ./internal/handlers/...
```

Expected: PASS. (The mock was updated in Task 3.)

- [ ] **Step 7: Commit (combined with Task 3)**

```bash
git add backend/internal/repository/interfaces.go \
        backend/internal/repository/user_repo.go \
        backend/internal/services/auth_service.go \
        backend/internal/services/auth_service_test.go
git commit -m "refactor(repo): UpdateEducation → UpdateProfile (now writes grade_level)"
```

---

## Section 3 — Service Layer

### Task 5: Extend `validateEducation` to handle `grade_level`

**Files:**
- Modify: `backend/internal/services/auth_service.go`

- [ ] **Step 1: Write the failing test**

Append to `backend/internal/services/auth_service_test.go`:

```go
// --- grade_level validation ---

func TestAuthService_ValidateEducation_HSRequiresJuniorGrade(t *testing.T) {
    svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    _, err := svc.UpdateProfile(1, "HS", nil, ptr("11"))
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_ValidateEducation_SHSRequiresSeniorGrade(t *testing.T) {
    svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    _, err := svc.UpdateProfile(1, "SHS", nil, ptr("9"))
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_ValidateEducation_CollegeRejectsGrade(t *testing.T) {
    dept := "CCE"
    svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    _, err := svc.UpdateProfile(1, "College", &dept, ptr("12"))
    assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func ptr(s string) *string { return &s }
```

These tests reference `svc.UpdateProfile` which doesn't exist yet — that's intentional. They'll compile-fail. We'll implement in Task 6.

- [ ] **Step 2: Run the tests to confirm the compile failure**

```bash
cd backend && go test ./internal/services/... 2>&1 | head -20
```

Expected: compile error `svc.UpdateProfile undefined`. This is the failing-test check for both Task 5's validation and Task 6's method.

- [ ] **Step 3: Update `validateEducation` to accept `gradeLevel`**

In `backend/internal/services/auth_service.go`, replace the existing `validateEducation` (around lines 200-228) with:

```go
var allowedEducationLevels = map[string]bool{"HS": true, "SHS": true, "College": true}
var allowedCollegeDepartments = map[string]bool{
    "CCE": true, "CTE": true, "CABE": true, "CCJE": true, "TVET": true,
}
var allowedHSGrades = map[string]bool{"7": true, "8": true, "9": true, "10": true}
var allowedSHSGrades = map[string]bool{"11": true, "12": true}

// ErrInvalidEducation indicates the (education_level, college_department, grade_level) combo is invalid.
var ErrInvalidEducation = errors.New("invalid education level, department, or grade")

// validateEducation enforces:
//   HS:      grade_level in {7,8,9,10};   college_department MUST be nil
//   SHS:     grade_level in {11,12};      college_department MUST be nil
//   College: college_department in allowed set;  grade_level MUST be nil
func validateEducation(educationLevel string, collegeDepartment *string, gradeLevel *string) error {
    if !allowedEducationLevels[educationLevel] {
        return ErrInvalidEducation
    }
    switch educationLevel {
    case "College":
        if collegeDepartment == nil || !allowedCollegeDepartments[*collegeDepartment] {
            return ErrInvalidEducation
        }
        if gradeLevel != nil {
            return ErrInvalidEducation
        }
    case "HS":
        if collegeDepartment != nil {
            return ErrInvalidEducation
        }
        if gradeLevel != nil && !allowedHSGrades[*gradeLevel] {
            return ErrInvalidEducation
        }
    case "SHS":
        if collegeDepartment != nil {
            return ErrInvalidEducation
        }
        if gradeLevel != nil && !allowedSHSGrades[*gradeLevel] {
            return ErrInvalidEducation
        }
    }
    return nil
}
```

Note: HS/SHS allow `gradeLevel == nil` so existing rows that pre-date this column don't fail validation when `CompleteProfile` is called.

- [ ] **Step 4: Update existing call sites of `validateEducation`**

`SignupUser` (line ~108) and `CompleteProfile` (line ~251) both call the old 2-arg version. Update each:

In `SignupUser`:

```go
if err := validateEducation(educationLevel, collegeDepartment, nil); err != nil {
```

In `CompleteProfile`:

```go
if err := validateEducation(educationLevel, collegeDepartment, nil); err != nil {
```

- [ ] **Step 5: Verify build (still expecting test failures because UpdateProfile doesn't exist)**

```bash
cd backend && go build ./...
```

Expected: clean build of non-test code. Test file won't compile yet — fixed in Task 6.

- [ ] **Step 6: No commit yet — combined with Task 6.**

---

### Task 6: Add `UpdateProfile` to `AuthService` and `AuthServicer`

**Files:**
- Modify: `backend/internal/services/auth_service.go`
- Modify: `backend/internal/services/interfaces.go`
- Modify: `backend/internal/handlers/auth_test.go` (mock)

- [ ] **Step 1: Add `UpdateProfile` to `AuthService`**

Append to `backend/internal/services/auth_service.go`:

```go
// UpdateProfile lets a logged-in user change their education level,
// department, or grade. Validates the combo end-to-end and returns the
// updated User row.
func (s *AuthService) UpdateProfile(userID int, educationLevel string, collegeDepartment *string, gradeLevel *string) (*models.User, error) {
    if err := validateEducation(educationLevel, collegeDepartment, gradeLevel); err != nil {
        return nil, err
    }
    if err := s.userRepo.UpdateProfile(userID, educationLevel, collegeDepartment, gradeLevel); err != nil {
        return nil, err
    }
    return s.userRepo.FindUserByID(userID)
}
```

- [ ] **Step 2: Add to `AuthServicer` interface**

In `backend/internal/services/interfaces.go`, add to `AuthServicer`:

```go
UpdateProfile(userID int, educationLevel string, collegeDepartment *string, gradeLevel *string) (*models.User, error)
```

Place it next to `CompleteProfile` for grouping.

- [ ] **Step 3: Update the handler-test mock**

In `backend/internal/handlers/auth_test.go`, add a field to `mockAuthSvc`:

```go
updateProfileResult *models.User
updateProfileErr    error
```

(Place near the other `complete*` fields around line 36.)

And add the method:

```go
func (m *mockAuthSvc) UpdateProfile(userID int, level string, dept *string, grade *string) (*models.User, error) {
    if m.updateProfileErr != nil {
        return nil, m.updateProfileErr
    }
    return m.updateProfileResult, nil
}
```

(Place near `CompleteProfile` around line 83.)

- [ ] **Step 4: Run service tests**

```bash
cd backend && go test ./internal/services/...
```

Expected: PASS. The three new tests from Task 5 now pass.

- [ ] **Step 5: Run handler tests too — mock must satisfy the interface**

```bash
cd backend && go test ./internal/handlers/...
```

Expected: PASS.

- [ ] **Step 6: Commit (combined with Task 5)**

```bash
git add backend/internal/services/auth_service.go \
        backend/internal/services/interfaces.go \
        backend/internal/services/auth_service_test.go \
        backend/internal/handlers/auth_test.go
git commit -m "feat(auth): UpdateProfile + grade_level validation"
```

---

### Task 7: Add `ChangePassword` to `AuthService` and `AuthServicer`

**Files:**
- Modify: `backend/internal/services/auth_service.go`
- Modify: `backend/internal/services/interfaces.go`
- Modify: `backend/internal/services/auth_service_test.go`
- Modify: `backend/internal/handlers/auth_test.go` (mock)

- [ ] **Step 1: Write the failing tests**

Append to `backend/internal/services/auth_service_test.go`:

```go
// --- ChangePassword ---

func TestAuthService_ChangePassword_HappyPath(t *testing.T) {
    repo := newMockUserRepo()
    svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    u, _, err := svc.SignupUser("u@e.com", "oldpass", "U", "HS", nil)
    require.NoError(t, err)

    err = svc.ChangePassword(u.ID, "oldpass", "newpass")
    require.NoError(t, err)

    // Old password no longer works
    _, _, loginErr := svc.LoginUser("u@e.com", "oldpass")
    assert.EqualError(t, loginErr, "invalid credentials")

    // New password works
    _, _, loginErr = svc.LoginUser("u@e.com", "newpass")
    assert.NoError(t, loginErr)
}

func TestAuthService_ChangePassword_WrongCurrent(t *testing.T) {
    repo := newMockUserRepo()
    svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    u, _, err := svc.SignupUser("u@e.com", "oldpass", "U", "HS", nil)
    require.NoError(t, err)

    err = svc.ChangePassword(u.ID, "wrong-current", "newpass")
    assert.ErrorIs(t, err, services.ErrInvalidCurrentPassword)
}

func TestAuthService_ChangePassword_TooShort(t *testing.T) {
    repo := newMockUserRepo()
    svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    u, _, err := svc.SignupUser("u@e.com", "oldpass", "U", "HS", nil)
    require.NoError(t, err)

    err = svc.ChangePassword(u.ID, "oldpass", "12345")
    assert.ErrorIs(t, err, services.ErrPasswordTooShort)
}

func TestAuthService_ChangePassword_UnknownUser(t *testing.T) {
    svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
    err := svc.ChangePassword(9999, "anything", "newpass")
    assert.ErrorIs(t, err, services.ErrInvalidCurrentPassword)
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && go test ./internal/services/... -run TestAuthService_ChangePassword 2>&1 | head -20
```

Expected: compile error `svc.ChangePassword undefined` and `services.ErrInvalidCurrentPassword undefined`.

- [ ] **Step 3: Add the error and method**

In `backend/internal/services/auth_service.go`, near the existing error vars (around line 244):

```go
// ErrInvalidCurrentPassword is returned by ChangePassword when the supplied
// current password does not match the stored hash. This is intentionally
// also returned when the user ID does not exist, so the handler can map both
// to the same 401 without leaking which one happened.
var ErrInvalidCurrentPassword = errors.New("current password is incorrect")
```

And append the method:

```go
// ChangePassword swaps the user's password after verifying the current one.
// Used by the My Account page when the user is already logged in.
func (s *AuthService) ChangePassword(userID int, currentPassword, newPassword string) error {
    if len(newPassword) < 6 {
        return ErrPasswordTooShort
    }
    user, err := s.userRepo.FindUserByID(userID)
    if err != nil {
        return err
    }
    if user == nil {
        return ErrInvalidCurrentPassword
    }
    if !s.CheckPassword(user.Password, currentPassword) {
        return ErrInvalidCurrentPassword
    }
    hashed, err := s.HashPassword(newPassword)
    if err != nil {
        return err
    }
    return s.userRepo.UpdatePassword(userID, hashed)
}
```

- [ ] **Step 4: Add to `AuthServicer` interface**

In `backend/internal/services/interfaces.go`, add:

```go
ChangePassword(userID int, currentPassword, newPassword string) error
```

- [ ] **Step 5: Update the handler-test mock**

In `backend/internal/handlers/auth_test.go`, add a field to `mockAuthSvc`:

```go
changePasswordErr error
```

And the method:

```go
func (m *mockAuthSvc) ChangePassword(userID int, currentPassword, newPassword string) error {
    return m.changePasswordErr
}
```

- [ ] **Step 6: Run tests**

```bash
cd backend && go test ./internal/services/... ./internal/handlers/...
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/services/auth_service.go \
        backend/internal/services/interfaces.go \
        backend/internal/services/auth_service_test.go \
        backend/internal/handlers/auth_test.go
git commit -m "feat(auth): ChangePassword for logged-in users"
```

---

## Section 4 — Handlers & Routes

### Task 8: Handler — `PATCH /api/auth/profile`

**Files:**
- Modify: `backend/internal/handlers/auth.go`
- Modify: `backend/internal/handlers/auth_test.go`

- [ ] **Step 1: Write the failing tests**

Append to `backend/internal/handlers/auth_test.go`:

```go
// --- UpdateProfile handler ---

func setupAuthRouterWithProfile(svc services.AuthServicer) *gin.Engine {
    gin.SetMode(gin.TestMode)
    h := handlers.NewAuthHandler(svc)
    r := gin.New()
    r.PATCH("/api/auth/profile", func(c *gin.Context) {
        c.Set(middleware.CtxKeyUserID, 1)
        c.Set(middleware.CtxKeyRole, services.RoleUser)
        h.UpdateProfile(c)
    })
    r.POST("/api/auth/change-password", func(c *gin.Context) {
        c.Set(middleware.CtxKeyUserID, 1)
        c.Set(middleware.CtxKeyRole, services.RoleUser)
        h.ChangePassword(c)
    })
    return r
}

func TestAuthHandler_UpdateProfile_Success(t *testing.T) {
    level := "HS"
    grade := "9"
    svc := &mockAuthSvc{updateProfileResult: &models.User{ID: 1, Email: "u@e.com", EducationLevel: &level, GradeLevel: &grade}}
    r := setupAuthRouterWithProfile(svc)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("PATCH", "/api/auth/profile", bytes.NewBufferString(`{"education_level":"HS","grade_level":"9"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
    assert.Contains(t, w.Body.String(), `"grade_level":"9"`)
}

func TestAuthHandler_UpdateProfile_Invalid(t *testing.T) {
    svc := &mockAuthSvc{updateProfileErr: services.ErrInvalidEducation}
    r := setupAuthRouterWithProfile(svc)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("PATCH", "/api/auth/profile", bytes.NewBufferString(`{"education_level":"HS","grade_level":"99"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthHandler_UpdateProfile_MalformedBody(t *testing.T) {
    r := setupAuthRouterWithProfile(&mockAuthSvc{})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("PATCH", "/api/auth/profile", bytes.NewBufferString(`{"education_level":""}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && go test ./internal/handlers/... -run TestAuthHandler_UpdateProfile 2>&1 | head -20
```

Expected: compile error `h.UpdateProfile undefined`.

- [ ] **Step 3: Add the handler**

Append to `backend/internal/handlers/auth.go`:

```go
type updateProfileInput struct {
    EducationLevel    string  `json:"education_level" binding:"required"`
    CollegeDepartment *string `json:"college_department"`
    GradeLevel        *string `json:"grade_level"`
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
    var input updateProfileInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    userIDVal, _ := c.Get(middleware.CtxKeyUserID)
    userID, _ := userIDVal.(int)
    user, err := h.svc.UpdateProfile(userID, input.EducationLevel, input.CollegeDepartment, input.GradeLevel)
    if err != nil {
        if errors.Is(err, services.ErrInvalidEducation) {
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid education level, department, or grade"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update profile"})
        return
    }
    c.JSON(http.StatusOK, user)
}
```

- [ ] **Step 4: Run handler tests**

```bash
cd backend && go test ./internal/handlers/...
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/auth.go \
        backend/internal/handlers/auth_test.go
git commit -m "feat(auth): PATCH /api/auth/profile handler"
```

---

### Task 9: Handler — `POST /api/auth/change-password`

**Files:**
- Modify: `backend/internal/handlers/auth.go`
- Modify: `backend/internal/handlers/auth_test.go`

- [ ] **Step 1: Write the failing tests**

Append to `backend/internal/handlers/auth_test.go` (after the UpdateProfile tests; the helper `setupAuthRouterWithProfile` already wires the change-password route):

```go
// --- ChangePassword handler ---

func TestAuthHandler_ChangePassword_Success(t *testing.T) {
    r := setupAuthRouterWithProfile(&mockAuthSvc{})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/change-password", bytes.NewBufferString(`{"current_password":"old","new_password":"newpass"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
    assert.Contains(t, w.Body.String(), "Password updated")
}

func TestAuthHandler_ChangePassword_WrongCurrent(t *testing.T) {
    svc := &mockAuthSvc{changePasswordErr: services.ErrInvalidCurrentPassword}
    r := setupAuthRouterWithProfile(svc)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/change-password", bytes.NewBufferString(`{"current_password":"wrong","new_password":"newpass"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthHandler_ChangePassword_TooShort(t *testing.T) {
    svc := &mockAuthSvc{changePasswordErr: services.ErrPasswordTooShort}
    r := setupAuthRouterWithProfile(svc)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/change-password", bytes.NewBufferString(`{"current_password":"old","new_password":"short"}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthHandler_ChangePassword_MissingFields(t *testing.T) {
    r := setupAuthRouterWithProfile(&mockAuthSvc{})
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/api/auth/change-password", bytes.NewBufferString(`{}`))
    req.Header.Set("Content-Type", "application/json")
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && go test ./internal/handlers/... -run TestAuthHandler_ChangePassword 2>&1 | head -20
```

Expected: compile error `h.ChangePassword undefined`.

- [ ] **Step 3: Add the handler**

Append to `backend/internal/handlers/auth.go`:

```go
type changePasswordInput struct {
    CurrentPassword string `json:"current_password" binding:"required"`
    NewPassword     string `json:"new_password" binding:"required,min=6"`
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
    var input changePasswordInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    userIDVal, _ := c.Get(middleware.CtxKeyUserID)
    userID, _ := userIDVal.(int)
    err := h.svc.ChangePassword(userID, input.CurrentPassword, input.NewPassword)
    if err != nil {
        switch {
        case errors.Is(err, services.ErrInvalidCurrentPassword):
            c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
        case errors.Is(err, services.ErrPasswordTooShort):
            c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 6 characters"})
        default:
            c.JSON(http.StatusInternalServerError, gin.H{"error": "could not change password"})
        }
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Password updated"})
}
```

- [ ] **Step 4: Run handler tests**

```bash
cd backend && go test ./internal/handlers/...
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/auth.go \
        backend/internal/handlers/auth_test.go
git commit -m "feat(auth): POST /api/auth/change-password handler"
```

---

### Task 10: `Me` handler returns `grade_level`

**Files:**
- Modify: `backend/internal/handlers/auth.go`
- Modify: `backend/internal/handlers/auth_test.go`

- [ ] **Step 1: Update the test**

In `backend/internal/handlers/auth_test.go`, find `TestAuthHandler_Me` (around line 255) and extend it to assert `grade_level` is present:

```go
func TestAuthHandler_Me(t *testing.T) {
    level := "HS"
    grade := "9"
    svc := &mockAuthSvc{getUserResult: &models.User{ID: 1, EducationLevel: &level, GradeLevel: &grade}}
    r := setupAuthRouter(svc)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/api/auth/me", nil)
    r.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
    var resp map[string]interface{}
    require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
    assert.Equal(t, float64(1), resp["user_id"])
    assert.Equal(t, services.RoleUser, resp["role"])
    _, hasEducation := resp["education_level"]
    assert.True(t, hasEducation, "education_level key must be present in /me response for role=user")
    assert.Equal(t, "HS", resp["education_level"])
    _, hasGrade := resp["grade_level"]
    assert.True(t, hasGrade, "grade_level key must be present in /me response for role=user")
    assert.Equal(t, "9", resp["grade_level"])
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend && go test ./internal/handlers/... -run TestAuthHandler_Me$
```

Expected: FAIL on `grade_level` assertion.

- [ ] **Step 3: Update the handler**

In `backend/internal/handlers/auth.go`, find the `Me` handler (around line 139) and update the user-role branch:

```go
if role == services.RoleUser {
    user, err := h.svc.GetUserByID(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
        return
    }
    if user == nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
        return
    }
    resp["education_level"] = user.EducationLevel
    resp["college_department"] = user.CollegeDepartment
    resp["grade_level"] = user.GradeLevel
}
```

(The only addition is the `grade_level` line.)

- [ ] **Step 4: Run tests**

```bash
cd backend && go test ./internal/handlers/...
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/auth.go \
        backend/internal/handlers/auth_test.go
git commit -m "feat(auth): /me returns grade_level for users"
```

---

### Task 11: Register routes in `main.go`

**Files:**
- Modify: `backend/cmd/main.go`

- [ ] **Step 1: Add the routes**

In `backend/cmd/main.go`, find the `auth` route group (around line 64). After the existing `complete-profile` line, add:

```go
auth.PATCH("/profile", middleware.AuthRequired(cfg.JWTSecret, "user"), authH.UpdateProfile)
auth.POST("/change-password", middleware.AuthRequired(cfg.JWTSecret, "user"), authH.ChangePassword)
```

- [ ] **Step 2: Verify build**

```bash
cd backend && go build ./...
```

Expected: clean build.

- [ ] **Step 3: Run full backend test suite**

```bash
cd backend && go test ./...
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/cmd/main.go
git commit -m "feat(auth): register /profile + /change-password routes"
```

---

## Section 5 — B1 Login → Logout Bug

### Task 12: Test that AuthContext keeps cache on network error / 5xx

**Files:**
- Modify: `frontend/src/context/AuthContext.test.tsx`

- [ ] **Step 1: Add the regression tests**

The existing test file already uses `vi.mock('../api/auth')` plus `import * as authApi`. Match that convention. Append these three tests inside the existing `describe('AuthContext', ...)` block in `frontend/src/context/AuthContext.test.tsx`:

```tsx
  // B1 regression: only an explicit 401 should clear cached auth. Network
  // errors and 5xx mean the server is currently unreachable, not that the
  // user logged out — keeping the cache prevents the immediate-logout bug.
  it('keeps cached auth when /me rejects with a network error', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 42, education_level: 'HS', college_department: null, grade_level: '9' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockRejectedValue(Object.assign(new Error('Network Error'), { request: {} }))
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText(/Role: user/)).toBeInTheDocument())
  })

  it('keeps cached auth when /me rejects with a 5xx', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 42, education_level: 'HS', college_department: null, grade_level: '9' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 502, data: 'Bad Gateway' } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText(/Role: user/)).toBeInTheDocument())
  })

  it('clears cached auth when /me rejects with a 401', async () => {
    localStorage.setItem(
      'idealink_auth',
      JSON.stringify({
        user: { id: 42, education_level: 'HS', college_department: null, grade_level: '9' },
        role: 'user',
      }),
    )
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Guest')).toBeInTheDocument())
  })
```

No new imports are needed — `render`, `screen`, `waitFor`, `vi`, `it`, `expect`, `beforeEach`, `authApi` are already imported at the top of the file.

- [ ] **Step 2: Run only these new tests**

```bash
cd frontend && npm test -- AuthContext
```

Expected: the 5xx and network-error tests FAIL (they currently get cleared because `.catch` is unconditional). The 401 test passes today.

- [ ] **Step 3: No commit yet — combined with Task 13.**

---

### Task 13: Fix `AuthContext` — only clear on explicit 401

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Replace the `useEffect` body**

In `frontend/src/context/AuthContext.tsx`, replace the `useEffect` block (lines 46-90) with:

```tsx
  useEffect(() => {
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout>

    const finish = (user: CurrentUser | null, roleVal: string | null) => {
      if (cancelled) return
      cancelled = true
      clearTimeout(timerId)
      setCurrentUser(user)
      setRole(roleVal)
      writeCache(user, roleVal)
      setIsLoading(false)
    }

    // stopLoading: end the loading state without overwriting cached auth.
    // Used when /me fails for a transient reason (network error, 5xx, etc.)
    // — we have no fresh signal, so the cached values stay authoritative.
    const stopLoading = () => {
      if (cancelled) return
      cancelled = true
      clearTimeout(timerId)
      setIsLoading(false)
    }

    timerId = setTimeout(() => stopLoading(), TIMEOUT_MS)

    me()
      .then(res => {
        const userId = res.data?.user_id
        const roleVal = res.data?.role
        if (typeof userId === 'number' && typeof roleVal === 'string') {
          const data = (res.data ?? {}) as unknown as Record<string, unknown>
          const hasEducation = 'education_level' in data
          const hasDept = 'college_department' in data
          const hasGrade = 'grade_level' in data
          finish({
            id: userId,
            education_level: hasEducation
              ? (data.education_level as string | null | undefined) ?? null
              : cached?.user.education_level ?? null,
            college_department: hasDept
              ? (data.college_department as string | null | undefined) ?? null
              : cached?.user.college_department ?? null,
            grade_level: hasGrade
              ? (data.grade_level as string | null | undefined) ?? null
              : cached?.user.grade_level ?? null,
          }, roleVal)
        } else {
          // Server replied 200 OK but with no auth payload — treat as logged out.
          finish(null, null)
        }
      })
      .catch((err: unknown) => {
        // Only an explicit 401 from the server means "you are logged out."
        // Network errors and 5xx are transient — keep the cached auth so a
        // flaky backend doesn't kick the user out (B1 regression).
        const status =
          (err as { response?: { status?: number } } | null | undefined)?.response?.status
        if (status === 401) {
          finish(null, null)
        } else {
          // eslint-disable-next-line no-console
          console.warn('[auth] /me failed; retaining cached auth', err)
          stopLoading()
        }
      })

    return () => { cancelled = true; clearTimeout(timerId) }
  }, [])
```

- [ ] **Step 2: Add `grade_level` to the `CurrentUser` interface**

At the top of `AuthContext.tsx`, update the interface:

```tsx
export interface CurrentUser {
  id: number
  education_level: string | null
  college_department: string | null
  grade_level: string | null
}
```

- [ ] **Step 3: Run the regression tests**

```bash
cd frontend && npm test -- AuthContext
```

Expected: all three new tests PASS, and existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/AuthContext.tsx \
        frontend/src/context/AuthContext.test.tsx
git commit -m "fix(auth): only clear cached auth on explicit 401 (B1)"
```

---

## Section 6 — B2 Reset-Password Verification

### Task 14: Document required SMTP env vars

**Files:**
- Create: `docs/setup/email.md`

- [ ] **Step 1: Create the doc**

Path: `docs/setup/email.md`

```markdown
# Email Setup (SMTP) — IdeaLink

IdeaLink sends two kinds of email:
- **Password reset** — link sent when a user clicks "Forgot password" on `/login`.
- **New user credentials** — sent when an admin or registrar provisions an account from `/admin/users`.

If SMTP is not configured, both flows return HTTP 501 ("email not configured") and the user-facing UI surfaces a clear error. The reset token is still issued in the DB so a quick fix is to retry once SMTP is wired up.

## Required environment variables

| Variable        | Example                              | Notes |
|-----------------|--------------------------------------|-------|
| `SMTP_HOST`     | `smtp.gmail.com`                     | If empty, send is skipped and `mail.ErrNotConfigured` is returned. |
| `SMTP_PORT`     | `465` (implicit TLS) or `587` (STARTTLS) | Code branches on this — both are tested. |
| `SMTP_USER`     | `noreply@ascb.edu.ph`                | Gmail account name (full email). |
| `SMTP_PASS`     | `xxxx xxxx xxxx xxxx`                | **Gmail App Password**, not the account password (see below). |
| `SMTP_FROM`     | `IdeaLink <noreply@ascb.edu.ph>`     | Display From; address part is also used as MAIL FROM if parseable. |
| `FRONTEND_URL`  | `https://idealink.app`               | Used to build the reset link (`<base>/reset-password?token=…`). May be a comma-separated list — first entry wins for the link. |

## Generating a Gmail App Password

1. Sign in to the Gmail account that will send mail (`noreply@ascb.edu.ph` or similar).
2. Visit https://myaccount.google.com/security and enable 2-Step Verification.
3. Visit https://myaccount.google.com/apppasswords and create an app password labelled `IdeaLink`.
4. Copy the 16-character value into `SMTP_PASS`. Spaces are OK; the SMTP library trims them.

## Smoke test (run after every prod deploy)

1. Open `https://<frontend-host>/forgot-password` in a clean browser session.
2. Enter a real registered email and submit.
3. Open the admin panel: `/admin/email-logs`. Confirm a row with `kind=password_reset`, `status=sent`.
4. Open the inbox of the email above. Find the IdeaLink message. Click the link.
5. Set a new password (≥ 6 chars). Confirm the success toast.
6. Sign back in with the new password.

If step 3 shows `status=failed` or `status=skipped`, check `SMTP_*` env vars and Gmail App Password validity.

If step 4 never arrives but step 3 says `sent`, check the recipient's spam / promotions folder. Some Gmail accounts mark first-time senders as spam.
```

- [ ] **Step 2: Commit**

```bash
git add docs/setup/email.md
git commit -m "docs(setup): SMTP/email configuration runbook"
```

---

### Task 15: Backend — verify the reset round-trip test exists; extend with login

**Files:**
- Modify: `backend/internal/services/auth_service_test.go`

The existing test `TestAuthService_ResetPassword_ValidFlow` already covers the round-trip from `RequestPasswordReset` to `ResetPassword`. We extend it to assert the new password actually works for `LoginUser`, closing the loop end-to-end.

- [ ] **Step 1: Modify the existing test**

In `backend/internal/services/auth_service_test.go`, find `TestAuthService_ResetPassword_ValidFlow` (around line 402) and append at the end (right before the closing `}`):

```go
    // Verify the new password actually authenticates.
    _, _, loginErr := svc.LoginUser("u@e.com", "newpass123")
    assert.NoError(t, loginErr)
    // Old password no longer works.
    _, _, loginErr = svc.LoginUser("u@e.com", "pass123")
    assert.EqualError(t, loginErr, "invalid credentials")
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/services/... -run TestAuthService_ResetPassword_ValidFlow
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/services/auth_service_test.go
git commit -m "test(auth): reset-password round-trip closes with login"
```

---

## Section 7 — Frontend My Account

### Task 16: Extend API helpers + types

**Files:**
- Modify: `frontend/src/api/auth.ts`

- [ ] **Step 1: Add `grade_level` to `MeResponse`**

In `frontend/src/api/auth.ts`, update `MeResponse`:

```ts
export interface MeResponse {
  user_id: number
  role: string
  education_level?: string | null
  college_department?: string | null
  grade_level?: string | null
}
```

- [ ] **Step 2: Add `GradeLevel` type and helpers**

Append to `frontend/src/api/auth.ts`:

```ts
export type GradeLevel = '7' | '8' | '9' | '10' | '11' | '12'

export const updateProfile = (
  educationLevel: EducationLevel,
  collegeDepartment: CollegeDepartment | null,
  gradeLevel: GradeLevel | null,
) =>
  client.patch('/api/auth/profile', {
    education_level: educationLevel,
    college_department: collegeDepartment,
    grade_level: gradeLevel,
  })

export const changePassword = (currentPassword: string, newPassword: string) =>
  client.post('/api/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
```

- [ ] **Step 3: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean output (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/auth.ts
git commit -m "feat(api): updateProfile + changePassword helpers"
```

---

### Task 17: Extend `EducationFields` with optional grade selector

**Files:**
- Modify: `frontend/src/components/auth/EducationFields.tsx`

- [ ] **Step 1: Replace the file**

Path: `frontend/src/components/auth/EducationFields.tsx`. Replace its contents with:

```tsx
import type { EducationLevel, CollegeDepartment, GradeLevel } from '../../api/auth'

const DEPARTMENTS: { value: CollegeDepartment; label: string }[] = [
  { value: 'CCE', label: 'CCE — College of Computing Education' },
  { value: 'CTE', label: 'CTE — College of Teacher Education' },
  { value: 'CABE', label: 'CABE — College of Accountancy & Business Education' },
  { value: 'CCJE', label: 'CCJE — College of Criminal Justice Education' },
  { value: 'TVET', label: 'TVET — Technical & Vocational Education' },
]

const HS_GRADES: GradeLevel[]  = ['7', '8', '9', '10']
const SHS_GRADES: GradeLevel[] = ['11', '12']

interface Props {
  level: EducationLevel | ''
  department: CollegeDepartment | ''
  grade?: GradeLevel | ''
  showGrade?: boolean
  onLevelChange: (level: EducationLevel) => void
  onDepartmentChange: (dept: CollegeDepartment | '') => void
  onGradeChange?: (grade: GradeLevel | '') => void
}

export function EducationFields({
  level,
  department,
  grade = '',
  showGrade = false,
  onLevelChange,
  onDepartmentChange,
  onGradeChange,
}: Props) {
  const grades =
    level === 'HS'  ? HS_GRADES
    : level === 'SHS' ? SHS_GRADES
    : []

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
                  if (opt === 'College' && onGradeChange) onGradeChange('')
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

      {showGrade && grades.length > 0 && onGradeChange && (
        <div className="space-y-1.5 animate-fade-in">
          <label className="block text-xs font-semibold text-gray-400 font-ui">Grade Level</label>
          <select
            value={grade}
            onChange={e => onGradeChange(e.target.value as GradeLevel | '')}
            className="input-field h-11 w-full"
          >
            <option value="">Select grade…</option>
            {grades.map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify CompleteProfilePage still type-checks**

`CompleteProfilePage` doesn't pass `showGrade` so the new field is opt-in via the default `false`. No change required there. Confirm:

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auth/EducationFields.tsx
git commit -m "feat(ui): EducationFields supports optional grade selector"
```

---

### Task 18: Build `MyAccountPage`

**Files:**
- Create: `frontend/src/pages/user/MyAccountPage.tsx`

- [ ] **Step 1: Create the page**

Path: `frontend/src/pages/user/MyAccountPage.tsx`

```tsx
import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { Lock, Eye, EyeOff, User as UserIcon, Mail } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { EducationFields } from '../../components/auth/EducationFields'
import {
  me,
  updateProfile,
  changePassword,
  type EducationLevel,
  type CollegeDepartment,
  type GradeLevel,
} from '../../api/auth'

interface FullProfile {
  fullname: string
  email: string
  educationLevel: EducationLevel | ''
  collegeDepartment: CollegeDepartment | ''
  gradeLevel: GradeLevel | ''
}

export function MyAccountPage() {
  const { currentUser, role, setAuth } = useAuth()
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // Change-password state
  const [current, setCurrent]   = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  // Hydrate fullname/email by re-reading /me (which the backend already populates).
  // The auth context only caches id + level + dept + grade.
  useEffect(() => {
    let cancelled = false
    me()
      .then(res => {
        if (cancelled) return
        const d = res.data as Record<string, unknown>
        setProfile({
          fullname: (d.fullname as string) ?? '',
          email: (d.email as string) ?? '',
          educationLevel: (d.education_level as EducationLevel) ?? '',
          collegeDepartment: (d.college_department as CollegeDepartment) ?? '',
          gradeLevel: (d.grade_level as GradeLevel) ?? '',
        })
      })
      .catch(() => { if (!cancelled) toast.error('Could not load your account.') })
      .finally(() => { if (!cancelled) setProfileLoading(false) })
    return () => { cancelled = true }
  }, [])

  const onSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!profile.educationLevel) { toast.error('Choose an education level'); return }
    if (profile.educationLevel === 'College' && !profile.collegeDepartment) {
      toast.error('Choose a department'); return
    }
    if ((profile.educationLevel === 'HS' || profile.educationLevel === 'SHS') && !profile.gradeLevel) {
      toast.error('Choose a grade'); return
    }
    setSavingProfile(true)
    try {
      await updateProfile(
        profile.educationLevel as EducationLevel,
        profile.educationLevel === 'College' ? (profile.collegeDepartment as CollegeDepartment) : null,
        profile.educationLevel !== 'College' ? (profile.gradeLevel as GradeLevel) : null,
      )
      // Refresh auth cache so other pages see the new values.
      if (currentUser) {
        setAuth({
          id: currentUser.id,
          education_level: profile.educationLevel || null,
          college_department: profile.educationLevel === 'College' ? (profile.collegeDepartment || null) : null,
          grade_level: profile.educationLevel !== 'College' ? (profile.gradeLevel || null) : null,
        }, role)
      }
      toast.success('Profile updated')
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not update profile') : 'Something went wrong')
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePw = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (newPw !== confirm) { toast.error('New password and confirmation do not match'); return }
    setSavingPw(true)
    try {
      await changePassword(current, newPw)
      toast.success('Password updated')
      setCurrent(''); setNewPw(''); setConfirm('')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        toast.error('Current password is incorrect')
      } else {
        toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Could not change password') : 'Something went wrong')
      }
    } finally {
      setSavingPw(false)
    }
  }

  if (profileLoading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ascb-orange border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white font-display">My Account</h1>
        <p className="text-gray-400 text-sm font-ui mt-1">Manage your profile and password.</p>
      </div>

      {/* PROFILE CARD */}
      <form onSubmit={onSaveProfile} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
        <h2 className="text-base font-semibold text-white font-ui">Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Full Name</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={profile.fullname} readOnly className="input-field pl-10 h-11 cursor-not-allowed opacity-80" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={profile.email} readOnly className="input-field pl-10 h-11 cursor-not-allowed opacity-80" />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 font-ui -mt-2">
          Full name and email are managed by the registrar. Contact the office to change them.
        </p>

        <EducationFields
          level={profile.educationLevel}
          department={profile.collegeDepartment}
          grade={profile.gradeLevel}
          showGrade
          onLevelChange={(level) => setProfile({ ...profile, educationLevel: level })}
          onDepartmentChange={(dept) => setProfile({ ...profile, collegeDepartment: dept })}
          onGradeChange={(g) => setProfile({ ...profile, gradeLevel: g })}
        />

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
        >
          {savingProfile ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Save changes'}
        </button>
      </form>

      {/* CHANGE PASSWORD CARD */}
      <form onSubmit={onChangePw} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 space-y-5">
        <h2 className="text-base font-semibold text-white font-ui">Change Password</h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Current password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showPw ? 'text' : 'password'}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                className="input-field pl-10 pr-11 h-11"
                autoComplete="current-password"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 p-0.5">
                {showPw ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">New password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field pl-10 h-11"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Confirm new password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="input-field pl-10 h-11"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPw}
          className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-semibold font-ui text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
        >
          {savingPw ? <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Update password'}
        </button>
      </form>
    </div>
  )
}
```

> Note: this page uses `me()` to fetch fullname + email because `AuthContext` only caches the minimum needed for routing. We could extend `CurrentUser`, but a one-time fetch on this page keeps the cache lean and avoids cache-coherence bugs across tabs.

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/user/MyAccountPage.tsx
git commit -m "feat(account): MyAccountPage — profile + change password"
```

---

### Task 19: Add nav link in `Header.tsx`

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Add to the desktop user nav**

In `frontend/src/components/layout/Header.tsx`, find the `currentUser && role === 'user'` desktop block (around line 135) and update the `[ ... ].map` array:

```tsx
{[
  { to: '/user/submit', label: 'Submit Feedback', badge: 0 },
  { to: '/user/submissions', label: 'My Submissions', badge: statusUnread },
  { to: '/user/announcements', label: 'Announcements', badge: unread },
  { to: '/user/account', label: 'My Account', badge: 0 },
].map(({ to, label, badge }) => (
```

- [ ] **Step 2: Add to the mobile user nav**

Same file, find the mobile block (around line 213) and apply the same array change.

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "feat(nav): My Account link for user role"
```

---

### Task 20: Register route in `router.tsx`

**Files:**
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Import the page**

In `frontend/src/router.tsx`, add near the other lazy imports (around line 19):

```tsx
const MyAccountPage      = lazy(() => import('./pages/user/MyAccountPage').then(m => ({ default: m.MyAccountPage })))
```

- [ ] **Step 2: Register the route**

Inside the `<Route element={<RequireAuth role="user" />}>` block (around line 186), inside the inner `<Route element={<PublicLayout />}>`, add:

```tsx
<Route path="/user/account" element={<MyAccountPage />} />
```

- [ ] **Step 3: Type-check + run all frontend tests**

```bash
cd frontend && npx tsc --noEmit && npm test -- --run
```

Expected: clean type-check; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router.tsx
git commit -m "feat(router): /user/account route"
```

---

## Section 8 — Verification

### Task 21: Full-suite verification

- [ ] **Step 1: Backend full test suite**

```bash
cd backend && go test ./...
```

Expected: PASS for every package.

- [ ] **Step 2: Frontend full test suite**

```bash
cd frontend && npm test -- --run
```

Expected: PASS.

- [ ] **Step 3: Frontend type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Local smoke**

Start dev servers (per existing repo convention):

```bash
cd backend && go run ./cmd & cd frontend && npm run dev
```

Visit `http://localhost:5173` and run through this checklist:

1. **B1 — login persistence:** sign in as a user → confirm dashboard. Refresh the page (F5). Confirm you remain signed in. Open Network tab; observe `/api/auth/me` returns 200 — no logout.
2. **B1 — 5xx tolerance:** stop the backend. Refresh `/user/submit`. Confirm the page does NOT redirect to login (cached auth retained, with a console warning).
3. **B2 — reset password:** sign out. Visit `/forgot-password`. Submit a real email. Inbox: confirm email arrives. Click link → set a new password → log in.
4. **B3 — My Account:** as an HS user, visit `/user/account`. Change grade from `null` (or whatever) to `9`. Save. Refresh — new value persists. Switch to College + CCE: save → reload → persists, grade dropdown is hidden.
5. **B3 — Change password:** on `/user/account`, type wrong current password → expect "Current password is incorrect" toast. Try `< 6` char new password → toast. Set valid new password → success → log out → log in with new password.

If anything fails, file a follow-up task and stop.

- [ ] **Step 5: Final commit if any incidental changes**

```bash
git status
```

If clean, no commit needed. If changes were forced (e.g., a test snapshot), inspect and commit deliberately.

---

## Done

All 21 tasks committed. Group B is complete. Open PR to `main` (or merge directly per your team's convention).

Out-of-scope reminders for follow-up:
- Group C: Notifications (Facebook-style real-time + clearing on click).
- Group D: Service-rating chart, photo attachments visible to staff, office hours editor + history + custom workdays, services catalog editor, slow eye-icon.
- Group E: Homepage "Values" → "Core Values", footer phone number, announcement pagination layout, top overflow.
