package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"idealink/internal/middleware"
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
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	var input models.CreateSuggestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	suggestion, err := h.svc.Submit(userID, input)
	if err != nil {
		if errors.Is(err, services.ErrWeeklyLimitReached) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "You've reached the 5-submission weekly limit. The counter resets every Monday.",
				"code":  "WEEKLY_LIMIT_REACHED",
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, suggestion)
}

// GET /api/submissions/weekly-usage — user-only. Returns usage for the submit
// UI's "X of 5 this week" counter.
func (h *SuggestionHandler) WeeklyUsage(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	usage, err := h.svc.WeeklyUsageFor(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, usage)
}

func (h *SuggestionHandler) List(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	list, err := h.svc.ListForRole(userID, role)
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
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	// Admin is read-only per the simplified status flow — only Registrar and
	// Finance (accounting) staff may toggle Reviewed / Unreviewed (Delivered).
	if role == services.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin cannot change feedback status"})
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

// POST /api/suggestions/:id/read — staff-only. Auto-marks as Reviewed when
// Registrar / Finance opens the feedback detail.
func (h *SuggestionHandler) MarkReviewed(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	// Admin is read-only — opening a feedback doesn't change its status.
	if role == services.RoleAdmin {
		c.Status(http.StatusNoContent)
		return
	}
	if err := h.svc.MarkReviewedOnOpen(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /api/submissions/status-unread-count — user-only. Returns how many of
// the caller's own submissions have had an unacknowledged status change.
func (h *SuggestionHandler) StatusUnreadCount(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	n, err := h.svc.CountStatusUnreadByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": n})
}

// POST /api/submissions/mark-seen — user-only. Clears the unread badge.
func (h *SuggestionHandler) MarkSubmissionsSeen(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	if err := h.svc.MarkStatusSeenByUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
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
