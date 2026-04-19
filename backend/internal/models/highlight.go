package models

import "time"

type Highlight struct {
	ID            int         `json:"id"`
	SuggestionID  int         `json:"suggestion_id"`
	CreatedBy     int         `json:"created_by"`
	CreatedAt     time.Time   `json:"created_at"`
	ExpiresAt     time.Time   `json:"expires_at"`
	ReactCount    int         `json:"react_count"`
	ViewerReacted bool        `json:"viewer_reacted"`
	Suggestion    *Suggestion `json:"suggestion,omitempty"`
}
