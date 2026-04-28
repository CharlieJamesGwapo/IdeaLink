package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type OfficeHoursHandler struct {
	hoursRepo    repository.OfficeHoursRepository
	closuresRepo repository.OfficeHoursClosuresRepository
}

func NewOfficeHoursHandler(hours repository.OfficeHoursRepository, closures repository.OfficeHoursClosuresRepository) *OfficeHoursHandler {
	return &OfficeHoursHandler{hoursRepo: hours, closuresRepo: closures}
}

// GET /api/office-hours/:dept — public read.
func (h *OfficeHoursHandler) Get(c *gin.Context) {
	dept := c.Param("dept")
	oh, err := h.hoursRepo.GetByDepartment(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if oh == nil {
		// Auto-provision the parent row + default schedule on first read.
		var ensureErr error
		oh, ensureErr = h.hoursRepo.EnsureRow(dept)
		if ensureErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": ensureErr.Error()})
			return
		}
	}
	now := time.Now().In(manilaLocation())
	status, err := h.buildPayload(oh, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// PUT /api/office-hours/:dept/schedule — staff. Replaces the 7-day schedule.
func (h *OfficeHoursHandler) PutSchedule(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office edit is not allowed"})
		return
	}

	var input models.PutScheduleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateSchedule(input.Schedule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := h.hoursRepo.ReplaceSchedule(oh.ID, input.Schedule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Re-fetch to pick up the new updated_at.
	oh, _ = h.hoursRepo.GetByDepartment(dept)
	now := time.Now().In(manilaLocation())
	status, err := h.buildPayload(oh, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// validateSchedule enforces: exactly 7 entries, weekdays 0..6 each once,
// hours in range, open<close when not closed.
func validateSchedule(s []models.DaySchedule) error {
	if len(s) != 7 {
		return errors.New("schedule must contain exactly 7 entries")
	}
	seen := make(map[int]bool, 7)
	for _, d := range s {
		if d.Weekday < 0 || d.Weekday > 6 {
			return fmt.Errorf("weekday must be 0..6 (got %d)", d.Weekday)
		}
		if seen[d.Weekday] {
			return fmt.Errorf("duplicate weekday %d", d.Weekday)
		}
		seen[d.Weekday] = true
		if d.IsClosed {
			continue
		}
		if d.OpenHour < 0 || d.OpenHour > 23 {
			return fmt.Errorf("open_hour out of range on weekday %d", d.Weekday)
		}
		if d.CloseHour < 1 || d.CloseHour > 24 {
			return fmt.Errorf("close_hour out of range on weekday %d", d.Weekday)
		}
		if d.OpenHour >= d.CloseHour {
			return fmt.Errorf("open_hour must be earlier than close_hour on weekday %d", d.Weekday)
		}
	}
	for i := 0; i < 7; i++ {
		if !seen[i] {
			return fmt.Errorf("missing weekday %d", i)
		}
	}
	return nil
}

// buildPayload assembles the OfficeHoursStatus response.
func (h *OfficeHoursHandler) buildPayload(oh *models.OfficeHours, now time.Time) (models.OfficeHoursStatus, error) {
	schedule, err := h.hoursRepo.GetSchedule(oh.ID)
	if err != nil {
		return models.OfficeHoursStatus{}, err
	}
	active, err := h.closuresRepo.GetActive(oh.ID, now)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return models.OfficeHoursStatus{}, err
	}
	upcoming, err := h.closuresRepo.GetUpcoming(oh.ID, now)
	if err != nil {
		return models.OfficeHoursStatus{}, err
	}
	status := computeStatus(now, schedule, active)
	status.Department = oh.Department
	status.Schedule = schedule
	status.ActiveClosure = active
	status.UpcomingClosures = upcoming
	status.UpdatedAt = oh.UpdatedAt
	return status, nil
}

// computeStatus is pure: given the clock, the schedule, and any active
// closure, it returns is_open + a human status_message. Tested in
// office_hours_test.go.
//
// Precedence:
//  1. Active closure  → CLOSED (reason or "Temporarily closed").
//  2. Today is closed → CLOSED ("Office is closed today").
//  3. open_hour <= now.Hour() < close_hour → OPEN.
//  4. Otherwise       → CLOSED ("Outside office hours").
func computeStatus(now time.Time, schedule []models.DaySchedule, active *models.Closure) models.OfficeHoursStatus {
	if active != nil {
		msg := "Temporarily closed"
		if active.Reason != nil && *active.Reason != "" {
			msg = "Closed: " + *active.Reason
		}
		return models.OfficeHoursStatus{IsOpen: false, StatusMessage: msg}
	}
	wd := int(now.Weekday()) // 0=Sun..6=Sat — matches our schema.
	var today *models.DaySchedule
	for i := range schedule {
		if schedule[i].Weekday == wd {
			today = &schedule[i]
			break
		}
	}
	if today == nil {
		return models.OfficeHoursStatus{IsOpen: false, StatusMessage: "No schedule configured"}
	}
	if today.IsClosed {
		return models.OfficeHoursStatus{IsOpen: false, StatusMessage: "Office is closed today"}
	}
	h := now.Hour()
	if h >= today.OpenHour && h < today.CloseHour {
		return models.OfficeHoursStatus{
			IsOpen:        true,
			StatusMessage: fmt.Sprintf("Open today, %s – %s", formatHour(today.OpenHour), formatHour(today.CloseHour)),
		}
	}
	return models.OfficeHoursStatus{IsOpen: false, StatusMessage: "Outside office hours"}
}

// authorizeDept checks role-vs-dept (registrar role can only edit Registrar
// Office, accounting role can only edit Finance Office). Admins pass through.
func authorizeDept(c *gin.Context, dept string) bool {
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	if role == "registrar" && dept != "Registrar Office" {
		return false
	}
	if role == "accounting" && dept != "Finance Office" {
		return false
	}
	return true
}

func formatHour(h int) string {
	if h == 0 || h == 24 {
		return "12:00 AM"
	}
	suffix := "AM"
	if h >= 12 {
		suffix = "PM"
	}
	display := h % 12
	if display == 0 {
		display = 12
	}
	return fmt.Sprintf("%d:00 %s", display, suffix)
}

func manilaLocation() *time.Location {
	if loc, err := time.LoadLocation("Asia/Manila"); err == nil {
		return loc
	}
	return time.FixedZone("Asia/Manila", 8*60*60)
}
