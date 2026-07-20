package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/model"
	relaymodel "github.com/songquanpeng/one-api/relay/model"
)

func GetSubscription(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	points, err := model.GetUserPoints(userId)
	if err != nil {
		c.JSON(200, gin.H{
			"error": relaymodel.Error{
				Message: err.Error(),
				Type:    "upstream_error",
			},
		})
		return
	}
	usedPoints, err := model.GetUserUsedPoints(userId)
	if err != nil {
		c.JSON(200, gin.H{
			"error": relaymodel.Error{
				Message: err.Error(),
				Type:    "upstream_error",
			},
		})
		return
	}
	total := float64(points + usedPoints)
	c.JSON(200, OpenAISubscriptionResponse{
		Object:             "billing_subscription",
		HasPaymentMethod:   true,
		SoftLimitUSD:       total,
		HardLimitUSD:       total,
		SystemHardLimitUSD: total,
		AccessUntil:        0,
	})
}

func GetUsage(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	points, err := model.GetUserUsedPoints(userId)
	if err != nil {
		c.JSON(200, gin.H{
			"error": relaymodel.Error{
				Message: err.Error(),
				Type:    "one_api_error",
			},
		})
		return
	}
	c.JSON(200, OpenAIUsageResponse{
		Object:     "list",
		TotalUsage: float64(points) * 100,
	})
}
