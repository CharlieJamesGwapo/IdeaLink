package handlers

import (
	"net/http"

	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type UsersHandler struct {
	svc *services.UserProvisioningService
}

func NewUsersHandler(svc *services.UserProvisioningService) *UsersHandler {
	return &UsersHandler{svc: svc}
}

// POST /api/admin/users — provision a single user. Admin + Registrar only.
func (h *UsersHandler) Create(c *gin.Context) {
	var input services.ProvisionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := h.svc.ProvisionOne(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if res.Status == "error" {
		c.JSON(http.StatusBadRequest, res)
		return
	}
	if res.Status == "skipped" {
		c.JSON(http.StatusConflict, res)
		return
	}
	c.JSON(http.StatusCreated, res)
}

// POST /api/admin/users/bulk — CSV upload, multipart/form-data, field "file".
func (h *UsersHandler) BulkCreate(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field is required"})
		return
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer f.Close()

	results, err := h.svc.ProvisionFromCSV(f)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	summary := map[string]int{"created": 0, "skipped": 0, "error": 0}
	for _, r := range results {
		summary[r.Status]++
	}
	c.JSON(http.StatusOK, gin.H{
		"summary": summary,
		"results": results,
	})
}
