package handlers

import (
	"net/http"

	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	suggestionRepo repository.SuggestionRepository
	userRepo       repository.UserRepository
}

func NewAdminHandler(suggestionRepo repository.SuggestionRepository, userRepo repository.UserRepository) *AdminHandler {
	return &AdminHandler{suggestionRepo: suggestionRepo, userRepo: userRepo}
}

func (h *AdminHandler) Analytics(c *gin.Context) {
	analytics, err := h.suggestionRepo.GetAnalytics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	userCount, err := h.userRepo.CountUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	analytics.TotalUsers = userCount
	c.JSON(http.StatusOK, analytics)
}

// GET /api/ratings-summary — admin + staff.
// Returns per-department/category aggregated ratings (avg + 1-5 breakdown).
func (h *AdminHandler) RatingsSummary(c *gin.Context) {
	groups, err := h.suggestionRepo.GetRatingSummary()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if groups == nil {
		groups = []*models.RatingGroup{}
	}
	c.JSON(http.StatusOK, groups)
}
