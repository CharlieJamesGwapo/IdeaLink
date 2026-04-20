package repository

import (
	"database/sql"

	"idealink/internal/models"
)

type SuggestionAttachmentRepo struct {
	db *sql.DB
}

func NewSuggestionAttachmentRepo(db *sql.DB) *SuggestionAttachmentRepo {
	return &SuggestionAttachmentRepo{db: db}
}

// Create inserts the blob and returns the stored metadata.
func (r *SuggestionAttachmentRepo) Create(suggestionID int, filename, mimeType string, data []byte) (*models.SuggestionAttachment, error) {
	var a models.SuggestionAttachment
	err := r.db.QueryRow(
		`INSERT INTO suggestion_attachments (suggestion_id, filename, mime_type, size_bytes, data)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, suggestion_id, filename, mime_type, size_bytes, uploaded_at`,
		suggestionID, filename, mimeType, len(data), data,
	).Scan(&a.ID, &a.SuggestionID, &a.Filename, &a.MimeType, &a.SizeBytes, &a.UploadedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// ListBySuggestion returns metadata only (no blob) for all attachments
// belonging to one suggestion, oldest first.
func (r *SuggestionAttachmentRepo) ListBySuggestion(suggestionID int) ([]*models.SuggestionAttachment, error) {
	rows, err := r.db.Query(
		`SELECT id, suggestion_id, filename, mime_type, size_bytes, uploaded_at
		 FROM suggestion_attachments WHERE suggestion_id = $1 ORDER BY uploaded_at ASC`,
		suggestionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*models.SuggestionAttachment, 0)
	for rows.Next() {
		var a models.SuggestionAttachment
		if err := rows.Scan(&a.ID, &a.SuggestionID, &a.Filename, &a.MimeType, &a.SizeBytes, &a.UploadedAt); err != nil {
			return nil, err
		}
		out = append(out, &a)
	}
	return out, rows.Err()
}

// CountBySuggestion enforces the per-suggestion cap server-side.
func (r *SuggestionAttachmentRepo) CountBySuggestion(suggestionID int) (int, error) {
	var n int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM suggestion_attachments WHERE suggestion_id = $1`, suggestionID).Scan(&n)
	return n, err
}

// FindBlob returns the full row including data. Used for the download endpoint.
func (r *SuggestionAttachmentRepo) FindBlob(attachmentID int) (*models.SuggestionAttachment, []byte, error) {
	var a models.SuggestionAttachment
	var data []byte
	err := r.db.QueryRow(
		`SELECT id, suggestion_id, filename, mime_type, size_bytes, uploaded_at, data
		 FROM suggestion_attachments WHERE id = $1`,
		attachmentID,
	).Scan(&a.ID, &a.SuggestionID, &a.Filename, &a.MimeType, &a.SizeBytes, &a.UploadedAt, &data)
	if err == sql.ErrNoRows {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	return &a, data, nil
}
