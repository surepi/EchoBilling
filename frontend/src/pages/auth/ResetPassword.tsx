import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { api } from '../../lib/utils'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError(t('auth.resetPassword.missingToken'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.resetPassword.passwordMin'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await api('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password }),
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetPassword.failed'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-4">
              <ShieldCheck className="w-6 h-6 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-text">{t('auth.resetPassword.successTitle')}</h1>
            <p className="text-sm text-text-secondary mt-3">
              {t('auth.resetPassword.successDescription')}
            </p>
            <div className="mt-6">
              <Link to="/login" className="text-primary hover:underline text-sm">
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
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
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">{t('auth.resetPassword.title')}</h1>
          <p className="text-sm text-text-secondary mt-2">{t('auth.resetPassword.description')}</p>
        </div>

        {!token && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm mb-4">
            {t('auth.resetPassword.missingToken')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <Input
            id="password"
            type="password"
            label={t('auth.resetPassword.newPassword')}
            placeholder={t('auth.resetPassword.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!token}
          />

          <Input
            id="confirm-password"
            type="password"
            label={t('auth.resetPassword.confirmPassword')}
            placeholder={t('auth.resetPassword.passwordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={!token}
          />

          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-text-secondary hover:text-text">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </Card>
    </div>
  )
}
