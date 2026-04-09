// backend/internal/handlers/auth.go
package handlers

import (
	"net/http"
	"time"

	"idealink/internal/middleware"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc services.AuthServicer
}

func NewAuthHandler(svc services.AuthServicer) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type signupInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Fullname string `json:"fullname" binding:"required"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var input signupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, token, err := h.svc.SignupUser(input.Email, input.Password, input.Fullname)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusCreated, user)
}

type loginInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, token, err := h.svc.LoginUser(input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) AdminLogin(c *gin.Context) {
	var input loginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	admin, token, err := h.svc.LoginAdmin(input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, admin)
}

type staffLoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) RegistrarLogin(c *gin.Context) {
	var input staffLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	reg, token, err := h.svc.LoginRegistrar(input.Username, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, reg)
}

func (h *AuthHandler) AccountingLogin(c *gin.Context) {
	var input staffLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	acc, token, err := h.svc.LoginAccounting(input.Username, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	setTokenCookie(c, token)
	c.JSON(http.StatusOK, acc)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie(middleware.AuthCookieName, "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get(middleware.CtxKeyUserID)
	role, _ := c.Get(middleware.CtxKeyRole)
	c.JSON(http.StatusOK, gin.H{"user_id": userID, "role": role})
}

func setTokenCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie(middleware.AuthCookieName, token, int(24*time.Hour/time.Second), "/", "", true, true)
}
