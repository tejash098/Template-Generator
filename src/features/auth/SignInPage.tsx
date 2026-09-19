import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { FORM } from '../../config/constants'
import { useAuth } from '../../cloud/useAuth'
import { useLocale } from '../../i18n/useLocale'
import { AuthLayout } from './AuthLayout'
import { useAuthError } from './useAuthError'

export function SignInPage() {
  const { status, signIn } = useAuth()
  const { t } = useLocale()
  const describe = useAuthError()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already signed in (or just became a member): go to the app.
  useEffect(() => {
    if (status === 'member') navigate('/templates', { replace: true })
  }, [status, navigate])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setWorking(true)
    setError(null)
    const err = await signIn(email, password)
    setWorking(false)
    if (err) setError(err)
  }

  return (
    <AuthLayout title={t('auth.signIn.title')} subtitle={t('auth.signIn.subtitle')}>
      {status === 'disabled' ? (
        <p className="text-sm text-danger">{t('auth.error.disabled')}</p>
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
          <Field id="password" label={t('auth.password')}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {status === 'not-member' && !error && <p className="text-sm text-danger">{t('auth.error.notMember')}</p>}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {describe(error)}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={working} className="w-full">
            {working ? t('auth.signIn.working') : t('auth.signIn.submit')}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-accent hover:underline">
              {t('auth.forgot')}
            </Link>
            <Link to="/templates" className="text-text-secondary hover:underline">
              {t('auth.continueOffline')}
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
