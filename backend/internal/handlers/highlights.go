package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type HighlightHandler struct {
	svc *services.HighlightService
}

func NewHighlightHandler(svc *services.HighlightService) *HighlightHandler {
	return &HighlightHandler{svc: svc}
}

type createHighlightInput struct {
	SuggestionID int `json:"suggestion_id" binding:"required"`
}

func (h *HighlightHandler) Create(c *gin.Context) {
	var input createHighlightInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	adminIDVal, _ := c.Get(middleware.CtxKeyUserID)
	adminID, _ := adminIDVal.(int)
	id, err := h.svc.Create(input.SuggestionID, adminID)
	if err != nil {
		if errors.Is(err, services.ErrSuggestionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "suggestion not found"})
			return
		}
		if errors.Is(err, repository.ErrHighlightAlreadyActive) {
			c.JSON(http.StatusConflict, gin.H{"error": "already highlighted"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *HighlightHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.svc.Expire(id); err != nil {
		if errors.Is(err, repository.ErrHighlightNotFoundOrExpired) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "unhighlighted"})
}

func (h *HighlightHandler) List(c *gin.Context) {
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	viewerID := 0
	if role == services.RoleUser {
		uid, _ := c.Get(middleware.CtxKeyUserID)
		viewerID, _ = uid.(int)
	}
	list, err := h.svc.List(viewerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Highlight{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *HighlightHandler) React(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	uidVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := uidVal.(int)
	count, reacted, err := h.svc.ToggleReact(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrHighlightNotFoundOrExpired) {
			c.JSON(http.StatusNotFound, gin.H{"error": "highlight not found or expired"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"react_count": count, "viewer_reacted": reacted})
}
