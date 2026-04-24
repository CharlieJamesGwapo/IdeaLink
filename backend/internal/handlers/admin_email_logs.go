package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type AdminEmailLogsHandler struct {
	repo *repository.EmailLogRepo
}

func NewAdminEmailLogsHandler(repo *repository.EmailLogRepo) *AdminEmailLogsHandler {
	return &AdminEmailLogsHandler{repo: repo}
}

// List returns the most recent email_logs rows. Query params:
//   limit  (default 50, max 200)
//   offset (default 0)
//   kind   (optional: password_reset | provisioning | announcement)
//   status (optional: sent | failed | skipped)
func (h *AdminEmailLogsHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	kind := c.Query("kind")
	status := c.Query("status")

	rows, err := h.repo.List(kind, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}
