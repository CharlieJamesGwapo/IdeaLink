package repository

import (
	"database/sql"
	"fmt"

	"github.com/lib/pq"

	"idealink/internal/models"
)

type OfficeHoursRepo struct {
	db *sql.DB
}

func NewOfficeHoursRepo(db *sql.DB) *OfficeHoursRepo {
	return &OfficeHoursRepo{db: db}
}

// EnsureRow returns the office_hours row for a department, creating it
// (and seeding 7 schedule rows) on first call. Idempotent.
func (r *OfficeHoursRepo) EnsureRow(department string) (*models.OfficeHours, error) {
	if _, err := r.db.Exec(
		`INSERT INTO office_hours (department) VALUES ($1) ON CONFLICT (department) DO NOTHING`,
		department,
	); err != nil {
		return nil, err
	}

	// Seed schedule (idempotent — UNIQUE (office_hours_id, weekday) protects us).
	if _, err := r.db.Exec(
		`INSERT INTO office_hours_schedule (office_hours_id, weekday, open_hour, close_hour, is_closed)
		 SELECT oh.id, w.weekday,
		        CASE WHEN w.weekday BETWEEN 1 AND 5 THEN 8  ELSE 0 END,
		        CASE WHEN w.weekday BETWEEN 1 AND 5 THEN 17 ELSE 1 END,
		        w.weekday NOT BETWEEN 1 AND 5
		 FROM office_hours oh
		 CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS w(weekday)
		 WHERE oh.department = $1
		 ON CONFLICT (office_hours_id, weekday) DO NOTHING`,
		department,
	); err != nil {
		return nil, err
	}

	return r.GetByDepartment(department)
}

// GetByDepartment uses an inlined literal to dodge Render's pgbouncer
// "unnamed prepared statement" issue on simple-protocol reads from the
// public homepage. See repository/suggestion_repo.go for the same pattern.
func (r *OfficeHoursRepo) GetByDepartment(department string) (*models.OfficeHours, error) {
	var oh models.OfficeHours
	query := fmt.Sprintf(
		`SELECT id, department, updated_at FROM office_hours WHERE department = %s`,
		pq.QuoteLiteral(department),
	)
	err := r.db.QueryRow(query).Scan(&oh.ID, &oh.Department, &oh.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &oh, nil
}

func (r *OfficeHoursRepo) GetSchedule(officeHoursID int) ([]models.DaySchedule, error) {
	rows, err := r.db.Query(
		`SELECT weekday, open_hour, close_hour, is_closed
		 FROM office_hours_schedule
		 WHERE office_hours_id = $1
		 ORDER BY weekday ASC`,
		officeHoursID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.DaySchedule, 0, 7)
	for rows.Next() {
		var d models.DaySchedule
		if err := rows.Scan(&d.Weekday, &d.OpenHour, &d.CloseHour, &d.IsClosed); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ReplaceSchedule writes exactly 7 rows for the office. Validation (7 entries,
// no dup weekdays, open<close when not closed) is the caller's job — the SQL
// CHECK constraints will reject violations as a backstop.
func (r *OfficeHoursRepo) ReplaceSchedule(officeHoursID int, schedule []models.DaySchedule) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	for _, d := range schedule {
		// Defensive defaults so closed rows still satisfy the table CHECK.
		open, close := d.OpenHour, d.CloseHour
		if d.IsClosed {
			open, close = 0, 1
		}
		if _, err := tx.Exec(
			`INSERT INTO office_hours_schedule (office_hours_id, weekday, open_hour, close_hour, is_closed)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (office_hours_id, weekday)
			 DO UPDATE SET open_hour = EXCLUDED.open_hour,
			               close_hour = EXCLUDED.close_hour,
			               is_closed = EXCLUDED.is_closed`,
			officeHoursID, d.Weekday, open, close, d.IsClosed,
		); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(
		`UPDATE office_hours SET updated_at = NOW() WHERE id = $1`,
		officeHoursID,
	); err != nil {
		return err
	}

	return tx.Commit()
}
