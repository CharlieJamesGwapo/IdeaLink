package repository

import (
	"database/sql"
	"errors"
	"time"

	"idealink/internal/models"
)

var ErrHighlightAlreadyActive = errors.New("suggestion already has an active highlight")
var ErrHighlightNotFoundOrExpired = errors.New("highlight not found or expired")

type HighlightRepo struct {
	db *sql.DB
}

func NewHighlightRepo(db *sql.DB) *HighlightRepo {
	return &HighlightRepo{db: db}
}

// Create inserts a new active highlight. Returns ErrHighlightAlreadyActive if
// the suggestion is already actively highlighted.
func (r *HighlightRepo) Create(suggestionID, adminID int, ttl time.Duration) (int, error) {
	var exists bool
	err := r.db.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM highlights WHERE suggestion_id = $1 AND expires_at > NOW())`,
		suggestionID,
	).Scan(&exists)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, ErrHighlightAlreadyActive
	}
	var id int
	err = r.db.QueryRow(
		`INSERT INTO highlights (suggestion_id, created_by, expires_at)
		 VALUES ($1, $2, NOW() + $3::interval)
		 RETURNING id`,
		suggestionID, adminID, ttl.String(),
	).Scan(&id)
	return id, err
}

// Expire sets expires_at to NOW() so the highlight disappears immediately.
func (r *HighlightRepo) Expire(id int) error {
	res, err := r.db.Exec(`UPDATE highlights SET expires_at = NOW() WHERE id = $1 AND expires_at > NOW()`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrHighlightNotFoundOrExpired
	}
	return nil
}

// IsActive reports whether the given highlight exists and has not expired.
func (r *HighlightRepo) IsActive(id int) (bool, error) {
	var ok bool
	err := r.db.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM highlights WHERE id = $1 AND expires_at > NOW())`,
		id,
	).Scan(&ok)
	return ok, err
}

// ActiveSuggestionIDs returns a map of suggestion IDs that currently have an
// active highlight, for the admin UI to render toggle state.
func (r *HighlightRepo) ActiveSuggestionIDs() (map[int]int, error) {
	rows, err := r.db.Query(`SELECT id, suggestion_id FROM highlights WHERE expires_at > NOW()`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int]int)
	for rows.Next() {
		var hid, sid int
		if err := rows.Scan(&hid, &sid); err != nil {
			return nil, err
		}
		out[sid] = hid
	}
	return out, rows.Err()
}

// ListActive returns all non-expired highlights, each enriched with the
// joined suggestion, react count, and whether viewerUserID has reacted.
// viewerUserID == 0 means "no viewer" (admin/staff); viewer_reacted is
// always false in that case.
func (r *HighlightRepo) ListActive(viewerUserID int) ([]*models.Highlight, error) {
	rows, err := r.db.Query(`
		SELECT
		  h.id, h.suggestion_id, h.created_by, h.created_at, h.expires_at,
		  COALESCE(rc.cnt, 0) AS react_count,
		  CASE WHEN $1 > 0 AND vr.user_id IS NOT NULL THEN true ELSE false END AS viewer_reacted,
		  s.id, s.user_id, s.department, COALESCE(s.service_category,''), s.user_role, s.title, s.description,
		  s.status, s.anonymous, s.is_read, s.submitted_at, u.fullname
		FROM highlights h
		JOIN suggestions s ON s.id = h.suggestion_id
		LEFT JOIN users u ON u.id = s.user_id
		LEFT JOIN (
		  SELECT highlight_id, COUNT(*) AS cnt
		  FROM highlight_reactions GROUP BY highlight_id
		) rc ON rc.highlight_id = h.id
		LEFT JOIN highlight_reactions vr
		  ON vr.highlight_id = h.id AND vr.user_id = $1
		WHERE h.expires_at > NOW()
		ORDER BY react_count DESC, h.created_at DESC
	`, viewerUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*models.Highlight
	for rows.Next() {
		var h models.Highlight
		var s models.Suggestion
		var userRole sql.NullString
		var submitterName sql.NullString
		err := rows.Scan(
			&h.ID, &h.SuggestionID, &h.CreatedBy, &h.CreatedAt, &h.ExpiresAt,
			&h.ReactCount, &h.ViewerReacted,
			&s.ID, &s.UserID, &s.Department, &s.ServiceCategory, &userRole, &s.Title, &s.Description,
			&s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt, &submitterName,
		)
		if err != nil {
			return nil, err
		}
		if userRole.Valid {
			s.UserRole = &userRole.String
		}
		if submitterName.Valid && !s.Anonymous {
			s.SubmitterName = submitterName.String
		}
		h.Suggestion = &s
		out = append(out, &h)
	}
	return out, rows.Err()
}

// ToggleReact inserts or deletes the user's reaction row and returns the
// new react_count plus the final state.
func (r *HighlightRepo) ToggleReact(highlightID, userID int) (int, bool, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback()

	var existed bool
	err = tx.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM highlight_reactions WHERE highlight_id = $1 AND user_id = $2)`,
		highlightID, userID,
	).Scan(&existed)
	if err != nil {
		return 0, false, err
	}

	if existed {
		if _, err := tx.Exec(
			`DELETE FROM highlight_reactions WHERE highlight_id = $1 AND user_id = $2`,
			highlightID, userID,
		); err != nil {
			return 0, false, err
		}
	} else {
		if _, err := tx.Exec(
			`INSERT INTO highlight_reactions (highlight_id, user_id) VALUES ($1, $2)`,
			highlightID, userID,
		); err != nil {
			return 0, false, err
		}
	}

	var count int
	err = tx.QueryRow(
		`SELECT COUNT(*) FROM highlight_reactions WHERE highlight_id = $1`,
		highlightID,
	).Scan(&count)
	if err != nil {
		return 0, false, err
	}

	if err := tx.Commit(); err != nil {
		return 0, false, err
	}
	return count, !existed, nil
}
