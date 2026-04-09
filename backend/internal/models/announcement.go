// backend/internal/models/announcement.go
package models

import "time"

type Announcement struct {
	ID         int       `json:"id"`
	AdminID    int       `json:"admin_id"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	DatePosted time.Time `json:"date_posted"`
}

type CreateAnnouncementInput struct {
	Title   string `json:"title" binding:"required"`
	Message string `json:"message" binding:"required"`
}
