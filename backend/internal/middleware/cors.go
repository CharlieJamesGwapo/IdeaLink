package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS accepts a comma-separated list of allowed origins (e.g. "https://a.vercel.app,https://b.vercel.app").
func CORS(frontendURL string) gin.HandlerFunc {
	allowed := make(map[string]bool)
	for _, o := range strings.Split(frontendURL, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			allowed[o] = true
		}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		} else if len(allowed) == 1 {
			// Single origin configured — set it directly (matches original behaviour)
			for o := range allowed {
				c.Header("Access-Control-Allow-Origin", o)
			}
		}

		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Expose-Headers", "Content-Type")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
