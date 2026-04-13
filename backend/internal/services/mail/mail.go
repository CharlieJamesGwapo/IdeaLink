package mail

import (
	"fmt"
	"log"
	"net/smtp"
)

type Config struct {
	Host string
	Port string
	User string
	Pass string
	From string
}

type Sender struct {
	cfg Config
}

func NewSender(cfg Config) *Sender {
	return &Sender{cfg: cfg}
}

// SendPasswordReset sends a plain-text password reset email.
// If Host is empty, it logs and returns nil (local dev without SMTP).
func (s *Sender) SendPasswordReset(to, resetLink string) error {
	if s.cfg.Host == "" {
		log.Printf("[mail] SMTP_HOST unset — skipping send. Reset link for %s: %s", to, resetLink)
		return nil
	}
	subject := "Reset your IdeaLink password"
	body := fmt.Sprintf(
		"Hi,\r\n\r\nSomeone requested a password reset for your IdeaLink account.\r\n"+
			"Click the link below to choose a new password. The link expires in 30 minutes and can only be used once.\r\n\r\n"+
			"%s\r\n\r\n"+
			"If you didn't request this, you can safely ignore this email.\r\n",
		resetLink,
	)
	msg := []byte(
		"From: " + s.cfg.From + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
			body,
	)
	addr := s.cfg.Host + ":" + s.cfg.Port
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Pass, s.cfg.Host)
	return smtp.SendMail(addr, auth, s.cfg.From, []string{to}, msg)
}
