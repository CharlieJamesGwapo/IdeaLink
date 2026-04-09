package main

import (
	"log"

	"idealink/internal/config"
	"idealink/internal/handlers"
	"idealink/internal/middleware"
	"idealink/internal/repository"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}
	db := config.ConnectDB(cfg.DatabaseURL)
	defer db.Close()

	// Repositories
	userRepo := repository.NewUserRepo(db)
	suggestionRepo := repository.NewSuggestionRepo(db)
	announcementRepo := repository.NewAnnouncementRepo(db)
	testimonialRepo := repository.NewTestimonialRepo(db)

	// Services
	authSvc := services.NewAuthService(userRepo, cfg.JWTSecret)
	announcementSvc := services.NewAnnouncementService(announcementRepo)
	testimonialSvc := services.NewTestimonialService(testimonialRepo)
	suggestionSvc := services.NewSuggestionService(suggestionRepo, userRepo, testimonialRepo)

	// Handlers
	authH := handlers.NewAuthHandler(authSvc)
	announcementH := handlers.NewAnnouncementHandler(announcementSvc)
	testimonialH := handlers.NewTestimonialHandler(testimonialSvc)
	suggestionH := handlers.NewSuggestionHandler(suggestionSvc)
	adminH := handlers.NewAdminHandler(suggestionRepo, userRepo)

	// Router
	r := gin.Default()
	r.Use(middleware.CORS(cfg.FrontendURL))

	auth := r.Group("/api/auth")
	{
		auth.POST("/signup", authH.Signup)
		auth.POST("/login", authH.Login)
		auth.POST("/admin/login", authH.AdminLogin)
		auth.POST("/registrar/login", authH.RegistrarLogin)
		auth.POST("/accounting/login", authH.AccountingLogin)
		auth.POST("/logout", authH.Logout)
		auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authH.Me)
	}

	api := r.Group("/api")
	{
		// Public
		api.GET("/announcements", announcementH.List)
		api.GET("/testimonials", testimonialH.List)

		// Admin only
		admin := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin"))
		{
			admin.POST("/announcements", announcementH.Create)
			admin.PUT("/announcements/:id", announcementH.Update)
			admin.DELETE("/announcements/:id", announcementH.Delete)
			admin.PATCH("/testimonials/:id/toggle", testimonialH.Toggle)
			admin.POST("/suggestions/:id/feature", suggestionH.Feature)
			admin.GET("/admin/analytics", adminH.Analytics)
		}

		// User only
		user := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "user"))
		{
			user.POST("/suggestions", suggestionH.Submit)
		}

		// Authenticated (all roles) — role-filtered inside handler
		authenticated := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "user", "admin", "registrar", "accounting"))
		{
			authenticated.GET("/suggestions", suggestionH.List)
		}

		// Admin + registrar + accounting
		staff := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin", "registrar", "accounting"))
		{
			staff.PATCH("/suggestions/:id/status", suggestionH.UpdateStatus)
		}
	}

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
