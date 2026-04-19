package services

import (
	"crypto/rand"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strings"

	"idealink/internal/models"
	"idealink/internal/repository"
)

// CredentialsMailer is the narrow dependency UserProvisioningService needs
// from mail.Sender — sending freshly minted account credentials.
type CredentialsMailer interface {
	SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error
}

type UserProvisioningService struct {
	userRepo    repository.UserRepository
	auth        *AuthService
	mailer      CredentialsMailer
	frontendURL string
}

func NewUserProvisioningService(
	userRepo repository.UserRepository,
	auth *AuthService,
	mailer CredentialsMailer,
	frontendURL string,
) *UserProvisioningService {
	return &UserProvisioningService{userRepo: userRepo, auth: auth, mailer: mailer, frontendURL: frontendURL}
}

// ProvisionInput is one row worth of account data coming from the admin UI
// or a CSV import.
type ProvisionInput struct {
	Email             string  `json:"email" binding:"required"`
	Fullname          string  `json:"fullname" binding:"required"`
	EducationLevel    string  `json:"education_level" binding:"required"`
	CollegeDepartment *string `json:"college_department"`
}

// ProvisionResult reports what happened for a single row — useful for bulk
// CSV imports so admins can see partial successes and per-row errors.
type ProvisionResult struct {
	Email       string `json:"email"`
	Fullname    string `json:"fullname"`
	Status      string `json:"status"` // "created" | "skipped" | "error"
	Error       string `json:"error,omitempty"`
	RawPassword string `json:"-"` // never serialize to HTTP response
}

// generateTempPassword returns a reasonably random 10-char password that is
// ASCII, URL-safe, and avoids confusing characters (0/O, l/1, I).
func generateTempPassword() (string, error) {
	const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$"
	const length = 10
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, length)
	for i, v := range b {
		out[i] = charset[int(v)%len(charset)]
	}
	return string(out), nil
}

// ProvisionOne creates exactly one user and emails credentials.
// Duplicate-email results in status="skipped".
func (s *UserProvisioningService) ProvisionOne(input ProvisionInput) (ProvisionResult, error) {
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	res := ProvisionResult{Email: input.Email, Fullname: input.Fullname}

	if err := validateEducation(input.EducationLevel, input.CollegeDepartment); err != nil {
		res.Status = "error"
		res.Error = "invalid education level/department"
		return res, nil
	}
	existing, err := s.userRepo.FindUserByEmail(input.Email)
	if err != nil {
		res.Status = "error"
		res.Error = err.Error()
		return res, nil
	}
	if existing != nil {
		res.Status = "skipped"
		res.Error = "email already registered"
		return res, nil
	}

	rawPw, err := generateTempPassword()
	if err != nil {
		res.Status = "error"
		res.Error = err.Error()
		return res, nil
	}
	hashed, err := s.auth.HashPassword(rawPw)
	if err != nil {
		res.Status = "error"
		res.Error = err.Error()
		return res, nil
	}
	if _, err := s.userRepo.CreateUser(input.Email, hashed, input.Fullname, input.EducationLevel, input.CollegeDepartment); err != nil {
		res.Status = "error"
		res.Error = err.Error()
		return res, nil
	}

	// Use the first FRONTEND_URL as the canonical login link.
	primary := s.frontendURL
	if idx := strings.Index(primary, ","); idx >= 0 {
		primary = primary[:idx]
	}
	primary = strings.TrimSpace(strings.TrimRight(primary, "/"))
	loginURL := primary + "/login"

	if err := s.mailer.SendNewUserCredentials(input.Email, input.Fullname, rawPw, loginURL); err != nil {
		// Account still exists — surface the email error but report success.
		fmt.Printf("[provisioning] credentials email failed for %s: %v\n", input.Email, err)
	}
	res.Status = "created"
	res.RawPassword = rawPw
	return res, nil
}

// ProvisionFromCSV reads a CSV with headers:
//   email,fullname,education_level,college_department
// and provisions each row. Unknown columns are ignored. Empty lines skipped.
func (s *UserProvisioningService) ProvisionFromCSV(r io.Reader) ([]ProvisionResult, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1 // allow variable column counts

	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, errors.New("empty CSV")
	}

	// Map header to column index.
	header := records[0]
	idx := map[string]int{}
	for i, h := range header {
		idx[strings.ToLower(strings.TrimSpace(h))] = i
	}
	need := []string{"email", "fullname", "education_level"}
	for _, n := range need {
		if _, ok := idx[n]; !ok {
			return nil, fmt.Errorf("CSV missing required column: %s", n)
		}
	}

	results := make([]*models.User, 0) // not used directly; keeps import happy
	_ = results

	out := make([]ProvisionResult, 0, len(records)-1)
	for _, row := range records[1:] {
		if len(row) == 0 {
			continue
		}
		get := func(name string) string {
			i, ok := idx[name]
			if !ok || i >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[i])
		}
		email := get("email")
		name := get("fullname")
		if email == "" && name == "" {
			continue // blank line
		}
		level := get("education_level")
		var deptPtr *string
		if d := get("college_department"); d != "" {
			deptPtr = &d
		}
		res, _ := s.ProvisionOne(ProvisionInput{
			Email:             email,
			Fullname:          name,
			EducationLevel:    level,
			CollegeDepartment: deptPtr,
		})
		out = append(out, res)
	}
	return out, nil
}
