package handlers

import (
	"testing"
	"time"

	"idealink/internal/models"
)

// schedule helper: Mon-Fri 8..17, Sat/Sun closed.
func standardSchedule() []models.DaySchedule {
	out := make([]models.DaySchedule, 7)
	for i := 0; i < 7; i++ {
		closed := i == 0 || i == 6
		out[i] = models.DaySchedule{
			Weekday: i, OpenHour: 8, CloseHour: 17, IsClosed: closed,
		}
	}
	return out
}

func mustTime(t *testing.T, s string) time.Time {
	t.Helper()
	loc, _ := time.LoadLocation("Asia/Manila")
	if loc == nil {
		loc = time.FixedZone("Asia/Manila", 8*60*60)
	}
	tt, err := time.ParseInLocation("2006-01-02 15:04", s, loc)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	return tt
}

func TestComputeStatus_OnSchedule_Open(t *testing.T) {
	now := mustTime(t, "2026-04-28 09:30") // Tuesday, 9:30 AM
	got := computeStatus(now, standardSchedule(), nil)
	if !got.IsOpen {
		t.Fatalf("expected open, got %+v", got)
	}
}

func TestComputeStatus_OnSchedule_BeforeOpen_Closed(t *testing.T) {
	now := mustTime(t, "2026-04-28 07:59") // Tuesday, 1 min before open
	got := computeStatus(now, standardSchedule(), nil)
	if got.IsOpen {
		t.Fatalf("expected closed, got %+v", got)
	}
	if got.StatusMessage == "" {
		t.Fatalf("expected status_message")
	}
}

func TestComputeStatus_TodayClosed_Beats_TimeOfDay(t *testing.T) {
	now := mustTime(t, "2026-04-26 12:00") // Sunday, noon
	got := computeStatus(now, standardSchedule(), nil)
	if got.IsOpen {
		t.Fatalf("expected closed, got %+v", got)
	}
	if got.StatusMessage != "Office is closed today" {
		t.Fatalf("unexpected message: %q", got.StatusMessage)
	}
}

func TestComputeStatus_ActiveClosure_Beats_Schedule(t *testing.T) {
	now := mustTime(t, "2026-04-28 09:30") // Tuesday, would be open
	reason := "Power outage"
	closure := &models.Closure{
		ID:      1,
		StartAt: mustTime(t, "2026-04-28 00:00"),
		EndAt:   mustTime(t, "2026-04-29 00:00"),
		Reason:  &reason,
	}
	got := computeStatus(now, standardSchedule(), closure)
	if got.IsOpen {
		t.Fatalf("expected closed (active closure), got %+v", got)
	}
	if got.StatusMessage != "Closed: Power outage" {
		t.Fatalf("unexpected message: %q", got.StatusMessage)
	}
}

func TestComputeStatus_AfterClose_Closed(t *testing.T) {
	now := mustTime(t, "2026-04-28 17:00") // Tuesday, 5:00 PM (close hour)
	got := computeStatus(now, standardSchedule(), nil)
	if got.IsOpen {
		t.Fatalf("expected closed at 17:00 (close-hour boundary is exclusive)")
	}
}
