package main

import (
	"fmt"
	"log"
	"time"

	"idealink/internal/config"
	"idealink/internal/repository"
	"idealink/internal/services"
	"idealink/internal/services/mail"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}
	db := config.ConnectDB(cfg.DatabaseURL)
	defer db.Close()

	userRepo := repository.NewUserRepo(db)
	passwordResetRepo := repository.NewPasswordResetRepo(db)
	mailer := mail.NewSender(mail.Config{
		Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.SMTPFrom,
	})
	svc := services.NewAuthService(userRepo, passwordResetRepo, mailer, cfg.JWTSecret, cfg.FrontendURL)

	adminPass, _ := svc.HashPassword("Admin@123")
	studentPass, _ := svc.HashPassword("Student@123")
	staffPass, _ := svc.HashPassword("Staff@123")

	// Admin account
	_, err = db.Exec(
		`INSERT INTO admin_accounts (fullname, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET password = $3`,
		"System Administrator", "admin@ascb.edu.ph", adminPass,
	)
	if err != nil {
		log.Fatal(err)
	}

	// Registrar account
	_, err = db.Exec(
		`INSERT INTO registrar_accounts (email, password) VALUES ($1, $2)
		 ON CONFLICT (email) DO UPDATE SET password = $2`,
		"registrar@ascb.edu.ph", staffPass,
	)
	if err != nil {
		log.Fatal(err)
	}

	// Finance (Accounting) account
	_, err = db.Exec(
		`INSERT INTO accounting_accounts (email, password) VALUES ($1, $2)
		 ON CONFLICT (email) DO UPDATE SET password = $2`,
		"finance@ascb.edu.ph", staffPass,
	)
	if err != nil {
		log.Fatal(err)
	}

	// Student accounts
	students := []struct{ name, email string }{
		{"Juan dela Cruz", "student@ascb.edu.ph"},
		{"Maria Santos", "maria.santos@ascb.edu.ph"},
		{"Pedro Reyes", "pedro.reyes@ascb.edu.ph"},
	}
	for _, s := range students {
		_, err = db.Exec(
			`INSERT INTO users (fullname, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
			s.name, s.email, studentPass,
		)
		if err != nil {
			log.Printf("student insert warning: %v", err)
		}
	}

	// Get student IDs
	var studentID1, studentID2, studentID3 int
	db.QueryRow(`SELECT id FROM users WHERE email = 'student@ascb.edu.ph'`).Scan(&studentID1)
	db.QueryRow(`SELECT id FROM users WHERE email = 'maria.santos@ascb.edu.ph'`).Scan(&studentID2)
	db.QueryRow(`SELECT id FROM users WHERE email = 'pedro.reyes@ascb.edu.ph'`).Scan(&studentID3)

	type sampleFeedback struct {
		userID          int
		department      string
		serviceCategory string
		title           string
		description     string
		status          string
		anonymous       bool
		daysAgo         int
	}

	samples := []sampleFeedback{
		{studentID1, "Registrar Office", "Transcript of Records", "Slow TOR Processing", "It takes more than 2 weeks to process transcript requests. Please improve turnaround time.", "Delivered", false, 1},
		{studentID1, "Finance Office", "Tuition Fee Payment", "Online Payment Option", "Please add GCash or Maya payment options for tuition. Going to the cashier is inconvenient.", "Delivered", false, 3},
		{studentID2, "Registrar Office", "Enrollment/Registration", "Enrollment System Error", "The online enrollment portal shows error 404 every Monday morning during peak enrollment hours.", "Reviewed", false, 5},
		{studentID2, "Finance Office", "Scholarship/Financial Aid", "Scholarship Notification Delay", "Scholarship recipients are notified very late. I almost missed the deadline for my scholarship application.", "Delivered", true, 2},
		{studentID3, "Registrar Office", "Certificate of Enrollment", "Certificate Request Process", "The process for requesting enrollment certificates should be available online, not just in-person.", "Delivered", false, 7},
		{studentID3, "Finance Office", "Fee Assessment", "Wrong Assessment Amount", "My assessment shows incorrect tuition amount. I was charged for units I dropped.", "Delivered", false, 4},
		{studentID1, "Registrar Office", "ID Issuance", "ID Replacement Takes Too Long", "It takes 3 months to replace a lost ID. Can this be expedited?", "Reviewed", false, 10},
		{studentID2, "Finance Office", "Clearance Processing", "Clearance Requirement Confusion", "The requirements for clearance are not clearly posted anywhere. Please put them on the school website.", "Delivered", true, 6},
		{studentID3, "Registrar Office", "Good Moral Certificate", "Good Moral Certificate Availability", "Good moral certificates should be available within 3 days, not 2 weeks.", "Delivered", false, 8},
		{studentID1, "Finance Office", "Refund Request", "Refund Processing Time", "Refund requests take over a month to process. Please improve this for students who need urgent funds.", "Delivered", false, 9},
	}

	for _, f := range samples {
		submittedAt := time.Now().AddDate(0, 0, -f.daysAgo)
		_, err = db.Exec(
			`INSERT INTO suggestions (user_id, department, service_category, title, description, status, anonymous, submitted_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT DO NOTHING`,
			f.userID, f.department, f.serviceCategory, f.title, f.description, f.status, f.anonymous, submittedAt,
		)
		if err != nil {
			log.Printf("sample feedback insert warning: %v", err)
		}
	}

	// Announcements
	var adminID int
	db.QueryRow(`SELECT id FROM admin_accounts WHERE email = 'admin@ascb.edu.ph'`).Scan(&adminID)
	announcements := []struct{ title, message string }{
		{"Enrollment Period Open", "Enrollment for Second Semester AY 2025-2026 is now open. Please coordinate with the Registrar's Office for your enrollment concerns."},
		{"Holiday Notice", "The Registrar and Accounting offices will be closed on April 9, 2026 in observance of Araw ng Kagitingan. Regular operations resume on April 10."},
		{"New Online Payment System", "The Accounting Office is pleased to announce that online payment via GCash and Maya is now available for tuition and miscellaneous fees."},
	}
	for _, a := range announcements {
		db.Exec(
			`INSERT INTO announcements (admin_id, title, message) VALUES ($1, $2, $3)`,
			adminID, a.title, a.message,
		)
	}

	fmt.Println("=== Seed Complete ===")
	fmt.Println("Admin:      admin@ascb.edu.ph   / Admin@123")
	fmt.Println("Student:    student@ascb.edu.ph  / Student@123")
	fmt.Println("Student 2:  maria.santos@ascb.edu.ph / Student@123")
	fmt.Println("Student 3:  pedro.reyes@ascb.edu.ph  / Student@123")
	fmt.Println("Registrar:  registrar@ascb.edu.ph / Staff@123")
	fmt.Println("Finance:    finance@ascb.edu.ph   / Staff@123")
}
