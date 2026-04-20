package handlers

import (
	"net/http"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type OfficeHoursHandler struct {
	repo repository.OfficeHoursRepository
}

func NewOfficeHoursHandler(repo repository.OfficeHoursRepository) *OfficeHoursHandler {
	return &OfficeHoursHandler{repo: repo}
}

// GET /api/office-hours/:dept — public. is_open is computed from the
// department's weekday schedule and any temporary closure override.
func (h *OfficeHoursHandler) Get(c *gin.Context) {
	dept := c.Param("dept")
	oh, err := h.repo.GetByDepartment(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if oh == nil {
		// No row yet — fall back to defaults.
		defaults := &models.OfficeHours{
			Department: dept,
			OpenHour:   8,
			CloseHour:  17,
		}
		c.JSON(http.StatusOK, buildStatus(defaults))
		return
	}
	c.JSON(http.StatusOK, buildStatus(oh))
}

// POST /api/office-hours/:dept — staff/admin only. Partial update.
func (h *OfficeHoursHandler) Set(c *gin.Context) {
	dept := c.Param("dept")
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	roleStr, _ := roleVal.(string)

	if roleStr == "registrar" && dept != "Registrar Office" {
		c.JSON(http.StatusForbidden, gin.H{"error": "registrar can only update Registrar Office hours"})
		return
	}
	if roleStr == "accounting" && dept != "Finance Office" {
		c.JSON(http.StatusForbidden, gin.H{"error": "accounting can only update Finance Office hours"})
		return
	}

	var input models.SetOfficeHoursInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.OpenHour != nil && input.CloseHour != nil && *input.OpenHour >= *input.CloseHour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "open_hour must be earlier than close_hour"})
		return
	}

	oh, err := h.repo.Update(dept, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, buildStatus(oh))
}

// buildStatus applies the automatic open/closed decision.
//
// Precedence:
//  1. Temporary closure (closed_until still in the future) → CLOSED.
//  2. Weekday schedule (Mon–Fri, open_hour <= hour < close_hour, Asia/Manila) → OPEN.
//  3. Otherwise → CLOSED.
func buildStatus(oh *models.OfficeHours) models.OfficeHoursStatus {
	now := time.Now().In(manilaLocation())
	// If a temporary closure is active, honor it.
	if oh.ClosedUntil != nil && oh.ClosedUntil.After(now) {
		return models.OfficeHoursStatus{
			Department:    oh.Department,
			OpenHour:      oh.OpenHour,
			CloseHour:     oh.CloseHour,
			IsOpen:        false,
			ClosureReason: oh.ClosureReason,
			ClosedUntil:   oh.ClosedUntil,
			UpdatedAt:     oh.UpdatedAt,
		}
	}
	// Closure has expired — don't surface stale ClosureReason/ClosedUntil.
	return models.OfficeHoursStatus{
		Department: oh.Department,
		OpenHour:   oh.OpenHour,
		CloseHour:  oh.CloseHour,
		IsOpen:     isOnSchedule(now, oh.OpenHour, oh.CloseHour),
		UpdatedAt:  oh.UpdatedAt,
	}
}

// isOnSchedule reports whether `now` falls inside the weekday hours window.
func isOnSchedule(now time.Time, openHour, closeHour int) bool {
	wd := now.Weekday()
	if wd == time.Saturday || wd == time.Sunday {
		return false
	}
	h := now.Hour()
	return h >= openHour && h < closeHour
}

func manilaLocation() *time.Location {
	if loc, err := time.LoadLocation("Asia/Manila"); err == nil {
		return loc
	}
	return time.FixedZone("Asia/Manila", 8*60*60)
}
