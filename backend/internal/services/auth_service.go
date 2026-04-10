// backend/internal/services/auth_service.go
package services

import (
	"errors"
	"fmt"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"

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
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, jwtSecret: jwtSecret}
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

func (s *AuthService) SignupUser(email, password, fullname string) (*models.User, string, error) {
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
	user, err := s.userRepo.CreateUser(email, hashed, fullname)
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
