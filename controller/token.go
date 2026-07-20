package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/common/ctxkey"
	"github.com/songquanpeng/one-api/common/helper"
	"github.com/songquanpeng/one-api/common/network"
	"github.com/songquanpeng/one-api/common/random"
	"github.com/songquanpeng/one-api/model"
)

func GetAllTokens(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	p, _ := strconv.Atoi(c.Query("p"))
	if p < 0 {
		p = 0
	}
	tokens, err := model.GetAllUserTokens(userId, p*10, 10, c.Query("order"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": tokens})
}

func SearchTokens(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	tokens, err := model.SearchUserTokens(userId, c.Query("keyword"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": tokens})
}

func GetToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	token, err := model.GetTokenByIds(id, c.GetInt(ctxkey.Id))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": token})
}

func GetTokenStatus(c *gin.Context) {
	token, err := model.GetTokenByIds(c.GetInt(ctxkey.TokenId), c.GetInt(ctxkey.Id))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	expiredAt := token.ExpiredTime
	if expiredAt == -1 {
		expiredAt = 0
	}
	points, err := model.GetUserPoints(token.UserId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	usedPoints, err := model.GetUserUsedPoints(token.UserId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"object":          "credit_summary",
		"total_granted":   points + usedPoints,
		"total_used":      usedPoints,
		"total_available": points,
		"expires_at":      expiredAt * 1000,
	})
}

func validateToken(token model.Token) error {
	if len(token.Name) > 30 {
		return fmt.Errorf("令牌名称过长")
	}
	if token.Subnet != nil && *token.Subnet != "" {
		return network.IsValidSubnets(*token.Subnet)
	}
	return nil
}

func AddToken(c *gin.Context) {
	token := model.Token{}
	if err := c.ShouldBindJSON(&token); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := validateToken(token); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("参数错误：%s", err.Error())})
		return
	}
	cleanToken := model.Token{
		UserId:       c.GetInt(ctxkey.Id),
		Name:         token.Name,
		Key:          random.GenerateKey(),
		CreatedTime:  helper.GetTimestamp(),
		AccessedTime: helper.GetTimestamp(),
		ExpiredTime:  token.ExpiredTime,
		Models:       token.Models,
		Subnet:       token.Subnet,
	}
	if err := cleanToken.Insert(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": cleanToken})
}

func DeleteToken(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteTokenById(id, c.GetInt(ctxkey.Id)); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func UpdateToken(c *gin.Context) {
	userId := c.GetInt(ctxkey.Id)
	statusOnly := c.Query("status_only")
	token := model.Token{}
	if err := c.ShouldBindJSON(&token); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := validateToken(token); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("参数错误：%s", err.Error())})
		return
	}
	cleanToken, err := model.GetTokenByIds(token.Id, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if token.Status == model.TokenStatusEnabled && cleanToken.Status == model.TokenStatusExpired && cleanToken.ExpiredTime <= helper.GetTimestamp() && cleanToken.ExpiredTime != -1 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "令牌已过期，无法启用，请先修改令牌过期时间，或者设置为永不过期"})
		return
	}
	if statusOnly != "" {
		cleanToken.Status = token.Status
	} else {
		cleanToken.Name = token.Name
		cleanToken.ExpiredTime = token.ExpiredTime
		cleanToken.Models = token.Models
		cleanToken.Subnet = token.Subnet
	}
	if err := cleanToken.Update(); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": cleanToken})
}
