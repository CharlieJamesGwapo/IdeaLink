package services

import (
	"errors"
	"time"

	"idealink/internal/models"
	"idealink/internal/repository"
)

// WeeklySubmissionLimit caps how many suggestions a single user can submit
// within one ISO week. Resets at Monday 00:00 local time (Asia/Manila).
const WeeklySubmissionLimit = 5

// ErrWeeklyLimitReached is returned when a user has already submitted
// WeeklySubmissionLimit times in the current ISO week.
var ErrWeeklyLimitReached = errors.New("weekly submission limit reached")

// ErrRatingRequired is returned when a submission is missing a valid 1-5 rating.
var ErrRatingRequired = errors.New("rating is required (1-5)")

// manilaLocation returns the Asia/Manila time zone, falling back to UTC if
// the zoneinfo database isn't available in the runtime image.
func manilaLocation() *time.Location {
	if loc, err := time.LoadLocation("Asia/Manila"); err == nil {
		return loc
	}
	// Manila is UTC+8 with no DST — a fixed offset is a safe fallback.
	return time.FixedZone("Asia/Manila", 8*60*60)
}

// currentWeekBoundary returns [startOfWeek, startOfNextWeek) in UTC,
// using Monday 00:00 Manila time as the boundary.
func currentWeekBoundary() (time.Time, time.Time) {
	loc := manilaLocation()
	now := time.Now().In(loc)
	// Go's Weekday: Sunday=0..Saturday=6. Shift so Monday=0.
	offset := (int(now.Weekday()) + 6) % 7
	monday := time.Date(now.Year(), now.Month(), now.Day()-offset, 0, 0, 0, 0, loc)
	nextMonday := monday.Add(7 * 24 * time.Hour)
	return monday.UTC(), nextMonday.UTC()
}

type SuggestionService struct {
	repo     repository.SuggestionRepository
	testRepo repository.TestimonialRepository
}

func NewSuggestionService(
	repo repository.SuggestionRepository,
	testRepo repository.TestimonialRepository,
) *SuggestionService {
	return &SuggestionService{repo: repo, testRepo: testRepo}
}

func (s *SuggestionService) Submit(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error) {
	if input.Department != "Registrar Office" && input.Department != "Finance Office" {
		return nil, errors.New("department must be 'Registrar Office' or 'Finance Office'")
	}
	if input.Rating == nil || *input.Rating < 1 || *input.Rating > 5 {
		return nil, ErrRatingRequired
	}
	startOfWeek, _ := currentWeekBoundary()
	used, err := s.repo.CountSubmissionsSince(userID, startOfWeek)
	if err != nil {
		return nil, err
	}
	if used >= WeeklySubmissionLimit {
		return nil, ErrWeeklyLimitReached
	}
	return s.repo.Create(userID, input)
}

// WeeklyUsage describes how many submissions a user has used this ISO week
// and when the window resets (next Monday 00:00 Manila time, as UTC).
type WeeklyUsage struct {
	Used     int       `json:"used"`
	Limit    int       `json:"limit"`
	ResetsAt time.Time `json:"resets_at"`
}

// WeeklyUsageFor returns the user's current submission count and the moment
// the window rolls over. Used by the submit UI to render the counter.
func (s *SuggestionService) WeeklyUsageFor(userID int) (*WeeklyUsage, error) {
	startOfWeek, nextWeek := currentWeekBoundary()
	used, err := s.repo.CountSubmissionsSince(userID, startOfWeek)
	if err != nil {
		return nil, err
	}
	return &WeeklyUsage{
		Used:     used,
		Limit:    WeeklySubmissionLimit,
		ResetsAt: nextWeek,
	}, nil
}

func (s *SuggestionService) ListForRole(userID int, role string) ([]*models.Suggestion, error) {
	switch role {
	case RoleAdmin:
		return s.repo.FindAll()
	case RoleRegistrar:
		return s.repo.FindByDepartment("Registrar Office")
	case RoleAccounting:
		return s.repo.FindByDepartment("Finance Office")
	default:
		return s.repo.FindByUserID(userID)
	}
}

func (s *SuggestionService) UpdateStatus(id int, status string) error {
	if status != "Delivered" && status != "Reviewed" {
		return errors.New("status must be 'Delivered' or 'Reviewed'")
	}
	if err := s.repo.UpdateStatus(id, status); err != nil {
		return err
	}
	// Mark as read when status is explicitly updated by staff
	return s.repo.MarkAsRead(id)
}

// MarkReviewedOnOpen auto-marks the suggestion as Reviewed when staff opens
// the detail view. No-op if the suggestion is already Reviewed.
func (s *SuggestionService) MarkReviewedOnOpen(id int) error {
	existing, err := s.repo.FindByID(id)
	if err != nil || existing == nil {
		return err
	}
	if existing.Status == "Reviewed" {
		// Still mark as read so the unread-feedback badge clears.
		return s.repo.MarkAsRead(id)
	}
	if err := s.repo.UpdateStatus(id, "Reviewed"); err != nil {
		return err
	}
	return s.repo.MarkAsRead(id)
}

// MarkStatusSeenByUser clears the status-change notification for a user's own
// submissions. Call when the user opens their submissions page.
func (s *SuggestionService) MarkStatusSeenByUser(userID int) error {
	return s.repo.MarkStatusSeenByUser(userID)
}

// CountStatusUnreadByUser tells the user-side UI how many of their submissions
// have had a status change the user hasn't acknowledged.
func (s *SuggestionService) CountStatusUnreadByUser(userID int) (int, error) {
	return s.repo.CountStatusUnreadByUser(userID)
}

// SoftDelete marks the suggestion as deleted. Admin, registrar, and finance can
// all call this — staff manage their own department's feedback, admin manages
// everything. See handler for role-scoped authorization.
func (s *SuggestionService) SoftDelete(id int) error {
	return s.repo.SoftDelete(id)
}

// FindByID exposes the repo lookup so handlers can run role-scoped checks
// before mutating (e.g., "does this feedback belong to the caller's office?").
func (s *SuggestionService) FindByID(id int) (*models.Suggestion, error) {
	return s.repo.FindByID(id)
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
