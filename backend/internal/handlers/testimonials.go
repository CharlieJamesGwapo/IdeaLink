package handlers

import (
	"net/http"
	"strconv"

	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type TestimonialHandler struct {
	svc *services.TestimonialService
}

func NewTestimonialHandler(svc *services.TestimonialService) *TestimonialHandler {
	return &TestimonialHandler{svc: svc}
}

func (h *TestimonialHandler) List(c *gin.Context) {
	list, err := h.svc.ListActive()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Testimonial{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *TestimonialHandler) Toggle(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	t, err := h.svc.Toggle(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, t)
}
