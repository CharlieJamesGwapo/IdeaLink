package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- mocks ---

type mockHoursRepo struct {
	row *models.OfficeHours
}

func (m *mockHoursRepo) EnsureRow(dept string) (*models.OfficeHours, error) {
	if m.row == nil {
		m.row = &models.OfficeHours{ID: 1, Department: dept, UpdatedAt: time.Now()}
	}
	return m.row, nil
}
func (m *mockHoursRepo) GetByDepartment(dept string) (*models.OfficeHours, error) {
	if m.row != nil && m.row.Department == dept {
		return m.row, nil
	}
	return nil, nil
}
func (m *mockHoursRepo) GetSchedule(int) ([]models.DaySchedule, error) {
	return standardSchedule(), nil
}
func (m *mockHoursRepo) ReplaceSchedule(int, []models.DaySchedule) error { return nil }

type mockClosuresRepo struct {
	createErr error
	created   *models.Closure
	byID      map[int]*models.Closure
	cancelled bool
}

func (m *mockClosuresRepo) Create(officeID int, start, end time.Time, reason *string, by *int) (*models.Closure, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	c := &models.Closure{ID: 42, StartAt: start, EndAt: end, Reason: reason, CreatedAt: time.Now()}
	m.created = c
	return c, nil
}
func (m *mockClosuresRepo) List(int, repository.ClosureStatus, int, int) ([]models.Closure, error) {
	return []models.Closure{}, nil
}
func (m *mockClosuresRepo) GetActive(int, time.Time) (*models.Closure, error)    { return nil, nil }
func (m *mockClosuresRepo) GetUpcoming(int, time.Time) ([]models.Closure, error) { return nil, nil }
func (m *mockClosuresRepo) FindByID(id int) (*models.Closure, error) {
	if c, ok := m.byID[id]; ok {
		return c, nil
	}
	return nil, nil
}
func (m *mockClosuresRepo) Cancel(id int, now time.Time) (*models.Closure, error) {
	c, _ := m.FindByID(id)
	if c == nil {
		return nil, nil
	}
	t := now
	c.CancelledAt = &t
	m.cancelled = true
	return c, nil
}

// --- helpers ---

func newTestRouter(h *OfficeHoursHandler, role string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(middleware.CtxKeyRole, role)
		c.Next()
	})
	r.POST("/api/office-hours/:dept/closures", h.CreateClosure)
	r.DELETE("/api/office-hours/:dept/closures/:id", h.CancelClosure)
	r.GET("/api/office-hours/:dept/closures", h.ListClosures)
	return r
}

// --- tests ---

func TestCreateClosure_OverlapReturns409(t *testing.T) {
	hours := &mockHoursRepo{}
	closures := &mockClosuresRepo{createErr: repository.ErrClosureOverlap}
	h := NewOfficeHoursHandler(hours, closures)
	r := newTestRouter(h, "registrar")

	body, _ := json.Marshal(models.CreateClosureInput{
		StartAt: "2026-05-01T08:00:00+08:00",
		EndAt:   "2026-05-01T17:00:00+08:00",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/office-hours/Registrar%20Office/closures", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCreateClosure_CrossOfficeForbidden(t *testing.T) {
	h := NewOfficeHoursHandler(&mockHoursRepo{}, &mockClosuresRepo{})
	r := newTestRouter(h, "registrar")
	body, _ := json.Marshal(models.CreateClosureInput{
		StartAt: "2026-05-01T08:00:00+08:00",
		EndAt:   "2026-05-01T17:00:00+08:00",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/office-hours/Finance%20Office/closures", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestCancelClosure_PastReturns409(t *testing.T) {
	past := time.Now().Add(-24 * time.Hour)
	hours := &mockHoursRepo{}
	// Office row id will be 1 once EnsureRow runs; pre-set the closure to
	// belong to that office so the ownership check passes.
	closures := &mockClosuresRepoCancelOverride{
		mockClosuresRepo: mockClosuresRepo{
			byID: map[int]*models.Closure{
				7: {ID: 7, OfficeHoursID: 1, StartAt: past.Add(-time.Hour), EndAt: past},
			},
		},
		cancelErr: repository.ErrClosurePast,
	}
	h := NewOfficeHoursHandler(hours, closures)
	r := newTestRouter(h, "registrar")

	req := httptest.NewRequest(http.MethodDelete, "/api/office-hours/Registrar%20Office/closures/7", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", w.Code, w.Body.String())
	}
}

// mockClosuresRepoCancelOverride lets a test inject an error from Cancel
// while keeping the rest of the mock behaviour.
type mockClosuresRepoCancelOverride struct {
	mockClosuresRepo
	cancelErr error
}

func (m *mockClosuresRepoCancelOverride) Cancel(id int, now time.Time) (*models.Closure, error) {
	if m.cancelErr != nil {
		return nil, m.cancelErr
	}
	return m.mockClosuresRepo.Cancel(id, now)
}
