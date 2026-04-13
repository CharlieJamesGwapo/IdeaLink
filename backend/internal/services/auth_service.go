// backend/internal/services/auth_service.go
package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"
	"idealink/internal/services/mail"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ErrEmailTaken is returned by SignupUser when the email is already registered.
var ErrEmailTaken = errors.New("email already registered")

const (
	RoleUser       = "user"
	RoleAdmin      = "admin"
	RoleRegistrar  = "registrar"
	RoleAccounting = "accounting"
)

type Claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo      repository.UserRepository
	resetRepo     repository.PasswordResetRepository
	mailer        PasswordResetMailer
	rateLimiter   *RateLimiter
	jwtSecret     string
	frontendURL   string
	resetTokenTTL time.Duration
}

// PasswordResetMailer is the narrow dependency AuthService needs from mail.Sender.
type PasswordResetMailer interface {
	SendPasswordReset(to, resetLink string) error
}

// Compile-time check that mail.Sender satisfies PasswordResetMailer.
var _ PasswordResetMailer = (*mail.Sender)(nil)

func NewAuthService(
	userRepo repository.UserRepository,
	resetRepo repository.PasswordResetRepository,
	mailer PasswordResetMailer,
	jwtSecret, frontendURL string,
) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		resetRepo:     resetRepo,
		mailer:        mailer,
		rateLimiter:   NewRateLimiter(5, time.Hour),
		jwtSecret:     jwtSecret,
		frontendURL:   frontendURL,
		resetTokenTTL: 30 * time.Minute,
	}
}

func (s *AuthService) SignToken(userID int, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return token.Claims.(*Claims), nil
}

func (s *AuthService) HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

func (s *AuthService) CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) SignupUser(email, password, fullname, educationLevel string, collegeDepartment *string) (*models.User, string, error) {
	if err := validateEducation(educationLevel, collegeDepartment); err != nil {
		return nil, "", err
	}
	existing, err := s.userRepo.FindUserByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if existing != nil {
		return nil, "", ErrEmailTaken
	}
	hashed, err := s.HashPassword(password)
	if err != nil {
		return nil, "", err
	}
	user, err := s.userRepo.CreateUser(email, hashed, fullname, educationLevel, collegeDepartment)
	if err != nil {
		return nil, "", err
	}
	token, err := s.SignToken(user.ID, RoleUser)
	return user, token, err
}

func (s *AuthService) LoginUser(email, password string) (*models.User, string, error) {
	user, err := s.userRepo.FindUserByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if user == nil {
		// Dummy comparison to prevent timing-based email enumeration
		bcrypt.CompareHashAndPassword([]byte("$2a$10$dummy.hash.for.timing.protection"), []byte(password))
		return nil, "", errors.New("invalid credentials")
	}
	if !s.CheckPassword(user.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(user.ID, RoleUser)
	return user, token, err
}

func (s *AuthService) LoginAdmin(email, password string) (*models.AdminAccount, string, error) {
	admin, err := s.userRepo.FindAdminByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if admin == nil {
		// Dummy comparison to prevent timing-based email enumeration
		bcrypt.CompareHashAndPassword([]byte("$2a$10$dummy.hash.for.timing.protection"), []byte(password))
		return nil, "", errors.New("invalid credentials")
	}
	if !s.CheckPassword(admin.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(admin.ID, RoleAdmin)
	return admin, token, err
}

func (s *AuthService) LoginRegistrar(username, password string) (*models.RegistrarAccount, string, error) {
	reg, err := s.userRepo.FindRegistrarByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if reg == nil {
		// Dummy comparison to prevent timing-based username enumeration
		bcrypt.CompareHashAndPassword([]byte("$2a$10$dummy.hash.for.timing.protection"), []byte(password))
		return nil, "", errors.New("invalid credentials")
	}
	if !s.CheckPassword(reg.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(reg.ID, RoleRegistrar)
	return reg, token, err
}

func (s *AuthService) LoginAccounting(username, password string) (*models.AccountingAccount, string, error) {
	acc, err := s.userRepo.FindAccountingByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if acc == nil {
		// Dummy comparison to prevent timing-based username enumeration
		bcrypt.CompareHashAndPassword([]byte("$2a$10$dummy.hash.for.timing.protection"), []byte(password))
		return nil, "", errors.New("invalid credentials")
	}
	if !s.CheckPassword(acc.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(acc.ID, RoleAccounting)
	return acc, token, err
}

// --- Education validation ---

var allowedEducationLevels = map[string]bool{"HS": true, "SHS": true, "College": true}
var allowedCollegeDepartments = map[string]bool{
	"CCE": true, "CTE": true, "CABE": true, "CCJE": true, "TVET": true,
}

// ErrInvalidEducation indicates the education_level/college_department combo is invalid.
var ErrInvalidEducation = errors.New("invalid education level or department")

// validateEducation enforces:
//   - education_level in {HS, SHS, College}
//   - college_department required iff education_level == "College"
//   - college_department must be one of the allowed codes
func validateEducation(educationLevel string, collegeDepartment *string) error {
	if !allowedEducationLevels[educationLevel] {
		return ErrInvalidEducation
	}
	if educationLevel == "College" {
		if collegeDepartment == nil || !allowedCollegeDepartments[*collegeDepartment] {
			return ErrInvalidEducation
		}
	} else {
		if collegeDepartment != nil {
			return ErrInvalidEducation
		}
	}
	return nil
}

// --- Password reset / profile completion ---

// ErrInvalidResetToken is returned when a reset token is missing, expired, or already used.
var ErrInvalidResetToken = errors.New("invalid or expired reset token")

// ErrRateLimited is returned when the caller has exceeded the password-reset rate limit.
var ErrRateLimited = errors.New("too many requests")

// ErrPasswordTooShort mirrors the signup rule (min 6 chars).
var ErrPasswordTooShort = errors.New("password must be at least 6 characters")

func (s *AuthService) GetUserByID(userID int) (*models.User, error) {
	return s.userRepo.FindUserByID(userID)
}

func (s *AuthService) CompleteProfile(userID int, educationLevel string, collegeDepartment *string) (*models.User, error) {
	if err := validateEducation(educationLevel, collegeDepartment); err != nil {
		return nil, err
	}
	if err := s.userRepo.UpdateEducation(userID, educationLevel, collegeDepartment); err != nil {
		return nil, err
	}
	return s.userRepo.FindUserByID(userID)
}

func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func (s *AuthService) RequestPasswordReset(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if !s.rateLimiter.Allow(email) {
		return ErrRateLimited
	}
	user, err := s.userRepo.FindUserByEmail(email)
	if err != nil {
		return err
	}
	if user == nil {
		return nil
	}
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return err
	}
	rawToken := base64.RawURLEncoding.EncodeToString(rawBytes)
	tokenHash := hashResetToken(rawToken)
	expiresAt := time.Now().Add(s.resetTokenTTL)
	if err := s.resetRepo.Create(user.ID, tokenHash, expiresAt); err != nil {
		return err
	}
	link := strings.TrimRight(s.frontendURL, "/") + "/reset-password?token=" + rawToken
	if err := s.mailer.SendPasswordReset(user.Email, link); err != nil {
		fmt.Printf("[auth] password-reset mail send failed for %s: %v\n", user.Email, err)
	}
	return nil
}

func (s *AuthService) ResetPassword(rawToken, newPassword string) error {
	if len(newPassword) < 6 {
		return ErrPasswordTooShort
	}
	tokenHash := hashResetToken(rawToken)
	userID, rowID, err := s.resetRepo.FindValidByHash(tokenHash)
	if err != nil {
		if errors.Is(err, repository.ErrResetTokenNotFound) {
			return ErrInvalidResetToken
		}
		return err
	}
	hashed, err := s.HashPassword(newPassword)
	if err != nil {
		return err
	}
	if err := s.userRepo.UpdatePassword(userID, hashed); err != nil {
		return err
	}
	return s.resetRepo.MarkUsed(rowID)
}
