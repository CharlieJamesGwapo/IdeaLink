package repository

import (
	"database/sql"
	"fmt"
	"time"

	"idealink/internal/models"
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
	err := r.db.QueryRow(
		`SELECT id, department, is_open, closure_reason, closed_until, updated_at FROM office_hours WHERE department = $1`,
		department,
	).Scan(&oh.ID, &oh.Department, &oh.IsOpen, &closureReason, &closedUntil, &oh.UpdatedAt)
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

func (r *OfficeHoursRepo) Update(department string, input models.SetOfficeHoursInput) (*models.OfficeHours, error) {
	var closedUntil *time.Time
	if input.ClosedUntil != nil {
		// Accept RFC3339 (API clients) and "2006-01-02T15:04" (HTML datetime-local input)
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
	var closureReason *string
	if input.ClosureReason != "" {
		closureReason = &input.ClosureReason
	}

	_, err := r.db.Exec(
		`INSERT INTO office_hours (department, is_open, closure_reason, closed_until, updated_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (department) DO UPDATE SET
		   is_open = EXCLUDED.is_open,
		   closure_reason = EXCLUDED.closure_reason,
		   closed_until = EXCLUDED.closed_until,
		   updated_at = NOW()`,
		department, input.IsOpen, closureReason, closedUntil,
	)
	if err != nil {
		return nil, err
	}
	return r.GetByDepartment(department)
}
