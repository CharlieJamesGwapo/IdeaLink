# Group D-mini Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a horizontal-bar rating distribution inside each Service Rating card on `/admin/dashboard`, and ship a database-backed service catalog (with `/admin/services` admin UI) that replaces the hardcoded service arrays in `SubmitPage.tsx`.

**Architecture:**
- D1 is frontend-only — `RatingsPanel.tsx` already receives the `breakdown` per group, we just render it.
- D2 adds a `services` table (migration 015) with admin CRUD endpoints (`GET/POST/PATCH/DELETE /api/admin/services`) and a public read endpoint (`GET /api/services?department=X`). The `SubmitPage` step 2 fetches services dynamically. Admins manage the catalog at `/admin/services`. Soft-delete preserves rating history (suggestions store the label as a string snapshot).
- No new third-party deps. Icon picker uses 20 curated Lucide icons already in the bundle.

**Tech Stack:** Go 1.21+, Gin, PostgreSQL; React 18 + TypeScript + axios + react-router-dom + sonner toasts + lucide-react.

**Spec:** [`docs/superpowers/specs/2026-04-27-group-d-mini-design.md`](../specs/2026-04-27-group-d-mini-design.md)

---

## File Map

**Backend (new):**
- `backend/internal/migrations/015_services.sql` — table, index, seed.
- `backend/internal/models/service.go` — `Service`, `CreateServiceInput`, `UpdateServiceInput`.
- `backend/internal/repository/service_repo.go` — `ServiceRepo` struct + 5 methods.
- `backend/internal/handlers/services.go` — `ServicesHandler` struct + 5 handler methods.
- `backend/internal/handlers/services_test.go` — handler tests with mock repo.

**Backend (modified):**
- `backend/internal/migrations/migrations.go` — embed `015_services.sql`.
- `backend/internal/config/db.go` — execute migration after `UserGradeLevelSQL`.
- `backend/internal/repository/interfaces.go` — add `ServiceRepository` interface.
- `backend/cmd/main.go` — wire repo, handler, routes.

**Frontend (new):**
- `frontend/src/api/services.ts` — typed API client.
- `frontend/src/lib/serviceIcons.tsx` — icon registry + `<ServiceIcon>` component.
- `frontend/src/pages/admin/AdminServicesPage.tsx` — admin catalog page.

**Frontend (modified):**
- `frontend/src/components/shared/RatingsPanel.tsx` — D1 chart (horizontal bars per card).
- `frontend/src/components/layout/Sidebar.tsx` — add "Services" admin nav entry.
- `frontend/src/pages/user/SubmitPage.tsx` — delete hardcoded arrays, fetch services from API.
- `frontend/src/router.tsx` — register `/admin/services`.

---

## Conventions

- **Run from the repo root** (`/Users/a1234/IdeaLink`) unless otherwise specified.
- **Backend:** `cd backend && go test ./...` and `cd backend && go build ./...`.
- **Frontend:** `cd frontend && npx tsc --noEmit`, `cd frontend && npx vitest run`, and `cd frontend && npm run build` (the **strict** build that catches missing properties).
- **Commit after each task** with a short imperative subject.
- **Plan-confidence checkpoint:** When a task touches multiple call sites of an interface, run `npm run build` (not just `tsc --noEmit`) to catch the strict checks; the dev `tsc` config is loose and missed Group B's setAuth issues.

---

## Section 1 — Migration & Model

### Task 1: Add migration 015 (services table + seed) and wire it

**Files:**
- Create: `backend/internal/migrations/015_services.sql`
- Modify: `backend/internal/migrations/migrations.go`
- Modify: `backend/internal/config/db.go`

- [ ] **Step 1: Create the migration**

Path: `backend/internal/migrations/015_services.sql`

```sql
-- 015_services.sql
-- Service catalog managed by admin. Replaces hardcoded arrays in SubmitPage.

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  department    TEXT NOT NULL CHECK (department IN ('Registrar Office', 'Finance Office')),
  label         TEXT NOT NULL,
  icon_name     TEXT NOT NULL DEFAULT 'HelpCircle',
  display_order INT  NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department, label)
);

CREATE INDEX IF NOT EXISTS services_dept_active_order_idx
  ON services (department, is_active, display_order);

-- Seed the 16 currently-hardcoded services so prod isn't suddenly empty.
-- ON CONFLICT lets the migration be re-run idempotently.
INSERT INTO services (department, label, icon_name, display_order) VALUES
  ('Registrar Office', 'Enrollment / Registration',  'BookOpen',     1),
  ('Registrar Office', 'Transcript of Records (TOR)','FileText',     2),
  ('Registrar Office', 'Certificate of Enrollment',  'Award',        3),
  ('Registrar Office', 'Good Moral Certificate',     'Shield',       4),
  ('Registrar Office', 'Diploma & Authentication',   'Award',        5),
  ('Registrar Office', 'ID Issuance',                'CreditCard',   6),
  ('Registrar Office', 'Shifting / Cross-enrollment','Shuffle',      7),
  ('Registrar Office', 'Other Registrar Concern',    'HelpCircle',   8),
  ('Finance Office',   'Tuition Fee Payment',        'DollarSign',   1),
  ('Finance Office',   'Scholarship / Financial Aid','GraduationCap', 2),
  ('Finance Office',   'Fee Assessment',             'Receipt',      3),
  ('Finance Office',   'Clearance Processing',       'CheckCircle2', 4),
  ('Finance Office',   'Refund Request',             'RotateCcw',    5),
  ('Finance Office',   'Receipt Re-issuance',        'FileText',     6),
  ('Finance Office',   'Billing Dispute',            'AlertTriangle', 7),
  ('Finance Office',   'Other Accounting Concern',   'HelpCircle',   8)
  ON CONFLICT (department, label) DO NOTHING;
```

- [ ] **Step 2: Embed in migrations.go**

In `backend/internal/migrations/migrations.go`, append after the `UserGradeLevelSQL` block:

```go
//go:embed 015_services.sql
var ServicesSQL string
```

- [ ] **Step 3: Wire into db.go**

In `backend/internal/config/db.go`, find this block:

```go
if _, err := db.Exec(migrations.UserGradeLevelSQL); err != nil {
    log.Fatalf("failed to run user_grade_level migration: %v", err)
}
```

Add immediately after it (before `log.Println("Migrations applied")`):

```go
if _, err := db.Exec(migrations.ServicesSQL); err != nil {
    log.Fatalf("failed to run services migration: %v", err)
}
```

- [ ] **Step 4: Verify build**

```bash
cd backend && go build ./...
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/migrations/015_services.sql \
        backend/internal/migrations/migrations.go \
        backend/internal/config/db.go
git commit -m "feat(db): migration 015 — services catalog table + seed"
```

---

### Task 2: Add Service model

**Files:**
- Create: `backend/internal/models/service.go`

- [ ] **Step 1: Create the model file**

Path: `backend/internal/models/service.go`

```go
package models

import "time"

// Service represents one row in the admin-managed service catalog.
// Suggestions store service_category as a free-text snapshot, so renaming
// or disabling a Service does not retroactively rewrite past rows.
type Service struct {
	ID           int       `json:"id"`
	Department   string    `json:"department"`
	Label        string    `json:"label"`
	IconName     string    `json:"icon_name"`
	DisplayOrder int       `json:"display_order"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreateServiceInput is the shape POST /api/admin/services accepts.
type CreateServiceInput struct {
	Department   string `json:"department"    binding:"required,oneof='Registrar Office' 'Finance Office'"`
	Label        string `json:"label"         binding:"required,min=2,max=100"`
	IconName     string `json:"icon_name"     binding:"required"`
	DisplayOrder int    `json:"display_order"`
}

// UpdateServiceInput is the shape PATCH /api/admin/services/:id accepts.
// Every field is optional — only non-nil fields get written.
type UpdateServiceInput struct {
	Department   *string `json:"department,omitempty"`
	Label        *string `json:"label,omitempty"`
	IconName     *string `json:"icon_name,omitempty"`
	DisplayOrder *int    `json:"display_order,omitempty"`
	IsActive     *bool   `json:"is_active,omitempty"`
}
```

- [ ] **Step 2: Verify build**

```bash
cd backend && go build ./...
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/models/service.go
git commit -m "feat(models): Service + Create/UpdateServiceInput"
```

---

## Section 2 — Repository

### Task 3: ServiceRepository interface + implementation

**Files:**
- Modify: `backend/internal/repository/interfaces.go`
- Create: `backend/internal/repository/service_repo.go`

- [ ] **Step 1: Add interface**

In `backend/internal/repository/interfaces.go`, append:

```go
type ServiceRepository interface {
	ListByDepartment(department string, activeOnly bool) ([]*models.Service, error)
	ListAll() ([]*models.Service, error)
	FindByID(id int) (*models.Service, error)
	Create(in models.CreateServiceInput) (*models.Service, error)
	Update(id int, in models.UpdateServiceInput) (*models.Service, error)
}
```

(`models` is already imported in `interfaces.go`.)

- [ ] **Step 2: Implement repo**

Path: `backend/internal/repository/service_repo.go`

```go
package repository

import (
	"database/sql"
	"errors"
	"strconv"
	"strings"

	"github.com/lib/pq"

	"idealink/internal/models"
)

// ErrServiceLabelConflict is returned by Create/Update when a (department, label)
// pair would collide with an existing row.
var ErrServiceLabelConflict = errors.New("service label already exists for this department")

type ServiceRepo struct {
	db *sql.DB
}

func NewServiceRepo(db *sql.DB) *ServiceRepo {
	return &ServiceRepo{db: db}
}

const selectServices = `
	SELECT id, department, label, icon_name, display_order, is_active, created_at, updated_at
	FROM services `

func scanService(row interface {
	Scan(...interface{}) error
}) (*models.Service, error) {
	var s models.Service
	err := row.Scan(
		&s.ID, &s.Department, &s.Label, &s.IconName, &s.DisplayOrder,
		&s.IsActive, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ServiceRepo) ListByDepartment(department string, activeOnly bool) ([]*models.Service, error) {
	q := selectServices + `WHERE department = $1`
	args := []interface{}{department}
	if activeOnly {
		q += ` AND is_active = TRUE`
	}
	q += ` ORDER BY display_order ASC, label ASC`
	rows, err := r.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*models.Service, 0)
	for rows.Next() {
		s, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ServiceRepo) ListAll() ([]*models.Service, error) {
	rows, err := r.db.Query(selectServices + `ORDER BY department ASC, display_order ASC, label ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*models.Service, 0)
	for rows.Next() {
		s, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ServiceRepo) FindByID(id int) (*models.Service, error) {
	row := r.db.QueryRow(selectServices+`WHERE id = $1`, id)
	s, err := scanService(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *ServiceRepo) Create(in models.CreateServiceInput) (*models.Service, error) {
	row := r.db.QueryRow(
		`INSERT INTO services (department, label, icon_name, display_order)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, department, label, icon_name, display_order, is_active, created_at, updated_at`,
		in.Department, in.Label, in.IconName, in.DisplayOrder,
	)
	s, err := scanService(row)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, ErrServiceLabelConflict
		}
		return nil, err
	}
	return s, nil
}

// Update applies a partial patch. Only non-nil fields in `in` are written.
// Returns nil + ErrSomething if no fields were sent (caller should validate first).
func (r *ServiceRepo) Update(id int, in models.UpdateServiceInput) (*models.Service, error) {
	sets := []string{}
	args := []interface{}{}
	idx := 1
	if in.Department != nil {
		sets = append(sets, "department = $"+strconv.Itoa(idx))
		args = append(args, *in.Department)
		idx++
	}
	if in.Label != nil {
		sets = append(sets, "label = $"+strconv.Itoa(idx))
		args = append(args, *in.Label)
		idx++
	}
	if in.IconName != nil {
		sets = append(sets, "icon_name = $"+strconv.Itoa(idx))
		args = append(args, *in.IconName)
		idx++
	}
	if in.DisplayOrder != nil {
		sets = append(sets, "display_order = $"+strconv.Itoa(idx))
		args = append(args, *in.DisplayOrder)
		idx++
	}
	if in.IsActive != nil {
		sets = append(sets, "is_active = $"+strconv.Itoa(idx))
		args = append(args, *in.IsActive)
		idx++
	}
	if len(sets) == 0 {
		// Nothing to update — return current row.
		return r.FindByID(id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := `UPDATE services SET ` + strings.Join(sets, ", ") +
		` WHERE id = $` + strconv.Itoa(idx) +
		` RETURNING id, department, label, icon_name, display_order, is_active, created_at, updated_at`
	row := r.db.QueryRow(q, args...)
	s, err := scanService(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, ErrServiceLabelConflict
		}
		return nil, err
	}
	return s, nil
}
```

- [ ] **Step 3: Verify build**

```bash
cd backend && go build ./...
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/interfaces.go \
        backend/internal/repository/service_repo.go
git commit -m "feat(repo): ServiceRepo with partial-update + 23505 conflict mapping"
```

---

## Section 3 — Handlers

### Task 4: Handlers — `GET /api/services` + `GET /api/admin/services` (TDD)

**Files:**
- Create: `backend/internal/handlers/services.go`
- Create: `backend/internal/handlers/services_test.go`

- [ ] **Step 1: Write failing tests for the two list endpoints**

Path: `backend/internal/handlers/services_test.go`

```go
package handlers_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"idealink/internal/handlers"
	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- mockServiceRepo ---

type mockServiceRepo struct {
	listByDepartmentResult []*models.Service
	listByDepartmentErr    error
	listAllResult          []*models.Service
	listAllErr             error
	findByIDResult         *models.Service
	findByIDErr            error
	createResult           *models.Service
	createErr              error
	updateResult           *models.Service
	updateErr              error

	// Spies
	lastCreate models.CreateServiceInput
	lastUpdate models.UpdateServiceInput
	lastUpdateID int
}

func (m *mockServiceRepo) ListByDepartment(dept string, activeOnly bool) ([]*models.Service, error) {
	return m.listByDepartmentResult, m.listByDepartmentErr
}
func (m *mockServiceRepo) ListAll() ([]*models.Service, error) {
	return m.listAllResult, m.listAllErr
}
func (m *mockServiceRepo) FindByID(id int) (*models.Service, error) {
	return m.findByIDResult, m.findByIDErr
}
func (m *mockServiceRepo) Create(in models.CreateServiceInput) (*models.Service, error) {
	m.lastCreate = in
	return m.createResult, m.createErr
}
func (m *mockServiceRepo) Update(id int, in models.UpdateServiceInput) (*models.Service, error) {
	m.lastUpdateID = id
	m.lastUpdate = in
	return m.updateResult, m.updateErr
}

// setupServicesRouter builds a Gin router that:
//   - exposes GET /api/services (with admin role injected so middleware passes)
//   - exposes GET/POST/PATCH/DELETE /api/admin/services (admin-only)
// We inject role/userID via context so the test doesn't need to drive the JWT
// middleware — same pattern as auth_test.go's setupAuthRouter.
func setupServicesRouter(repo repository.ServiceRepository) *gin.Engine {
	gin.SetMode(gin.TestMode)
	h := handlers.NewServicesHandler(repo)
	r := gin.New()
	mw := func(c *gin.Context) {
		c.Set(middleware.CtxKeyUserID, 1)
		c.Set(middleware.CtxKeyRole, services.RoleAdmin)
		c.Next()
	}
	r.GET("/api/services", mw, h.List)
	r.GET("/api/admin/services", mw, h.AdminList)
	r.POST("/api/admin/services", mw, h.Create)
	r.PATCH("/api/admin/services/:id", mw, h.Update)
	r.DELETE("/api/admin/services/:id", mw, h.Delete)
	return r
}

func sampleService(id int, label string, active bool) *models.Service {
	return &models.Service{
		ID: id, Department: "Registrar Office", Label: label,
		IconName: "BookOpen", DisplayOrder: id, IsActive: active,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
}

func TestServicesHandler_List_FiltersByDepartment(t *testing.T) {
	repo := &mockServiceRepo{
		listByDepartmentResult: []*models.Service{
			sampleService(1, "Enrollment / Registration", true),
		},
	}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/services?department=Registrar%20Office", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var out []*models.Service
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Len(t, out, 1)
	assert.Equal(t, "Enrollment / Registration", out[0].Label)
}

func TestServicesHandler_List_RequiresDepartmentParam(t *testing.T) {
	r := setupServicesRouter(&mockServiceRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/services", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestServicesHandler_AdminList_ReturnsAll(t *testing.T) {
	repo := &mockServiceRepo{
		listAllResult: []*models.Service{
			sampleService(1, "Active", true),
			sampleService(2, "Disabled", false),
		},
	}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/admin/services", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var out []*models.Service
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Len(t, out, 2)
}

func TestServicesHandler_AdminList_RepoError(t *testing.T) {
	repo := &mockServiceRepo{listAllErr: errors.New("db down")}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/admin/services", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

// Stubs so the build compiles even though Create/Update/Delete tests live in later tasks.
// (Empty body POST will hit the binding error path or proceed — covered by their tasks.)
var _ = bytes.NewBufferString
```

- [ ] **Step 2: Run to confirm compile failure**

```bash
cd backend && go test ./internal/handlers/... -run TestServicesHandler 2>&1 | head -10
```

Expected: compile error `handlers.NewServicesHandler undefined`.

- [ ] **Step 3: Implement the handlers**

Path: `backend/internal/handlers/services.go`

```go
package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type ServicesHandler struct {
	repo repository.ServiceRepository
}

func NewServicesHandler(repo repository.ServiceRepository) *ServicesHandler {
	return &ServicesHandler{repo: repo}
}

// GET /api/services?department=Registrar%20Office
// Returns active services for one department. Used by SubmitPage step 2.
func (h *ServicesHandler) List(c *gin.Context) {
	dept := c.Query("department")
	if dept == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "department query param is required"})
		return
	}
	out, err := h.repo.ListByDepartment(dept, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list services"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// GET /api/admin/services
// Returns ALL services (incl. inactive). Used by AdminServicesPage.
func (h *ServicesHandler) AdminList(c *gin.Context) {
	out, err := h.repo.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list services"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// Create / Update / Delete are added in subsequent tasks.

func (h *ServicesHandler) Create(c *gin.Context) {
	var input models.CreateServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.repo.Create(input)
	if err != nil {
		if errors.Is(err, repository.ErrServiceLabelConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "a service with that label already exists in this department"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create service"})
		return
	}
	c.JSON(http.StatusCreated, out)
}

func (h *ServicesHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input models.UpdateServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.repo.Update(id, input)
	if err != nil {
		if errors.Is(err, repository.ErrServiceLabelConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "a service with that label already exists in this department"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update service"})
		return
	}
	if out == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *ServicesHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	inactive := false
	out, err := h.repo.Update(id, models.UpdateServiceInput{IsActive: &inactive})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disable service"})
		return
	}
	if out == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	c.JSON(http.StatusOK, out)
}
```

> Note: I'm including all 5 handler methods in this task because they share the struct and the test file's `setupServicesRouter` already wires all routes. Tests for Create/Update/Delete arrive in later tasks; for now they exist but aren't exercised.

- [ ] **Step 4: Run the list tests**

```bash
cd backend && go test ./internal/handlers/... -run TestServicesHandler_List_ -v 2>&1 | tail -20
cd backend && go test ./internal/handlers/... -run TestServicesHandler_AdminList -v 2>&1 | tail -20
```

Expected: all 4 list-related tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handlers/services.go \
        backend/internal/handlers/services_test.go
git commit -m "feat(api): GET /api/services + GET /api/admin/services + handler skeletons"
```

---

### Task 5: Handler — `POST /api/admin/services` (Create with 409)

**Files:**
- Modify: `backend/internal/handlers/services_test.go`

(Implementation already landed in Task 4 — this task adds the tests that exercise the conflict and validation paths.)

- [ ] **Step 1: Append tests**

In `backend/internal/handlers/services_test.go`, append:

```go
func TestServicesHandler_Create_Success(t *testing.T) {
	repo := &mockServiceRepo{
		createResult: sampleService(99, "New Service", true),
	}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	body := `{"department":"Registrar Office","label":"New Service","icon_name":"BookOpen","display_order":9}`
	req, _ := http.NewRequest("POST", "/api/admin/services", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Equal(t, "Registrar Office", repo.lastCreate.Department)
	assert.Equal(t, "New Service",       repo.lastCreate.Label)
	assert.Equal(t, "BookOpen",          repo.lastCreate.IconName)
	assert.Equal(t, 9,                   repo.lastCreate.DisplayOrder)
}

func TestServicesHandler_Create_DuplicateLabel(t *testing.T) {
	repo := &mockServiceRepo{createErr: repository.ErrServiceLabelConflict}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	body := `{"department":"Registrar Office","label":"Dup","icon_name":"BookOpen"}`
	req, _ := http.NewRequest("POST", "/api/admin/services", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestServicesHandler_Create_BadDepartment(t *testing.T) {
	r := setupServicesRouter(&mockServiceRepo{})
	w := httptest.NewRecorder()
	body := `{"department":"Bogus","label":"x","icon_name":"BookOpen"}`
	req, _ := http.NewRequest("POST", "/api/admin/services", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestServicesHandler_Create_LabelTooShort(t *testing.T) {
	r := setupServicesRouter(&mockServiceRepo{})
	w := httptest.NewRecorder()
	body := `{"department":"Registrar Office","label":"x","icon_name":"BookOpen"}`
	req, _ := http.NewRequest("POST", "/api/admin/services", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/handlers/... -run TestServicesHandler_Create -v 2>&1 | tail -15
```

Expected: 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/handlers/services_test.go
git commit -m "test(api): POST /api/admin/services — success, conflict, validation"
```

---

### Task 6: Handler — `PATCH /api/admin/services/:id` (Update partial-patch)

**Files:**
- Modify: `backend/internal/handlers/services_test.go`

- [ ] **Step 1: Append tests**

```go
func TestServicesHandler_Update_PartialPatch(t *testing.T) {
	repo := &mockServiceRepo{
		updateResult: sampleService(7, "Renamed", true),
	}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	body := `{"label":"Renamed"}`
	req, _ := http.NewRequest("PATCH", "/api/admin/services/7", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, 7, repo.lastUpdateID)
	require.NotNil(t, repo.lastUpdate.Label)
	assert.Equal(t, "Renamed", *repo.lastUpdate.Label)
	assert.Nil(t, repo.lastUpdate.Department)
	assert.Nil(t, repo.lastUpdate.IconName)
}

func TestServicesHandler_Update_NotFound(t *testing.T) {
	repo := &mockServiceRepo{updateResult: nil} // simulates id not in DB
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PATCH", "/api/admin/services/9999", bytes.NewBufferString(`{"label":"X new"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestServicesHandler_Update_DuplicateLabel(t *testing.T) {
	repo := &mockServiceRepo{updateErr: repository.ErrServiceLabelConflict}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PATCH", "/api/admin/services/3", bytes.NewBufferString(`{"label":"existing"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestServicesHandler_Update_InvalidID(t *testing.T) {
	r := setupServicesRouter(&mockServiceRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PATCH", "/api/admin/services/abc", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/handlers/... -run TestServicesHandler_Update -v 2>&1 | tail -15
```

Expected: 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/handlers/services_test.go
git commit -m "test(api): PATCH /api/admin/services/:id — partial patch + 404 + 409"
```

---

### Task 7: Handler — `DELETE /api/admin/services/:id` (Soft-delete)

**Files:**
- Modify: `backend/internal/handlers/services_test.go`

- [ ] **Step 1: Append tests**

```go
func TestServicesHandler_Delete_SoftDeletes(t *testing.T) {
	disabled := sampleService(5, "Soon-to-be-disabled", false)
	repo := &mockServiceRepo{updateResult: disabled}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/services/5", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.NotNil(t, repo.lastUpdate.IsActive)
	assert.False(t, *repo.lastUpdate.IsActive, "DELETE must call Update with IsActive=false")
	assert.Equal(t, 5, repo.lastUpdateID)
}

func TestServicesHandler_Delete_NotFound(t *testing.T) {
	repo := &mockServiceRepo{updateResult: nil}
	r := setupServicesRouter(repo)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/services/9999", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestServicesHandler_Delete_InvalidID(t *testing.T) {
	r := setupServicesRouter(&mockServiceRepo{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/admin/services/xyz", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
```

- [ ] **Step 2: Run**

```bash
cd backend && go test ./internal/handlers/... -run TestServicesHandler_Delete -v 2>&1 | tail -15
```

Expected: 3 PASS.

- [ ] **Step 3: Run the entire services handler test set + the full handlers package**

```bash
cd backend && go test ./internal/handlers/... -v 2>&1 | tail -25
```

Expected: all `TestServicesHandler_*` (~15) and pre-existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handlers/services_test.go
git commit -m "test(api): DELETE /api/admin/services/:id soft-delete + 404"
```

---

## Section 4 — Wiring

### Task 8: Wire repo, handler, and routes in `main.go`

**Files:**
- Modify: `backend/cmd/main.go`

- [ ] **Step 1: Add repo + handler instances**

In `backend/cmd/main.go`:

After the line:

```go
emailLogRepo := repository.NewEmailLogRepo(db)
```

Add:

```go
serviceRepo := repository.NewServiceRepo(db)
```

After the line:

```go
adminEmailLogsH := handlers.NewAdminEmailLogsHandler(emailLogRepo)
```

Add:

```go
servicesH := handlers.NewServicesHandler(serviceRepo)
```

- [ ] **Step 2: Add public route**

Find the `authenticated := api.Group(...)` block (around line 120). Inside its braces (after the existing `authenticated.GET(...)` lines), add:

```go
authenticated.GET("/services", servicesH.List)
```

This puts `GET /api/services` behind any-role auth — students and staff can both see the list. (We use the existing `authenticated` group rather than adding a new one because the access pattern is identical: any logged-in role.)

- [ ] **Step 3: Add admin routes**

Find the `admin := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin"))` block (around line 91). Inside its braces (after `admin.GET("/admin/email-logs", ...)`), add:

```go
admin.GET("/admin/services",       servicesH.AdminList)
admin.POST("/admin/services",      servicesH.Create)
admin.PATCH("/admin/services/:id", servicesH.Update)
admin.DELETE("/admin/services/:id",servicesH.Delete)
```

- [ ] **Step 4: Verify build + run all tests**

```bash
cd backend && go build ./... && go test ./...
```

Expected: clean build, all packages pass.

- [ ] **Step 5: Commit**

```bash
git add backend/cmd/main.go
git commit -m "feat(api): register service catalog routes"
```

---

## Section 5 — Frontend

### Task 9: API client + types

**Files:**
- Create: `frontend/src/api/services.ts`

- [ ] **Step 1: Create the file**

Path: `frontend/src/api/services.ts`

```ts
import client from './client'

export type Department = 'Registrar Office' | 'Finance Office'

export interface Service {
  id: number
  department: Department
  label: string
  icon_name: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateServiceInput {
  department: Department
  label: string
  icon_name: string
  display_order: number
}

export type UpdateServicePatch = Partial<{
  department: Department
  label: string
  icon_name: string
  display_order: number
  is_active: boolean
}>

export const listServices = (department: Department) =>
  client.get<Service[]>(`/api/services?department=${encodeURIComponent(department)}`)

export const adminListServices = () =>
  client.get<Service[]>('/api/admin/services')

export const createService = (body: CreateServiceInput) =>
  client.post<Service>('/api/admin/services', body)

export const updateService = (id: number, patch: UpdateServicePatch) =>
  client.patch<Service>(`/api/admin/services/${id}`, patch)

export const disableService = (id: number) =>
  client.delete<Service>(`/api/admin/services/${id}`)
```

- [ ] **Step 2: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/services.ts
git commit -m "feat(api): typed services CRUD client"
```

---

### Task 10: Icon registry + `<ServiceIcon>` component

**Files:**
- Create: `frontend/src/lib/serviceIcons.tsx`

- [ ] **Step 1: Create the file**

Path: `frontend/src/lib/serviceIcons.tsx`

```tsx
import {
  BookOpen, FileText, Award, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle,
  Building2, Calculator, Star, CheckCircle2, Tag, Mail, User, Settings,
} from 'lucide-react'
import type { ComponentType } from 'react'

// 20 curated Lucide icons available in the admin Services catalog picker.
// Order is the order shown in the icon-picker grid (5 cols × 4 rows).
export const ICON_CHOICES = [
  'BookOpen', 'FileText', 'Award', 'Shield', 'CreditCard',
  'Shuffle', 'HelpCircle', 'DollarSign', 'GraduationCap', 'Receipt',
  'RotateCcw', 'AlertTriangle', 'Building2', 'Calculator', 'Star',
  'CheckCircle2', 'Tag', 'Mail', 'User', 'Settings',
] as const

export type IconName = (typeof ICON_CHOICES)[number]

const MAP: Record<IconName, ComponentType<{ size?: number; className?: string }>> = {
  BookOpen, FileText, Award, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle,
  Building2, Calculator, Star, CheckCircle2, Tag, Mail, User, Settings,
}

interface Props {
  name: string
  size?: number
  className?: string
}

// Renders a curated Lucide icon by its registry name. Falls back to
// HelpCircle for unknown names so legacy/typoed data never crashes the UI.
export function ServiceIcon({ name, size = 16, className }: Props) {
  const Cmp = MAP[name as IconName] ?? HelpCircle
  return <Cmp size={size} className={className} />
}
```

- [ ] **Step 2: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/serviceIcons.tsx
git commit -m "feat(ui): ServiceIcon registry — 20 curated Lucide icons"
```

---

### Task 11: AdminServicesPage shell + table

**Files:**
- Create: `frontend/src/pages/admin/AdminServicesPage.tsx`

> This task scaffolds the page with the table + group sections and a "Loading…" / empty state. The Add/Edit modal arrives in Task 12 and disable/re-enable in Task 13. We split the page over three tasks because it's a meaningfully sized file.

- [ ] **Step 1: Create the page (table only — buttons stub for now)**

Path: `frontend/src/pages/admin/AdminServicesPage.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, EyeOff, Eye } from 'lucide-react'
import axios from 'axios'
import { adminListServices, type Service, type Department } from '../../api/services'
import { ServiceIcon } from '../../lib/serviceIcons'

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const refresh = () => {
    setError(null)
    adminListServices()
      .then(res => setServices(res.data))
      .catch(err => {
        setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Failed to load') : 'Failed to load')
      })
  }

  useEffect(() => { refresh() }, [])

  const grouped = useMemo(() => {
    const out: Record<Department, Service[]> = {
      'Registrar Office': [],
      'Finance Office': [],
    }
    if (!services) return out
    for (const s of services) out[s.department].push(s)
    return out
  }, [services])

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Service Catalog</h1>
          <p className="text-gray-400 text-sm font-ui mt-1">Manage the services users can rate. Disabling a service hides it from new submissions but keeps past ratings.</p>
        </div>
        <button
          type="button"
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ascb-orange/15 hover:bg-ascb-orange/25 text-ascb-orange border border-ascb-orange/30 text-sm font-semibold font-ui disabled:opacity-50"
          title="Add (wired in next task)"
        >
          <Plus size={15} /> Add Service
        </button>
      </div>

      {error && <p className="text-sm text-red-400 font-ui">{error}</p>}
      {!services && !error && <p className="text-sm text-gray-500 font-ui">Loading…</p>}

      {services && (['Registrar Office', 'Finance Office'] as Department[]).map(dept => (
        <section key={dept} className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <h2 className="px-5 py-3 text-sm font-semibold text-white font-ui border-b border-white/10">{dept}</h2>
          {grouped[dept].length === 0 ? (
            <p className="px-5 py-6 text-xs text-gray-500 font-ui">No services in this department yet.</p>
          ) : (
            <table className="w-full text-sm font-ui">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2 w-16">Order</th>
                  <th className="px-2 py-2 w-12">Icon</th>
                  <th className="px-2 py-2">Label</th>
                  <th className="px-2 py-2 w-24">Status</th>
                  <th className="px-5 py-2 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grouped[dept].map(s => (
                  <tr key={s.id} className={`border-t border-white/5 ${s.is_active ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-2.5 text-gray-400 tabular-nums">{s.display_order}</td>
                    <td className="px-2 py-2.5 text-gray-300"><ServiceIcon name={s.icon_name} size={16} /></td>
                    <td className="px-2 py-2.5 text-white truncate">{s.label}</td>
                    <td className="px-2 py-2.5">
                      {s.is_active ? (
                        <span className="text-[10px] uppercase tracking-wider text-green-400">Active</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Disabled</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        disabled
                        className="p-1.5 text-gray-500 hover:text-white disabled:opacity-50"
                        title="Edit (wired in next task)"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled
                        className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-50"
                        title={s.is_active ? 'Disable (wired in next task)' : 'Re-enable (wired in next task)'}
                      >
                        {s.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  )
}
```

> Note: this scaffold doesn't yet need `toast` — Task 12 adds it when modal submissions become real. Same for `disableService`/`updateService` (Task 13).

- [ ] **Step 2: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean type-check, Vite build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminServicesPage.tsx
git commit -m "feat(admin): AdminServicesPage shell — grouped table"
```

---

### Task 12: AdminServicesPage — Add/Edit modal

**Files:**
- Modify: `frontend/src/pages/admin/AdminServicesPage.tsx`

- [ ] **Step 1: Replace the page with the modal-equipped version**

Replace the entire contents of `frontend/src/pages/admin/AdminServicesPage.tsx` with:

```tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Pencil, EyeOff, Eye, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import {
  adminListServices, createService, updateService,
  type Service, type Department,
} from '../../api/services'
import { ServiceIcon, ICON_CHOICES, type IconName } from '../../lib/serviceIcons'

const DEPTS: Department[] = ['Registrar Office', 'Finance Office']

interface ModalState {
  open: boolean
  editing: Service | null
}

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[] | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [modal, setModal]       = useState<ModalState>({ open: false, editing: null })

  const refresh = () => {
    setError(null)
    adminListServices()
      .then(res => setServices(res.data))
      .catch(err => {
        setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Failed to load') : 'Failed to load')
      })
  }

  useEffect(() => { refresh() }, [])

  const grouped = useMemo(() => {
    const out: Record<Department, Service[]> = {
      'Registrar Office': [],
      'Finance Office': [],
    }
    if (!services) return out
    for (const s of services) out[s.department].push(s)
    return out
  }, [services])

  const openCreate = () => setModal({ open: true, editing: null })
  const openEdit   = (s: Service) => setModal({ open: true, editing: s })
  const closeModal = () => setModal({ open: false, editing: null })

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Service Catalog</h1>
          <p className="text-gray-400 text-sm font-ui mt-1">Manage the services users can rate. Disabling a service hides it from new submissions but keeps past ratings.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ascb-orange/15 hover:bg-ascb-orange/25 text-ascb-orange border border-ascb-orange/30 text-sm font-semibold font-ui transition-colors"
        >
          <Plus size={15} /> Add Service
        </button>
      </div>

      {error && <p className="text-sm text-red-400 font-ui">{error}</p>}
      {!services && !error && <p className="text-sm text-gray-500 font-ui">Loading…</p>}

      {services && DEPTS.map(dept => (
        <section key={dept} className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <h2 className="px-5 py-3 text-sm font-semibold text-white font-ui border-b border-white/10">{dept}</h2>
          {grouped[dept].length === 0 ? (
            <p className="px-5 py-6 text-xs text-gray-500 font-ui">No services in this department yet.</p>
          ) : (
            <table className="w-full text-sm font-ui">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-2 w-16">Order</th>
                  <th className="px-2 py-2 w-12">Icon</th>
                  <th className="px-2 py-2">Label</th>
                  <th className="px-2 py-2 w-24">Status</th>
                  <th className="px-5 py-2 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grouped[dept].map(s => (
                  <tr key={s.id} className={`border-t border-white/5 ${s.is_active ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-2.5 text-gray-400 tabular-nums">{s.display_order}</td>
                    <td className="px-2 py-2.5 text-gray-300"><ServiceIcon name={s.icon_name} size={16} /></td>
                    <td className="px-2 py-2.5 text-white truncate">{s.label}</td>
                    <td className="px-2 py-2.5">
                      {s.is_active ? (
                        <span className="text-[10px] uppercase tracking-wider text-green-400">Active</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Disabled</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-gray-500 hover:text-white"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled
                        className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-50"
                        title="Disable / Re-enable wired in next task"
                      >
                        {s.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {modal.open && (
        <ServiceModal
          editing={modal.editing}
          onClose={closeModal}
          onSaved={() => { closeModal(); refresh() }}
        />
      )}
    </div>
  )
}

// --- ServiceModal (Add or Edit) -------------------------------------------------

interface ModalProps {
  editing: Service | null
  onClose: () => void
  onSaved: () => void
}

function ServiceModal({ editing, onClose, onSaved }: ModalProps) {
  const isEdit = editing !== null
  const [department, setDept]   = useState<Department>(editing?.department ?? 'Registrar Office')
  const [label, setLabel]       = useState(editing?.label ?? '')
  const [iconName, setIcon]     = useState<IconName>((editing?.icon_name as IconName) ?? 'BookOpen')
  const [order, setOrder]       = useState<number>(editing?.display_order ?? 0)
  const [submitting, setSubmit] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (label.trim().length < 2) { toast.error('Label must be at least 2 characters'); return }
    setSubmit(true)
    try {
      if (isEdit && editing) {
        await updateService(editing.id, {
          department, label, icon_name: iconName, display_order: order,
        })
        toast.success('Service updated')
      } else {
        await createService({ department, label, icon_name: iconName, display_order: order })
        toast.success('Service created')
      }
      onSaved()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error('A service with that label already exists in this department.')
      } else {
        toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Save failed') : 'Save failed')
      }
    } finally {
      setSubmit(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-ascb-navy border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-base font-semibold text-white font-ui">{isEdit ? 'Edit Service' : 'Add Service'}</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white"><XIcon size={16} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Department</label>
            <select
              value={department}
              onChange={e => setDept(e.target.value as Department)}
              className="input-field h-11 w-full"
            >
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Label</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={100}
              required
              className="input-field h-11 w-full"
              placeholder="e.g. Tuition Fee Payment"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Icon</label>
            <div className="grid grid-cols-5 gap-1.5">
              {ICON_CHOICES.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  className={`p-2 rounded-lg border transition-colors ${
                    iconName === name
                      ? 'bg-ascb-orange/20 border-ascb-orange text-ascb-orange'
                      : 'bg-white/[0.03] border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                  title={name}
                >
                  <ServiceIcon name={name} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 font-ui">Display order</label>
            <input
              type="number"
              value={order}
              onChange={e => setOrder(parseInt(e.target.value || '0', 10))}
              className="input-field h-11 w-full tabular-nums"
            />
            <p className="text-[10px] text-gray-500 font-ui">Lower = shown earlier in the user's list.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-white/15 text-gray-300 hover:text-white text-sm font-ui"
            >Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 h-10 rounded-xl text-white text-sm font-semibold font-ui disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F47C20 0%, #d4651a 100%)' }}
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminServicesPage.tsx
git commit -m "feat(admin): AdminServicesPage — Add/Edit modal with icon picker"
```

---

### Task 13: AdminServicesPage — Disable / Re-enable actions

**Files:**
- Modify: `frontend/src/pages/admin/AdminServicesPage.tsx`

- [ ] **Step 1: Wire the eye/eye-off button**

In `frontend/src/pages/admin/AdminServicesPage.tsx`, add an import for `disableService` and `updateService` is already imported. Update the existing import line:

```tsx
import {
  adminListServices, createService, updateService, disableService,
  type Service, type Department,
} from '../../api/services'
```

Inside the `AdminServicesPage` function (above the `return`), add a handler:

```tsx
  const onToggleActive = async (s: Service) => {
    try {
      if (s.is_active) {
        await disableService(s.id)
        toast.success(`Disabled "${s.label}"`)
      } else {
        await updateService(s.id, { is_active: true })
        toast.success(`Re-enabled "${s.label}"`)
      }
      refresh()
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? (err.response?.data?.error ?? 'Action failed') : 'Action failed')
    }
  }
```

Replace the disabled disable/re-enable button:

```tsx
                      <button
                        type="button"
                        disabled
                        className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-50"
                        title="Disable / Re-enable wired in next task"
                      >
                        {s.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
```

with:

```tsx
                      <button
                        type="button"
                        onClick={() => onToggleActive(s)}
                        className="p-1.5 text-gray-500 hover:text-red-400"
                        title={s.is_active ? 'Disable' : 'Re-enable'}
                      >
                        {s.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
```

Add the `toast` import at the top of the file (it should already be there from Task 12 — confirm). The full top-of-file imports should now be:

```tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Pencil, EyeOff, Eye, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import {
  adminListServices, createService, updateService, disableService,
  type Service, type Department,
} from '../../api/services'
import { ServiceIcon, ICON_CHOICES, type IconName } from '../../lib/serviceIcons'
```

- [ ] **Step 2: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminServicesPage.tsx
git commit -m "feat(admin): AdminServicesPage — disable / re-enable actions"
```

---

## Section 6 — Sidebar nav + Router

### Task 14: Add "Services" admin nav entry

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update imports**

In `frontend/src/components/layout/Sidebar.tsx`, replace the lucide-react import line (around line 3):

```tsx
import { LayoutDashboard, MessageSquare, Megaphone, Star, UserPlus, LogOut, X, Menu } from 'lucide-react'
```

with:

```tsx
import { LayoutDashboard, MessageSquare, Megaphone, Star, UserPlus, Tag, LogOut, X, Menu } from 'lucide-react'
```

- [ ] **Step 2: Add nav entry**

In the `navItems` array (around lines 10-21), add a new entry between the existing `/admin/users` and the registrar block:

```tsx
  { to: '/admin/users',          icon: UserPlus,        label: 'Users',         roles: ['admin'] },
  { to: '/admin/services',       icon: Tag,             label: 'Services',      roles: ['admin'] },
  { to: '/registrar/dashboard',  icon: LayoutDashboard, label: 'Dashboard',     roles: ['registrar'] },
```

- [ ] **Step 3: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(nav): admin sidebar entry — Services"
```

---

### Task 15: Register `/admin/services` route

**Files:**
- Modify: `frontend/src/router.tsx`

- [ ] **Step 1: Add lazy import**

In `frontend/src/router.tsx`, near the other admin lazy imports (around line 26), add:

```tsx
const AdminServicesPage  = lazy(() => import('./pages/admin/AdminServicesPage').then(m => ({ default: m.AdminServicesPage })))
```

(Place it after `AdminEmailLogs` for grouping.)

- [ ] **Step 2: Register the route**

Inside the admin `<Route element={<RequireAuth role="admin" />}>` block (around line 195), inside its `<Route element={<StaffLayout />}>`, add:

```tsx
<Route path="/admin/services"     element={<AdminServicesPage />} />
```

(Place it after `/admin/email-logs` for visual grouping.)

- [ ] **Step 3: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router.tsx
git commit -m "feat(router): /admin/services route"
```

---

## Section 7 — SubmitPage rewire

### Task 16: SubmitPage fetches services dynamically

**Files:**
- Modify: `frontend/src/pages/user/SubmitPage.tsx`

- [ ] **Step 1: Replace the hardcoded service arrays**

In `frontend/src/pages/user/SubmitPage.tsx`:

**(a)** Update imports — replace the lucide-react import at the top with the slimmed list (drops the icons that lived only in the constants), and add the new dependencies:

The current line:
```tsx
import {
  Send, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Plus,
  FileText, Award, BookOpen, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle, Check,
  Building2, Calculator, Star, Paperclip, X as XIcon,
} from 'lucide-react'
```

becomes:
```tsx
import {
  Send, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Plus,
  BookOpen, Check, Calculator, Star, Paperclip, X as XIcon,
} from 'lucide-react'
```

(We keep `BookOpen`, `Calculator` for the Step 1 department buttons, and `Check`, `Star`, `Plus`, `Paperclip`, `XIcon`, `AlertCircle`, `CheckCircle2`, `ArrowRight`, `ArrowLeft`, `Send`, `Eye`, `EyeOff` for the rest of the page. Everything else moves to the icon registry.)

Add new imports below the existing ones:

```tsx
import { listServices, type Service } from '../../api/services'
import { ServiceIcon } from '../../lib/serviceIcons'
```

**(b)** Delete the two hardcoded constants (lines 17-37):

```tsx
const REGISTRAR_SERVICES: { label: string; icon: React.ReactNode }[] = [
  ...
]
const ACCOUNTING_SERVICES: { label: string; icon: React.ReactNode }[] = [
  ...
]
```

**(c)** Replace the line that picks one of the two arrays:

```tsx
const services = department === 'Registrar Office' ? REGISTRAR_SERVICES : ACCOUNTING_SERVICES
```

with state + a fetcher. Inside `SubmitPage`, near the other `useState` calls, add:

```tsx
  const [services, setServices]           = useState<Service[] | null>(null)
  const [servicesLoading, setSrvLoading]  = useState(false)
  const [servicesError, setSrvError]      = useState<string | null>(null)
```

Then add a `useEffect` that fires whenever `department` changes:

```tsx
  useEffect(() => {
    if (!department) { setServices(null); return }
    let cancelled = false
    setSrvLoading(true); setSrvError(null)
    listServices(department)
      .then(res => { if (!cancelled) setServices(res.data) })
      .catch(() => { if (!cancelled) setSrvError('Could not load services. Try again.') })
      .finally(() => { if (!cancelled) setSrvLoading(false) })
    return () => { cancelled = true }
  }, [department])
```

**(d)** Update the Step 2 render to use the new state. Replace the `services.map(svc => …)` block in `Step2`:

```tsx
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
        {services.map(svc => {
          const selected = serviceCategory === svc.label
          return (
            <button
              key={svc.label}
              type="button"
              onClick={() => setService(svc.label)}
              className={`flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition-all duration-150 active:scale-95 ${
                selected
                  ? 'border-ascb-orange bg-ascb-orange/12 text-ascb-orange shadow-md shadow-ascb-orange/15'
                  : 'border-white/10 bg-white/3 text-gray-400 hover:border-ascb-orange/30 hover:text-white hover:bg-white/6'
              }`}
            >
              <span className={`transition-colors ${selected ? 'text-ascb-orange' : 'text-gray-500'}`}>{svc.icon}</span>
              <span className="text-xs font-ui font-medium leading-tight">{svc.label}</span>
              {selected && <Check size={10} className="text-ascb-orange" />}
            </button>
          )
        })}
      </div>
```

with:

```tsx
      {servicesLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-[88px] rounded-xl bg-white/3 border border-white/8 animate-pulse" />
          ))}
        </div>
      )}
      {servicesError && (
        <p className="text-sm text-red-400 font-ui text-center py-6">{servicesError}</p>
      )}
      {!servicesLoading && !servicesError && services !== null && services.length === 0 && (
        <p className="text-sm text-gray-500 font-ui text-center py-6">
          No services available for {department}. Please contact the office directly.
        </p>
      )}
      {!servicesLoading && !servicesError && services !== null && services.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {services.map(svc => {
            const selected = serviceCategory === svc.label
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => setService(svc.label)}
                className={`flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition-all duration-150 active:scale-95 ${
                  selected
                    ? 'border-ascb-orange bg-ascb-orange/12 text-ascb-orange shadow-md shadow-ascb-orange/15'
                    : 'border-white/10 bg-white/3 text-gray-400 hover:border-ascb-orange/30 hover:text-white hover:bg-white/6'
                }`}
              >
                <span className={`transition-colors ${selected ? 'text-ascb-orange' : 'text-gray-500'}`}>
                  <ServiceIcon name={svc.icon_name} size={16} />
                </span>
                <span className="text-xs font-ui font-medium leading-tight">{svc.label}</span>
                {selected && <Check size={10} className="text-ascb-orange" />}
              </button>
            )
          })}
        </div>
      )}
```

- [ ] **Step 2: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean. If unused-import warnings surface for any of the lucide icons we removed (e.g. `FileText`), remove them from the import line as well.

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run 2>&1 | tail -10
```

Expected: 6/6 pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/user/SubmitPage.tsx
git commit -m "feat(submit): fetch services from API instead of hardcoded arrays"
```

---

## Section 8 — D1: Rating chart

### Task 17: Render horizontal-bar chart inside each Service Rating card

**Files:**
- Modify: `frontend/src/components/shared/RatingsPanel.tsx`

- [ ] **Step 1: Replace the card body**

Open `frontend/src/components/shared/RatingsPanel.tsx`. Replace the entire `<li>…</li>` JSX inside `filtered.map(g => …)` (around lines 73-89) with:

```tsx
            <li
              key={`${g.department}-${g.category}`}
              className="rounded-lg border border-white/6 bg-ascb-navy-dark/50 p-2.5 flex flex-col justify-between min-h-[120px]"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white font-ui leading-tight line-clamp-2">{g.category}</p>
                {!department && <p className="text-[9px] text-gray-500 font-ui mt-0.5 truncate">{g.department}</p>}
              </div>

              {g.count === 0 ? (
                <p className="text-[10px] text-gray-500 font-ui text-center py-2">No ratings yet</p>
              ) : (
                <RatingBars breakdown={g.breakdown} />
              )}

              <div className="flex items-center justify-between gap-1 mt-1">
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-ascb-gold" fill="currentColor" />
                  <span className="text-sm font-bold text-ascb-gold font-ui tabular-nums leading-none">{g.average.toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-ui tabular-nums">{g.count}</span>
              </div>
            </li>
```

(The `aspect-square` class is removed; `min-h-[120px]` replaces `min-h-[96px]` so the bars + footer + title fit comfortably.)

- [ ] **Step 2: Add the `RatingBars` helper at the bottom of the file**

After the `RatingsPanel` function (i.e. as a sibling at module level — not nested), append:

```tsx
// 5 horizontal bars (5★ at top → 1★ at bottom). Bar width is the count for
// that rating divided by the highest count across all 5 ratings, so the
// distribution shape is visible regardless of total volume.
function RatingBars({ breakdown }: { breakdown: Record<string, number> }) {
  const counts = [5, 4, 3, 2, 1].map(n => ({ rating: n, count: breakdown[String(n)] ?? 0 }))
  const max = counts.reduce((m, c) => Math.max(m, c.count), 0) || 1
  const colors: Record<number, string> = {
    5: 'bg-green-500',
    4: 'bg-lime-500',
    3: 'bg-yellow-500',
    2: 'bg-orange-500',
    1: 'bg-red-500',
  }
  return (
    <div className="flex flex-col gap-[3px] py-1.5">
      {counts.map(({ rating, count }) => (
        <div key={rating} className="flex items-center gap-1.5">
          <span className="text-[8px] font-ui text-ascb-gold tabular-nums w-3 text-right">{rating}★</span>
          <div className="flex-1 h-[5px] bg-white/[0.06] rounded-sm overflow-hidden">
            <div
              className={`h-full ${colors[rating]} rounded-sm`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-[8px] font-ui text-gray-500 tabular-nums w-3 text-right">{count}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/RatingsPanel.tsx
git commit -m "feat(admin): horizontal-bar rating distribution inside each card"
```

---

## Section 9 — Final verification

### Task 18: Full-suite checks + smoke checklist

- [ ] **Step 1: Backend full test suite**

```bash
cd backend && go test ./...
```

Expected: every package PASS.

- [ ] **Step 2: Frontend strict build**

```bash
cd frontend && npm run build
```

Expected: Vite emits `dist/…` with no TypeScript errors.

- [ ] **Step 3: Frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass (6 from Group B).

- [ ] **Step 4: Verify clean tree**

```bash
git status --short
```

Expected: empty.

- [ ] **Step 5: Smoke checklist (manual, in browser)**

Record results in your reply rather than this file:

```
1. Admin Dashboard chart (D1):
   - Visit /admin/dashboard
   - Each service-rating card now has 5 horizontal bars labelled 5★ → 1★.
   - Bar width matches the breakdown numbers shown to the right of each bar.
   - A category with 0 ratings shows "No ratings yet" centered.

2. Admin Services Catalog (D2):
   - Sidebar shows new "Services" entry.
   - /admin/services renders two sections: Registrar Office (8 rows) + Finance Office (8 rows).
   - "Add Service" → modal → fill in label "Test Service", icon "BookOpen", department "Finance Office", order 99 → Save → row appears.
   - Edit "Test Service" → change label to "Renamed Test" → Save → table updates.
   - Disable "Renamed Test" → row dims, Status shows "Disabled".
   - Re-enable "Renamed Test" → row brightens, Status shows "Active".

3. User-facing flow (D2 integration):
   - Sign in as a user → /user/submit
   - Step 1: pick "Finance Office" → Step 2 fetches /api/services?department=Finance%20Office → buttons appear.
   - "Renamed Test" appears at the position dictated by display_order (99 = last).
   - Disable "Renamed Test" in admin → reload submit page → Step 2 no longer shows it.
   - Delete "Renamed Test" via PATCH (re-disable) and confirm rating panel can still show legacy rows if any.

4. No regressions:
   - Admin Suggestions, Announcements, Testimonials, Users, Email Logs all still load.
   - Logout works.
```

- [ ] **Step 6: Final commit if any incidental changes**

```bash
git status --short
```

If anything's pending (e.g. an import the linter wants tidied), inspect and commit deliberately. Otherwise no commit needed.

---

## Done

18 tasks. Open a PR (or merge to `main` and let Render + Vercel auto-deploy, depending on team norms). Out-of-scope reminders for follow-up:

- Group C: Notifications (Facebook-style real-time + bug #9).
- Group D remaining: photo attachments visible to staff (#5), office hours editor with history + custom workdays (#6), slow eye-icon (#10).
- Group E: homepage polish — "Values" → "Core Values", footer phone, announcement pagination (#8, #11, #13).
