package auth

import (
	"net/http"
	"time"

	"github.com/adiecho/echobilling/internal/app"
	"github.com/adiecho/echobilling/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// Handler 认证处理器
type Handler struct {
	pool        *pgxpool.Pool
	rdb         *redis.Client
	jwtSecret   string
	jwtExpiry   time.Duration
	frontendURL string
	store       *app.SettingsStore
}

// NewHandler 创建新的认证处理器
func NewHandler(pool *pgxpool.Pool, rdb *redis.Client, cfg *app.Config, store *app.SettingsStore) *Handler {
	return &Handler{
		pool:        pool,
		rdb:         rdb,
		jwtSecret:   cfg.JWTSecret,
		jwtExpiry:   cfg.JWTExpiry,
		frontendURL: cfg.FrontendURL,
		store:       store,
	}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RefreshRequest 刷新令牌请求
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse 认证响应
type AuthResponse struct {
	AccessToken    string    `json:"access_token,omitempty"`
	RefreshToken   string    `json:"refresh_token,omitempty"`
	User           *UserInfo `json:"user,omitempty"`
	Requires2FA    bool      `json:"requires_2fa,omitempty"`
	TwoFactorToken string    `json:"two_factor_token,omitempty"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	Name             string    `json:"name"`
	Role             string    `json:"role"`
	TwoFactorEnabled bool      `json:"two_factor_enabled"`
	CreatedAt        time.Time `json:"created_at"`
}

// Register 用户注册
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 验证邮箱格式
	if !common.ValidateEmail(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		return
	}

	// 验证密码长度
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 8 characters"})
		return
	}

	authResp, err := h.registerUser(c.Request.Context(), req)
	if err != nil {
		common.WriteServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, authResp)
}

// Login 用户登录
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	authResp, err := h.loginUser(c.Request.Context(), req)
	if err != nil {
		common.WriteServiceError(c, err)
		return
	}

	if authResp.Requires2FA {
		c.JSON(http.StatusOK, authResp)
		return
	}

	c.JSON(http.StatusOK, authResp)
}

// Me 获取当前用户信息
func (h *Handler) Me(c *gin.Context) {
	userID, ok := common.GetUserID(c)
	if !ok {
		return
	}

	user, err := h.getUserByID(c.Request.Context(), userID)
	if err != nil {
		common.WriteServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, user)
}

// Refresh 刷新访问令牌
func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	authResp, err := h.refreshAuth(c.Request.Context(), req.RefreshToken)
	if err != nil {
		common.WriteServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, authResp)
}

// smtpConfig converts the SettingsStore snapshot into auth.SMTPConfig.
func (h *Handler) smtpConfig() *SMTPConfig {
	ss := h.store.SMTPConfig()
	if ss == nil {
		return nil
	}
	return &SMTPConfig{
		Host:     ss.Host,
		Port:     ss.Port,
		Username: ss.Username,
		Password: ss.Password,
		From:     ss.From,
	}
}
