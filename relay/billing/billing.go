package billing

import (
	"context"
	"fmt"

	"github.com/songquanpeng/one-api/common/logger"
	"github.com/songquanpeng/one-api/model"
)

func ReturnPreConsumedPoints(ctx context.Context, preConsumedPoints int64, tokenId int, userId int) {
	if preConsumedPoints != 0 {
		go func(ctx context.Context) {
			err := model.PostConsumeTokenPoints(tokenId, -preConsumedPoints)
			if err != nil {
				logger.Error(ctx, "error return pre-consumed points: "+err.Error())
				return
			}
			if err := model.CacheUpdateUserPoints(ctx, userId); err != nil {
				logger.Error(ctx, "error update user points cache: "+err.Error())
			}
		}(ctx)
	}
}

func PostConsumePoints(ctx context.Context, tokenId int, pointsDelta int64, totalPoints int64, userId int, channelId int, modelRatio float64, groupRatio float64, modelName string, tokenName string) {
	err := model.PostConsumeTokenPoints(tokenId, pointsDelta)
	if err != nil {
		logger.SysError("error consuming user points: " + err.Error())
	}
	err = model.CacheUpdateUserPoints(ctx, userId)
	if err != nil {
		logger.SysError("error update user points cache: " + err.Error())
	}
	if totalPoints != 0 {
		logContent := fmt.Sprintf("倍率：%.2f × %.2f", modelRatio, groupRatio)
		model.RecordConsumeLog(ctx, &model.Log{
			UserId:           userId,
			ChannelId:        channelId,
			PromptTokens:     int(totalPoints),
			CompletionTokens: 0,
			ModelName:        modelName,
			TokenName:        tokenName,
			Points:           int(totalPoints),
			Content:          logContent,
		})
		model.UpdateUserUsedPointsAndRequestCount(userId, totalPoints)
		model.UpdateChannelUsedPoints(channelId, totalPoints)
	}
	if totalPoints <= 0 {
		logger.Error(ctx, fmt.Sprintf("totalPoints consumed is %d, something is wrong", totalPoints))
	}
}
