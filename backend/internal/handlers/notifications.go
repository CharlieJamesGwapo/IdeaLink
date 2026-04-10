package handlers

import (
	"net/http"

	"idealink/internal/middleware"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type NotificationsHandler struct {
	suggestionRepo repository.SuggestionRepository
}

func NewNotificationsHandler(suggestionRepo repository.SuggestionRepository) *NotificationsHandler {
	return &NotificationsHandler{suggestionRepo: suggestionRepo}
}

// GET /api/notifications/unread-count
func (h *NotificationsHandler) UnreadCount(c *gin.Context) {
	role, _ := c.Get(middleware.CtxKeyRole)
	roleStr := role.(string)

	var count int
	var err error

	switch roleStr {
	case "registrar":
		count, err = h.suggestionRepo.CountUnreadByDepartment("Registrar")
	case "accounting":
		count, err = h.suggestionRepo.CountUnreadByDepartment("Accounting Office")
	default:
		count, err = h.suggestionRepo.CountUnread()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}
