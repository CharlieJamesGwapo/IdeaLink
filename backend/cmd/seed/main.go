package main

import (
	"fmt"
	"log"

	"idealink/internal/config"
	"idealink/internal/repository"
	"idealink/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}
	db := config.ConnectDB(cfg.DatabaseURL)
	defer db.Close()

	userRepo := repository.NewUserRepo(db)
	svc := services.NewAuthService(userRepo, cfg.JWTSecret)

	hashed, err := svc.HashPassword("admin123")
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(
		`INSERT INTO admin_accounts (fullname, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
		"Admin", "admin@idealink.com", hashed,
	)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(
		`INSERT INTO registrar_accounts (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
		"registrar", hashed,
	)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(
		`INSERT INTO accounting_accounts (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
		"accounting", hashed,
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Seed complete. Admin: admin@idealink.com / admin123, Registrar: registrar / admin123, Accounting: accounting / admin123")
}
