package models

import "time"

// Service represents one row in the admin-managed service catalog.
// Suggestions store service_category as a free-text snapshot, so renaming
// or disabling a Service does not retroactively rewrite past rows.
type Service struct {
	ID           int       `json:"id"`
	Department   string    `json:"department"`
	Label        string    `json:"label"`
	IconName     string    `json:"icon_name"`
	DisplayOrder int       `json:"display_order"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreateServiceInput is the shape POST /api/admin/services accepts.
type CreateServiceInput struct {
	Department   string `json:"department"    binding:"required,oneof='Registrar Office' 'Finance Office'"`
	Label        string `json:"label"         binding:"required,min=2,max=100"`
	IconName     string `json:"icon_name"     binding:"required"`
	DisplayOrder int    `json:"display_order"`
}

// UpdateServiceInput is the shape PATCH /api/admin/services/:id accepts.
// Every field is optional — only non-nil fields get written.
type UpdateServiceInput struct {
	Department   *string `json:"department,omitempty"`
	Label        *string `json:"label,omitempty"`
	IconName     *string `json:"icon_name,omitempty"`
	DisplayOrder *int    `json:"display_order,omitempty"`
	IsActive     *bool   `json:"is_active,omitempty"`
}
