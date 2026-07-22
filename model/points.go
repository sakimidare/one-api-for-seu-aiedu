package model

import (
	"fmt"
	"strings"
	"time"

	"github.com/songquanpeng/one-api/common"
	"github.com/songquanpeng/one-api/common/config"
	"github.com/songquanpeng/one-api/common/logger"
)

func RefreshUserPoints() error {
	tx := DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	if err := tx.Exec("UPDATE users SET points = daily_points, used_points = 0 WHERE status != ?", UserStatusDeleted).Error; err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Commit().Error; err != nil {
		return err
	}
	if common.RedisEnabled {
		var users []*User
		if err := DB.Select("id", "points").Where("status != ?", UserStatusDeleted).Find(&users).Error; err == nil {
			for _, user := range users {
				_ = common.RedisSet(fmt.Sprintf("user_points:%d", user.Id), fmt.Sprintf("%d", user.Points), time.Duration(UserId2PointsCacheSeconds)*time.Second)
			}
		}
	}
	return nil
}

func StartPointsRefreshWorker() {
	go func() {
		for {
			location, now := pointsRefreshNow()
			refreshDate := now.Format("2006-01-02")
			refreshAt := refreshAtForDate(location, now)
			if shouldRefresh(now, refreshAt) && config.LastPointsRefreshDate != refreshDate {
				if err := refreshAndRecord(refreshDate); err != nil {
					logger.SysError("failed to refresh daily points: " + err.Error())
				}
			}
			wait := time.Until(nextRefreshAt(location, now))
			if wait > time.Minute {
				wait = time.Minute
			}
			if wait <= 0 {
				wait = time.Second
			}
			time.Sleep(wait)
		}
	}()
}

func pointsRefreshNow() (*time.Location, time.Time) {
	location, err := time.LoadLocation(config.PointsRefreshTimezone)
	if err != nil {
		logger.SysError(fmt.Sprintf("invalid PointsRefreshTimezone %q, fallback to Asia/Shanghai", config.PointsRefreshTimezone))
		location, _ = time.LoadLocation("Asia/Shanghai")
	}
	return location, time.Now().In(location)
}

func nextRefreshAt(location *time.Location, now time.Time) time.Time {
	next := refreshAtForDate(location, now)
	if !next.After(now) {
		next = next.AddDate(0, 0, 1)
	}
	return next
}

func refreshAtForDate(location *time.Location, now time.Time) time.Time {
	hour, minute := parseRefreshTime()
	return time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, location)
}

func shouldRefresh(now time.Time, refreshAt time.Time) bool {
	return !now.Before(refreshAt)
}

func parseRefreshTime() (int, int) {
	parts := strings.Split(config.PointsRefreshTime, ":")
	if len(parts) != 2 {
		return 0, 0
	}
	t, err := time.Parse("15:04", config.PointsRefreshTime)
	if err != nil {
		return 0, 0
	}
	return t.Hour(), t.Minute()
}

func refreshAndRecord(date string) error {
	if err := RefreshUserPoints(); err != nil {
		return err
	}
	if err := UpdateOption("LastPointsRefreshDate", date); err != nil {
		return err
	}
	logger.SysLog("daily points refreshed for " + date)
	return nil
}
