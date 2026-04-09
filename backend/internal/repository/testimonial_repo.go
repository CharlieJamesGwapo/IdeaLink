// backend/internal/repository/testimonial_repo.go
package repository

import (
	"database/sql"

	"idealink/internal/models"
)

type TestimonialRepo struct {
	db *sql.DB
}

func NewTestimonialRepo(db *sql.DB) *TestimonialRepo {
	return &TestimonialRepo{db: db}
}

func (r *TestimonialRepo) FindActive() ([]*models.Testimonial, error) {
	rows, err := r.db.Query(
		`SELECT id, suggestion_id, name, department, message, is_active, created_at
		 FROM testimonials WHERE is_active = true ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Testimonial
	for rows.Next() {
		var t models.Testimonial
		if err := rows.Scan(&t.ID, &t.SuggestionID, &t.Name, &t.Department,
			&t.Message, &t.IsActive, &t.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &t)
	}
	return list, rows.Err()
}

func (r *TestimonialRepo) Create(suggestionID int, name, department, message string) (*models.Testimonial, error) {
	var t models.Testimonial
	err := r.db.QueryRow(
		`INSERT INTO testimonials (suggestion_id, name, department, message)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, suggestion_id, name, department, message, is_active, created_at`,
		suggestionID, name, department, message,
	).Scan(&t.ID, &t.SuggestionID, &t.Name, &t.Department, &t.Message, &t.IsActive, &t.CreatedAt)
	return &t, err
}

func (r *TestimonialRepo) ToggleActive(id int) (*models.Testimonial, error) {
	var t models.Testimonial
	err := r.db.QueryRow(
		`UPDATE testimonials SET is_active = NOT is_active WHERE id = $1
		 RETURNING id, suggestion_id, name, department, message, is_active, created_at`,
		id,
	).Scan(&t.ID, &t.SuggestionID, &t.Name, &t.Department, &t.Message, &t.IsActive, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &t, err
}
