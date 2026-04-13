package migrations

import _ "embed"

//go:embed 001_initial.sql
var InitialSQL string

//go:embed 002_additions.sql
var AdditionsSQL string

//go:embed 003_user_education.sql
var UserEducationSQL string
