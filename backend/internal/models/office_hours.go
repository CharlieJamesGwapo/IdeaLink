package models

import "time"

type OfficeHours struct {
	ID            int        `json:"id"`
	Department    string     `json:"department"`
	IsOpen        bool       `json:"is_open"`
	ClosureReason *string    `json:"closure_reason,omitempty"`
	ClosedUntil   *time.Time `json:"closed_until,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type SetOfficeHoursInput struct {
	IsOpen        bool    `json:"is_open"`
	ClosureReason string  `json:"closure_reason"`
	ClosedUntil   *string `json:"closed_until"`
}

type OfficeHoursStatus struct {
	Department    string     `json:"department"`
	IsOpen        bool       `json:"is_open"`
	ClosureReason *string    `json:"closure_reason,omitempty"`
	ClosedUntil   *time.Time `json:"closed_until,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
