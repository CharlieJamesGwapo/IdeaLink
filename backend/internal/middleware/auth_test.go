package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"idealink/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

const testSecret = "test-secret"

func makeToken(userID int, role string, secret string) string {
	claims := jwt.MapClaims{
		"user_id": float64(userID),
		"role":    role,
		"exp":     time.Now().Add(time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	t, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	return t
}

func setupRouter(secret string, roles ...string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", middleware.AuthRequired(secret, roles...), func(c *gin.Context) {
		userID, _ := c.Get("userID")
		role, _ := c.Get("role")
		c.JSON(200, gin.H{"user_id": userID, "role": role})
	})
	return r
}

func TestAuthRequired_ValidToken(t *testing.T) {
	r := setupRouter(testSecret, "user", "admin")
	token := makeToken(5, "user", testSecret)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), `"user_id":5`)
}

func TestAuthRequired_MissingToken(t *testing.T) {
	r := setupRouter(testSecret, "user")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)
}

func TestAuthRequired_WrongRole(t *testing.T) {
	r := setupRouter(testSecret, "admin")
	token := makeToken(5, "user", testSecret)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 403, w.Code)
}

func TestAuthRequired_ExpiredToken(t *testing.T) {
	claims := jwt.MapClaims{
		"user_id": float64(1),
		"role":    "user",
		"exp":     time.Now().Add(-time.Hour).Unix(),
		"iat":     time.Now().Add(-2 * time.Hour).Unix(),
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))

	r := setupRouter(testSecret, "user")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
}

func TestAuthRequired_WrongSecret(t *testing.T) {
	token := makeToken(5, "user", "wrong-secret")

	r := setupRouter(testSecret, "user")
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
}

func TestAuthRequired_NoRoleRestriction(t *testing.T) {
	// When no roles passed, any valid token is accepted
	r := setupRouter(testSecret) // no role args
	token := makeToken(5, "admin", testSecret)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}
