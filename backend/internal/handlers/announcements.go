package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/middleware"
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
	adminIDVal, _ := c.Get(middleware.CtxKeyUserID)
	adminID, _ := adminIDVal.(int)
	var input models.CreateAnnouncementInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ann, err := h.svc.Create(adminID, input)
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
	var input models.UpdateAnnouncementInput
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

// GET /api/announcements/unread-count — only meaningful for 'user' role.
// Admin/staff have IDs from separate tables that collide with user IDs in
// the shared SERIAL space, so we hard-return 0 for them to avoid leaking
// another user's last_announcement_view.
func (h *AnnouncementHandler) UnreadCount(c *gin.Context) {
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	if role != "user" {
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	if userID == 0 {
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}
	n, err := h.svc.UnreadCount(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": n})
}

// POST /api/announcements/mark-seen — only 'user' role has a
// last_announcement_view timestamp to advance. No-op for admin/staff.
func (h *AnnouncementHandler) MarkSeen(c *gin.Context) {
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	if role != "user" {
		c.Status(http.StatusNoContent)
		return
	}
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	if err := h.svc.MarkSeen(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
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
