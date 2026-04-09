// backend/internal/services/auth_service.go
package services

import (
	"errors"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
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
		return nil, "", errors.New("email already registered")
	}
	hashed, err := s.HashPassword(password)
	if err != nil {
		return nil, "", err
	}
	user, err := s.userRepo.CreateUser(email, hashed, fullname)
	if err != nil {
		return nil, "", err
	}
	token, err := s.SignToken(user.ID, "user")
	return user, token, err
}

func (s *AuthService) LoginUser(email, password string) (*models.User, string, error) {
	user, err := s.userRepo.FindUserByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if user == nil || !s.CheckPassword(user.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(user.ID, "user")
	return user, token, err
}

func (s *AuthService) LoginAdmin(email, password string) (*models.AdminAccount, string, error) {
	admin, err := s.userRepo.FindAdminByEmail(email)
	if err != nil {
		return nil, "", err
	}
	if admin == nil || !s.CheckPassword(admin.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(admin.ID, "admin")
	return admin, token, err
}

func (s *AuthService) LoginRegistrar(username, password string) (*models.RegistrarAccount, string, error) {
	reg, err := s.userRepo.FindRegistrarByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if reg == nil || !s.CheckPassword(reg.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(reg.ID, "registrar")
	return reg, token, err
}

func (s *AuthService) LoginAccounting(username, password string) (*models.AccountingAccount, string, error) {
	acc, err := s.userRepo.FindAccountingByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if acc == nil || !s.CheckPassword(acc.Password, password) {
		return nil, "", errors.New("invalid credentials")
	}
	token, err := s.SignToken(acc.ID, "accounting")
	return acc, token, err
}
