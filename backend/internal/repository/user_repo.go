// backend/internal/repository/user_repo.go
package repository

import (
	"database/sql"

	"idealink/internal/models"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) CreateUser(email, hashedPassword, fullname string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`INSERT INTO users (email, password, fullname)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, fullname, last_announcement_view, created_at`,
		email, hashedPassword, fullname,
	).Scan(&u.ID, &u.Email, &u.Fullname, &u.LastAnnouncementView, &u.CreatedAt)
	return &u, err
}

func (r *UserRepo) FindUserByEmail(email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`SELECT id, email, password, fullname, last_announcement_view, created_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.LastAnnouncementView, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (r *UserRepo) FindAdminByEmail(email string) (*models.AdminAccount, error) {
	var a models.AdminAccount
	err := r.db.QueryRow(
		`SELECT id, email, password, fullname FROM admin_accounts WHERE email = $1`,
		email,
	).Scan(&a.ID, &a.Email, &a.Password, &a.Fullname)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &a, err
}

func (r *UserRepo) FindRegistrarByUsername(username string) (*models.RegistrarAccount, error) {
	var reg models.RegistrarAccount
	err := r.db.QueryRow(
		`SELECT id, username, password FROM registrar_accounts WHERE username = $1`,
		username,
	).Scan(&reg.ID, &reg.Username, &reg.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &reg, err
}

func (r *UserRepo) FindAccountingByUsername(username string) (*models.AccountingAccount, error) {
	var acc models.AccountingAccount
	err := r.db.QueryRow(
		`SELECT id, username, password FROM accounting_accounts WHERE username = $1`,
		username,
	).Scan(&acc.ID, &acc.Username, &acc.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &acc, err
}

func (r *UserRepo) UpdateLastAnnouncementView(userID int) error {
	_, err := r.db.Exec(
		`UPDATE users SET last_announcement_view = NOW() WHERE id = $1`,
		userID,
	)
	return err
}

func (r *UserRepo) CountUsers() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
	return count, err
}
