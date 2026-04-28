package main

import (
	"log"

	"idealink/internal/config"
	"idealink/internal/handlers"
	"idealink/internal/middleware"
	"idealink/internal/repository"
	"idealink/internal/services"
	"idealink/internal/services/mail"

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
	passwordResetRepo := repository.NewPasswordResetRepo(db)
	suggestionRepo := repository.NewSuggestionRepo(db)
	announcementRepo := repository.NewAnnouncementRepo(db)
	testimonialRepo := repository.NewTestimonialRepo(db)
	officeHoursRepo := repository.NewOfficeHoursRepo(db)
	officeHoursClosuresRepo := repository.NewOfficeHoursClosuresRepo(db)
	attachmentRepo := repository.NewSuggestionAttachmentRepo(db)
	emailLogRepo := repository.NewEmailLogRepo(db)
	serviceRepo := repository.NewServiceRepo(db)

	// Services
	rawMailer := mail.NewSender(mail.Config{
		Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.SMTPFrom,
	})
	mailer := mail.NewAuditingSender(rawMailer, emailLogRepo, cfg.MailAllowNoop)
	authSvc := services.NewAuthService(userRepo, passwordResetRepo, mailer, cfg.JWTSecret, cfg.FrontendURL)
	provisioningSvc := services.NewUserProvisioningService(userRepo, authSvc, mailer, cfg.FrontendURL)
	announcementSvc := services.NewAnnouncementService(announcementRepo, userRepo)
	testimonialSvc := services.NewTestimonialService(testimonialRepo)
	suggestionSvc := services.NewSuggestionService(suggestionRepo, testimonialRepo)

	// Handlers
	authH := handlers.NewAuthHandler(authSvc)
	announcementH := handlers.NewAnnouncementHandler(announcementSvc)
	testimonialH := handlers.NewTestimonialHandler(testimonialSvc)
	suggestionH := handlers.NewSuggestionHandler(suggestionSvc, attachmentRepo)
	adminH := handlers.NewAdminHandler(suggestionRepo, userRepo)
	officeHoursH := handlers.NewOfficeHoursHandler(officeHoursRepo, officeHoursClosuresRepo)
	notificationsH := handlers.NewNotificationsHandler(suggestionRepo)
	usersH := handlers.NewUsersHandler(provisioningSvc)
	adminEmailLogsH := handlers.NewAdminEmailLogsHandler(emailLogRepo)
	servicesH := handlers.NewServicesHandler(serviceRepo)

	// Router
	r := gin.Default()
	r.Use(middleware.CORS(cfg.FrontendURL))

	auth := r.Group("/api/auth")
	{
		// Public signup is disabled — accounts are provisioned by Admin/Registrar
		// via POST /api/admin/users. The handler returns 403 so stale bookmarks
		// and scripts get a clear signal instead of silently creating accounts.
		auth.POST("/signup", authH.SignupDisabled)
		auth.POST("/login", authH.Login)
		auth.POST("/admin/login", authH.AdminLogin)
		auth.POST("/registrar/login", authH.RegistrarLogin)
		auth.POST("/accounting/login", authH.AccountingLogin)
		auth.POST("/logout", authH.Logout)
		auth.POST("/forgot-password", authH.ForgotPassword)
		auth.POST("/reset-password", authH.ResetPassword)
		auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), authH.Me)
		auth.POST("/complete-profile", middleware.AuthRequired(cfg.JWTSecret, "user"), authH.CompleteProfile)
		auth.PATCH("/profile", middleware.AuthRequired(cfg.JWTSecret, "user"), authH.UpdateProfile)
		auth.POST("/change-password", middleware.AuthRequired(cfg.JWTSecret, "user"), authH.ChangePassword)
	}

	api := r.Group("/api")
	{
		// Public
		api.GET("/announcements", announcementH.List)
		api.GET("/testimonials", testimonialH.List)
		api.GET("/office-hours/:dept", officeHoursH.Get)

		// Admin only
		admin := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin"))
		{
			admin.POST("/announcements", announcementH.Create)
			admin.PUT("/announcements/:id", announcementH.Update)
			admin.DELETE("/announcements/:id", announcementH.Delete)
			admin.PATCH("/testimonials/:id/toggle", testimonialH.Toggle)
			admin.POST("/suggestions/:id/feature", suggestionH.Feature)
			admin.GET("/admin/analytics", adminH.Analytics)
			admin.GET("/admin/email-logs", adminEmailLogsH.List)
			admin.GET("/admin/services", servicesH.AdminList)
			admin.POST("/admin/services", servicesH.Create)
			admin.PATCH("/admin/services/:id", servicesH.Update)
			admin.DELETE("/admin/services/:id", servicesH.Delete)
		}

		// Admin + Registrar can provision student accounts
		provisioners := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin", "registrar"))
		{
			provisioners.POST("/admin/users", usersH.Create)
			provisioners.POST("/admin/users/bulk", usersH.BulkCreate)
		}

		// User only
		user := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "user"))
		{
			user.POST("/suggestions", suggestionH.Submit)
			user.POST("/suggestions/:id/attachments", suggestionH.UploadAttachment)
			user.GET("/submissions/status-unread-count", suggestionH.StatusUnreadCount)
			user.POST("/submissions/mark-seen", suggestionH.MarkSubmissionsSeen)
			user.GET("/submissions/weekly-usage", suggestionH.WeeklyUsage)
		}

		// Authenticated (all roles)
		authenticated := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "user", "admin", "registrar", "accounting"))
		{
			authenticated.GET("/suggestions", suggestionH.List)
			authenticated.GET("/suggestions/:id/attachments", suggestionH.ListAttachments)
			authenticated.GET("/suggestions/:id/attachments/:aid", suggestionH.DownloadAttachment)
			authenticated.GET("/notifications/unread-count", notificationsH.UnreadCount)
			authenticated.GET("/announcements/unread-count", announcementH.UnreadCount)
			authenticated.POST("/announcements/mark-seen", announcementH.MarkSeen)
			authenticated.GET("/services", servicesH.List)
		}

		// Admin + staff analytics
		staffAnalytics := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin", "registrar", "accounting"))
		{
			staffAnalytics.GET("/ratings-summary", adminH.RatingsSummary)
		}

		// Admin + registrar + accounting
		staff := api.Group("", middleware.AuthRequired(cfg.JWTSecret, "admin", "registrar", "accounting"))
		{
			staff.PATCH("/suggestions/:id/status", suggestionH.UpdateStatus)
			staff.POST("/suggestions/:id/read", suggestionH.MarkReviewed)
			staff.DELETE("/suggestions/:id", suggestionH.Delete)
			staff.PUT("/office-hours/:dept/schedule",        officeHoursH.PutSchedule)
			staff.GET("/office-hours/:dept/closures",        officeHoursH.ListClosures)
			staff.POST("/office-hours/:dept/closures",       officeHoursH.CreateClosure)
			staff.DELETE("/office-hours/:dept/closures/:id", officeHoursH.CancelClosure)
		}
	}

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
