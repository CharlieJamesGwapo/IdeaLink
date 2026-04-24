// backend/internal/services/mail/audit.go
package mail

import (
	"errors"
	"log"
)

// Recorder is the minimal surface AuditingSender needs from the email_logs
// repository. Defined here so the mail package doesn't import repository.
type Recorder interface {
	Record(to, kind, status, errMsg string) error
}

// AuditingSender wraps a *Sender and writes one email_logs row per attempt.
// Record failures are log-and-continue — never block the original send.
type AuditingSender struct {
	inner     *Sender
	recorder  Recorder
	allowNoop bool
}

// NewAuditingSender builds the wrapper. allowNoop converts ErrNotConfigured
// into a nil error return (for dev boxes without SMTP set up).
func NewAuditingSender(inner *Sender, recorder Recorder, allowNoop bool) *AuditingSender {
	return &AuditingSender{inner: inner, recorder: recorder, allowNoop: allowNoop}
}

func (a *AuditingSender) SendPasswordReset(to, resetLink string) error {
	err := a.inner.SendPasswordReset(to, resetLink)
	a.audit(to, "password_reset", err)
	return a.mapErr(err)
}

func (a *AuditingSender) SendNewUserCredentials(to, fullname, rawPassword, loginURL string) error {
	err := a.inner.SendNewUserCredentials(to, fullname, rawPassword, loginURL)
	a.audit(to, "provisioning", err)
	return a.mapErr(err)
}

// audit resolves the status string and writes a row. Record errors are logged
// and ignored so auditing never breaks the caller's flow.
func (a *AuditingSender) audit(to, kind string, err error) {
	status, errMsg := resolveStatus(err)
	if rErr := a.recorder.Record(to, kind, status, errMsg); rErr != nil {
		log.Printf("[mail audit] failed to record %s/%s for %s: %v", kind, status, to, rErr)
	}
}

// mapErr converts ErrNotConfigured to nil when allowNoop is set; otherwise
// every error passes through unchanged.
func (a *AuditingSender) mapErr(err error) error {
	if err == nil {
		return nil
	}
	if a.allowNoop && errors.Is(err, ErrNotConfigured) {
		return nil
	}
	return err
}

func resolveStatus(err error) (status string, errMsg string) {
	if err == nil {
		return "sent", ""
	}
	if errors.Is(err, ErrNotConfigured) {
		return "skipped", err.Error()
	}
	return "failed", err.Error()
}
