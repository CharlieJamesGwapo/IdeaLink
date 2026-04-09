// backend/internal/models/testimonial.go
package models

import "time"

type Testimonial struct {
	ID           int       `json:"id"`
	SuggestionID *int      `json:"suggestion_id"`
	Name         string    `json:"name"`
	Department   string    `json:"department"`
	Message      string    `json:"message"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}
