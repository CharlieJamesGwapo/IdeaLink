package mail

import (
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"net/mail"
	"net/smtp"
	"strings"
)

// ErrNotConfigured is returned when SMTP_HOST is unset. Callers should treat
// this as "email did not send" and surface a fallback (e.g., display the
// credentials in the admin UI so they can be relayed manually).
var ErrNotConfigured = errors.New("mail: SMTP_HOST not configured")

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
// Returns ErrNotConfigured if SMTP_HOST is empty.
func (s *Sender) SendPasswordReset(to, resetLink string) error {
	if s.cfg.Host == "" {
		log.Printf("[mail] SMTP_HOST unset — password reset link for %s: %s", to, resetLink)
		return ErrNotConfigured
	}
	subject := "Reset your IdeaLink password"
	body := fmt.Sprintf(
		"Hi,\r\n\r\nSomeone requested a password reset for your IdeaLink account.\r\n"+
			"Click the link below to choose a new password. The link expires in 30 minutes and can only be used once.\r\n\r\n"+
			"%s\r\n\r\n"+
			"If you didn't request this, you can safely ignore this email.\r\n",
		resetLink,
	)
	return s.send(to, subject, body)
}

// SendNewUserCredentials emails a freshly provisioned account's login details.
// Returns ErrNotConfigured if SMTP_HOST is empty — the caller is expected to
// surface the temp password through another channel (admin UI) when that
// happens instead of pretending the email went out.
func (s *Sender) SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error {
	if s.cfg.Host == "" {
		log.Printf("[mail] SMTP_HOST unset — cannot send credentials for %s", to)
		return ErrNotConfigured
	}
	subject := "Your IdeaLink account has been created"
	body := fmt.Sprintf(
		"Hi %s,\r\n\r\n"+
			"An IdeaLink account has been created for you by the school administration.\r\n\r\n"+
			"Login URL: %s\r\n"+
			"Email:     %s\r\n"+
			"Password:  %s\r\n\r\n"+
			"Please sign in and change your password as soon as possible.\r\n"+
			"If you didn't expect this email, contact the registrar's office.\r\n",
		fullname, loginURL, to, rawPassword,
	)
	return s.send(to, subject, body)
}

// send dispatches the message using whichever transport the configured port
// implies. 465 → implicit TLS (Gmail's smtps); everything else → STARTTLS on
// the standard smtp.SendMail path. Previously the service hard-coded the
// STARTTLS path, so deploys that set SMTP_PORT=465 silently failed.
func (s *Sender) send(to, subject, body string) error {
	envelopeFrom := s.cfg.User
	if addr, err := mail.ParseAddress(s.cfg.From); err == nil && addr.Address != "" {
		envelopeFrom = addr.Address
	}
	msg := []byte(
		"From: " + s.cfg.From + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
			body,
	)
	addr := s.cfg.Host + ":" + s.cfg.Port
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Pass, s.cfg.Host)

	if strings.TrimSpace(s.cfg.Port) == "465" {
		return sendImplicitTLS(addr, s.cfg.Host, auth, envelopeFrom, to, msg)
	}
	return smtp.SendMail(addr, auth, envelopeFrom, []string{to}, msg)
}

// sendImplicitTLS handles port-465 SMTPS (the connection is TLS from byte 0).
// smtp.SendMail only knows how to start a plain connection and issue STARTTLS,
// which is why it silently fails against Gmail on 465.
func sendImplicitTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	tlsConn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host})
	if err != nil {
		return fmt.Errorf("smtps dial %s: %w", addr, err)
	}
	c, err := smtp.NewClient(tlsConn, host)
	if err != nil {
		tlsConn.Close()
		return fmt.Errorf("smtps client: %w", err)
	}
	defer c.Close()

	if err := c.Auth(auth); err != nil {
		return fmt.Errorf("smtps auth: %w", err)
	}
	if err := c.Mail(from); err != nil {
		return fmt.Errorf("smtps MAIL FROM: %w", err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("smtps RCPT TO: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("smtps DATA: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("smtps write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtps close: %w", err)
	}
	return c.Quit()
}
