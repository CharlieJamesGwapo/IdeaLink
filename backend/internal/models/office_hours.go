package models

import "time"

type OfficeHours struct {
	ID         int    `json:"id"`
	Department string `json:"department"`
	// OpenHour/CloseHour define the weekday schedule (Monday–Friday, Asia/Manila).
	// is_open is derived at read time — no more manual toggle. ClosedUntil +
	// ClosureReason still let staff post a temporary closure override (holiday,
	// emergency, etc.) that wins over the schedule until it expires.
	OpenHour      int        `json:"open_hour"`
	CloseHour     int        `json:"close_hour"`
	IsOpen        bool       `json:"is_open"`
	ClosureReason *string    `json:"closure_reason,omitempty"`
	ClosedUntil   *time.Time `json:"closed_until,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// SetOfficeHoursInput drives POST /api/office-hours/:dept. All fields are
// optional so the same endpoint can edit hours, post a temporary closure, or
// clear an existing closure.
type SetOfficeHoursInput struct {
	OpenHour      *int    `json:"open_hour"`
	CloseHour     *int    `json:"close_hour"`
	ClosureReason *string `json:"closure_reason"`
	ClosedUntil   *string `json:"closed_until"`
	// ClearClosure, when true, clears any active temporary closure override
	// (lets staff re-open early without waiting for ClosedUntil to elapse).
	ClearClosure bool `json:"clear_closure"`
}

type OfficeHoursStatus struct {
	Department    string     `json:"department"`
	OpenHour      int        `json:"open_hour"`
	CloseHour     int        `json:"close_hour"`
	IsOpen        bool       `json:"is_open"`
	ClosureReason *string    `json:"closure_reason,omitempty"`
	ClosedUntil   *time.Time `json:"closed_until,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
