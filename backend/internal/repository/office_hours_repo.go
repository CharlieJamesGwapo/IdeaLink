package repository

import (
	"database/sql"
	"fmt"
	"time"

	"idealink/internal/models"

	"github.com/lib/pq"
)

type OfficeHoursRepo struct {
	db *sql.DB
}

func NewOfficeHoursRepo(db *sql.DB) *OfficeHoursRepo {
	return &OfficeHoursRepo{db: db}
}

func (r *OfficeHoursRepo) GetByDepartment(department string) (*models.OfficeHours, error) {
	var oh models.OfficeHours
	var closureReason sql.NullString
	var closedUntil sql.NullTime
	// Inline the literal (pq.QuoteLiteral is SQL-safe) instead of using $1.
	// Parameterised reads against Render's pgbouncer intermittently surface
	// `pq: unnamed prepared statement does not exist` when the pool
	// reassigns backends between Parse and Execute. A simple-protocol query
	// with no placeholders sidesteps the issue — this is the only public
	// read on the homepage that relies on a bound parameter.
	query := fmt.Sprintf(
		`SELECT id, department, open_hour, close_hour, is_open, closure_reason, closed_until, updated_at
		 FROM office_hours WHERE department = %s`,
		pq.QuoteLiteral(department),
	)
	err := r.db.QueryRow(query).Scan(&oh.ID, &oh.Department, &oh.OpenHour, &oh.CloseHour, &oh.IsOpen, &closureReason, &closedUntil, &oh.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if closureReason.Valid {
		oh.ClosureReason = &closureReason.String
	}
	if closedUntil.Valid {
		oh.ClosedUntil = &closedUntil.Time
	}
	return &oh, nil
}

// Update applies a partial change. Only non-nil fields are touched, so the
// same endpoint can edit schedule, post a temporary closure, or clear one.
func (r *OfficeHoursRepo) Update(department string, input models.SetOfficeHoursInput) (*models.OfficeHours, error) {
	// Parse closed_until if provided. Accepts RFC3339 or HTML datetime-local.
	var closedUntil *time.Time
	if input.ClosedUntil != nil && *input.ClosedUntil != "" {
		pht := time.FixedZone("PHT", 8*3600)
		parsed := false
		for _, layout := range []string{time.RFC3339, "2006-01-02T15:04"} {
			t, err := time.ParseInLocation(layout, *input.ClosedUntil, pht)
			if err == nil {
				closedUntil = &t
				parsed = true
				break
			}
		}
		if !parsed {
			return nil, fmt.Errorf("invalid closed_until format; use RFC3339 or YYYY-MM-DDTHH:MM")
		}
	}

	// Make sure a row exists for the department before we run partial updates.
	if _, err := r.db.Exec(
		`INSERT INTO office_hours (department) VALUES ($1) ON CONFLICT (department) DO NOTHING`,
		department,
	); err != nil {
		return nil, err
	}

	if input.OpenHour != nil {
		if *input.OpenHour < 0 || *input.OpenHour > 23 {
			return nil, fmt.Errorf("open_hour must be 0-23")
		}
		if _, err := r.db.Exec(
			`UPDATE office_hours SET open_hour = $1, updated_at = NOW() WHERE department = $2`,
			*input.OpenHour, department,
		); err != nil {
			return nil, err
		}
	}
	if input.CloseHour != nil {
		if *input.CloseHour < 1 || *input.CloseHour > 24 {
			return nil, fmt.Errorf("close_hour must be 1-24")
		}
		if _, err := r.db.Exec(
			`UPDATE office_hours SET close_hour = $1, updated_at = NOW() WHERE department = $2`,
			*input.CloseHour, department,
		); err != nil {
			return nil, err
		}
	}
	if input.ClearClosure {
		if _, err := r.db.Exec(
			`UPDATE office_hours SET closure_reason = NULL, closed_until = NULL, updated_at = NOW() WHERE department = $1`,
			department,
		); err != nil {
			return nil, err
		}
	} else if input.ClosureReason != nil || closedUntil != nil {
		var reason *string
		if input.ClosureReason != nil && *input.ClosureReason != "" {
			reason = input.ClosureReason
		}
		if _, err := r.db.Exec(
			`UPDATE office_hours SET closure_reason = $1, closed_until = $2, updated_at = NOW() WHERE department = $3`,
			reason, closedUntil, department,
		); err != nil {
			return nil, err
		}
	}

	return r.GetByDepartment(department)
}
