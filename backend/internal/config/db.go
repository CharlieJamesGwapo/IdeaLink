// backend/internal/config/db.go
package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/lib/pq"
)

func ConnectDB(databaseURL string) *sql.DB {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("failed to open DB: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping DB: %v", err)
	}
	runMigrations(db)
	return db
}

func runMigrations(db *sql.DB) {
	_, filename, _, _ := runtime.Caller(0)
	// navigate from internal/config/ to internal/migrations/
	migrationPath := filepath.Join(filepath.Dir(filename), "..", "migrations", "001_initial.sql")
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		log.Fatalf("failed to read migration: %v", err)
	}
	if _, err := db.Exec(string(content)); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	fmt.Println("Migrations applied")
}
