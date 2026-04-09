// backend/internal/models/admin.go
package models

type Analytics struct {
	TotalUsers           int `json:"total_users"`
	TotalSuggestions     int `json:"total_suggestions"`
	ThisMonthSuggestions int `json:"this_month_suggestions"`
	UnreadSuggestions    int `json:"unread_suggestions"`
	StudentCount         int `json:"student_count"`
	FacultyCount         int `json:"faculty_count"`
}
