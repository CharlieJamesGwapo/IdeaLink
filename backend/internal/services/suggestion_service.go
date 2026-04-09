package services

import (
	"errors"
	"idealink/internal/models"
	"idealink/internal/repository"
)

type SuggestionService struct {
	repo     repository.SuggestionRepository
	userRepo repository.UserRepository
	testRepo repository.TestimonialRepository
}

func NewSuggestionService(
	repo repository.SuggestionRepository,
	userRepo repository.UserRepository,
	testRepo repository.TestimonialRepository,
) *SuggestionService {
	return &SuggestionService{repo: repo, userRepo: userRepo, testRepo: testRepo}
}

func (s *SuggestionService) Submit(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error) {
	if input.Department != "Registrar" && input.Department != "Accounting Office" {
		return nil, errors.New("department must be 'Registrar' or 'Accounting Office'")
	}
	return s.repo.Create(userID, input)
}

func (s *SuggestionService) ListForRole(userID int, role string) ([]*models.Suggestion, error) {
	switch role {
	case RoleAdmin:
		return s.repo.FindAll()
	case RoleRegistrar:
		return s.repo.FindByDepartment("Registrar")
	case RoleAccounting:
		return s.repo.FindByDepartment("Accounting Office")
	default:
		return s.repo.FindByUserID(userID)
	}
}

func (s *SuggestionService) UpdateStatus(id int, status string) error {
	if status != "Pending" && status != "Reviewed" {
		return errors.New("status must be 'Pending' or 'Reviewed'")
	}
	return s.repo.UpdateStatus(id, status)
}

func (s *SuggestionService) Feature(suggestionID int) (*models.Testimonial, error) {
	suggestion, err := s.repo.FindByID(suggestionID)
	if err != nil {
		return nil, err
	}
	if suggestion == nil {
		return nil, errors.New("suggestion not found")
	}
	name := "Anonymous"
	if !suggestion.Anonymous && suggestion.SubmitterName != "" {
		name = suggestion.SubmitterName
	}
	return s.testRepo.Create(suggestionID, name, suggestion.Department, suggestion.Description)
}
