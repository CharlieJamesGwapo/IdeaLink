package migrations

import _ "embed"

//go:embed 001_initial.sql
var InitialSQL string

//go:embed 002_additions.sql
var AdditionsSQL string

//go:embed 003_user_education.sql
var UserEducationSQL string

//go:embed 004_password_reset_tokens.sql
var PasswordResetTokensSQL string

//go:embed 005_highlights.sql
var HighlightsSQL string

//go:embed 006_rename_departments.sql
var RenameDepartmentsSQL string

//go:embed 007_staff_email_login.sql
var StaffEmailLoginSQL string

//go:embed 008_status_simplification.sql
var StatusSimplificationSQL string

//go:embed 009_suggestion_rating.sql
var SuggestionRatingSQL string

//go:embed 010_suggestion_soft_delete.sql
var SuggestionSoftDeleteSQL string

//go:embed 011_office_hours_schedule.sql
var OfficeHoursScheduleSQL string

//go:embed 012_suggestion_attachments.sql
var SuggestionAttachmentsSQL string

//go:embed 013_email_logs.sql
var EmailLogsSQL string

//go:embed 014_user_grade_level.sql
var UserGradeLevelSQL string

//go:embed 015_services.sql
var ServicesSQL string
