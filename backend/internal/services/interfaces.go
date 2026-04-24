// backend/internal/services/interfaces.go
package services

import "idealink/internal/models"

// AuthServicer defines the auth operations used by handlers.
type AuthServicer interface {
	SignToken(userID int, role string) (string, error)
	ParseToken(tokenStr string) (*Claims, error)
	HashPassword(password string) (string, error)
	CheckPassword(hash, password string) bool
	SignupUser(email, password, fullname, educationLevel string, collegeDepartment *string) (*models.User, string, error)
	LoginUser(email, password string) (*models.User, string, error)
	LoginAdmin(email, password string) (*models.AdminAccount, string, error)
	LoginRegistrar(email, password string) (*models.RegistrarAccount, string, error)
	LoginAccounting(email, password string) (*models.AccountingAccount, string, error)

	GetUserByID(userID int) (*models.User, error)
	RequestPasswordReset(email string) error
	ResetPassword(rawToken, newPassword string) error
	CompleteProfile(userID int, educationLevel string, collegeDepartment *string) (*models.User, error)
}

// Mailer is the minimal interface the auth and provisioning services need
// from the email subsystem. *mail.Sender and *mail.AuditingSender both
// satisfy it. Kept here (not in package mail) so package mail stays free of
// application-level concerns.
type Mailer interface {
	SendPasswordReset(to, resetLink string) error
	SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error
}
