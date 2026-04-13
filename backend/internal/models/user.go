// backend/internal/models/user.go
package models

import "time"

type User struct {
	ID                   int       `json:"id"`
	Email                string    `json:"email"`
	Password             string    `json:"-"`
	Fullname             string    `json:"fullname"`
	EducationLevel       *string   `json:"education_level"`
	CollegeDepartment    *string   `json:"college_department"`
	LastAnnouncementView time.Time `json:"last_announcement_view"`
	CreatedAt            time.Time `json:"created_at"`
}

type AdminAccount struct {
	ID        int       `json:"id"`
	Fullname  string    `json:"fullname"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type RegistrarAccount struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}

type AccountingAccount struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"-"`
}
