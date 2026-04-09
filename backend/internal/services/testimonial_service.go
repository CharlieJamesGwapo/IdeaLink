package services

import (
	"idealink/internal/models"
	"idealink/internal/repository"
)

type TestimonialService struct {
	repo repository.TestimonialRepository
}

func NewTestimonialService(repo repository.TestimonialRepository) *TestimonialService {
	return &TestimonialService{repo: repo}
}

func (s *TestimonialService) ListActive() ([]*models.Testimonial, error) {
	return s.repo.FindActive()
}

func (s *TestimonialService) Toggle(id int) (*models.Testimonial, error) {
	return s.repo.ToggleActive(id)
}

func (s *TestimonialService) CreateFromSuggestion(suggestionID int, name, department, message string) (*models.Testimonial, error) {
	return s.repo.Create(suggestionID, name, department, message)
}
