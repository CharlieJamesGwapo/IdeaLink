package middleware

import (
	"fmt"
	"net/http"

	"idealink/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthCookieName is the httpOnly cookie used to carry the JWT.
const AuthCookieName = "token"

// Context keys set by AuthRequired for downstream handlers.
const (
	CtxKeyUserID = "userID"
	CtxKeyRole   = "role"
)

func AuthRequired(jwtSecret string, roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		cookie, err := c.Cookie(AuthCookieName)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}

		token, err := jwt.ParseWithClaims(cookie, &services.Claims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(*services.Claims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}

		role := claims.Role
		userID := claims.UserID

		if len(roles) > 0 {
			allowed := false
			for _, r := range roles {
				if r == role {
					allowed = true
					break
				}
			}
			if !allowed {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
				return
			}
		}

		c.Set(CtxKeyUserID, userID)
		c.Set(CtxKeyRole, role)
		c.Next()
	}
}
