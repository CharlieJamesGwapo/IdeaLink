// backend/internal/config/db.go
package config

import (
	"database/sql"
	"log"
	"time"

	"idealink/internal/migrations"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

func ConnectDB(databaseURL string) *sql.DB {
	// Parse the URL with pgx and force exec mode. Default mode caches named
	// prepared statements which break behind transaction-mode poolers
	// (Render/Neon/Supabase) — symptom: "unnamed prepared statement does not
	// exist". QueryExecModeExec sends Parse+Bind+Execute+Sync as one batch
	// per query with no caching: pooler-safe AND keeps binary parameter
	// encoding for bytea (file uploads). Simple protocol mode would force
	// text-escaped hex for []byte, which corrupts file uploads.
	cfg, err := pgx.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("failed to parse DATABASE_URL: %v", err)
	}
	cfg.DefaultQueryExecMode = pgx.QueryExecModeExec

	db, err := sql.Open("pgx", stdlib.RegisterConnConfig(cfg))
	if err != nil {
		log.Fatalf("failed to open DB: %v", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping DB: %v", err)
	}
	runMigrations(db)
	return db
}

func runMigrations(db *sql.DB) {
	if _, err := db.Exec(migrations.InitialSQL); err != nil {
		log.Fatalf("failed to run initial migration: %v", err)
	}
	if _, err := db.Exec(migrations.AdditionsSQL); err != nil {
		log.Fatalf("failed to run additions migration: %v", err)
	}
	if _, err := db.Exec(migrations.UserEducationSQL); err != nil {
		log.Fatalf("failed to run user education migration: %v", err)
	}
	if _, err := db.Exec(migrations.PasswordResetTokensSQL); err != nil {
		log.Fatalf("failed to run password_reset_tokens migration: %v", err)
	}
	if _, err := db.Exec(migrations.HighlightsSQL); err != nil {
		log.Fatalf("failed to run highlights migration: %v", err)
	}
	if _, err := db.Exec(migrations.RenameDepartmentsSQL); err != nil {
		log.Fatalf("failed to run rename_departments migration: %v", err)
	}
	if _, err := db.Exec(migrations.StaffEmailLoginSQL); err != nil {
		log.Fatalf("failed to run staff_email_login migration: %v", err)
	}
	if _, err := db.Exec(migrations.StatusSimplificationSQL); err != nil {
		log.Fatalf("failed to run status_simplification migration: %v", err)
	}
	if _, err := db.Exec(migrations.SuggestionRatingSQL); err != nil {
		log.Fatalf("failed to run suggestion_rating migration: %v", err)
	}
	if _, err := db.Exec(migrations.SuggestionSoftDeleteSQL); err != nil {
		log.Fatalf("failed to run suggestion_soft_delete migration: %v", err)
	}
	if _, err := db.Exec(migrations.OfficeHoursScheduleSQL); err != nil {
		log.Fatalf("failed to run office_hours_schedule migration: %v", err)
	}
	if _, err := db.Exec(migrations.SuggestionAttachmentsSQL); err != nil {
		log.Fatalf("failed to run suggestion_attachments migration: %v", err)
	}
	if _, err := db.Exec(migrations.EmailLogsSQL); err != nil {
		log.Fatalf("failed to run email_logs migration: %v", err)
	}
	if _, err := db.Exec(migrations.UserGradeLevelSQL); err != nil {
		log.Fatalf("failed to run user_grade_level migration: %v", err)
	}
	if _, err := db.Exec(migrations.ServicesSQL); err != nil {
		log.Fatalf("failed to run services migration: %v", err)
	}
	if _, err := db.Exec(migrations.OfficeHoursV2SQL); err != nil {
		log.Fatalf("failed to run office_hours_v2 migration: %v", err)
	}
	log.Println("Migrations applied")
}
