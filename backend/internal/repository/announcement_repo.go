// backend/internal/repository/announcement_repo.go
package repository

import (
	"database/sql"

	"idealink/internal/models"
)

type AnnouncementRepo struct {
	db *sql.DB
}

func NewAnnouncementRepo(db *sql.DB) *AnnouncementRepo {
	return &AnnouncementRepo{db: db}
}

func (r *AnnouncementRepo) FindAll() ([]*models.Announcement, error) {
	rows, err := r.db.Query(
		`SELECT id, admin_id, title, message, date_posted
		 FROM announcements ORDER BY date_posted DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.AdminID, &a.Title, &a.Message, &a.DatePosted); err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, rows.Err()
}

func (r *AnnouncementRepo) Create(adminID int, input models.CreateAnnouncementInput) (*models.Announcement, error) {
	var a models.Announcement
	err := r.db.QueryRow(
		`INSERT INTO announcements (admin_id, title, message)
		 VALUES ($1, $2, $3)
		 RETURNING id, admin_id, title, message, date_posted`,
		adminID, input.Title, input.Message,
	).Scan(&a.ID, &a.AdminID, &a.Title, &a.Message, &a.DatePosted)
	return &a, err
}

func (r *AnnouncementRepo) Update(id int, input models.UpdateAnnouncementInput) error {
	_, err := r.db.Exec(
		`UPDATE announcements SET title = $1, message = $2 WHERE id = $3`,
		input.Title, input.Message, id,
	)
	return err
}

func (r *AnnouncementRepo) Delete(id int) error {
	_, err := r.db.Exec(`DELETE FROM announcements WHERE id = $1`, id)
	return err
}
