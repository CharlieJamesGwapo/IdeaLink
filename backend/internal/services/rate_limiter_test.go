package services_test

import (
	"testing"
	"time"

	"idealink/internal/services"

	"github.com/stretchr/testify/assert"
)

func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
	rl := services.NewRateLimiter(3, time.Hour)
	assert.True(t, rl.Allow("alice@example.com"))
	assert.True(t, rl.Allow("alice@example.com"))
	assert.True(t, rl.Allow("alice@example.com"))
}

func TestRateLimiter_BlocksOverLimit(t *testing.T) {
	rl := services.NewRateLimiter(2, time.Hour)
	assert.True(t, rl.Allow("bob@example.com"))
	assert.True(t, rl.Allow("bob@example.com"))
	assert.False(t, rl.Allow("bob@example.com"))
}

func TestRateLimiter_IndependentKeys(t *testing.T) {
	rl := services.NewRateLimiter(1, time.Hour)
	assert.True(t, rl.Allow("a@example.com"))
	assert.True(t, rl.Allow("b@example.com"))
	assert.False(t, rl.Allow("a@example.com"))
}

func TestRateLimiter_ExpiresOldEntries(t *testing.T) {
	rl := services.NewRateLimiter(1, 10*time.Millisecond)
	assert.True(t, rl.Allow("c@example.com"))
	assert.False(t, rl.Allow("c@example.com"))
	time.Sleep(20 * time.Millisecond)
	assert.True(t, rl.Allow("c@example.com"))
}
