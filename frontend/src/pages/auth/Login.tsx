import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuthStore } from '../../stores/auth'
import { useBrandingStore } from '../../stores/branding'
import { LogIn, Shield, Mail, Key } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type TwoFAMethod = 'totp' | 'email' | 'recovery'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA state
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFAMethod, setTwoFAMethod] = useState<TwoFAMethod>('totp')
  const [emailCooldown, setEmailCooldown] = useState(0)

  const login = useAuthStore((state) => state.login)
  const verify2FA = useAuthStore((state) => state.verify2FA)
  const send2FAEmailCode = useAuthStore((state) => state.send2FAEmailCode)
  const twoFactorRequired = useAuthStore((state) => state.twoFactorRequired)
  const clear2FAState = useAuthStore((state) => state.clear2FAState)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const siteName = useBrandingStore((s) => s.siteName)

  // Email cooldown timer
  useEffect(() => {
    if (emailCooldown <= 0) return
    const timer = setTimeout(() => setEmailCooldown(emailCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [emailCooldown])

  // Navigate after successful 2FA
  const token = useAuthStore((state) => state.token)
  useEffect(() => {
    if (token && !twoFactorRequired) {
      navigate('/portal/dashboard')
    }
  }, [token, twoFactorRequired, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      // If 2FA is not required, useEffect will handle navigation
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.failed'))
    } finally {
      setLoading(false)
    }
  }

  const handle2FAVerify = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await verify2FA(twoFACode, twoFAMethod)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('portal.security.twoFactor.invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailCode = async () => {
    try {
      await send2FAEmailCode()
      setEmailCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email code')
    }
  }

  const handleBack = () => {
    clear2FAState()
    setTwoFACode('')
    setError('')
  }

  // 2FA verification UI
  if (twoFactorRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text">{t('portal.security.twoFactor.loginTitle')}</h1>
            <p className="text-sm text-text-secondary mt-2">{t('portal.security.twoFactor.loginDesc')}</p>
          </div>

          {/* Method switcher */}
          <div className="flex gap-1 p-1 bg-bg rounded-lg mb-6">
            {([
              { key: 'totp' as TwoFAMethod, label: t('portal.security.twoFactor.loginTOTP'), icon: Key },
              { key: 'email' as TwoFAMethod, label: t('portal.security.twoFactor.loginEmail'), icon: Mail },
              { key: 'recovery' as TwoFAMethod, label: t('portal.security.twoFactor.loginRecovery'), icon: Shield },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setTwoFAMethod(key); setTwoFACode(''); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                  twoFAMethod === key
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handle2FAVerify} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            {twoFAMethod === 'email' && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleSendEmailCode}
                  disabled={emailCooldown > 0}
                >
                  {emailCooldown > 0
                    ? t('portal.security.twoFactor.resendIn', { seconds: emailCooldown })
                    : t('portal.security.twoFactor.sendCode')
                  }
                </Button>
              </div>
            )}

            <Input
              id="twofa-code"
              type="text"
              label={t('portal.security.twoFactor.step2EnterCode')}
              placeholder={twoFAMethod === 'recovery'
                ? t('portal.security.twoFactor.enterRecoveryCode')
                : t('portal.security.twoFactor.enterCode')
              }
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value)}
              autoComplete="one-time-code"
              required
            />

            <Button type="submit" className="w-full" disabled={loading || !twoFACode}>
              {loading ? t('portal.security.twoFactor.verifying') : t('portal.security.twoFactor.verify')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-text-secondary hover:text-text transition-colors"
            >
              {t('portal.security.twoFactor.back')}
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">{t('auth.login.title')}</h1>
          <p className="text-sm text-text-secondary mt-2">{t('auth.login.welcome', { company: siteName })}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <Input
            id="email"
            type="email"
            label={t('auth.login.email')}
            placeholder={t('common.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="password"
            type="password"
            label={t('auth.login.password')}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="text-primary hover:underline">
            {t('auth.login.registerNow')}
          </Link>
        </div>
      </Card>
    </div>
  )
}
