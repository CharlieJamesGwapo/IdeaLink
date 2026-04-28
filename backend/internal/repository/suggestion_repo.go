package repository

import (
	"database/sql"
	"time"

	"idealink/internal/models"
)

type SuggestionRepo struct {
	db *sql.DB
}

func NewSuggestionRepo(db *sql.DB) *SuggestionRepo {
	return &SuggestionRepo{db: db}
}

const selectSuggestions = `
	SELECT s.id, s.user_id, s.department, COALESCE(s.service_category,''), s.user_role, s.title, s.description,
	       s.status, s.rating, s.anonymous, s.is_read, s.status_seen_by_user, s.submitted_at, u.fullname,
	       COALESCE(att.cnt, 0) AS attachment_count
	FROM suggestions s
	LEFT JOIN users u ON s.user_id = u.id
	LEFT JOIN (
	  SELECT suggestion_id, COUNT(*) AS cnt
	  FROM suggestion_attachments
	  GROUP BY suggestion_id
	) att ON att.suggestion_id = s.id `

func (r *SuggestionRepo) scanRows(rows *sql.Rows) ([]*models.Suggestion, error) {
	var suggestions []*models.Suggestion
	for rows.Next() {
		var s models.Suggestion
		var userRole sql.NullString
		var submitterName sql.NullString
		var rating sql.NullInt16
		err := rows.Scan(&s.ID, &s.UserID, &s.Department, &s.ServiceCategory, &userRole, &s.Title,
			&s.Description, &s.Status, &rating, &s.Anonymous, &s.IsRead, &s.StatusSeenByUser, &s.SubmittedAt, &submitterName, &s.AttachmentCount)
		if err != nil {
			return nil, err
		}
		if userRole.Valid {
			s.UserRole = &userRole.String
		}
		if rating.Valid {
			v := int(rating.Int16)
			s.Rating = &v
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
	var rating sql.NullInt16
	err := row.Scan(&s.ID, &s.UserID, &s.Department, &s.ServiceCategory, &userRole, &s.Title,
		&s.Description, &s.Status, &rating, &s.Anonymous, &s.IsRead, &s.StatusSeenByUser, &s.SubmittedAt, &submitterName, &s.AttachmentCount)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if userRole.Valid {
		s.UserRole = &userRole.String
	}
	if rating.Valid {
		v := int(rating.Int16)
		s.Rating = &v
	}
	if submitterName.Valid && !s.Anonymous {
		s.SubmitterName = submitterName.String
	}
	return &s, nil
}

func (r *SuggestionRepo) Create(userID int, input models.CreateSuggestionInput) (*models.Suggestion, error) {
	var s models.Suggestion
	var userRole sql.NullString
	var rating sql.NullInt16
	var ratingArg interface{}
	if input.Rating != nil {
		ratingArg = *input.Rating
	} else {
		ratingArg = nil
	}
	err := r.db.QueryRow(
		`INSERT INTO suggestions (user_id, department, service_category, user_role, title, description, rating, anonymous)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, user_id, department, COALESCE(service_category,''), user_role, title, description, status, rating, anonymous, is_read, status_seen_by_user, submitted_at`,
		userID, input.Department, input.ServiceCategory, input.UserRole, input.Title, input.Description, ratingArg, input.Anonymous,
	).Scan(&s.ID, &s.UserID, &s.Department, &s.ServiceCategory, &userRole, &s.Title, &s.Description,
		&s.Status, &rating, &s.Anonymous, &s.IsRead, &s.StatusSeenByUser, &s.SubmittedAt)
	if err != nil {
		return nil, err
	}
	if userRole.Valid {
		s.UserRole = &userRole.String
	}
	if rating.Valid {
		v := int(rating.Int16)
		s.Rating = &v
	}
	return &s, nil
}

func (r *SuggestionRepo) FindAll() ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions + ` WHERE s.deleted_at IS NULL ORDER BY s.submitted_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByDepartment(department string) ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions+` WHERE s.deleted_at IS NULL AND s.department = $1 ORDER BY s.submitted_at DESC`, department)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByUserID(userID int) ([]*models.Suggestion, error) {
	rows, err := r.db.Query(selectSuggestions+` WHERE s.deleted_at IS NULL AND s.user_id = $1 ORDER BY s.submitted_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *SuggestionRepo) FindByID(id int) (*models.Suggestion, error) {
	row := r.db.QueryRow(selectSuggestions+` WHERE s.deleted_at IS NULL AND s.id = $1`, id)
	return r.scanRow(row)
}

// SoftDelete marks a suggestion as deleted without removing the row. Lists
// filter deleted_at IS NULL; analytics exclude deleted rows too. Idempotent.
func (r *SuggestionRepo) SoftDelete(id int) error {
	_, err := r.db.Exec(
		`UPDATE suggestions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		id,
	)
	return err
}

func (r *SuggestionRepo) UpdateStatus(id int, status string) error {
	// Any status change marks the suggestion as unseen for the submitter —
	// they'll see the notification badge until they re-visit their submissions.
	_, err := r.db.Exec(
		`UPDATE suggestions SET status = $1, status_seen_by_user = FALSE WHERE id = $2`,
		status, id,
	)
	return err
}

func (r *SuggestionRepo) MarkAsRead(id int) error {
	_, err := r.db.Exec(`UPDATE suggestions SET is_read = true WHERE id = $1`, id)
	return err
}

// MarkStatusSeenByUser clears the unread-status-change badge for all of a
// user's own suggestions. Call this when the user opens "My Submissions".
func (r *SuggestionRepo) MarkStatusSeenByUser(userID int) error {
	_, err := r.db.Exec(
		`UPDATE suggestions SET status_seen_by_user = TRUE
		 WHERE user_id = $1 AND status_seen_by_user = FALSE`,
		userID,
	)
	return err
}

// CountStatusUnreadByUser returns how many of the user's own suggestions have
// had a status change the user hasn't yet acknowledged.
func (r *SuggestionRepo) CountStatusUnreadByUser(userID int) (int, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM suggestions
		 WHERE deleted_at IS NULL AND user_id = $1 AND status_seen_by_user = FALSE`,
		userID,
	).Scan(&count)
	return count, err
}

func (r *SuggestionRepo) CountUnreadByDepartment(department string) (int, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM suggestions WHERE deleted_at IS NULL AND is_read = false AND department = $1`, department,
	).Scan(&count)
	return count, err
}

func (r *SuggestionRepo) CountUnread() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM suggestions WHERE deleted_at IS NULL AND is_read = false`).Scan(&count)
	return count, err
}

// GetRatingSummary returns per-department/category rating aggregations.
// Only rows with a non-null rating are included.
func (r *SuggestionRepo) GetRatingSummary() ([]*models.RatingGroup, error) {
	rows, err := r.db.Query(`
		SELECT department, COALESCE(service_category,'Uncategorized') AS category,
		       rating, COUNT(*)
		  FROM suggestions
		 WHERE deleted_at IS NULL AND rating IS NOT NULL
		 GROUP BY department, category, rating
		 ORDER BY department, category, rating
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type key struct{ dept, cat string }
	groups := make(map[key]*models.RatingGroup)
	for rows.Next() {
		var dept, cat string
		var rating, count int
		if err := rows.Scan(&dept, &cat, &rating, &count); err != nil {
			return nil, err
		}
		k := key{dept, cat}
		g, ok := groups[k]
		if !ok {
			g = &models.RatingGroup{Department: dept, Category: cat, Breakdown: map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
			groups[k] = g
		}
		g.Breakdown[rating] = count
		g.Count += count
	}

	out := make([]*models.RatingGroup, 0, len(groups))
	for _, g := range groups {
		var sum float64
		for r, c := range g.Breakdown {
			sum += float64(r * c)
		}
		if g.Count > 0 {
			g.Average = sum / float64(g.Count)
		}
		out = append(out, g)
	}
	return out, nil
}

// CountSubmissionsSince returns how many suggestions the given user has
// submitted at or after the cutoff. The caller supplies the cutoff so the
// week boundary can follow Manila time (not the DB server timezone).
// Soft-deleted rows still count against the weekly quota — deletion is an
// admin cleanup action, not a way for users to bypass the rate limit.
func (r *SuggestionRepo) CountSubmissionsSince(userID int, cutoff time.Time) (int, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM suggestions
		 WHERE user_id = $1
		   AND submitted_at >= $2`,
		userID, cutoff,
	).Scan(&count)
	return count, err
}

func (r *SuggestionRepo) GetAnalytics() (*models.Analytics, error) {
	var a models.Analytics

	// Basic counts
	err := r.db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE submitted_at >= DATE_TRUNC('month', NOW())),
			COUNT(*) FILTER (WHERE is_read = false),
			COUNT(*) FILTER (WHERE user_role = 'Student'),
			COUNT(*) FILTER (WHERE user_role = 'Faculty Staff')
		FROM suggestions
		WHERE deleted_at IS NULL
	`).Scan(&a.TotalSuggestions, &a.ThisMonthSuggestions,
		&a.UnreadSuggestions, &a.StudentCount, &a.FacultyCount)
	if err != nil {
		return nil, err
	}

	// By department
	rows, err := r.db.Query(`SELECT department, COUNT(*) FROM suggestions WHERE deleted_at IS NULL GROUP BY department ORDER BY department`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var d models.DeptCount
		if err := rows.Scan(&d.Department, &d.Count); err != nil {
			return nil, err
		}
		a.ByDepartment = append(a.ByDepartment, d)
	}

	// By status
	statusRows, err := r.db.Query(`SELECT status, COUNT(*) FROM suggestions WHERE deleted_at IS NULL GROUP BY status ORDER BY status`)
	if err != nil {
		return nil, err
	}
	defer statusRows.Close()
	for statusRows.Next() {
		var s models.StatusCount
		if err := statusRows.Scan(&s.Status, &s.Count); err != nil {
			return nil, err
		}
		a.ByStatus = append(a.ByStatus, s)
	}

	// Monthly trend (last 6 months)
	monthRows, err := r.db.Query(`
		SELECT TO_CHAR(DATE_TRUNC('month', submitted_at), 'Mon YYYY') as month,
		       COUNT(*)
		FROM suggestions
		WHERE deleted_at IS NULL AND submitted_at >= NOW() - INTERVAL '6 months'
		GROUP BY DATE_TRUNC('month', submitted_at)
		ORDER BY DATE_TRUNC('month', submitted_at)
	`)
	if err != nil {
		return nil, err
	}
	defer monthRows.Close()
	for monthRows.Next() {
		var m models.MonthCount
		if err := monthRows.Scan(&m.Month, &m.Count); err != nil {
			return nil, err
		}
		a.MonthlyTrend = append(a.MonthlyTrend, m)
	}

	// By category - Registrar
	catRegRows, err := r.db.Query(`
		SELECT COALESCE(service_category,'Uncategorized'), COUNT(*)
		FROM suggestions WHERE deleted_at IS NULL AND department = 'Registrar Office'
		GROUP BY service_category ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, err
	}
	defer catRegRows.Close()
	for catRegRows.Next() {
		var c models.CategoryCount
		if err := catRegRows.Scan(&c.Category, &c.Count); err != nil {
			return nil, err
		}
		a.ByCategoryRegistrar = append(a.ByCategoryRegistrar, c)
	}

	// By category - Accounting
	catAccRows, err := r.db.Query(`
		SELECT COALESCE(service_category,'Uncategorized'), COUNT(*)
		FROM suggestions WHERE deleted_at IS NULL AND department = 'Finance Office'
		GROUP BY service_category ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, err
	}
	defer catAccRows.Close()
	for catAccRows.Next() {
		var c models.CategoryCount
		if err := catAccRows.Scan(&c.Category, &c.Count); err != nil {
			return nil, err
		}
		a.ByCategoryAccounting = append(a.ByCategoryAccounting, c)
	}

	return &a, nil
}
