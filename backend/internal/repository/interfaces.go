package repository

import (
	"time"

	"idealink/internal/models"
)

type UserRepository interface {
	CreateUser(email, hashedPassword, fullname, educationLevel string, collegeDepartment *string) (*models.User, error)
	FindUserByEmail(email string) (*models.User, error)
	FindUserByID(id int) (*models.User, error)
	UpdatePassword(userID int, hashedPassword string) error
	UpdateProfile(userID int, educationLevel string, collegeDepartment *string, gradeLevel *string) error
	FindAdminByEmail(email string) (*models.AdminAccount, error)
	FindRegistrarByEmail(email string) (*models.RegistrarAccount, error)
	FindAccountingByEmail(email string) (*models.AccountingAccount, error)
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
	MarkStatusSeenByUser(userID int) error
	CountStatusUnreadByUser(userID int) (int, error)
	CountUnread() (int, error)
	CountUnreadByDepartment(department string) (int, error)
	CountSubmissionsSince(userID int, cutoff time.Time) (int, error)
	GetRatingSummary() ([]*models.RatingGroup, error)
	GetAnalytics() (*models.Analytics, error)
	SoftDelete(id int) error
}

type AnnouncementRepository interface {
	FindAll() ([]*models.Announcement, error)
	Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error)
	Update(id int, input models.UpdateAnnouncementInput) error
	Delete(id int) error
	CountSince(cutoff interface{}) (int, error)
}

type TestimonialRepository interface {
	FindActive() ([]*models.Testimonial, error)
	Create(suggestionID int, name, department, message string) (*models.Testimonial, error)
	ToggleActive(id int) (*models.Testimonial, error)
}

type OfficeHoursRepository interface {
	// EnsureRow returns the office_hours row for a department, creating it on
	// first call and seeding 7 default schedule rows (Mon-Fri 8-17, Sat/Sun closed).
	EnsureRow(department string) (*models.OfficeHours, error)
	GetByDepartment(department string) (*models.OfficeHours, error)
	GetSchedule(officeHoursID int) ([]models.DaySchedule, error)
	ReplaceSchedule(officeHoursID int, schedule []models.DaySchedule) error
}

type PasswordResetRepository interface {
	Create(userID int, tokenHash string, expiresAt time.Time) error
	FindValidByHash(tokenHash string) (userID int, id int, err error)
	MarkUsed(id int) error
}

type SuggestionAttachmentRepository interface {
	Create(suggestionID int, filename, mimeType string, data []byte) (*models.SuggestionAttachment, error)
	ListBySuggestion(suggestionID int) ([]*models.SuggestionAttachment, error)
	CountBySuggestion(suggestionID int) (int, error)
	FindBlob(attachmentID int) (*models.SuggestionAttachment, []byte, error)
}

type ServiceRepository interface {
	ListByDepartment(department string, activeOnly bool) ([]*models.Service, error)
	ListAll() ([]*models.Service, error)
	FindByID(id int) (*models.Service, error)
	Create(in models.CreateServiceInput) (*models.Service, error)
	Update(id int, in models.UpdateServiceInput) (*models.Service, error)
}
