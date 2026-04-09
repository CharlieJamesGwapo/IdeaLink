// backend/internal/migrations/migrations.go
package migrations

import _ "embed"

//go:embed 001_initial.sql
var InitialSQL string
