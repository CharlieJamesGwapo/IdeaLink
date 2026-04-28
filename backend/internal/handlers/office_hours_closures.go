package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

// CreateClosure → POST /api/office-hours/:dept/closures (staff)
func (h *OfficeHoursHandler) CreateClosure(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office edit is not allowed"})
		return
	}

	var input models.CreateClosureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startAt, endAt, err := parseClosureRange(input.StartAt, input.EndAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Reason != nil && len(*input.Reason) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reason exceeds 500 chars"})
		return
	}

	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var createdBy *int
	if v, ok := c.Get(middleware.CtxKeyUserID); ok {
		if id, ok := v.(int); ok {
			createdBy = &id
		}
	}

	closure, err := h.closuresRepo.Create(oh.ID, startAt, endAt, input.Reason, createdBy)
	if errors.Is(err, repository.ErrClosureOverlap) {
		c.JSON(http.StatusConflict, gin.H{"error": "closure overlaps with an existing closure"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, closure)
}

// ListClosures → GET /api/office-hours/:dept/closures (staff)
func (h *OfficeHoursHandler) ListClosures(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office read is not allowed"})
		return
	}
	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	status := repository.ClosureStatus(c.DefaultQuery("status", "all"))
	switch status {
	case repository.ClosureStatusActive,
		repository.ClosureStatusUpcoming,
		repository.ClosureStatusPast,
		repository.ClosureStatusAll:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if offset < 0 {
		offset = 0
	}

	closures, err := h.closuresRepo.List(oh.ID, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"closures": closures})
}

// CancelClosure → DELETE /api/office-hours/:dept/closures/:id (staff)
func (h *OfficeHoursHandler) CancelClosure(c *gin.Context) {
	dept := c.Param("dept")
	if !authorizeDept(c, dept) {
		c.JSON(http.StatusForbidden, gin.H{"error": "cross-office edit is not allowed"})
		return
	}
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	oh, err := h.hoursRepo.EnsureRow(dept)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Ownership check: the closure must belong to this office.
	existing, err := h.closuresRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if existing == nil || existing.OfficeHoursID != oh.ID {
		c.JSON(http.StatusNotFound, gin.H{"error": "closure not found"})
		return
	}

	now := time.Now().In(manilaLocation())
	updated, err := h.closuresRepo.Cancel(id, now)
	if errors.Is(err, repository.ErrClosurePast) {
		c.JSON(http.StatusConflict, gin.H{"error": "closure is already past"})
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "closure not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

// parseClosureRange accepts RFC3339 or "YYYY-MM-DDTHH:MM" (HTML
// datetime-local). Strings without a timezone are interpreted in
// Asia/Manila. Returns 400-friendly errors.
func parseClosureRange(startStr, endStr string) (time.Time, time.Time, error) {
	pht := time.FixedZone("PHT", 8*3600)
	parse := func(s string) (time.Time, error) {
		for _, layout := range []string{time.RFC3339, "2006-01-02T15:04"} {
			t, err := time.ParseInLocation(layout, s, pht)
			if err == nil {
				return t, nil
			}
		}
		return time.Time{}, errors.New("expected RFC3339 or YYYY-MM-DDTHH:MM")
	}
	start, err := parse(startStr)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid start_at: " + err.Error())
	}
	end, err := parse(endStr)
	if err != nil {
		return time.Time{}, time.Time{}, errors.New("invalid end_at: " + err.Error())
	}
	if !end.After(start) {
		return time.Time{}, time.Time{}, errors.New("end_at must be after start_at")
	}
	if !end.After(time.Now()) {
		return time.Time{}, time.Time{}, errors.New("end_at must be in the future")
	}
	return start, end, nil
}
