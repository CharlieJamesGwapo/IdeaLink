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

	list := make([]*models.Announcement, 0)
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
	res, err := r.db.Exec(
		`UPDATE announcements SET title = $1, message = $2 WHERE id = $3`,
		input.Title, input.Message, id,
	)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// CountSince returns the number of announcements posted strictly after the
// given cutoff. Used to compute the "unread" badge for a user based on their
// last_announcement_view timestamp.
func (r *AnnouncementRepo) CountSince(cutoff interface{}) (int, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM announcements WHERE date_posted > $1`,
		cutoff,
	).Scan(&count)
	return count, err
}

func (r *AnnouncementRepo) Delete(id int) error {
	res, err := r.db.Exec(`DELETE FROM announcements WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
