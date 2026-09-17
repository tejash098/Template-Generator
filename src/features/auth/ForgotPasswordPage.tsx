import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { FORM } from '../../config/constants'
import { useAuth } from '../../cloud/useAuth'
import { useLocale } from '../../i18n/useLocale'
import { AuthLayout } from './AuthLayout'
import { useAuthError } from './useAuthError'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const { t } = useLocale()
  const describe = useAuthError()
  const [email, setEmail] = useState('')
  const [working, setWorking] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setWorking(true)
    setError(null)
    const err = await requestPasswordReset(email)
    setWorking(false)
    if (err) setError(err)
    else setSent(true)
  }

  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      {sent ? (
        <p className="text-sm text-text-primary" role="status">
          {t('auth.forgot.sent')}
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field id="email" label={t('auth.email')}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={FORM.INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {describe(error)}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={working} className="w-full">
            {working ? t('export.working') : t('auth.forgot.submit')}
          </Button>
        </form>
      )}
      <p className="mt-5 text-sm">
        <Link to="/signin" className="text-accent hover:underline">
          {t('auth.backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
