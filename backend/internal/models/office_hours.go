package models

import "time"

// OfficeHours is the parent row per department. Hours and closures live in
// their child tables (office_hours_schedule, office_hours_closures); this
// row only carries metadata.
type OfficeHours struct {
	ID         int       `json:"id"`
	Department string    `json:"department"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// DaySchedule is one row of office_hours_schedule. Weekday uses Go's
// time.Weekday convention: 0=Sunday..6=Saturday. When IsClosed is true,
// the hour fields are ignored by readers.
type DaySchedule struct {
	Weekday   int  `json:"weekday"`
	OpenHour  int  `json:"open_hour"`
	CloseHour int  `json:"close_hour"`
	IsClosed  bool `json:"is_closed"`
}

// Closure is one row of office_hours_closures. Status (active/upcoming/past)
// is computed by callers — never stored. OfficeHoursID is exposed to Go code
// for ownership checks but hidden from the JSON response.
type Closure struct {
	ID            int        `json:"id"`
	OfficeHoursID int        `json:"-"`
	StartAt       time.Time  `json:"start_at"`
	EndAt         time.Time  `json:"end_at"`
	Reason        *string    `json:"reason,omitempty"`
	CancelledAt   *time.Time `json:"cancelled_at,omitempty"`
	CreatedByID   *int       `json:"created_by_id,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

// OfficeHoursStatus is the response shape for GET /api/office-hours/:dept.
// is_open and status_message are computed from schedule + active_closure.
type OfficeHoursStatus struct {
	Department       string        `json:"department"`
	IsOpen           bool          `json:"is_open"`
	StatusMessage    string        `json:"status_message"`
	Schedule         []DaySchedule `json:"schedule"`
	ActiveClosure    *Closure      `json:"active_closure"`
	UpcomingClosures []Closure     `json:"upcoming_closures"`
	UpdatedAt        time.Time     `json:"updated_at"`
}

// PutScheduleInput drives PUT /api/office-hours/:dept/schedule. Must contain
// exactly 7 entries, one per weekday 0..6.
type PutScheduleInput struct {
	Schedule []DaySchedule `json:"schedule" binding:"required"`
}

// CreateClosureInput drives POST /api/office-hours/:dept/closures.
type CreateClosureInput struct {
	StartAt string  `json:"start_at" binding:"required"` // RFC3339 or "YYYY-MM-DDTHH:MM"
	EndAt   string  `json:"end_at"   binding:"required"`
	Reason  *string `json:"reason"`
}
