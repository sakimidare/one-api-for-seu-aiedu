package controller

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"sort"
)

func GetGroups(c *gin.Context) {
	groups := []string{"default"}
	sort.Strings(groups)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groups,
	})
}
