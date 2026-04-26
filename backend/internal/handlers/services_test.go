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
