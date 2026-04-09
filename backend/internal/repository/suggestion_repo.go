// backend/internal/repository/suggestion_repo.go
package repository

import (
	"database/sql"

	"idealink/internal/models"
)

type SuggestionRepo struct {
	db *sql.DB
}

func NewSuggestionRepo(db *sql.DB) *SuggestionRepo {
	return &SuggestionRepo{db: db}
}

const selectSuggestions = `
	SELECT s.id, s.user_id, s.department, s.user_role, s.title, s.description,
	       s.status, s.anonymous, s.is_read, s.submitted_at, u.fullname
	FROM suggestions s
	LEFT JOIN users u ON s.user_id = u.id`

func (r *SuggestionRepo) scanRows(rows *sql.Rows) ([]*models.Suggestion, error) {
	var suggestions []*models.Suggestion
	for rows.Next() {
		var s models.Suggestion
		var userRole sql.NullString
		var submitterName sql.NullString
		err := rows.Scan(&s.ID, &s.UserID, &s.Department, &userRole, &s.Title,
			&s.Description, &s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt, &submitterName)
		if err != nil {
			return nil, err
		}
		if userRole.Valid {
			s.UserRole = &userRole.String
		}
		if submitterName.Valid && !s.Anonymous {
			s.SubmitterName = submitterName.String
		}
		suggestions = append(suggestions, &s)
	}
	return suggestions, rows.Err()
}

func (r *SuggestionRepo) scanRow(row *sql.Row) (*models.Suggestion, error) {
	var s models.Suggestion
	var userRole sql.NullString
	var submitterName sql.NullString
	err := row.Scan(&s.ID, &s.UserID, &s.Department, &userRole, &s.Title,
		&s.Description, &s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt, &submitterName)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if userRole.Valid {
		s.UserRole = &userRole.String
	}
	if submitterName.Valid && !s.Anonymous {
		s.SubmitterName = submitterName.String
	}
	return &s, nil
}

func (r *SuggestionRepo) Create(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error) {
	var s models.Suggestion
	var userRole sql.NullString
	err := r.db.QueryRow(
		`INSERT INTO suggestions (user_id, department, user_role, title, description, anonymous)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id, department, user_role, title, description, status, anonymous, is_read, submitted_at`,
		userID, input.Department, input.UserRole, input.Title, input.Description, input.Anonymous,
	).Scan(&s.ID, &s.UserID, &s.Department, &userRole, &s.Title, &s.Description,
		&s.Status, &s.Anonymous, &s.IsRead, &s.SubmittedAt)
	if err != nil {
		return nil, err
	}
	if userRole.Valid {
		s.UserRole = &userRole.String
	}
	return &s, nil
}

func (r *SuggestionRepo) FindAll() ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions + ` ORDER BY s.submitted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByDepartment(department string) ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions+` WHERE s.department = $1 ORDER BY s.submitted_at DESC`, department)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByUserID(userID int) ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions+` WHERE s.user_id = $1 ORDER BY s.submitted_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByID(id int) (*models.Suggestion, error) {
	row := r.db.QueryRow(selectSuggestions+` WHERE s.id = $1`, id)
	return r.scanRow(row)
}

func (r *SuggestionRepo) UpdateStatus(id int, status string) error {
	_, err := r.db.Exec(
		`UPDATE suggestions SET status = $1 WHERE id = $2`,
		status, id,
	)
	return err
}

func (r *SuggestionRepo) MarkAsRead(id int) error {
	_, err := r.db.Exec(
		`UPDATE suggestions SET is_read = true WHERE id = $1`,
		id,
	)
	return err
}

func (r *SuggestionRepo) GetAnalytics() (*models.Analytics, error) {
	var a models.Analytics
	err := r.db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE submitted_at >= DATE_TRUNC('month', NOW())),
			COUNT(*) FILTER (WHERE is_read = false),
			COUNT(*) FILTER (WHERE user_role = 'Student'),
			COUNT(*) FILTER (WHERE user_role = 'Faculty Staff')
		FROM suggestions
	`).Scan(&a.TotalSuggestions, &a.ThisMonthSuggestions,
		&a.UnreadSuggestions, &a.StudentCount, &a.FacultyCount)
	return &a, err
}
