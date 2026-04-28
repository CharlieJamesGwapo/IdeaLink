package repository

import (
	"database/sql"
	"errors"
	"time"

	"idealink/internal/models"
)

type OfficeHoursClosuresRepo struct {
	db *sql.DB
}

func NewOfficeHoursClosuresRepo(db *sql.DB) *OfficeHoursClosuresRepo {
	return &OfficeHoursClosuresRepo{db: db}
}

const selectClosure = `
	SELECT id, office_hours_id, start_at, end_at, reason, cancelled_at, created_by_id, created_at
	FROM office_hours_closures `

func scanClosure(row interface {
	Scan(...interface{}) error
}) (*models.Closure, error) {
	var c models.Closure
	var reason sql.NullString
	var cancelled sql.NullTime
	var createdBy sql.NullInt64
	if err := row.Scan(&c.ID, &c.OfficeHoursID, &c.StartAt, &c.EndAt, &reason, &cancelled, &createdBy, &c.CreatedAt); err != nil {
		return nil, err
	}
	if reason.Valid {
		s := reason.String
		c.Reason = &s
	}
	if cancelled.Valid {
		t := cancelled.Time
		c.CancelledAt = &t
	}
	if createdBy.Valid {
		i := int(createdBy.Int64)
		c.CreatedByID = &i
	}
	return &c, nil
}

func (r *OfficeHoursClosuresRepo) Create(officeHoursID int, startAt, endAt time.Time, reason *string, createdByID *int) (*models.Closure, error) {
	// Half-open overlap check: reject when [startAt, endAt) intersects any
	// non-cancelled existing closure. Equal end/start is allowed.
	var conflictID int
	err := r.db.QueryRow(
		`SELECT id FROM office_hours_closures
		 WHERE office_hours_id = $1
		   AND cancelled_at IS NULL
		   AND start_at < $3
		   AND end_at   > $2
		 LIMIT 1`,
		officeHoursID, startAt, endAt,
	).Scan(&conflictID)
	if err == nil {
		return nil, ErrClosureOverlap
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	row := r.db.QueryRow(
		`INSERT INTO office_hours_closures (office_hours_id, start_at, end_at, reason, created_by_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, office_hours_id, start_at, end_at, reason, cancelled_at, created_by_id, created_at`,
		officeHoursID, startAt, endAt, reason, createdByID,
	)
	return scanClosure(row)
}

func (r *OfficeHoursClosuresRepo) List(officeHoursID int, status ClosureStatus, limit, offset int) ([]models.Closure, error) {
	q := selectClosure + `WHERE office_hours_id = $1`
	args := []interface{}{officeHoursID}
	now := time.Now()
	switch status {
	case ClosureStatusActive:
		q += ` AND cancelled_at IS NULL AND start_at <= $2 AND end_at > $2`
		args = append(args, now)
	case ClosureStatusUpcoming:
		q += ` AND cancelled_at IS NULL AND start_at > $2`
		args = append(args, now)
	case ClosureStatusPast:
		q += ` AND (end_at <= $2 OR cancelled_at IS NOT NULL)`
		args = append(args, now)
	case ClosureStatusAll, "":
		// no extra filter
	}
	q += ` ORDER BY start_at DESC LIMIT $` + itoa(len(args)+1) + ` OFFSET $` + itoa(len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Closure, 0)
	for rows.Next() {
		c, err := scanClosure(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// itoa avoids the `strconv` import for a single use.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [10]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func (r *OfficeHoursClosuresRepo) GetActive(officeHoursID int, now time.Time) (*models.Closure, error) {
	row := r.db.QueryRow(
		selectClosure+`WHERE office_hours_id = $1
		 AND cancelled_at IS NULL
		 AND start_at <= $2 AND end_at > $2
		 ORDER BY start_at DESC
		 LIMIT 1`,
		officeHoursID, now,
	)
	c, err := scanClosure(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *OfficeHoursClosuresRepo) GetUpcoming(officeHoursID int, now time.Time) ([]models.Closure, error) {
	rows, err := r.db.Query(
		selectClosure+`WHERE office_hours_id = $1
		 AND cancelled_at IS NULL
		 AND start_at > $2
		 ORDER BY start_at ASC`,
		officeHoursID, now,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Closure, 0)
	for rows.Next() {
		c, err := scanClosure(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (r *OfficeHoursClosuresRepo) FindByID(id int) (*models.Closure, error) {
	row := r.db.QueryRow(selectClosure+`WHERE id = $1`, id)
	c, err := scanClosure(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

// Cancel sets cancelled_at = now. Idempotent: cancelling an already-cancelled
// closure returns it unchanged. Returns ErrClosurePast if end_at is already
// in the past (and the closure isn't already cancelled).
func (r *OfficeHoursClosuresRepo) Cancel(id int, now time.Time) (*models.Closure, error) {
	c, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, sql.ErrNoRows
	}
	if c.CancelledAt != nil {
		return c, nil
	}
	if c.EndAt.Before(now) || c.EndAt.Equal(now) {
		return nil, ErrClosurePast
	}
	row := r.db.QueryRow(
		`UPDATE office_hours_closures SET cancelled_at = $1 WHERE id = $2
		 RETURNING id, office_hours_id, start_at, end_at, reason, cancelled_at, created_by_id, created_at`,
		now, id,
	)
	return scanClosure(row)
}

// ensure errors import is used even if no other file pulls it in this package.
var _ = errors.New
