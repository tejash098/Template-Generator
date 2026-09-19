import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordInput } from '../../components/ui/PasswordInput'
import type { TokenHashType } from '../../cloud/AuthContext'
import { useAuth } from '../../cloud/useAuth'
import { useLocale } from '../../i18n/useLocale'
import { AuthLayout } from './AuthLayout'
import { useAuthError } from './useAuthError'

const MIN_PASSWORD_LENGTH = 8

/**
 * Landing point of invite and password-reset emails. The email template
 * links to `/?token_hash=…&type=…#/auth/set-password`: the token sits in the
 * real query string (before the hash) so HashRouter still routes here. We
 * exchange it for a session, then let the user choose a password.
 */
export function SetPasswordPage() {
  const { status, verifyTokenHash, setPassword } = useAuth()
  const { t } = useLocale()
  const describe = useAuthError()
  const navigate = useNavigate()
  // The token comes from the real query string (before the hash); read it once.
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return { hash: params.get('token_hash'), type: params.get('type') as TokenHashType | null }
  })
  const hasToken = !!token.hash && !!token.type
  const [verification, setVerification] = useState<'pending' | 'ok' | 'failed'>(hasToken ? 'pending' : 'ok')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [working, setWorking] = useState(false)
  const verified = useRef(false)

  useEffect(() => {
    if (!hasToken || verified.current) return
    verified.current = true
    void verifyTokenHash(token.hash as string, token.type as TokenHashType).then((err) => {
      if (err) {
        setError(err)
        setVerification('failed')
        return
      }
      // Drop the token from the address bar so a reload cannot replay it.
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
      setVerification('ok')
    })
  }, [hasToken, token, verifyTokenHash])

  // Without a token only an already signed-in user may change their password here.
  const phase: 'verifying' | 'form' | 'done' | 'invalid' = done
    ? 'done'
    : verification === 'pending'
      ? 'verifying'
      : verification === 'failed' || (!hasToken && status !== 'member' && status !== 'loading')
        ? 'invalid'
        : 'form'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('auth.setPassword.tooShort')
      return
    }
    if (password !== confirm) {
      setError('auth.setPassword.mismatch')
      return
    }
    setWorking(true)
    const err = await setPassword(password)
    setWorking(false)
    if (err) {
      setError(err)
      return
    }
    setDone(true)
    window.setTimeout(() => navigate('/templates', { replace: true }), 800)
  }

  return (
    <AuthLayout title={t('auth.setPassword.title')} subtitle={t('auth.setPassword.subtitle')}>
      {phase === 'verifying' && <p className="text-sm text-text-secondary">{t('auth.setPassword.verifying')}</p>}
      {phase === 'invalid' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-danger" role="alert">
            {error ? describe(error) : t('auth.setPassword.invalidLink')}
          </p>
          <Link to="/forgot-password" className="text-sm text-accent hover:underline">
            {t('auth.forgot.title')}
          </Link>
        </div>
      )}
      {phase === 'done' && (
        <p className="text-sm text-success" role="status">
          {t('auth.setPassword.done')}
        </p>
      )}
      {phase === 'form' && (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field id="password" label={t('auth.newPassword')}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
            />
          </Field>
          <Field id="confirm" label={t('auth.confirmPassword')}>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {describe(error)}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={working} className="w-full">
            {working ? t('export.working') : t('auth.setPassword.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
