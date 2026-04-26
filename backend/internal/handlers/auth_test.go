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
	// added for forgot/reset/complete-profile tests
	getUserErr     error
	getUserResult  *models.User
	forgotErr      error
	resetErr       error
	completeErr    error
	completeResult *models.User
	updateProfileResult *models.User
	updateProfileErr    error
}

func (m *mockAuthSvc) SignToken(userID int, role string) (string, error) {
	return m.token, nil
}
func (m *mockAuthSvc) ParseToken(tokenStr string) (*services.Claims, error) {
	return nil, nil
}
func (m *mockAuthSvc) HashPassword(password string) (string, error) { return "hashed", nil }
func (m *mockAuthSvc) CheckPassword(hash, password string) bool      { return true }
func (m *mockAuthSvc) SignupUser(email, password, fullname, educationLevel string, collegeDepartment *string) (*models.User, string, error) {
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
func (m *mockAuthSvc) LoginRegistrar(email, password string) (*models.RegistrarAccount, string, error) {
	if m.loginErr != nil {
		return nil, "", m.loginErr
	}
	return &models.RegistrarAccount{ID: 1, Email: email}, m.token, nil
}
func (m *mockAuthSvc) LoginAccounting(email, password string) (*models.AccountingAccount, string, error) {
	if m.loginErr != nil {
		return nil, "", m.loginErr
	}
	return &models.AccountingAccount{ID: 1, Email: email}, m.token, nil
}

func (m *mockAuthSvc) GetUserByID(userID int) (*models.User, error) {
	return m.getUserResult, m.getUserErr
}
func (m *mockAuthSvc) RequestPasswordReset(email string) error { return m.forgotErr }
func (m *mockAuthSvc) ResetPassword(tok, newPw string) error   { return m.resetErr }
func (m *mockAuthSvc) CompleteProfile(userID int, level string, dept *string) (*models.User, error) {
	if m.completeErr != nil {
		return nil, m.completeErr
	}
	return m.completeResult, nil
}
func (m *mockAuthSvc) UpdateProfile(userID int, level string, dept *string, grade *string) (*models.User, error) {
	if m.updateProfileErr != nil {
		return nil, m.updateProfileErr
	}
	return m.updateProfileResult, nil
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
	r.POST("/api/auth/forgot-password", h.ForgotPassword)
	r.POST("/api/auth/reset-password", h.ResetPassword)
	r.POST("/api/auth/complete-profile", func(c *gin.Context) {
		c.Set(middleware.CtxKeyUserID, 1)
		c.Set(middleware.CtxKeyRole, services.RoleUser)
		h.CompleteProfile(c)
	})
	return r
}

func TestAuthHandler_Signup_Success(t *testing.T) {
	svc := &mockAuthSvc{
		signedUser: &models.User{ID: 1, Email: "alice@test.com", Fullname: "Alice"},
		token:      "tok123",
	}
	r := setupAuthRouter(svc)

	body := `{"email":"alice@test.com","password":"pass123","fullname":"Alice","education_level":"HS"}`
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
	svc := &mockAuthSvc{signupErr: services.ErrEmailTaken}
	r := setupAuthRouter(svc)

	body := `{"email":"dup@test.com","password":"pass123","fullname":"Dup","education_level":"HS"}`
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

	body := `{"email":"registrar@ascb.edu.ph","password":"regpass"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/registrar/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_AccountingLogin_Success(t *testing.T) {
	svc := &mockAuthSvc{token: "accttok"}
	r := setupAuthRouter(svc)

	body := `{"email":"finance@ascb.edu.ph","password":"acctpass"}`
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
	assert.Equal(t, 200, w.Code)
	// Verify cookie is cleared with SameSite=None for cross-origin compatibility
	setCookie := w.Header().Get("Set-Cookie")
	assert.Contains(t, setCookie, middleware.AuthCookieName)
	assert.Contains(t, setCookie, "SameSite=None")
}

func TestAuthHandler_Me(t *testing.T) {
	level := "College"
	dept := "CCE"
	svc := &mockAuthSvc{getUserResult: &models.User{ID: 1, EducationLevel: &level, CollegeDepartment: &dept}}
	r := setupAuthRouter(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/auth/me", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, float64(1), resp["user_id"])
	assert.Equal(t, services.RoleUser, resp["role"])
	// Bug fix: /me must always include education_level for role=user so the
	// frontend's cached value is never silently overwritten with null.
	_, hasEducation := resp["education_level"]
	assert.True(t, hasEducation, "education_level key must be present in /me response for role=user")
	assert.Equal(t, "College", resp["education_level"])
}

func TestAuthHandler_Me_UserLookupFailsReturns500(t *testing.T) {
	svc := &mockAuthSvc{getUserErr: errors.New("db down")}
	r := setupAuthRouter(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/auth/me", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestAuthHandler_Me_UserMissingReturns401(t *testing.T) {
	svc := &mockAuthSvc{} // getUserResult=nil, no error — user not found
	r := setupAuthRouter(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/auth/me", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthHandler_AdminLogin_InvalidCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &mockAuthSvc{loginErr: errors.New("invalid credentials")}
	h := handlers.NewAuthHandler(svc)
	r := gin.New()
	r.POST("/api/auth/admin/login", h.AdminLogin)

	body := `{"email":"bad@admin.com","password":"wrong"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/admin/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)
}

func TestAuthHandler_RegistrarLogin_InvalidCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &mockAuthSvc{loginErr: errors.New("invalid credentials")}
	h := handlers.NewAuthHandler(svc)
	r := gin.New()
	r.POST("/api/auth/registrar/login", h.RegistrarLogin)

	body := `{"email":"baduser@ascb.edu.ph","password":"wrong"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/registrar/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)
}

func TestAuthHandler_AccountingLogin_InvalidCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &mockAuthSvc{loginErr: errors.New("invalid credentials")}
	h := handlers.NewAuthHandler(svc)
	r := gin.New()
	r.POST("/api/auth/accounting/login", h.AccountingLogin)

	body := `{"email":"baduser@ascb.edu.ph","password":"wrong"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/accounting/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, 401, w.Code)
}

func TestAuthHandler_ForgotPassword_AlwaysNeutral(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/forgot-password", bytes.NewBufferString(`{"email":"x@y.com"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "If that email exists")
}

func TestAuthHandler_ForgotPassword_RateLimited(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{forgotErr: services.ErrRateLimited})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/forgot-password", bytes.NewBufferString(`{"email":"x@y.com"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestAuthHandler_ResetPassword_Success(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/reset-password", bytes.NewBufferString(`{"token":"t","new_password":"pass1234"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthHandler_ResetPassword_InvalidToken(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{resetErr: services.ErrInvalidResetToken})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/reset-password", bytes.NewBufferString(`{"token":"bad","new_password":"pass1234"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid or expired")
}

func TestAuthHandler_CompleteProfile_Success(t *testing.T) {
	level := "College"
	dept := "CCE"
	svc := &mockAuthSvc{completeResult: &models.User{ID: 1, Email: "u@e.com", EducationLevel: &level, CollegeDepartment: &dept}}
	r := setupAuthRouter(svc)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBufferString(`{"education_level":"College","college_department":"CCE"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "CCE")
}

func TestAuthHandler_CompleteProfile_Invalid(t *testing.T) {
	r := setupAuthRouter(&mockAuthSvc{completeErr: services.ErrInvalidEducation})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBufferString(`{"education_level":"Bogus"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
