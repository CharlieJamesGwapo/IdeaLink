// backend/internal/handlers/auth.go
package handlers

import (
	"errors"
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
	Email             string  `json:"email" binding:"required,email"`
	Password          string  `json:"password" binding:"required,min=6"`
	Fullname          string  `json:"fullname" binding:"required"`
	EducationLevel    string  `json:"education_level" binding:"required"`
	CollegeDepartment *string `json:"college_department"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var input signupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user, token, err := h.svc.SignupUser(input.Email, input.Password, input.Fullname, input.EducationLevel, input.CollegeDepartment)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrInvalidEducation):
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid education level or department"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "registration failed"})
		}
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
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie(middleware.AuthCookieName, "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	roleVal, _ := c.Get(middleware.CtxKeyRole)

	role, _ := roleVal.(string)
	userID, _ := userIDVal.(int)

	resp := gin.H{"user_id": userID, "role": role}
	if role == services.RoleUser {
		user, err := h.svc.GetUserByID(userID)
		if err == nil && user != nil {
			resp["education_level"] = user.EducationLevel
			resp["college_department"] = user.CollegeDepartment
		}
	}
	c.JSON(http.StatusOK, resp)
}

func setTokenCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie(middleware.AuthCookieName, token, int(24*time.Hour/time.Second), "/", "", true, true)
}

type forgotPasswordInput struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var input forgotPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := h.svc.RequestPasswordReset(input.Email)
	if errors.Is(err, services.ErrRateLimited) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please try again later"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "If that email exists, a reset link was sent."})
}

type resetPasswordInput struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var input resetPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := h.svc.ResetPassword(input.Token, input.NewPassword)
	if err != nil {
		if errors.Is(err, services.ErrPasswordTooShort) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 6 characters"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired reset link"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password updated."})
}

type completeProfileInput struct {
	EducationLevel    string  `json:"education_level" binding:"required"`
	CollegeDepartment *string `json:"college_department"`
}

func (h *AuthHandler) CompleteProfile(c *gin.Context) {
	var input completeProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	user, err := h.svc.CompleteProfile(userID, input.EducationLevel, input.CollegeDepartment)
	if err != nil {
		if errors.Is(err, services.ErrInvalidEducation) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid education level or department"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update profile"})
		return
	}
	c.JSON(http.StatusOK, user)
}
