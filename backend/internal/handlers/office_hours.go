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

// GET /api/office-hours/:dept — public
func (h *OfficeHoursHandler) Get(c *gin.Context) {
	dept := c.Param("dept")
	oh, err := h.repo.GetByDepartment(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if oh == nil {
		// Default: open during business hours
		c.JSON(http.StatusOK, gin.H{"department": dept, "is_open": isBusinessHours(), "closure_reason": nil, "closed_until": nil})
		return
	}

	// If closed_until is in the past, auto-reopen in DB then return open state
	if oh.ClosedUntil != nil && oh.ClosedUntil.Before(time.Now()) {
		input := models.SetOfficeHoursInput{IsOpen: true}
		_, _ = h.repo.Update(dept, input) // best-effort; ignore error — client still gets correct state
		c.JSON(http.StatusOK, gin.H{"department": dept, "is_open": isBusinessHours(), "closure_reason": nil, "closed_until": nil})
		return
	}

	// Manual override takes precedence; if no override, use schedule
	isOpen := oh.IsOpen
	if oh.ClosureReason == nil && oh.ClosedUntil == nil {
		isOpen = isBusinessHours()
	}

	c.JSON(http.StatusOK, gin.H{
		"department":     oh.Department,
		"is_open":        isOpen,
		"closure_reason": oh.ClosureReason,
		"closed_until":   oh.ClosedUntil,
		"updated_at":     oh.UpdatedAt,
	})
}

// POST /api/office-hours/:dept — staff/admin only
func (h *OfficeHoursHandler) Set(c *gin.Context) {
	dept := c.Param("dept")
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	roleStr, _ := roleVal.(string)

	// Registrar can only update their own dept
	if roleStr == "registrar" && dept != "Registrar" {
		c.JSON(http.StatusForbidden, gin.H{"error": "registrar can only update Registrar office hours"})
		return
	}
	if roleStr == "accounting" && dept != "Accounting Office" {
		c.JSON(http.StatusForbidden, gin.H{"error": "accounting can only update Accounting Office hours"})
		return
	}

	var input models.SetOfficeHoursInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oh, err := h.repo.Update(dept, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, oh)
}

func isBusinessHours() bool {
	loc, _ := time.LoadLocation("Asia/Manila")
	now := time.Now().In(loc)
	weekday := now.Weekday()
	if weekday == time.Saturday || weekday == time.Sunday {
		return false
	}
	hour := now.Hour()
	return hour >= 8 && hour < 17
}
