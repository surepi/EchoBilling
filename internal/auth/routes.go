package auth

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册认证路由
func RegisterRoutes(rg *gin.RouterGroup, h *Handler, authMiddleware gin.HandlerFunc) {
	// 公开路由
	rg.POST("/register", h.Register)
	rg.POST("/login", h.Login)
	rg.POST("/refresh", h.Refresh)

	// 2FA 验证路由（公开，使用临时 2FA token）
	rg.POST("/2fa/verify", h.Verify2FA)
	rg.POST("/2fa/email/send", h.Send2FAEmail)

	// 密码重置（公开）
	rg.POST("/password/forgot", h.ForgotPassword)
	rg.POST("/password/reset", h.ResetPassword)

	// 需要认证的路由
	rg.GET("/me", authMiddleware, h.Me)
}

// Register2FARoutes 注册 2FA 设置路由（需要认证）
func Register2FARoutes(rg *gin.RouterGroup, h *Handler) {
	twofa := rg.Group("/2fa")
	twofa.GET("/status", h.Get2FAStatus)
	twofa.POST("/setup/totp", h.SetupTOTP)
	twofa.POST("/setup/email", h.SetupEmail)
	twofa.POST("/enable", h.Enable2FA)
	twofa.POST("/disable", h.Disable2FA)
	twofa.POST("/recovery/regenerate", h.RegenerateRecoveryCodes)
}
