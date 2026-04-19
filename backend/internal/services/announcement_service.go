package services

import (
	"idealink/internal/models"
	"idealink/internal/repository"
)

type AnnouncementService struct {
	repo     repository.AnnouncementRepository
	userRepo repository.UserRepository
}

func NewAnnouncementService(repo repository.AnnouncementRepository, userRepo repository.UserRepository) *AnnouncementService {
	return &AnnouncementService{repo: repo, userRepo: userRepo}
}

func (s *AnnouncementService) List() ([]*models.Announcement, error) {
	return s.repo.FindAll()
}

func (s *AnnouncementService) Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error) {
	return s.repo.Create(adminID, input)
}

func (s *AnnouncementService) Update(id int, input models.UpdateAnnouncementInput) error {
	return s.repo.Update(id, input)
}

func (s *AnnouncementService) Delete(id int) error {
	return s.repo.Delete(id)
}

// UnreadCount returns the number of announcements posted after the user's
// last_announcement_view timestamp.
func (s *AnnouncementService) UnreadCount(userID int) (int, error) {
	user, err := s.userRepo.FindUserByID(userID)
	if err != nil || user == nil {
		return 0, err
	}
	return s.repo.CountSince(user.LastAnnouncementView)
}

// MarkSeen records the current time as the user's last_announcement_view,
// clearing their unread badge.
func (s *AnnouncementService) MarkSeen(userID int) error {
	return s.userRepo.UpdateLastAnnouncementView(userID)
}
