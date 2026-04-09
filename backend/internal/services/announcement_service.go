package services

import (
	"idealink/internal/models"
	"idealink/internal/repository"
)

type AnnouncementService struct {
	repo repository.AnnouncementRepository
}

func NewAnnouncementService(repo repository.AnnouncementRepository) *AnnouncementService {
	return &AnnouncementService{repo: repo}
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
