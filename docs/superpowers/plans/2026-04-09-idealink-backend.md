# IdeaLink Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Go + Gin + PostgreSQL backend API for IdeaLink with JWT auth, layered architecture (handlers → services → repositories), and all endpoints from the spec.

**Architecture:** Each layer sits behind an interface so services are testable without a live DB. JWT is stored in httpOnly cookies. PostgreSQL accessed via `database/sql` + `lib/pq`. Migrations run automatically at startup from an embedded SQL file.

**Tech Stack:** Go 1.21, `gin-gonic/gin` v1.9, `golang-jwt/jwt/v5`, `lib/pq`, `golang.org/x/crypto` (bcrypt), `joho/godotenv`, `stretchr/testify`

---

## File Map

| File | Responsibility |
|---|---|
| `backend/go.mod` | Module definition and dependencies |
| `backend/cmd/main.go` | Entry point: wire all deps, register routes, start server |
| `backend/internal/config/config.go` | Load env vars into a typed Config struct |
| `backend/internal/migrations/001_initial.sql` | All PostgreSQL table definitions |
| `backend/internal/models/user.go` | User, AdminAccount, RegistrarAccount, AccountingAccount |
| `backend/internal/models/suggestion.go` | Suggestion, CreateSuggestionInput, UpdateStatusInput |
| `backend/internal/models/announcement.go` | Announcement, CreateAnnouncementInput |
| `backend/internal/models/testimonial.go` | Testimonial |
| `backend/internal/models/admin.go` | Analytics struct |
| `backend/internal/repository/interfaces.go` | All repo interfaces |
| `backend/internal/repository/user_repo.go` | UserRepository implementation |
| `backend/internal/repository/suggestion_repo.go` | SuggestionRepository implementation |
| `backend/internal/repository/announcement_repo.go` | AnnouncementRepository implementation |
| `backend/internal/repository/testimonial_repo.go` | TestimonialRepository implementation |
| `backend/internal/services/auth_service.go` | JWT sign/parse, bcrypt, signup/login for all 4 roles |
| `backend/internal/services/suggestion_service.go` | Submit, list (role-filtered), update status |
| `backend/internal/services/announcement_service.go` | CRUD announcements |
| `backend/internal/services/testimonial_service.go` | List active, toggle, create from suggestion |
| `backend/internal/middleware/auth.go` | `AuthRequired(roles...)` Gin middleware |
| `backend/internal/middleware/cors.go` | CORS middleware for Vercel ↔ Render |
| `backend/internal/handlers/auth.go` | Signup, Login ×4, Logout, Me |
| `backend/internal/handlers/suggestions.go` | Submit, List, UpdateStatus, Feature |
| `backend/internal/handlers/announcements.go` | List, Create, Update, Delete |
| `backend/internal/handlers/testimonials.go` | List, Toggle |
| `backend/internal/handlers/admin.go` | Analytics |
| `backend/internal/services/auth_service_test.go` | Unit tests for auth service |
| `backend/internal/middleware/auth_test.go` | Unit tests for auth middleware |
| `backend/internal/handlers/auth_test.go` | Integration tests for auth handlers |
| `backend/internal/handlers/suggestions_test.go` | Integration tests for suggestion handlers |

---

### Task 1: Initialize Go backend

**Files:**
- Create: `backend/go.mod`
- Create: `backend/go.sum` (auto-generated)

- [ ] **Step 1: Create directory structure**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
mkdir -p backend/cmd
mkdir -p backend/internal/{config,migrations,models,repository,services,middleware,handlers}
```

- [ ] **Step 2: Initialize Go module**

```bash
cd backend
go mod init idealink
```

- [ ] **Step 3: Install dependencies**

```bash
go get github.com/gin-gonic/gin@v1.9.1
go get github.com/golang-jwt/jwt/v5@v5.2.1
go get github.com/lib/pq@v1.10.9
go get golang.org/x/crypto@v0.22.0
go get github.com/joho/godotenv@v1.5.1
go get github.com/stretchr/testify@v1.9.0
```

- [ ] **Step 4: Create .env file**

```bash
cat > .env << 'EOF'
DATABASE_URL=postgres://localhost/idealink_dev?sslmode=disable
JWT_SECRET=dev-secret-change-in-prod
PORT=8080
FRONTEND_URL=http://localhost:5173
EOF
```

- [ ] **Step 5: Verify go.mod looks correct**

Run: `cat go.mod`
Expected: module line `module idealink`, go version line, and require block with all 5 dependencies.

- [ ] **Step 6: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add backend/go.mod backend/go.sum backend/.env
git commit -m "chore: initialize Go backend module with dependencies"
```

---

### Task 2: Config package

**Files:**
- Create: `backend/internal/config/config.go`

- [ ] **Step 1: Write config.go**

```go
// backend/internal/config/config.go
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	FrontendURL string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading env from OS")
	}
	return &Config{
		DatabaseURL: mustGet("DATABASE_URL"),
		JWTSecret:   mustGet("JWT_SECRET"),
		Port:        getOr("PORT", "8080"),
		FrontendURL: getOr("FRONTEND_URL", "http://localhost:5173"),
	}
}

func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getOr(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend
go build ./internal/config/...
```
Expected: no output (success).

- [ ] **Step 3: Commit**

```bash
git add backend/internal/config/config.go
git commit -m "feat: add config package with env var loading"
```

---

### Task 3: Database migration SQL

**Files:**
- Create: `backend/internal/migrations/001_initial.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- backend/internal/migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255) NOT NULL,
  last_announcement_view TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id SERIAL PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrar_accounts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS accounting_accounts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  department VARCHAR(255) NOT NULL,
  user_role VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  anonymous BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_accounts(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  date_posted TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  suggestion_id INTEGER REFERENCES suggestions(id),
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Write DB connection + migration runner**

Create `backend/internal/config/db.go`:

```go
// backend/internal/config/db.go
package config

import (
	"database/sql"
	"embed"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

//go:embed ../../migrations/001_initial.sql
var migrationSQL embed.FS

func ConnectDB(databaseURL string) *sql.DB {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("failed to open DB: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping DB: %v", err)
	}
	runMigrations(db)
	return db
}

func runMigrations(db *sql.DB) {
	content, err := migrationSQL.ReadFile("../../migrations/001_initial.sql")
	if err != nil {
		log.Fatalf("failed to read migration file: %v", err)
	}
	if _, err := db.Exec(string(content)); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	fmt.Println("Migrations applied successfully")
}
```

> **Note:** The embed path is relative to the source file. Since `db.go` is in `internal/config/` and the SQL is in `internal/migrations/`, the embed path is `../../migrations/` — but Go embeds resolve relative to the package directory. Move the embed approach: embed the SQL file at the `backend/` level, or adjust the path. **Simpler approach:** read the file with `os.ReadFile` at runtime using a path from config.

Replace `db.go` with this simpler runtime approach:

```go
// backend/internal/config/db.go
package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/lib/pq"
)

func ConnectDB(databaseURL string) *sql.DB {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("failed to open DB: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping DB: %v", err)
	}
	runMigrations(db)
	return db
}

func runMigrations(db *sql.DB) {
	_, filename, _, _ := runtime.Caller(0)
	// navigate from internal/config/ to internal/migrations/
	migrationPath := filepath.Join(filepath.Dir(filename), "..", "migrations", "001_initial.sql")
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		log.Fatalf("failed to read migration: %v", err)
	}
	if _, err := db.Exec(string(content)); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	fmt.Println("Migrations applied")
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend
go build ./internal/config/...
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/migrations/001_initial.sql backend/internal/config/db.go
git commit -m "feat: add PostgreSQL schema migration and DB connection helper"
```

---

### Task 4: Models

**Files:**
- Create: `backend/internal/models/user.go`
- Create: `backend/internal/models/suggestion.go`
- Create: `backend/internal/models/announcement.go`
- Create: `backend/internal/models/testimonial.go`
- Create: `backend/internal/models/admin.go`

- [ ] **Step 1: Write user.go**

```go
// backend/internal/models/user.go
package models

import "time"

type User struct {
	ID                   int       `json:"id"`
	Email                string    `json:"email"`
	Password             string    `json:"-"`
	Fullname             string    `json:"fullname"`
	LastAnnouncementView time.Time `json:"last_announcement_view"`
	CreatedAt            time.Time `json:"created_at"`
}

type AdminAccount struct {
	ID        int       `json:"id"`
	Fullname  string    `json:"fullname"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type RegistrarAccount struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

type AccountingAccount struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}
```

- [ ] **Step 2: Write suggestion.go**

```go
// backend/internal/models/suggestion.go
package models

import "time"

type Suggestion struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Department    string    `json:"department"`
	UserRole      string    `json:"user_role"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Status        string    `json:"status"`
	Anonymous     bool      `json:"anonymous"`
	IsRead        bool      `json:"is_read"`
	SubmittedAt   time.Time `json:"submitted_at"`
	SubmitterName string    `json:"submitter_name,omitempty"`
}

type CreateSuggestionInput struct {
	Department  string `json:"department" binding:"required"`
	UserRole    string `json:"user_role"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
	Anonymous   bool   `json:"anonymous"`
}

type UpdateStatusInput struct {
	Status string `json:"status" binding:"required"`
}
```

- [ ] **Step 3: Write announcement.go**

```go
// backend/internal/models/announcement.go
package models

import "time"

type Announcement struct {
	ID         int       `json:"id"`
	AdminID    int       `json:"admin_id"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	DatePosted time.Time `json:"date_posted"`
}

type CreateAnnouncementInput struct {
	Title   string `json:"title" binding:"required"`
	Message string `json:"message" binding:"required"`
}
```

- [ ] **Step 4: Write testimonial.go**

```go
// backend/internal/models/testimonial.go
package models

import "time"

type Testimonial struct {
	ID           int       `json:"id"`
	SuggestionID *int      `json:"suggestion_id"`
	Name         string    `json:"name"`
	Department   string    `json:"department"`
	Message      string    `json:"message"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}
```

- [ ] **Step 5: Write admin.go**

```go
// backend/internal/models/admin.go
package models

type Analytics struct {
	TotalUsers           int `json:"total_users"`
	TotalSuggestions     int `json:"total_suggestions"`
	ThisMonthSuggestions int `json:"this_month_suggestions"`
	UnreadSuggestions    int `json:"unread_suggestions"`
	StudentCount         int `json:"student_count"`
	FacultyCount         int `json:"faculty_count"`
}
```

- [ ] **Step 6: Compile check**

```bash
cd backend
go build ./internal/models/...
```
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/models/
git commit -m "feat: add all domain models"
```

---

### Task 5: Repository interfaces

**Files:**
- Create: `backend/internal/repository/interfaces.go`

- [ ] **Step 1: Write interfaces.go**

```go
// backend/internal/repository/interfaces.go
package repository

import "idealink/internal/models"

type UserRepository interface {
	CreateUser(email, hashedPassword, fullname string) (*models.User, error)
	FindUserByEmail(email string) (*models.User, error)
	FindAdminByEmail(email string) (*models.AdminAccount, error)
	FindRegistrarByUsername(username string) (*models.RegistrarAccount, error)
	FindAccountingByUsername(username string) (*models.AccountingAccount, error)
	UpdateLastAnnouncementView(userID int) error
	CountUsers() (int, error)
}

type SuggestionRepository interface {
	Create(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error)
	FindAll() ([]*models.Suggestion, error)
	FindByDepartment(department string) ([]*models.Suggestion, error)
	FindByUserID(userID int) ([]*models.Suggestion, error)
	FindByID(id int) (*models.Suggestion, error)
	UpdateStatus(id int, status string) error
	GetAnalytics() (*models.Analytics, error)
}

type AnnouncementRepository interface {
	FindAll() ([]*models.Announcement, error)
	Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error)
	Update(id int, input models.CreateAnnouncementInput) error
	Delete(id int) error
}

type TestimonialRepository interface {
	FindActive() ([]*models.Testimonial, error)
	Create(suggestionID int, name, department, message string) (*models.Testimonial, error)
	ToggleActive(id int) (*models.Testimonial, error)
}
```

- [ ] **Step 2: Compile check**

```bash
cd backend
go build ./internal/repository/...
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/interfaces.go
git commit -m "feat: add repository interfaces for all domain entities"
```

---

### Task 6: Auth service (TDD)

**Files:**
- Create: `backend/internal/services/auth_service_test.go`
- Create: `backend/internal/services/auth_service.go`

- [ ] **Step 1: Write the failing tests**

```go
// backend/internal/services/auth_service_test.go
package services_test

import (
	"errors"
	"testing"

	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock UserRepository ---

type mockUserRepo struct {
	users    map[string]*models.User
	admins   map[string]*models.AdminAccount
	regs     map[string]*models.RegistrarAccount
	accts    map[string]*models.AccountingAccount
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users:  make(map[string]*models.User),
		admins: make(map[string]*models.AdminAccount),
		regs:   make(map[string]*models.RegistrarAccount),
		accts:  make(map[string]*models.AccountingAccount),
	}
}

func (m *mockUserRepo) CreateUser(email, hashedPassword, fullname string) (*models.User, error) {
	if _, exists := m.users[email]; exists {
		return nil, errors.New("duplicate email")
	}
	u := &models.User{ID: len(m.users) + 1, Email: email, Password: hashedPassword, Fullname: fullname}
	m.users[email] = u
	return u, nil
}
func (m *mockUserRepo) FindUserByEmail(email string) (*models.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, nil
	}
	return u, nil
}
func (m *mockUserRepo) FindAdminByEmail(email string) (*models.AdminAccount, error) {
	a, ok := m.admins[email]
	if !ok {
		return nil, nil
	}
	return a, nil
}
func (m *mockUserRepo) FindRegistrarByUsername(username string) (*models.RegistrarAccount, error) {
	r, ok := m.regs[username]
	if !ok {
		return nil, nil
	}
	return r, nil
}
func (m *mockUserRepo) FindAccountingByUsername(username string) (*models.AccountingAccount, error) {
	a, ok := m.accts[username]
	if !ok {
		return nil, nil
	}
	return a, nil
}
func (m *mockUserRepo) UpdateLastAnnouncementView(userID int) error { return nil }
func (m *mockUserRepo) CountUsers() (int, error)                    { return len(m.users), nil }

// --- Tests ---

func TestAuthService_SignAndParseToken(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")

	token, err := svc.SignToken(42, "admin")
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := svc.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, 42, claims.UserID)
	assert.Equal(t, "admin", claims.Role)
}

func TestAuthService_ParseToken_Invalid(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	_, err := svc.ParseToken("not.a.token")
	assert.Error(t, err)
}

func TestAuthService_HashAndCheckPassword(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	hashed, err := svc.HashPassword("mypassword")
	require.NoError(t, err)
	assert.True(t, svc.CheckPassword(hashed, "mypassword"))
	assert.False(t, svc.CheckPassword(hashed, "wrongpassword"))
}

func TestAuthService_SignupUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")

	user, token, err := svc.SignupUser("jane@test.com", "pass123", "Jane Doe")
	require.NoError(t, err)
	assert.Equal(t, "jane@test.com", user.Email)
	assert.NotEmpty(t, token)

	// Duplicate signup
	_, _, err = svc.SignupUser("jane@test.com", "pass123", "Jane Doe")
	assert.EqualError(t, err, "email already registered")
}

func TestAuthService_LoginUser_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	svc.SignupUser("john@test.com", "pass123", "John")

	user, token, err := svc.LoginUser("john@test.com", "pass123")
	require.NoError(t, err)
	assert.Equal(t, "john@test.com", user.Email)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginUser_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	svc.SignupUser("john@test.com", "pass123", "John")

	_, _, err := svc.LoginUser("john@test.com", "wrongpass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginUser_NotFound(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	_, _, err := svc.LoginUser("nobody@test.com", "pass")
	assert.EqualError(t, err, "invalid credentials")
}
```

- [ ] **Step 2: Run tests — expect failure (service not yet written)**

```bash
cd backend
go test ./internal/services/... -v 2>&1 | head -20
```
Expected: `cannot find package` or compile error since `auth_service.go` doesn't exist yet.

- [ ] **Step 3: Write auth_service.go**

```go
// backend/internal/services/auth_service.go
package services

import (
	"errors"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, jwtSecret: jwtSecret}
}

func (s *AuthService) SignToken(userID int, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return token.Claims.(*Claims), nil
}

func (s *AuthService) HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func (s *AuthService) CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) SignupUser(email, password, fullname string) (*models.User, string, error) {
	existing, err := s.userRepo.FindUserByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if existing != nil {
		return nil, "", errors.New("email already registered")
	}
	hashed, err := s.HashPassword(password)
	if err != nil {
		return nil, "", err
	}
	user, err := s.userRepo.CreateUser(email, hashed, fullname)
	if err != nil {
		return nil, "", err
	}
	token, err := s.SignToken(user.ID, "user")
	return user, token, err
}

func (s *AuthService) LoginUser(email, password string) (*models.User, string, error) {
	user, err := s.userRepo.FindUserByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if user == nil || !s.CheckPassword(user.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(user.ID, "user")
	return user, token, err
}

func (s *AuthService) LoginAdmin(email, password string) (*models.AdminAccount, string, error) {
	admin, err := s.userRepo.FindAdminByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if admin == nil || !s.CheckPassword(admin.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(admin.ID, "admin")
	return admin, token, err
}

func (s *AuthService) LoginRegistrar(username, password string) (*models.RegistrarAccount, string, error) {
	reg, err := s.userRepo.FindRegistrarByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if reg == nil || !s.CheckPassword(reg.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(reg.ID, "registrar")
	return reg, token, err
}

func (s *AuthService) LoginAccounting(username, password string) (*models.AccountingAccount, string, error) {
	acc, err := s.userRepo.FindAccountingByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if acc == nil || !s.CheckPassword(acc.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(acc.ID, "accounting")
	return acc, token, err
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd backend
go test ./internal/services/... -v
```
Expected:
```
--- PASS: TestAuthService_SignAndParseToken
--- PASS: TestAuthService_ParseToken_Invalid
--- PASS: TestAuthService_HashAndCheckPassword
--- PASS: TestAuthService_SignupUser
--- PASS: TestAuthService_LoginUser_Success
--- PASS: TestAuthService_LoginUser_WrongPassword
--- PASS: TestAuthService_LoginUser_NotFound
PASS
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/services/auth_service.go backend/internal/services/auth_service_test.go
git commit -m "feat: add auth service with JWT signing and bcrypt password handling"
```

---

### Task 7: Auth middleware (TDD)

**Files:**
- Create: `backend/internal/middleware/auth_test.go`
- Create: `backend/internal/middleware/auth.go`
- Create: `backend/internal/middleware/cors.go`

- [ ] **Step 1: Write the failing tests**

```go
// backend/internal/middleware/auth_test.go
package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"idealink/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

const testSecret = "test-secret"

func makeToken(userID int, role string, secret string) string {
	claims := jwt.MapClaims{
		"user_id": float64(userID),
		"role":    role,
		"exp":     time.Now().Add(time.Hour).Unix(),
	}
	t, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	return t
}

func setupRouter(secret string, roles ...string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", middleware.AuthRequired(secret, roles...), func(c *gin.Context) {
		userID, _ := c.Get("userID")
		role, _ := c.Get("role")
		c.JSON(200, gin.H{"user_id": userID, "role": role})
	})
	return r
}

func TestAuthRequired_ValidToken(t *testing.T) {
	r := setupRouter(testSecret, "user", "admin")
	token := makeToken(5, "user", testSecret)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), `"user_id":5`)
}

func TestAuthRequired_MissingToken(t *testing.T) {
	r := setupRouter(testSecret, "user")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)
}

func TestAuthRequired_WrongRole(t *testing.T) {
	r := setupRouter(testSecret, "admin")
	token := makeToken(5, "user", testSecret)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 403, w.Code)
}

func TestAuthRequired_ExpiredToken(t *testing.T) {
	claims := jwt.MapClaims{
		"user_id": float64(1),
		"role":    "user",
		"exp":     time.Now().Add(-time.Hour).Unix(),
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))

	r := setupRouter(testSecret, "user")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend
go test ./internal/middleware/... -v 2>&1 | head -10
```
Expected: compile error (middleware package doesn't exist yet).

- [ ] **Step 3: Write auth.go middleware**

```go
// backend/internal/middleware/auth.go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthRequired(jwtSecret string, roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		cookie, err := c.Cookie("token")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		token, err := jwt.Parse(cookie, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}

		role, _ := claims["role"].(string)
		userID := int(claims["user_id"].(float64))

		if len(roles) > 0 {
			allowed := false
			for _, r := range roles {
				if r == role {
					allowed = true
					break
				}
			}
			if !allowed {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
				return
			}
		}

		c.Set("userID", userID)
		c.Set("role", role)
		c.Next()
	}
}
```

- [ ] **Step 4: Write cors.go**

```go
// backend/internal/middleware/cors.go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORS(frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", frontendURL)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
cd backend
go test ./internal/middleware/... -v
```
Expected:
```
--- PASS: TestAuthRequired_ValidToken
--- PASS: TestAuthRequired_MissingToken
--- PASS: TestAuthRequired_WrongRole
--- PASS: TestAuthRequired_ExpiredToken
PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/internal/middleware/
git commit -m "feat: add JWT auth middleware and CORS middleware"
```

---

### Task 8: User repository

**Files:**
- Create: `backend/internal/repository/user_repo.go`

- [ ] **Step 1: Write user_repo.go**

```go
// backend/internal/repository/user_repo.go
package repository

import (
	"database/sql"

	"idealink/internal/models"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) CreateUser(email, hashedPassword, fullname string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`INSERT INTO users (email, password, fullname)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, fullname, last_announcement_view, created_at`,
		email, hashedPassword, fullname,
	).Scan(&u.ID, &u.Email, &u.Fullname, &u.LastAnnouncementView, &u.CreatedAt)
	return &u, err
}

func (r *UserRepo) FindUserByEmail(email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`SELECT id, email, password, fullname, last_announcement_view, created_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.LastAnnouncementView, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (r *UserRepo) FindAdminByEmail(email string) (*models.AdminAccount, error) {
	var a models.AdminAccount
	err := r.db.QueryRow(
		`SELECT id, email, password, fullname FROM admin_accounts WHERE email = $1`,
		email,
	).Scan(&a.ID, &a.Email, &a.Password, &a.Fullname)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &a, err
}

func (r *UserRepo) FindRegistrarByUsername(username string) (*models.RegistrarAccount, error) {
	var reg models.RegistrarAccount
	err := r.db.QueryRow(
		`SELECT id, username, password FROM registrar_accounts WHERE username = $1`,
		username,
	).Scan(&reg.ID, &reg.Username, &reg.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &reg, err
}

func (r *UserRepo) FindAccountingByUsername(username string) (*models.AccountingAccount, error) {
	var acc models.AccountingAccount
	err := r.db.QueryRow(
		`SELECT id, username, password FROM accounting_accounts WHERE username = $1`,
		username,
	).Scan(&acc.ID, &acc.Username, &acc.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &acc, err
}

func (r *UserRepo) UpdateLastAnnouncementView(userID int) error {
	_, err := r.db.Exec(
		`UPDATE users SET last_announcement_view = NOW() WHERE id = $1`,
		userID,
	)
	return err
}

func (r *UserRepo) CountUsers() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
	return count, err
}
```

- [ ] **Step 2: Verify UserRepo satisfies UserRepository interface**

```bash
cd backend
go build ./internal/repository/...
```
Expected: no output (if there are interface mismatch errors, fix method signatures to match interfaces.go).

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/user_repo.go
git commit -m "feat: implement UserRepository with PostgreSQL queries"
```

---

### Task 9: Suggestion, Announcement, Testimonial repositories

**Files:**
- Create: `backend/internal/repository/suggestion_repo.go`
- Create: `backend/internal/repository/announcement_repo.go`
- Create: `backend/internal/repository/testimonial_repo.go`

- [ ] **Step 1: Write suggestion_repo.go**

```go
// backend/internal/repository/suggestion_repo.go
package repository

import (
	"database/sql"
	"idealink/internal/models"
)

type SuggestionRepo struct {
	db *sql.DB
}

func NewSuggestionRepo(db *sql.DB) *SuggestionRepo {
	return &SuggestionRepo{db: db}
}

func (r *SuggestionRepo) Create(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error) {
	var s models.Suggestion
	err := r.db.QueryRow(
		`INSERT INTO suggestions (user_id, department, user_role, title, description, anonymous)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id, department, user_role, title, description, status, anonymous, is_read, submitted_at`,
		userID, input.Department, input.UserRole, input.Title, input.Description, input.Anonymous,
	).Scan(&s.ID, &s.UserID, &s.Department, &s.UserRole, &s.Title, &s.Description,
		&s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt)
	return &s, err
}

func (r *SuggestionRepo) scanRow(row *sql.Row) (*models.Suggestion, error) {
	var s models.Suggestion
	var submitterName sql.NullString
	err := row.Scan(&s.ID, &s.UserID, &s.Department, &s.UserRole, &s.Title,
		&s.Description, &s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt, &submitterName)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if submitterName.Valid {
		s.SubmitterName = submitterName.String
	}
	return &s, err
}

func (r *SuggestionRepo) scanRows(rows *sql.Rows) ([]*models.Suggestion, error) {
	var suggestions []*models.Suggestion
	for rows.Next() {
		var s models.Suggestion
		var submitterName sql.NullString
		err := rows.Scan(&s.ID, &s.UserID, &s.Department, &s.UserRole, &s.Title,
			&s.Description, &s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt, &submitterName)
		if err != nil {
			return nil, err
		}
		if submitterName.Valid && !s.Anonymous {
			s.SubmitterName = submitterName.String
		}
		suggestions = append(suggestions, &s)
	}
	return suggestions, rows.Err()
}

const selectSuggestions = `
	SELECT s.id, s.user_id, s.department, s.user_role, s.title, s.description,
	       s.status, s.anonymous, s.is_read, s.submitted_at, u.fullname
	FROM suggestions s
	LEFT JOIN users u ON s.user_id = u.id`

func (r *SuggestionRepo) FindAll() ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions + ` ORDER BY s.submitted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByDepartment(department string) ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions+` WHERE s.department = $1 ORDER BY s.submitted_at DESC`, department)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByUserID(userID int) ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions+` WHERE s.user_id = $1 ORDER BY s.submitted_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByID(id int) (*models.Suggestion, error) {
	row := r.db.QueryRow(selectSuggestions+` WHERE s.id = $1`, id)
	return r.scanRow(row)
}

func (r *SuggestionRepo) UpdateStatus(id int, status string) error {
	_, err := r.db.Exec(
		`UPDATE suggestions SET status = $1, is_read = true WHERE id = $2`,
		status, id,
	)
	return err
}

func (r *SuggestionRepo) GetAnalytics() (*models.Analytics, error) {
	var a models.Analytics
	err := r.db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE submitted_at >= DATE_TRUNC('month', NOW())),
			COUNT(*) FILTER (WHERE is_read = false),
			COUNT(*) FILTER (WHERE user_role = 'Student'),
			COUNT(*) FILTER (WHERE user_role = 'Faculty Staff')
		FROM suggestions
	`).Scan(&a.TotalSuggestions, &a.ThisMonthSuggestions,
		&a.UnreadSuggestions, &a.StudentCount, &a.FacultyCount)
	return &a, err
}
```

- [ ] **Step 2: Write announcement_repo.go**

```go
// backend/internal/repository/announcement_repo.go
package repository

import (
	"database/sql"
	"idealink/internal/models"
)

type AnnouncementRepo struct {
	db *sql.DB
}

func NewAnnouncementRepo(db *sql.DB) *AnnouncementRepo {
	return &AnnouncementRepo{db: db}
}

func (r *AnnouncementRepo) FindAll() ([]*models.Announcement, error) {
	rows, err := r.db.Query(
		`SELECT id, admin_id, title, message, date_posted
		 FROM announcements ORDER BY date_posted DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.AdminID, &a.Title, &a.Message, &a.DatePosted); err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, rows.Err()
}

func (r *AnnouncementRepo) Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error) {
	var a models.Announcement
	err := r.db.QueryRow(
		`INSERT INTO announcements (admin_id, title, message)
		 VALUES ($1, $2, $3)
		 RETURNING id, admin_id, title, message, date_posted`,
		adminID, input.Title, input.Message,
	).Scan(&a.ID, &a.AdminID, &a.Title, &a.Message, &a.DatePosted)
	return &a, err
}

func (r *AnnouncementRepo) Update(id int, input models.CreateAnnouncementInput) error {
	_, err := r.db.Exec(
		`UPDATE announcements SET title = $1, message = $2 WHERE id = $3`,
		input.Title, input.Message, id,
	)
	return err
}

func (r *AnnouncementRepo) Delete(id int) error {
	_, err := r.db.Exec(`DELETE FROM announcements WHERE id = $1`, id)
	return err
}
```

- [ ] **Step 3: Write testimonial_repo.go**

```go
// backend/internal/repository/testimonial_repo.go
package repository

import (
	"database/sql"
	"idealink/internal/models"
)

type TestimonialRepo struct {
	db *sql.DB
}

func NewTestimonialRepo(db *sql.DB) *TestimonialRepo {
	return &TestimonialRepo{db: db}
}

func (r *TestimonialRepo) FindActive() ([]*models.Testimonial, error) {
	rows, err := r.db.Query(
		`SELECT id, suggestion_id, name, department, message, is_active, created_at
		 FROM testimonials WHERE is_active = true ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Testimonial
	for rows.Next() {
		var t models.Testimonial
		if err := rows.Scan(&t.ID, &t.SuggestionID, &t.Name, &t.Department,
			&t.Message, &t.IsActive, &t.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &t)
	}
	return list, rows.Err()
}

func (r *TestimonialRepo) Create(suggestionID int, name, department, message string) (*models.Testimonial, error) {
	var t models.Testimonial
	err := r.db.QueryRow(
		`INSERT INTO testimonials (suggestion_id, name, department, message)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, suggestion_id, name, department, message, is_active, created_at`,
		suggestionID, name, department, message,
	).Scan(&t.ID, &t.SuggestionID, &t.Name, &t.Department, &t.Message, &t.IsActive, &t.CreatedAt)
	return &t, err
}

func (r *TestimonialRepo) ToggleActive(id int) (*models.Testimonial, error) {
	var t models.Testimonial
	err := r.db.QueryRow(
		`UPDATE testimonials SET is_active = NOT is_active WHERE id = $1
		 RETURNING id, suggestion_id, name, department, message, is_active, created_at`,
		id,
	).Scan(&t.ID, &t.SuggestionID, &t.Name, &t.Department, &t.Message, &t.IsActive, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &t, err
}
```

- [ ] **Step 4: Compile check all repos**

```bash
cd backend
go build ./internal/repository/...
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/repository/
git commit -m "feat: implement all repository layers (suggestions, announcements, testimonials)"
```

---

### Task 10: Auth handlers (TDD)

**Files:**
- Create: `backend/internal/handlers/auth_test.go`
- Create: `backend/internal/handlers/auth.go`

- [ ] **Step 1: Write the failing auth handler tests**

```go
// backend/internal/handlers/auth_test.go
package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"idealink/internal/handlers"
	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock UserRepository (same as in auth_service_test.go) ---

type mockUserRepo struct {
	users map[string]*models.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*models.User)}
}

func (m *mockUserRepo) CreateUser(email, pw, name string) (*models.User, error) {
	u := &models.User{ID: 1, Email: email, Password: pw, Fullname: name}
	m.users[email] = u
	return u, nil
}
func (m *mockUserRepo) FindUserByEmail(email string) (*models.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, nil
	}
	return u, nil
}
func (m *mockUserRepo) FindAdminByEmail(email string) (*models.AdminAccount, error) { return nil, nil }
func (m *mockUserRepo) FindRegistrarByUsername(username string) (*models.RegistrarAccount, error) {
	return nil, nil
}
func (m *mockUserRepo) FindAccountingByUsername(username string) (*models.AccountingAccount, error) {
	return nil, nil
}
func (m *mockUserRepo) UpdateLastAnnouncementView(userID int) error { return nil }
func (m *mockUserRepo) CountUsers() (int, error)                    { return 0, nil }

func setupAuthRouter() (*gin.Engine, *services.AuthService) {
	gin.SetMode(gin.TestMode)
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	h := handlers.NewAuthHandler(svc)

	r := gin.New()
	r.POST("/api/auth/signup", h.Signup)
	r.POST("/api/auth/login", h.Login)
	r.POST("/api/auth/logout", h.Logout)
	return r, svc
}

func TestAuthHandler_Signup_Success(t *testing.T) {
	r, _ := setupAuthRouter()
	body := `{"email":"alice@test.com","password":"pass123","fullname":"Alice"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, 201, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "alice@test.com", resp["email"])
}

func TestAuthHandler_Signup_MissingFields(t *testing.T) {
	r, _ := setupAuthRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBufferString(`{"email":"a@b.com"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, 400, w.Code)
}

func TestAuthHandler_Login_Success(t *testing.T) {
	r, svc := setupAuthRouter()
	svc.SignupUser("bob@test.com", "pass123", "Bob")

	body := `{"email":"bob@test.com","password":"pass123"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "token" {
			found = true
			assert.True(t, c.HttpOnly)
		}
	}
	assert.True(t, found, "expected token cookie")
}

func TestAuthHandler_Login_WrongPassword(t *testing.T) {
	r, svc := setupAuthRouter()
	svc.SignupUser("bob@test.com", "pass123", "Bob")

	body := `{"email":"bob@test.com","password":"wrongpass"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)
}

func TestAuthHandler_Logout(t *testing.T) {
	r, _ := setupAuthRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/logout", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
}
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend
go test ./internal/handlers/... -v 2>&1 | head -15
```
Expected: compile error (handlers package doesn't exist yet).

- [ ] **Step 3: Write auth.go handler**

```go
// backend/internal/handlers/auth.go
package handlers

import (
	"net/http"
	"time"

	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *services.AuthService
}

func NewAuthHandler(svc *services.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type signupInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Fullname string `json:"fullname" binding:"required"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var input signupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, token, err := h.svc.SignupUser(input.Email, input.Password, input.Fullname)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusCreated, user)
}

type loginInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, token, err := h.svc.LoginUser(input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, user)
}

type staffLoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	admin, token, err := h.svc.LoginAdmin(input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, admin)
}

func (h *AuthHandler) RegistrarLogin(c *gin.Context) {
	var input staffLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	reg, token, err := h.svc.LoginRegistrar(input.Username, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, reg)
}

func (h *AuthHandler) AccountingLogin(c *gin.Context) {
	var input staffLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	acc, token, err := h.svc.LoginAccounting(input.Username, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, acc)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie("token", "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	c.JSON(http.StatusOK, gin.H{"user_id": userID, "role": role})
}

func setTokenCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie("token", token, int(24*time.Hour/time.Second), "/", "", true, true)
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd backend
go test ./internal/handlers/... -v
```
Expected: all 5 auth handler tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/auth.go backend/internal/handlers/auth_test.go
git commit -m "feat: add auth handlers (signup, login, logout)"
```

---

### Task 11: Remaining services and handlers

**Files:**
- Create: `backend/internal/services/announcement_service.go`
- Create: `backend/internal/services/testimonial_service.go`
- Create: `backend/internal/services/suggestion_service.go`
- Create: `backend/internal/handlers/announcements.go`
- Create: `backend/internal/handlers/testimonials.go`
- Create: `backend/internal/handlers/suggestions.go`
- Create: `backend/internal/handlers/admin.go`

- [ ] **Step 1: Write announcement_service.go**

```go
// backend/internal/services/announcement_service.go
package services

import (
	"idealink/internal/models"
	"idealink/internal/repository"
)

type AnnouncementService struct {
	repo repository.AnnouncementRepository
}

func NewAnnouncementService(repo repository.AnnouncementRepository) *AnnouncementService {
	return &AnnouncementService{repo: repo}
}

func (s *AnnouncementService) List() ([]*models.Announcement, error) {
	return s.repo.FindAll()
}

func (s *AnnouncementService) Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error) {
	return s.repo.Create(adminID, input)
}

func (s *AnnouncementService) Update(id int, input models.CreateAnnouncementInput) error {
	return s.repo.Update(id, input)
}

func (s *AnnouncementService) Delete(id int) error {
	return s.repo.Delete(id)
}
```

- [ ] **Step 2: Write testimonial_service.go**

```go
// backend/internal/services/testimonial_service.go
package services

import (
	"idealink/internal/models"
	"idealink/internal/repository"
)

type TestimonialService struct {
	repo repository.TestimonialRepository
}

func NewTestimonialService(repo repository.TestimonialRepository) *TestimonialService {
	return &TestimonialService{repo: repo}
}

func (s *TestimonialService) ListActive() ([]*models.Testimonial, error) {
	return s.repo.FindActive()
}

func (s *TestimonialService) Toggle(id int) (*models.Testimonial, error) {
	return s.repo.ToggleActive(id)
}

func (s *TestimonialService) CreateFromSuggestion(suggestionID int, name, department, message string) (*models.Testimonial, error) {
	return s.repo.Create(suggestionID, name, department, message)
}
```

- [ ] **Step 3: Write suggestion_service.go**

```go
// backend/internal/services/suggestion_service.go
package services

import (
	"errors"
	"idealink/internal/models"
	"idealink/internal/repository"
)

type SuggestionService struct {
	repo     repository.SuggestionRepository
	userRepo repository.UserRepository
	testRepo repository.TestimonialRepository
}

func NewSuggestionService(
	repo repository.SuggestionRepository,
	userRepo repository.UserRepository,
	testRepo repository.TestimonialRepository,
) *SuggestionService {
	return &SuggestionService{repo: repo, userRepo: userRepo, testRepo: testRepo}
}

func (s *SuggestionService) Submit(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error) {
	if input.Department != "Registrar" && input.Department != "Accounting Office" {
		return nil, errors.New("department must be 'Registrar' or 'Accounting Office'")
	}
	return s.repo.Create(userID, input)
}

func (s *SuggestionService) ListForRole(userID int, role string) ([]*models.Suggestion, error) {
	switch role {
	case "admin":
		return s.repo.FindAll()
	case "registrar":
		return s.repo.FindByDepartment("Registrar")
	case "accounting":
		return s.repo.FindByDepartment("Accounting Office")
	default:
		return s.repo.FindByUserID(userID)
	}
}

func (s *SuggestionService) UpdateStatus(id int, status string) error {
	if status != "Pending" && status != "Reviewed" {
		return errors.New("status must be 'Pending' or 'Reviewed'")
	}
	return s.repo.UpdateStatus(id, status)
}

func (s *SuggestionService) Feature(suggestionID int) (*models.Testimonial, error) {
	suggestion, err := s.repo.FindByID(suggestionID)
	if err != nil {
		return nil, err
	}
	if suggestion == nil {
		return nil, errors.New("suggestion not found")
	}
	name := "Anonymous"
	if !suggestion.Anonymous && suggestion.SubmitterName != "" {
		name = suggestion.SubmitterName
	}
	return s.testRepo.Create(suggestionID, name, suggestion.Department, suggestion.Description)
}
```

- [ ] **Step 4: Write announcements.go handler**

```go
// backend/internal/handlers/announcements.go
package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type AnnouncementHandler struct {
	svc *services.AnnouncementService
}

func NewAnnouncementHandler(svc *services.AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{svc: svc}
}

func (h *AnnouncementHandler) List(c *gin.Context) {
	list, err := h.svc.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Announcement{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *AnnouncementHandler) Create(c *gin.Context) {
	adminID, _ := c.Get("userID")
	var input models.CreateAnnouncementInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ann, err := h.svc.Create(adminID.(int), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ann)
}

func (h *AnnouncementHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input models.CreateAnnouncementInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Update(id, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}

func (h *AnnouncementHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
```

- [ ] **Step 5: Write testimonials.go handler**

```go
// backend/internal/handlers/testimonials.go
package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type TestimonialHandler struct {
	svc *services.TestimonialService
}

func NewTestimonialHandler(svc *services.TestimonialService) *TestimonialHandler {
	return &TestimonialHandler{svc: svc}
}

func (h *TestimonialHandler) List(c *gin.Context) {
	list, err := h.svc.ListActive()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Testimonial{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *TestimonialHandler) Toggle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	t, err := h.svc.Toggle(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, t)
}
```

- [ ] **Step 6: Write suggestions.go handler**

```go
// backend/internal/handlers/suggestions.go
package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type SuggestionHandler struct {
	svc *services.SuggestionService
}

func NewSuggestionHandler(svc *services.SuggestionService) *SuggestionHandler {
	return &SuggestionHandler{svc: svc}
}

func (h *SuggestionHandler) Submit(c *gin.Context) {
	userID, _ := c.Get("userID")
	var input models.CreateSuggestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	suggestion, err := h.svc.Submit(userID.(int), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, suggestion)
}

func (h *SuggestionHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	list, err := h.svc.ListForRole(userID.(int), role.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Suggestion{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *SuggestionHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input models.UpdateStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.UpdateStatus(id, input.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status updated"})
}

func (h *SuggestionHandler) Feature(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	testimonial, err := h.svc.Feature(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, testimonial)
}
```

- [ ] **Step 7: Write admin.go handler**

```go
// backend/internal/handlers/admin.go
package handlers

import (
	"net/http"

	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	suggestionRepo repository.SuggestionRepository
	userRepo       repository.UserRepository
}

func NewAdminHandler(suggestionRepo repository.SuggestionRepository, userRepo repository.UserRepository) *AdminHandler {
	return &AdminHandler{suggestionRepo: suggestionRepo, userRepo: userRepo}
}

func (h *AdminHandler) Analytics(c *gin.Context) {
	analytics, err := h.suggestionRepo.GetAnalytics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	userCount, err := h.userRepo.CountUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	analytics.TotalUsers = userCount
	c.JSON(http.StatusOK, analytics)
}
```

- [ ] **Step 8: Compile all handlers**

```bash
cd backend
go build ./internal/...
```
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/services/ backend/internal/handlers/
git commit -m "feat: add announcement, testimonial, suggestion services and handlers"
```

---

### Task 12: Wire main.go and verify server starts

**Files:**
- Create: `backend/cmd/main.go`

- [ ] **Step 1: Write main.go**

```go
// backend/cmd/main.go
package main

import (
	"log"

	"idealink/internal/config"
	"idealink/internal/handlers"
	"idealink/internal/middleware"
	"idealink/internal/repository"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	db := config.ConnectDB(cfg.DatabaseURL)
	defer db.Close()

	// Repositories
	userRepo := repository.NewUserRepo(db)
	suggestionRepo := repository.NewSuggestionRepo(db)
	announcementRepo := repository.NewAnnouncementRepo(db)
	testimonialRepo := repository.NewTestimonialRepo(db)

	// Services
	authSvc := services.NewAuthService(userRepo, cfg.JWTSecret)
	announcementSvc := services.NewAnnouncementService(announcementRepo)
	testimonialSvc := services.NewTestimonialService(testimonialRepo)
	suggestionSvc := services.NewSuggestionService(suggestionRepo, userRepo, testimonialRepo)

	// Handlers
	authH := handlers.NewAuthHandler(authSvc)
	announcementH := handlers.NewAnnouncementHandler(announcementSvc)
	testimonialH := handlers.NewTestimonialHandler(testimonialSvc)
	suggestionH := handlers.NewSuggestionHandler(suggestionSvc)
	adminH := handlers.NewAdminHandler(suggestionRepo, userRepo)

	// Router
	r := gin.Default()
	r.Use(middleware.CORS(cfg.FrontendURL))

	auth := r.Group("/api/auth")
	{
		auth.POST("/signup", authH.Signup)
		auth.POST("/login", authH.Login)
		auth.POST("/admin/login", authH.AdminLogin)
		auth.POST("/registrar/login", authH.RegistrarLogin)
		auth.POST("/accounting/login", authH.AccountingLogin)
		auth.POST("/logout", authH.Logout)
		auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authH.Me)
	}

	api := r.Group("/api")
	{
		// Public
		api.GET("/announcements", announcementH.List)
		api.GET("/testimonials", testimonialH.List)

		// Admin only
		admin := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin"))
		{
			admin.POST("/announcements", announcementH.Create)
			admin.PUT("/announcements/:id", announcementH.Update)
			admin.DELETE("/announcements/:id", announcementH.Delete)
			admin.PATCH("/testimonials/:id/toggle", testimonialH.Toggle)
			admin.POST("/suggestions/:id/feature", suggestionH.Feature)
			admin.GET("/admin/analytics", adminH.Analytics)
		}

		// User only
		user := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "user"))
		{
			user.POST("/suggestions", suggestionH.Submit)
		}

		// Authenticated (user + admin + registrar + accounting) — role-filtered inside handler
		authenticated := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "user", "admin", "registrar", "accounting"))
		{
			authenticated.GET("/suggestions", suggestionH.List)
		}

		// Admin + registrar + accounting
		staff := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin", "registrar", "accounting"))
		{
			staff.PATCH("/suggestions/:id/status", suggestionH.UpdateStatus)
		}
	}

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
```

- [ ] **Step 2: Build the binary**

```bash
cd backend
go build ./cmd/...
```
Expected: no output (binary produced at `./cmd/main`).

- [ ] **Step 3: Run all tests**

```bash
cd backend
go test ./... -v 2>&1 | tail -20
```
Expected: all tests pass, no failures.

- [ ] **Step 4: Commit**

```bash
git add backend/cmd/main.go
git commit -m "feat: wire all dependencies and register API routes in main.go"
```

---

### Task 13: Seed admin account for local dev

**Files:**
- Create: `backend/cmd/seed/main.go`

- [ ] **Step 1: Write seed script**

```go
// backend/cmd/seed/main.go
package main

import (
	"fmt"
	"log"

	"idealink/internal/config"
	"idealink/internal/repository"
	"idealink/internal/services"
)

func main() {
	cfg := config.Load()
	db := config.ConnectDB(cfg.DatabaseURL)
	defer db.Close()

	userRepo := repository.NewUserRepo(db)
	svc := services.NewAuthService(userRepo, cfg.JWTSecret)

	hashed, err := svc.HashPassword("admin123")
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(
		`INSERT INTO admin_accounts (fullname, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
		"Admin", "admin@idealink.com", hashed,
	)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(
		`INSERT INTO registrar_accounts (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
		"registrar", hashed,
	)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(
		`INSERT INTO accounting_accounts (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
		"accounting", hashed,
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Seed complete. Admin: admin@idealink.com / admin123, Registrar: registrar / admin123, Accounting: accounting / admin123")
}
```

- [ ] **Step 2: Run seed (requires local PostgreSQL running)**

```bash
cd backend
go run ./cmd/seed/main.go
```
Expected: `Seed complete. Admin: admin@idealink.com / admin123 ...`

- [ ] **Step 3: Commit**

```bash
git add backend/cmd/seed/main.go
git commit -m "feat: add seed script for local admin/registrar/accounting accounts"
```

---

### Task 14: Smoke test the running server

- [ ] **Step 1: Start local PostgreSQL and create database**

```bash
createdb idealink_dev
```

- [ ] **Step 2: Start the server**

```bash
cd backend
go run ./cmd/main.go
```
Expected: `Migrations applied` then `Server starting on :8080`

- [ ] **Step 3: Test public announcements endpoint**

```bash
curl -s http://localhost:8080/api/announcements
```
Expected: `[]` (empty array, no error)

- [ ] **Step 4: Test signup**

```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullname":"Test User"}'
```
Expected: JSON with `"email":"test@test.com"` and a `Set-Cookie: token=...` header

- [ ] **Step 5: Test /api/auth/me with cookie**

```bash
curl -s -b /tmp/cookies.txt http://localhost:8080/api/auth/me
```
Expected: `{"user_id":1,"role":"user"}`

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: verify backend smoke tests pass locally"
```
