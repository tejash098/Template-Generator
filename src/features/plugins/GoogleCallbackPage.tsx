import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { OAUTH_CALLBACK_ROUTE } from '../../cloud/oauthRedirect'
import { useAuth } from '../../cloud/useAuth'
import { useCalendar } from '../../cloud/useCalendar'
import { useLocale } from '../../i18n/useLocale'
import { AuthLayout } from '../auth/AuthLayout'
import { calendarErrorKey, type PluginsRouteState } from './calendarError'

/**
 * #/oauth/google?code=…&state=… (moved here from the real query string by
 * oauthRedirect.ts). Waits for the session to be restored, then finishes the
 * connect exactly once — Google's code is single-use — and returns to Plugins.
 */
export function GoogleCallbackPage() {
  const { status } = useAuth()
  const cal = useCalendar()
  const { t } = useLocale()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useState(() => new URLSearchParams(location.search))
  const started = useRef(false)

  useEffect(() => {
    if (started.current || status === 'loading') return
    started.current = true
    // The code must not linger in the address bar (or in history).
    window.history.replaceState(null, '', `${window.location.pathname}#${OAUTH_CALLBACK_ROUTE}`)
    const fail = (error: PluginsRouteState) => navigate('/plugins', { replace: true, state: error })
    if (status !== 'member') {
      fail({ error: 'calendar.error.not_signed_in' })
      return
    }
    cal
      .finishConnect(params)
      .then((back) => navigate(back, { replace: true, state: { notice: 'connected' } satisfies PluginsRouteState }))
      .catch((err: unknown) => fail({ error: calendarErrorKey(err) }))
  }, [status, cal, params, navigate])

  return (
    <AuthLayout title={t('plugins.google.callbackTitle')}>
      <p className="flex items-center gap-2 text-sm text-text-secondary" role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        {t('plugins.google.finishing')}
      </p>
    </AuthLayout>
  )
}
