package services

import (
	"errors"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"
)

const highlightTTL = 24 * time.Hour

var ErrSuggestionNotFound = errors.New("suggestion not found")

type HighlightService struct {
	repo           repository.HighlightRepository
	suggestionRepo repository.SuggestionRepository
}

func NewHighlightService(repo repository.HighlightRepository, suggestionRepo repository.SuggestionRepository) *HighlightService {
	return &HighlightService{repo: repo, suggestionRepo: suggestionRepo}
}

func (s *HighlightService) Create(suggestionID, adminID int) (int, error) {
	sugg, err := s.suggestionRepo.FindByID(suggestionID)
	if err != nil {
		return 0, err
	}
	if sugg == nil {
		return 0, ErrSuggestionNotFound
	}
	return s.repo.Create(suggestionID, adminID, highlightTTL)
}

func (s *HighlightService) Expire(id int) error {
	return s.repo.Expire(id)
}

func (s *HighlightService) List(viewerUserID int) ([]*models.Highlight, error) {
	return s.repo.ListActive(viewerUserID)
}

func (s *HighlightService) ActiveSuggestionIDs() (map[int]int, error) {
	return s.repo.ActiveSuggestionIDs()
}

func (s *HighlightService) ToggleReact(highlightID, userID int) (int, bool, error) {
	active, err := s.repo.IsActive(highlightID)
	if err != nil {
		return 0, false, err
	}
	if !active {
		return 0, false, repository.ErrHighlightNotFoundOrExpired
	}
	return s.repo.ToggleReact(highlightID, userID)
}
