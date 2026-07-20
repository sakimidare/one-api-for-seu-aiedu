package model

import (
	"testing"
	"time"

	"github.com/songquanpeng/one-api/common/config"
)

func TestPointsRefreshSchedule(t *testing.T) {
	original := config.PointsRefreshTime
	t.Cleanup(func() { config.PointsRefreshTime = original })
	config.PointsRefreshTime = "08:30"
	location := time.UTC

	before := time.Date(2026, 7, 20, 8, 29, 0, 0, location)
	refreshAt := refreshAtForDate(location, before)
	if shouldRefresh(before, refreshAt) {
		t.Fatal("refresh should not be due before the configured time")
	}
	if got := nextRefreshAt(location, before); !got.Equal(refreshAt) {
		t.Fatalf("next refresh = %s, want %s", got, refreshAt)
	}

	after := time.Date(2026, 7, 20, 8, 31, 0, 0, location)
	refreshAt = refreshAtForDate(location, after)
	if !shouldRefresh(after, refreshAt) {
		t.Fatal("refresh should be due after the configured time")
	}
	wantNext := time.Date(2026, 7, 21, 8, 30, 0, 0, location)
	if got := nextRefreshAt(location, after); !got.Equal(wantNext) {
		t.Fatalf("next refresh = %s, want %s", got, wantNext)
	}
}

func TestGetDailyPointsByGroup(t *testing.T) {
	original := config.DailyPointsByGroup
	t.Cleanup(func() { config.DailyPointsByGroup = original })
	config.DailyPointsByGroup = `{"default":1000,"dev":3000}`

	if got := GetDailyPointsForGroup("dev"); got != 3000 {
		t.Fatalf("dev points = %d, want 3000", got)
	}
	if got := GetDailyPointsForGroup("missing"); got != 0 {
		t.Fatalf("missing group points = %d, want 0", got)
	}
}
