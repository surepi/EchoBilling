import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { api } from '../../lib/utils'
import { KeyRound, MailCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api('/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotPassword.failed'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <MailCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text">{t('auth.forgotPassword.sentTitle')}</h1>
            <p className="text-sm text-text-secondary mt-3">
              {t('auth.forgotPassword.sentDescription')}
            </p>
            <div className="mt-6">
              <Link to="/login" className="text-sm text-primary hover:underline">
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
          <h1 className="text-2xl font-bold text-text">{t('auth.forgotPassword.title')}</h1>
          <p className="text-sm text-text-secondary mt-2">{t('auth.forgotPassword.description')}</p>
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
            label={t('auth.forgotPassword.email')}
            placeholder={t('common.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
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
