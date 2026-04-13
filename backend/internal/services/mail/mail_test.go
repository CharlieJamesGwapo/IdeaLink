package mail_test

import (
	"testing"

	"idealink/internal/services/mail"

	"github.com/stretchr/testify/assert"
)

func TestSender_NoOpWhenHostEmpty(t *testing.T) {
	s := mail.NewSender(mail.Config{Host: ""})
	err := s.SendPasswordReset("alice@example.com", "https://example.com/reset?token=abc")
	assert.NoError(t, err, "no-op sender must not error when host is unset")
}

func TestSender_ErrorsWhenHostSetButUnreachable(t *testing.T) {
	s := mail.NewSender(mail.Config{
		Host: "127.0.0.1", Port: "1", From: "noreply@example.com",
	})
	err := s.SendPasswordReset("alice@example.com", "https://example.com/reset?token=abc")
	assert.Error(t, err, "real SMTP dial must fail for port 1")
}
