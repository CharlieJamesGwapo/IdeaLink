package models

type Analytics struct {
	TotalUsers           int                    `json:"total_users"`
	TotalSuggestions     int                    `json:"total_suggestions"`
	ThisMonthSuggestions int                    `json:"this_month_suggestions"`
	UnreadSuggestions    int                    `json:"unread_suggestions"`
	StudentCount         int                    `json:"student_count"`
	FacultyCount         int                    `json:"faculty_count"`
	ByDepartment         []DeptCount            `json:"by_department"`
	ByStatus             []StatusCount          `json:"by_status"`
	MonthlyTrend         []MonthCount           `json:"monthly_trend"`
	ByCategoryRegistrar  []CategoryCount        `json:"by_category_registrar"`
	ByCategoryAccounting []CategoryCount        `json:"by_category_accounting"`
}

type DeptCount struct {
	Department string `json:"department"`
	Count      int    `json:"count"`
}

type StatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type MonthCount struct {
	Month string `json:"month"`
	Count int    `json:"count"`
}

type CategoryCount struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

// RatingGroup aggregates ratings for one department+category slice.
type RatingGroup struct {
	Department  string         `json:"department"`
	Category    string         `json:"category"`
	Count       int            `json:"count"`   // number of rated submissions
	Average     float64        `json:"average"` // 0 if Count = 0
	Breakdown   map[int]int    `json:"breakdown"` // rating -> count (1..5)
}
