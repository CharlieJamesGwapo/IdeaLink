package models

import "time"

type Suggestion struct {
	ID                int       `json:"id"`
	UserID            int       `json:"user_id"`
	Department        string    `json:"department"`
	ServiceCategory   string    `json:"service_category,omitempty"`
	UserRole          *string   `json:"user_role,omitempty"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Status            string    `json:"status"`
	Rating            *int      `json:"rating,omitempty"`
	Anonymous         bool      `json:"anonymous"`
	IsRead            bool      `json:"is_read"`
	StatusSeenByUser  bool      `json:"status_seen_by_user"`
	SubmittedAt       time.Time `json:"submitted_at"`
	SubmitterName     string    `json:"submitter_name,omitempty"`
	AttachmentCount   int       `json:"attachment_count"`
}

type CreateSuggestionInput struct {
	Department      string `json:"department" binding:"required"`
	ServiceCategory string `json:"service_category"`
	UserRole        string `json:"user_role"`
	Title           string `json:"title" binding:"required"`
	Description     string `json:"description" binding:"required"`
	Rating          *int   `json:"rating"`
	Anonymous       bool   `json:"anonymous"`
}

type UpdateStatusInput struct {
	Status string `json:"status" binding:"required"`
}
