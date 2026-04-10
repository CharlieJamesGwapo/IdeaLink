package handlers

import (
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, suggestion)
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
