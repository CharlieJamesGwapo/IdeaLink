// backend/internal/handlers/auth_test.go
package handlers_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"idealink/internal/handlers"
	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock AuthServicer ---

type mockAuthSvc struct {
	signupErr   error
	loginErr    error
	signedUser  *models.User
	signedAdmin *models.AdminAccount
	token       string
}

func (m *mockAuthSvc) SignToken(userID int, role string) (string, error) {
	return m.token, nil
}
func (m *mockAuthSvc) ParseToken(tokenStr string) (*services.Claims, error) {
	return nil, nil
}
func (m *mockAuthSvc) HashPassword(password string) (string, error) { return "hashed", nil }
func (m *mockAuthSvc) CheckPassword(hash, password string) bool      { return true }
func (m *mockAuthSvc) SignupUser(email, password, fullname string) (*models.User, string, error) {
	if m.signupErr != nil {
		return nil, "", m.signupErr
	}
	return m.signedUser, m.token, nil
}
func (m *mockAuthSvc) LoginUser(email, password string) (*models.User, string, error) {
	if m.loginErr != nil {
		return nil, "", m.loginErr
	}
	return m.signedUser, m.token, nil
}
func (m *mockAuthSvc) LoginAdmin(email, password string) (*models.AdminAccount, string, error) {
	if m.loginErr != nil {
		return nil, "", m.loginErr
	}
	return m.signedAdmin, m.token, nil
}
func (m *mockAuthSvc) LoginRegistrar(username, password string) (*models.RegistrarAccount, string, error) {
	if m.loginErr != nil {
		return nil, "", m.loginErr
	}
	return &models.RegistrarAccount{ID: 1, Username: username}, m.token, nil
}
func (m *mockAuthSvc) LoginAccounting(username, password string) (*models.AccountingAccount, string, error) {
	if m.loginErr != nil {
		return nil, "", m.loginErr
	}
	return &models.AccountingAccount{ID: 1, Username: username}, m.token, nil
}

func setupAuthRouter(svc services.AuthServicer) *gin.Engine {
	gin.SetMode(gin.TestMode)
	h := handlers.NewAuthHandler(svc)
	r := gin.New()
	r.POST("/api/auth/signup", h.Signup)
	r.POST("/api/auth/login", h.Login)
	r.POST("/api/auth/admin/login", h.AdminLogin)
	r.POST("/api/auth/registrar/login", h.RegistrarLogin)
	r.POST("/api/auth/accounting/login", h.AccountingLogin)
	r.POST("/api/auth/logout", h.Logout)
	r.GET("/api/auth/me", func(c *gin.Context) {
		// Simulate the middleware setting context
		c.Set(middleware.CtxKeyUserID, 1)
		c.Set(middleware.CtxKeyRole, services.RoleUser)
		h.Me(c)
	})
	return r
}

func TestAuthHandler_Signup_Success(t *testing.T) {
	svc := &mockAuthSvc{
		signedUser: &models.User{ID: 1, Email: "alice@test.com", Fullname: "Alice"},
		token:      "tok123",
	}
	r := setupAuthRouter(svc)

	body := `{"email":"alice@test.com","password":"pass123","fullname":"Alice"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "alice@test.com", resp["email"])

	// Token cookie must be set
	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == middleware.AuthCookieName {
			found = true
			assert.True(t, c.HttpOnly)
		}
	}
	assert.True(t, found, "expected httpOnly token cookie")
}

func TestAuthHandler_Signup_MissingFields(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBufferString(`{"email":"a@b.com"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthHandler_Signup_DuplicateEmail(t *testing.T) {
	svc := &mockAuthSvc{signupErr: errors.New("email already registered")}
	r := setupAuthRouter(svc)

	body := `{"email":"dup@test.com","password":"pass123","fullname":"Dup"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/signup", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestAuthHandler_Login_Success(t *testing.T) {
	svc := &mockAuthSvc{
		signedUser: &models.User{ID: 1, Email: "bob@test.com"},
		token:      "tok456",
	}
	r := setupAuthRouter(svc)

	body := `{"email":"bob@test.com","password":"pass123"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	cookies := w.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == middleware.AuthCookieName {
			found = true
			assert.True(t, c.HttpOnly)
		}
	}
	assert.True(t, found, "expected token cookie")
}

func TestAuthHandler_Login_InvalidCredentials(t *testing.T) {
	svc := &mockAuthSvc{loginErr: errors.New("invalid credentials")}
	r := setupAuthRouter(svc)

	body := `{"email":"bob@test.com","password":"wrong"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthHandler_AdminLogin_Success(t *testing.T) {
	svc := &mockAuthSvc{
		signedAdmin: &models.AdminAccount{ID: 1, Email: "admin@test.com", Fullname: "Admin"},
		token:       "admintok",
	}
	r := setupAuthRouter(svc)

	body := `{"email":"admin@test.com","password":"adminpass"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/admin/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_RegistrarLogin_Success(t *testing.T) {
	svc := &mockAuthSvc{token: "regtok"}
	r := setupAuthRouter(svc)

	body := `{"username":"registrar","password":"regpass"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/registrar/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_AccountingLogin_Success(t *testing.T) {
	svc := &mockAuthSvc{token: "accttok"}
	r := setupAuthRouter(svc)

	body := `{"username":"accounting","password":"acctpass"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/accounting/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_Logout(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/logout", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_Me(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/auth/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, float64(1), resp["user_id"])
	assert.Equal(t, services.RoleUser, resp["role"])
}
