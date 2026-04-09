// backend/internal/repository/interfaces.go
package repository

import "idealink/internal/models"

type UserRepository interface {
	CreateUser(email, hashedPassword, fullname string) (*models.User, error)
	FindUserByEmail(email string) (*models.User, error)
	FindAdminByEmail(email string) (*models.AdminAccount, error)
	FindRegistrarByUsername(username string) (*models.RegistrarAccount, error)
	FindAccountingByUsername(username string) (*models.AccountingAccount, error)
	UpdateLastAnnouncementView(userID int) error
	CountUsers() (int, error)
}

type SuggestionRepository interface {
	Create(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error)
	FindAll() ([]*models.Suggestion, error)
	FindByDepartment(department string) ([]*models.Suggestion, error)
	FindByUserID(userID int) ([]*models.Suggestion, error)
	FindByID(id int) (*models.Suggestion, error)
	UpdateStatus(id int, status string) error
	MarkAsRead(id int) error
	GetAnalytics() (*models.Analytics, error)
}

type AnnouncementRepository interface {
	FindAll() ([]*models.Announcement, error)
	Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error)
	Update(id int, input models.UpdateAnnouncementInput) error
	Delete(id int) error
}

type TestimonialRepository interface {
	FindActive() ([]*models.Testimonial, error)
	Create(suggestionID int, name, department, message string) (*models.Testimonial, error)
	ToggleActive(id int) (*models.Testimonial, error)
}
