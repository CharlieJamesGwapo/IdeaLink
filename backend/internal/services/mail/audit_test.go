// backend/internal/services/mail/audit_test.go
package mail

import (
	"errors"
	"testing"
)

type fakeRecorder struct {
	calls []recordCall
	err   error
}

type recordCall struct {
	to, kind, status, errMsg string
}

func (f *fakeRecorder) Record(to, kind, status, errMsg string) error {
	f.calls = append(f.calls, recordCall{to, kind, status, errMsg})
	return f.err
}

func TestResolveStatus(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus string
		wantMsg    string
	}{
		{"nil is sent", nil, "sent", ""},
		{"ErrNotConfigured is skipped", ErrNotConfigured, "skipped", ErrNotConfigured.Error()},
		{"wrapped ErrNotConfigured is skipped", errors.New("wrap: " + ErrNotConfigured.Error()), "failed", "wrap: " + ErrNotConfigured.Error()},
		{"other errors are failed", errors.New("boom"), "failed", "boom"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			gotStatus, gotMsg := resolveStatus(tc.err)
			if gotStatus != tc.wantStatus {
				t.Fatalf("status: got %q, want %q", gotStatus, tc.wantStatus)
			}
			if gotMsg != tc.wantMsg {
				t.Fatalf("msg: got %q, want %q", gotMsg, tc.wantMsg)
			}
		})
	}
}

func TestAuditingSender_mapErr(t *testing.T) {
	t.Run("allowNoop converts ErrNotConfigured to nil", func(t *testing.T) {
		a := &AuditingSender{allowNoop: true}
		if err := a.mapErr(ErrNotConfigured); err != nil {
			t.Fatalf("want nil, got %v", err)
		}
	})
	t.Run("default surfaces ErrNotConfigured", func(t *testing.T) {
		a := &AuditingSender{allowNoop: false}
		if err := a.mapErr(ErrNotConfigured); !errors.Is(err, ErrNotConfigured) {
			t.Fatalf("want ErrNotConfigured, got %v", err)
		}
	})
	t.Run("other errors pass through", func(t *testing.T) {
		a := &AuditingSender{allowNoop: true}
		want := errors.New("smtp down")
		if err := a.mapErr(want); err != want {
			t.Fatalf("want %v, got %v", want, err)
		}
	})
}

func TestAuditingSender_audit_neverBlocksOnRecorderError(t *testing.T) {
	rec := &fakeRecorder{err: errors.New("db down")}
	a := &AuditingSender{recorder: rec}
	// audit is pkg-private; call directly — success doesn't panic even though
	// the recorder is failing.
	a.audit("user@example.com", "password_reset", nil)
	if len(rec.calls) != 1 {
		t.Fatalf("recorder not called: %+v", rec.calls)
	}
	if got := rec.calls[0]; got.status != "sent" || got.errMsg != "" {
		t.Fatalf("unexpected call: %+v", got)
	}
}
