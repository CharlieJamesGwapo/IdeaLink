package mail_test

import (
	"testing"

	"idealink/internal/services/mail"

	"github.com/stretchr/testify/assert"
)

func TestSender_ReturnsNotConfiguredWhenHostEmpty(t *testing.T) {
	s := mail.NewSender(mail.Config{Host: ""})
	err := s.SendPasswordReset("alice@example.com", "https://example.com/reset?token=abc")
	assert.ErrorIs(t, err, mail.ErrNotConfigured,
		"caller must be able to detect unconfigured SMTP to surface a fallback")
}

func TestSender_ErrorsWhenHostSetButUnreachable(t *testing.T) {
	s := mail.NewSender(mail.Config{
		Host: "127.0.0.1", Port: "1", From: "noreply@example.com",
	})
	err := s.SendPasswordReset("alice@example.com", "https://example.com/reset?token=abc")
	assert.Error(t, err, "real SMTP dial must fail for port 1")
}
