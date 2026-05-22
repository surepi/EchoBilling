package auth

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"github.com/adiecho/echobilling/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

const (
	passwordResetTokenTTL  = 30 * time.Minute
	passwordResetRateLimit = 3
	passwordResetRateTTL   = 5 * time.Minute
)

// ForgotPasswordRequest 请求发送密码重置链接
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required"`
}

// ResetPasswordRequest 提交新密码完成重置
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

// ForgotPassword 处理忘记密码请求。无论邮箱是否存在都返回 200，避免邮箱枚举。
func (h *Handler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	email := strings.TrimSpace(req.Email)
	if !common.ValidateEmail(email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		return
	}

	ctx := c.Request.Context()
	ackResp := gin.H{"message": "If an account exists for that email, a reset link has been sent."}

	var userID, name string
	err := h.pool.QueryRow(ctx, `SELECT id, name FROM users WHERE email = $1`, email).Scan(&userID, &name)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusOK, ackResp)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	rateKey := fmt.Sprintf("pwreset:rate:%s", userID)
	count, err := h.rdb.Incr(ctx, rateKey).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to track reset attempts"})
		return
	}
	if count == 1 {
		h.rdb.Expire(ctx, rateKey, passwordResetRateTTL)
	}
	if count > passwordResetRateLimit {
		c.JSON(http.StatusOK, ackResp)
		return
	}

	token := uuid.New().String()
	tokenKey := fmt.Sprintf("pwreset:token:%s", token)
	if err := h.rdb.Set(ctx, tokenKey, userID, passwordResetTokenTTL).Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store reset token"})
		return
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", strings.TrimRight(h.frontendURL, "/"), token)
	if err := h.sendPasswordResetEmail(email, name, resetURL); err != nil {
		// 邮件失败不要泄露信息，记录后仍返回成功
		log.Printf("[auth] failed to send password reset email: %v", err)
	}

	c.JSON(http.StatusOK, ackResp)
}

// ResetPassword 使用重置 token 提交新密码
func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if len(req.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters"})
		return
	}

	ctx := c.Request.Context()
	tokenKey := fmt.Sprintf("pwreset:token:%s", req.Token)
	userID, err := h.rdb.Get(ctx, tokenKey).Result()
	if errors.Is(err, redis.Nil) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired reset token"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate token"})
		return
	}

	hashed, err := HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	if _, err := h.pool.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		hashed, userID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	h.rdb.Del(ctx, tokenKey)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successful"})
}

func (h *Handler) sendPasswordResetEmail(toEmail, name, resetURL string) error {
	cfg := h.smtpConfig()
	if cfg == nil || cfg.Host == "" {
		return fmt.Errorf("SMTP not configured")
	}

	greeting := "Hello"
	if name != "" {
		greeting = "Hello " + name
	}

	subject := "EchoBilling - Reset your password"
	body := fmt.Sprintf(
		"%s,\n\nWe received a request to reset your password. Click the link below to choose a new password. This link will expire in 30 minutes.\n\n%s\n\nIf you did not request a password reset, you can safely ignore this email.",
		greeting, resetURL,
	)

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		cfg.From, toEmail, subject, body,
	)

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
	return smtp.SendMail(addr, auth, cfg.From, []string{toEmail}, []byte(msg))
}

