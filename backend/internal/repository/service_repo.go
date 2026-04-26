package repository

import (
	"database/sql"
	"errors"
	"strconv"
	"strings"

	"github.com/lib/pq"

	"idealink/internal/models"
)

// ErrServiceLabelConflict is returned by Create/Update when a (department, label)
// pair would collide with an existing row.
var ErrServiceLabelConflict = errors.New("service label already exists for this department")

type ServiceRepo struct {
	db *sql.DB
}

func NewServiceRepo(db *sql.DB) *ServiceRepo {
	return &ServiceRepo{db: db}
}

const selectServices = `
	SELECT id, department, label, icon_name, display_order, is_active, created_at, updated_at
	FROM services `

func scanService(row interface {
	Scan(...interface{}) error
}) (*models.Service, error) {
	var s models.Service
	err := row.Scan(
		&s.ID, &s.Department, &s.Label, &s.IconName, &s.DisplayOrder,
		&s.IsActive, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ServiceRepo) ListByDepartment(department string, activeOnly bool) ([]*models.Service, error) {
	q := selectServices + `WHERE department = $1`
	args := []interface{}{department}
	if activeOnly {
		q += ` AND is_active = TRUE`
	}
	q += ` ORDER BY display_order ASC, label ASC`
	rows, err := r.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*models.Service, 0)
	for rows.Next() {
		s, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ServiceRepo) ListAll() ([]*models.Service, error) {
	rows, err := r.db.Query(selectServices + `ORDER BY department ASC, display_order ASC, label ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*models.Service, 0)
	for rows.Next() {
		s, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ServiceRepo) FindByID(id int) (*models.Service, error) {
	row := r.db.QueryRow(selectServices+`WHERE id = $1`, id)
	s, err := scanService(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *ServiceRepo) Create(in models.CreateServiceInput) (*models.Service, error) {
	row := r.db.QueryRow(
		`INSERT INTO services (department, label, icon_name, display_order)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, department, label, icon_name, display_order, is_active, created_at, updated_at`,
		in.Department, in.Label, in.IconName, in.DisplayOrder,
	)
	s, err := scanService(row)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, ErrServiceLabelConflict
		}
		return nil, err
	}
	return s, nil
}

// Update applies a partial patch. Only non-nil fields in `in` are written.
// Returns nil + ErrSomething if no fields were sent (caller should validate first).
func (r *ServiceRepo) Update(id int, in models.UpdateServiceInput) (*models.Service, error) {
	sets := []string{}
	args := []interface{}{}
	idx := 1
	if in.Department != nil {
		sets = append(sets, "department = $"+strconv.Itoa(idx))
		args = append(args, *in.Department)
		idx++
	}
	if in.Label != nil {
		sets = append(sets, "label = $"+strconv.Itoa(idx))
		args = append(args, *in.Label)
		idx++
	}
	if in.IconName != nil {
		sets = append(sets, "icon_name = $"+strconv.Itoa(idx))
		args = append(args, *in.IconName)
		idx++
	}
	if in.DisplayOrder != nil {
		sets = append(sets, "display_order = $"+strconv.Itoa(idx))
		args = append(args, *in.DisplayOrder)
		idx++
	}
	if in.IsActive != nil {
		sets = append(sets, "is_active = $"+strconv.Itoa(idx))
		args = append(args, *in.IsActive)
		idx++
	}
	if len(sets) == 0 {
		// Nothing to update — return current row.
		return r.FindByID(id)
	}
	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)
	q := `UPDATE services SET ` + strings.Join(sets, ", ") +
		` WHERE id = $` + strconv.Itoa(idx) +
		` RETURNING id, department, label, icon_name, display_order, is_active, created_at, updated_at`
	row := r.db.QueryRow(q, args...)
	s, err := scanService(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, ErrServiceLabelConflict
		}
		return nil, err
	}
	return s, nil
}
