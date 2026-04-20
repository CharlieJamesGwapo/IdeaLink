package models

import "time"

type SuggestionAttachment struct {
	ID           int       `json:"id"`
	SuggestionID int       `json:"suggestion_id"`
	Filename     string    `json:"filename"`
	MimeType     string    `json:"mime_type"`
	SizeBytes    int       `json:"size_bytes"`
	UploadedAt   time.Time `json:"uploaded_at"`
}
