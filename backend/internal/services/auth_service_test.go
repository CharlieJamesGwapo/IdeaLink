// backend/internal/services/auth_service_test.go
package services_test

import (
	"errors"
	"testing"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"
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

func (m *mockUserRepo) CreateUser(email, hashedPassword, fullname, educationLevel string, collegeDepartment *string) (*models.User, error) {
	if _, exists := m.users[email]; exists {
		return nil, errors.New("duplicate email")
	}
	u := &models.User{
		ID:                len(m.users) + 1,
		Email:             email,
		Password:          hashedPassword,
		Fullname:          fullname,
		EducationLevel:    &educationLevel,
		CollegeDepartment: collegeDepartment,
	}
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
func (m *mockUserRepo) FindRegistrarByEmail(email string) (*models.RegistrarAccount, error) {
	r, ok := m.regs[email]
	if !ok {
		return nil, nil
	}
	return r, nil
}
func (m *mockUserRepo) FindAccountingByEmail(email string) (*models.AccountingAccount, error) {
	a, ok := m.accts[email]
	if !ok {
		return nil, nil
	}
	return a, nil
}
func (m *mockUserRepo) UpdateLastAnnouncementView(userID int) error { return nil }
func (m *mockUserRepo) CountUsers() (int, error)                    { return len(m.users), nil }

func (m *mockUserRepo) FindUserByID(id int) (*models.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}
func (m *mockUserRepo) UpdatePassword(userID int, hashedPassword string) error {
	for _, u := range m.users {
		if u.ID == userID {
			u.Password = hashedPassword
			return nil
		}
	}
	return nil
}
func (m *mockUserRepo) UpdateProfile(userID int, level string, dept *string, grade *string) error {
	for _, u := range m.users {
		if u.ID == userID {
			u.EducationLevel = &level
			u.CollegeDepartment = dept
			u.GradeLevel = grade
			return nil
		}
	}
	return nil
}

func (m *mockUserRepo) seedAdmin(email, hashedPw, fullname string) {
	m.admins[email] = &models.AdminAccount{ID: 1, Email: email, Password: hashedPw, Fullname: fullname}
}
func (m *mockUserRepo) seedRegistrar(email, hashedPw string) {
	m.regs[email] = &models.RegistrarAccount{ID: 1, Email: email, Password: hashedPw}
}
func (m *mockUserRepo) seedAccounting(email, hashedPw string) {
	m.accts[email] = &models.AccountingAccount{ID: 1, Email: email, Password: hashedPw}
}

// --- Mock PasswordResetRepository ---

type mockResetRepo struct {
	created   []string // captured token_hashes (in order)
	validHash string
	validUser int
	validID   int
	used      []int
}

func (m *mockResetRepo) Create(userID int, tokenHash string, expiresAt time.Time) error {
	m.created = append(m.created, tokenHash)
	return nil
}
func (m *mockResetRepo) FindValidByHash(tokenHash string) (int, int, error) {
	if tokenHash == m.validHash {
		return m.validUser, m.validID, nil
	}
	return 0, 0, repository.ErrResetTokenNotFound
}
func (m *mockResetRepo) MarkUsed(id int) error {
	m.used = append(m.used, id)
	return nil
}

// --- Mock mailer ---

type sentMail struct{ To, Link string }

type mockMailer struct {
	sent []sentMail
}

func (m *mockMailer) SendPasswordReset(to, link string) error {
	m.sent = append(m.sent, sentMail{to, link})
	return nil
}

// SendNewUserCredentials is unused by AuthService tests but is required to
// satisfy the services.Mailer interface (which AuthService now depends on).
func (m *mockMailer) SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error {
	return nil
}

// --- Tests ---

func TestAuthService_SignAndParseToken(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")

	token, err := svc.SignToken(42, "admin")
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := svc.ParseToken(token)
	require.NoError(t, err)
	assert.Equal(t, 42, claims.UserID)
	assert.Equal(t, "admin", claims.Role)
}

func TestAuthService_ParseToken_Invalid(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	_, err := svc.ParseToken("not.a.token")
	assert.Error(t, err)
}

func TestAuthService_HashAndCheckPassword(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	hashed, err := svc.HashPassword("mypassword")
	require.NoError(t, err)
	assert.True(t, svc.CheckPassword(hashed, "mypassword"))
	assert.False(t, svc.CheckPassword(hashed, "wrongpassword"))
}

func TestAuthService_SignupUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")

	user, token, err := svc.SignupUser("jane@test.com", "pass123", "Jane Doe", "HS", nil)
	require.NoError(t, err)
	assert.Equal(t, "jane@test.com", user.Email)
	assert.NotEmpty(t, token)

	// Duplicate signup
	_, _, err = svc.SignupUser("jane@test.com", "pass123", "Jane Doe", "HS", nil)
	assert.EqualError(t, err, "email already registered")
}

func TestAuthService_LoginUser_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	_, _, err := svc.SignupUser("john@test.com", "pass123", "John", "HS", nil)
	require.NoError(t, err)

	user, token, err := svc.LoginUser("john@test.com", "pass123")
	require.NoError(t, err)
	assert.Equal(t, "john@test.com", user.Email)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginUser_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	_, _, err := svc.SignupUser("john@test.com", "pass123", "John", "HS", nil)
	require.NoError(t, err)

	_, _, err = svc.LoginUser("john@test.com", "wrongpass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginUser_NotFound(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	_, _, err := svc.LoginUser("nobody@test.com", "pass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginAdmin_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
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
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	hashed, _ := svc.HashPassword("adminpass")
	repo.seedAdmin("admin@test.com", hashed, "Admin")

	_, _, err := svc.LoginAdmin("admin@test.com", "wrong")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginAdmin_NotFound(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	_, _, err := svc.LoginAdmin("nobody@test.com", "pass")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginRegistrar_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	hashed, err := svc.HashPassword("regpass")
	require.NoError(t, err)
	repo.seedRegistrar("registrar@ascb.edu.ph", hashed)

	reg, token, err := svc.LoginRegistrar("registrar@ascb.edu.ph", "regpass")
	require.NoError(t, err)
	assert.Equal(t, "registrar@ascb.edu.ph", reg.Email)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginRegistrar_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	hashed, _ := svc.HashPassword("regpass")
	repo.seedRegistrar("registrar@ascb.edu.ph", hashed)

	_, _, err := svc.LoginRegistrar("registrar@ascb.edu.ph", "wrong")
	assert.EqualError(t, err, "invalid credentials")
}

func TestAuthService_LoginAccounting_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	hashed, err := svc.HashPassword("acctpass")
	require.NoError(t, err)
	repo.seedAccounting("finance@ascb.edu.ph", hashed)

	acc, token, err := svc.LoginAccounting("finance@ascb.edu.ph", "acctpass")
	require.NoError(t, err)
	assert.Equal(t, "finance@ascb.edu.ph", acc.Email)
	assert.NotEmpty(t, token)
}

func TestAuthService_LoginAccounting_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "test-secret", "https://frontend.test")
	hashed, _ := svc.HashPassword("acctpass")
	repo.seedAccounting("finance@ascb.edu.ph", hashed)

	_, _, err := svc.LoginAccounting("finance@ascb.edu.ph", "wrong")
	assert.EqualError(t, err, "invalid credentials")
}

// --- Education validation ---

func TestAuthService_SignupUser_RejectsMissingEducation(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "", nil)
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_SignupUser_RejectsCollegeWithoutDept(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "College", nil)
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_SignupUser_RejectsNonCollegeWithDept(t *testing.T) {
	dept := "CCE"
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "HS", &dept)
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_SignupUser_AcceptsHS(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	u, tok, err := svc.SignupUser("a@b.com", "pass123", "Alice", "HS", nil)
	require.NoError(t, err)
	assert.NotEmpty(t, tok)
	assert.NotNil(t, u)
}

func TestAuthService_SignupUser_AcceptsCollegeWithDept(t *testing.T) {
	dept := "CTE"
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	u, _, err := svc.SignupUser("a@b.com", "pass123", "Alice", "College", &dept)
	require.NoError(t, err)
	assert.NotNil(t, u)
}

// --- Password reset ---

func TestAuthService_RequestPasswordReset_UnknownEmailSucceedsSilently(t *testing.T) {
	resetRepo := &mockResetRepo{}
	mailer := &mockMailer{}
	svc := services.NewAuthService(newMockUserRepo(), resetRepo, mailer, "s", "https://f")
	err := svc.RequestPasswordReset("nobody@example.com")
	assert.NoError(t, err)
	assert.Empty(t, resetRepo.created)
	assert.Empty(t, mailer.sent)
}

func TestAuthService_RequestPasswordReset_KnownEmailSendsMail(t *testing.T) {
	repo := newMockUserRepo()
	resetRepo := &mockResetRepo{}
	mailer := &mockMailer{}
	svc := services.NewAuthService(repo, resetRepo, mailer, "s", "https://f.test")
	// Seed a user
	_, _, err := svc.SignupUser("u@e.com", "pass123", "U", "HS", nil)
	require.NoError(t, err)

	err = svc.RequestPasswordReset("u@e.com")
	require.NoError(t, err)
	assert.Len(t, resetRepo.created, 1)
	assert.Len(t, mailer.sent, 1)
	assert.Contains(t, mailer.sent[0].Link, "https://f.test/reset-password?token=")
}

func TestAuthService_RequestPasswordReset_RateLimits(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, _, err := svc.SignupUser("u@e.com", "pass123", "U", "HS", nil)
	require.NoError(t, err)

	var lastErr error
	for i := 0; i < 10; i++ {
		lastErr = svc.RequestPasswordReset("u@e.com")
		if lastErr != nil {
			break
		}
	}
	assert.ErrorIs(t, lastErr, services.ErrRateLimited)
}

func TestAuthService_ResetPassword_InvalidToken(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	err := svc.ResetPassword("bogus", "newpass123")
	assert.ErrorIs(t, err, services.ErrInvalidResetToken)
}

func TestAuthService_ResetPassword_ShortPassword(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	err := svc.ResetPassword("anytoken", "short")
	assert.ErrorIs(t, err, services.ErrPasswordTooShort)
}

func TestAuthService_ResetPassword_ValidFlow(t *testing.T) {
	repo := newMockUserRepo()
	resetRepo := &mockResetRepo{}
	mailer := &mockMailer{}
	svc := services.NewAuthService(repo, resetRepo, mailer, "s", "https://f")
	_, _, err := svc.SignupUser("u@e.com", "pass123", "U", "HS", nil)
	require.NoError(t, err)

	// Request a reset so the service creates and hashes a token.
	err = svc.RequestPasswordReset("u@e.com")
	require.NoError(t, err)
	require.Len(t, resetRepo.created, 1)
	require.Len(t, mailer.sent, 1)

	// Extract raw token from the emailed link.
	link := mailer.sent[0].Link
	const prefix = "https://f/reset-password?token="
	require.Contains(t, link, prefix)
	rawToken := link[len(prefix):]

	// Seed the mock to return success for this token's hash.
	resetRepo.validHash = resetRepo.created[0]
	resetRepo.validUser = 1
	resetRepo.validID = 7

	err = svc.ResetPassword(rawToken, "newpass123")
	require.NoError(t, err)
	assert.Equal(t, []int{7}, resetRepo.used)
}

// --- Complete profile ---

func TestAuthService_CompleteProfile_ValidatesAndPersists(t *testing.T) {
	repo := newMockUserRepo()
	svc := services.NewAuthService(repo, &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	u, _, err := svc.SignupUser("u@e.com", "pass123", "U", "HS", nil)
	require.NoError(t, err)

	dept := "CCE"
	updated, err := svc.CompleteProfile(u.ID, "College", &dept)
	require.NoError(t, err)
	require.NotNil(t, updated)
	require.NotNil(t, updated.EducationLevel)
	assert.Equal(t, "College", *updated.EducationLevel)
	require.NotNil(t, updated.CollegeDepartment)
	assert.Equal(t, "CCE", *updated.CollegeDepartment)

	_, err = svc.CompleteProfile(u.ID, "Bogus", nil)
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

// --- grade_level validation ---

func TestAuthService_ValidateEducation_HSRequiresJuniorGrade(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, err := svc.UpdateProfile(1, "HS", nil, ptr("11"))
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_ValidateEducation_SHSRequiresSeniorGrade(t *testing.T) {
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, err := svc.UpdateProfile(1, "SHS", nil, ptr("9"))
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func TestAuthService_ValidateEducation_CollegeRejectsGrade(t *testing.T) {
	dept := "CCE"
	svc := services.NewAuthService(newMockUserRepo(), &mockResetRepo{}, &mockMailer{}, "s", "https://f")
	_, err := svc.UpdateProfile(1, "College", &dept, ptr("12"))
	assert.ErrorIs(t, err, services.ErrInvalidEducation)
}

func ptr(s string) *string { return &s }
