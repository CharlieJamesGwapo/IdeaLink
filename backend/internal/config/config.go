// backend/internal/config/config.go
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	FrontendURL string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading env from OS")
	}
	return &Config{
		DatabaseURL: mustGet("DATABASE_URL"),
		JWTSecret:   mustGet("JWT_SECRET"),
		Port:        getOr("PORT", "8080"),
		FrontendURL: getOr("FRONTEND_URL", "http://localhost:5173"),
	}
}

func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return v
}

func getOr(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
