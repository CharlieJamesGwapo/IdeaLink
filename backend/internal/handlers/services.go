package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/gin-gonic/gin"
)

type ServicesHandler struct {
	repo repository.ServiceRepository
}

func NewServicesHandler(repo repository.ServiceRepository) *ServicesHandler {
	return &ServicesHandler{repo: repo}
}

// GET /api/services?department=Registrar%20Office
// Returns active services for one department. Used by SubmitPage step 2.
func (h *ServicesHandler) List(c *gin.Context) {
	dept := c.Query("department")
	if dept == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "department query param is required"})
		return
	}
	out, err := h.repo.ListByDepartment(dept, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list services"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// GET /api/admin/services
// Returns ALL services (incl. inactive). Used by AdminServicesPage.
func (h *ServicesHandler) AdminList(c *gin.Context) {
	out, err := h.repo.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list services"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *ServicesHandler) Create(c *gin.Context) {
	var input models.CreateServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.repo.Create(input)
	if err != nil {
		if errors.Is(err, repository.ErrServiceLabelConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "a service with that label already exists in this department"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create service"})
		return
	}
	c.JSON(http.StatusCreated, out)
}

func (h *ServicesHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input models.UpdateServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.repo.Update(id, input)
	if err != nil {
		if errors.Is(err, repository.ErrServiceLabelConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "a service with that label already exists in this department"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update service"})
		return
	}
	if out == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *ServicesHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	inactive := false
	out, err := h.repo.Update(id, models.UpdateServiceInput{IsActive: &inactive})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disable service"})
		return
	}
	if out == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	c.JSON(http.StatusOK, out)
}
