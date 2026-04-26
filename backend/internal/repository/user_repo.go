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

func (r *UserRepo) CreateUser(email, hashedPassword, fullname, educationLevel string, collegeDepartment *string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`INSERT INTO users (email, password, fullname, education_level, college_department)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, email, fullname, education_level, college_department, grade_level, last_announcement_view, created_at`,
		email, hashedPassword, fullname, educationLevel, collegeDepartment,
	).Scan(&u.ID, &u.Email, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.GradeLevel, &u.LastAnnouncementView, &u.CreatedAt)
	return &u, err
}

func (r *UserRepo) FindUserByEmail(email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`SELECT id, email, password, fullname, education_level, college_department, grade_level, last_announcement_view, created_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.GradeLevel, &u.LastAnnouncementView, &u.CreatedAt)
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

func (r *UserRepo) FindRegistrarByEmail(email string) (*models.RegistrarAccount, error) {
	var reg models.RegistrarAccount
	err := r.db.QueryRow(
		`SELECT id, email, password FROM registrar_accounts WHERE email = $1`,
		email,
	).Scan(&reg.ID, &reg.Email, &reg.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &reg, err
}

func (r *UserRepo) FindAccountingByEmail(email string) (*models.AccountingAccount, error) {
	var acc models.AccountingAccount
	err := r.db.QueryRow(
		`SELECT id, email, password FROM accounting_accounts WHERE email = $1`,
		email,
	).Scan(&acc.ID, &acc.Email, &acc.Password)
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

func (r *UserRepo) FindUserByID(id int) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`SELECT id, email, password, fullname, education_level, college_department, grade_level, last_announcement_view, created_at
		 FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Fullname, &u.EducationLevel, &u.CollegeDepartment, &u.GradeLevel, &u.LastAnnouncementView, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (r *UserRepo) UpdatePassword(userID int, hashedPassword string) error {
	_, err := r.db.Exec(`UPDATE users SET password = $1 WHERE id = $2`, hashedPassword, userID)
	return err
}

func (r *UserRepo) UpdateProfile(userID int, educationLevel string, collegeDepartment *string, gradeLevel *string) error {
	_, err := r.db.Exec(
		`UPDATE users SET education_level = $1, college_department = $2, grade_level = $3 WHERE id = $4`,
		educationLevel, collegeDepartment, gradeLevel, userID,
	)
	return err
}
