// backend/internal/services/auth_service_test.go
package services_test

import (
	"errors"
	"testing"

	"idealink/internal/models"
	"idealink/internal/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock UserRepository ---

type mockUserRepo struct {
	users  map[string]*models.User
	admins map[string]*models.AdminAccount
	regs   map[string]*models.RegistrarAccount
	accts  map[string]*models.AccountingAccount
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users:  make(map[string]*models.User),
		admins: make(map[string]*models.AdminAccount),
		regs:   make(map[string]*models.RegistrarAccount),
		accts:  make(map[string]*models.AccountingAccount),
	}
}

func (m *mockUserRepo) CreateUser(email, hashedPassword, fullname string) (*models.User, error) {
	if _, exists := m.users[email]; exists {
		return nil, errors.New("duplicate email")
	}
	u := &models.User{ID: len(m.users) + 1, Email: email, Password: hashedPassword, Fullname: fullname}
	m.users[email] = u
	return u, nil
}
func (m *mockUserRepo) FindUserByEmail(email string) (*models.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, nil
	}
	return u, nil
}
func (m *mockUserRepo) FindAdminByEmail(email string) (*models.AdminAccount, error) {
	a, ok := m.admins[email]
	if !ok {
		return nil, nil
	}
	return a, nil
}
func (m *mockUserRepo) FindRegistrarByUsername(username string) (*models.RegistrarAccount, error) {
	r, ok := m.regs[username]
	if !ok {
		return nil, nil
	}
	return r, nil
}
func (m *mockUserRepo) FindAccountingByUsername(username string) (*models.AccountingAccount, error) {
	a, ok := m.accts[username]
	if !ok {
		return nil, nil
	}
	return a, nil
}
func (m *mockUserRepo) UpdateLastAnnouncementView(userID int) error { return nil }
func (m *mockUserRepo) CountUsers() (int, error)                    { return len(m.users), nil }

func (m *mockUserRepo) seedAdmin(email, hashedPw, fullname string) {
	m.admins[email] = &models.AdminAccount{ID: 1, Email: email, Password: hashedPw, Fullname: fullname}
}
func (m *mockUserRepo) seedRegistrar(username, hashedPw string) {
	m.regs[username] = &models.RegistrarAccount{ID: 1, Username: username, Password: hashedPw}
}
func (m *mockUserRepo) seedAccounting(username, hashedPw string) {
	m.accts[username] = &models.AccountingAccount{ID: 1, Username: username, Password: hashedPw}
}

// --- Tests ---

func TestAuthService_SignAndParseToken(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")

	token, err := svc.SignToken(42, "admin")
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := svc.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, 42, claims.UserID)
	assert.Equal(t, "admin", claims.Role)
}

func TestAuthService_ParseToken_Invalid(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	_, err := svc.ParseToken("not.a.token")
	assert.Error(t, err)
}

func TestAuthService_HashAndCheckPassword(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	hashed, err := svc.HashPassword("mypassword")
	require.NoError(t, err)
	assert.True(t, svc.CheckPassword(hashed, "mypassword"))
	assert.False(t, svc.CheckPassword(hashed, "wrongpassword"))
}

func TestAuthService_SignupUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")

	user, token, err := svc.SignupUser("jane@test.com", "pass123", "Jane Doe")
	require.NoError(t, err)
	assert.Equal(t, "jane@test.com", user.Email)
	assert.NotEmpty(t, token)

	// Duplicate signup
	_, _, err = svc.SignupUser("jane@test.com", "pass123", "Jane Doe")
	assert.EqualError(t, err, "email already registered")
}

func TestAuthService_LoginUser_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	_, _, err := svc.SignupUser("john@test.com", "pass123", "John")
	require.NoError(t, err)

	user, token, err := svc.LoginUser("john@test.com", "pass123")
	require.NoError(t, err)
	assert.Equal(t, "john@test.com", user.Email)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginUser_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	_, _, err := svc.SignupUser("john@test.com", "pass123", "John")
	require.NoError(t, err)

	_, _, err = svc.LoginUser("john@test.com", "wrongpass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginUser_NotFound(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	_, _, err := svc.LoginUser("nobody@test.com", "pass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginAdmin_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	hashed, err := svc.HashPassword("adminpass")
	require.NoError(t, err)
	repo.seedAdmin("admin@test.com", hashed, "Admin")

	admin, token, err := svc.LoginAdmin("admin@test.com", "adminpass")
	require.NoError(t, err)
	assert.Equal(t, "admin@test.com", admin.Email)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginAdmin_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	hashed, _ := svc.HashPassword("adminpass")
	repo.seedAdmin("admin@test.com", hashed, "Admin")

	_, _, err := svc.LoginAdmin("admin@test.com", "wrong")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginAdmin_NotFound(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), "test-secret")
	_, _, err := svc.LoginAdmin("nobody@test.com", "pass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginRegistrar_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	hashed, err := svc.HashPassword("regpass")
	require.NoError(t, err)
	repo.seedRegistrar("registrar", hashed)

	reg, token, err := svc.LoginRegistrar("registrar", "regpass")
	require.NoError(t, err)
	assert.Equal(t, "registrar", reg.Username)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginRegistrar_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	hashed, _ := svc.HashPassword("regpass")
	repo.seedRegistrar("registrar", hashed)

	_, _, err := svc.LoginRegistrar("registrar", "wrong")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginAccounting_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	hashed, err := svc.HashPassword("acctpass")
	require.NoError(t, err)
	repo.seedAccounting("accounting", hashed)

	acc, token, err := svc.LoginAccounting("accounting", "acctpass")
	require.NoError(t, err)
	assert.Equal(t, "accounting", acc.Username)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginAccounting_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, "test-secret")
	hashed, _ := svc.HashPassword("acctpass")
	repo.seedAccounting("accounting", hashed)

	_, _, err := svc.LoginAccounting("accounting", "wrong")
	assert.EqualError(t, err, "invalid credentials")
}
