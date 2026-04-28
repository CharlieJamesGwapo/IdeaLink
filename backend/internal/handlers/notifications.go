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
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	roleStr, _ := roleVal.(string)

	var count int
	var err error

	switch roleStr {
	case "registrar":
		count, err = h.suggestionRepo.CountUnreadByDepartment("Registrar Office")
	case "accounting":
		count, err = h.suggestionRepo.CountUnreadByDepartment("Finance Office")
	default:
		count, err = h.suggestionRepo.CountUnread()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

// POST /api/notifications/mark-all-read — Facebook-style "clear the badge"
// when staff clicks the bell. Scope follows the same rule as UnreadCount:
// registrar clears Registrar Office, accounting clears Finance Office,
// admin clears every office.
func (h *NotificationsHandler) MarkAllRead(c *gin.Context) {
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	roleStr, _ := roleVal.(string)

	var marked int
	var err error

	switch roleStr {
	case "registrar":
		marked, err = h.suggestionRepo.MarkAllAsReadByDepartment("Registrar Office")
	case "accounting":
		marked, err = h.suggestionRepo.MarkAllAsReadByDepartment("Finance Office")
	default:
		marked, err = h.suggestionRepo.MarkAllAsRead()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"marked": marked})
}
