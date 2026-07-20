package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/songquanpeng/one-api/model"
	billingratio "github.com/songquanpeng/one-api/relay/billing/ratio"
	"net/http"
	"sort"
)

func GetGroups(c *gin.Context) {
	groups := make(map[string]struct{})
	for groupName := range billingratio.GroupRatio {
		groups[groupName] = struct{}{}
	}
	for groupName := range model.GetDailyPointsByGroup() {
		groups[groupName] = struct{}{}
	}
	groupNames := make([]string, 0, len(groups))
	for groupName := range groups {
		groupNames = append(groupNames, groupName)
	}
	sort.Strings(groupNames)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groupNames,
	})
}
