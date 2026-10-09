import { AlertTriangle, CalendarDays, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../cloud/useAuth'
import { useCalendar } from '../../cloud/useCalendar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FORM, ICON_SIZE } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'
import { calendarErrorKey, type PluginsRouteState } from './calendarError'

/** Google sends the browser back to a web address; the file:// shells must connect from the website. */
const CAN_REDIRECT = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)

type Notice = { tone: 'ok' | 'error'; text: string } | null

/** Each member connects their own Google Calendar here (DocuDrive's "Plugins" page). */
export function PluginsPage() {
  const { status } = useAuth()
  const cal = useCalendar()
  const { t } = useLocale()
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState<Notice>(() => {
    const state = location.state as PluginsRouteState
    if (state?.error) return { tone: 'error', text: t(state.error) }
    if (state?.notice === 'connected') return { tone: 'ok', text: t('plugins.google.connected') }
    return null
  })
  const [working, setWorking] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  // The notice came through router state; drop it so a reload doesn't repeat it.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const connect = async () => {
    setWorking(true)
    setNotice(null)
    try {
      await cal.connect('/plugins') // leaves the page for Google
    } catch (err) {
      setNotice({ tone: 'error', text: t(calendarErrorKey(err)) })
      setWorking(false)
    }
  }

  const disconnect = async () => {
    setConfirmDisconnect(false)
    setWorking(true)
    setNotice(null)
    try {
      await cal.disconnect()
      setNotice({ tone: 'ok', text: t('plugins.google.disconnected') })
    } catch (err) {
      setNotice({ tone: 'error', text: t(calendarErrorKey(err)) })
    } finally {
      setWorking(false)
    }
  }

  const connection = cal.connection
  const connectButton = (label: string) => (
    <Button variant="primary" onClick={connect} disabled={working || !CAN_REDIRECT}>
      {working ? t('plugins.google.connecting') : label}
    </Button>
  )

  let body
  if (!cal.available) {
    body =
      status === 'loading' ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-secondary">{t('plugins.signIn')}</p>
          {status === 'anonymous' && (
            <Button variant="primary" size="sm" to="/signin">
              {t('nav.signIn')}
            </Button>
          )}
        </div>
      )
  } else if (cal.loading) {
    body = <p className="text-sm text-text-secondary">{t('plugins.loading')}</p>
  } else if (!connection) {
    body = (
      <div className="flex flex-col gap-3">
        <p className={FORM.HINT}>{t('plugins.google.privacy')}</p>
        <p className={FORM.HINT}>{t('plugins.google.consentNote')}</p>
        {!CAN_REDIRECT && <p className="text-sm text-warning">{t('plugins.google.shellNote')}</p>}
        <div>{connectButton(t('plugins.google.connect'))}</div>
      </div>
    )
  } else {
    const needsReauth = connection.status === 'needs_reauth'
    body = (
      <div className="flex flex-col gap-3">
        {needsReauth ? (
          <p className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle size={ICON_SIZE.SM} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t('plugins.google.needsReauth')}
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 size={ICON_SIZE.SM} className="shrink-0" aria-hidden="true" />
              {t('plugins.google.connectedAs', { email: connection.accountEmail })}
            </p>
            <p className={FORM.HINT}>{t('plugins.google.hint')}</p>
          </>
        )}
        <p className={FORM.HINT}>{t('plugins.google.privacy')}</p>
        <div className="flex flex-wrap gap-2">
          {needsReauth && connectButton(t('plugins.google.reconnect'))}
          <Button variant="danger" onClick={() => setConfirmDisconnect(true)} disabled={working}>
            {t('plugins.google.disconnect')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PageLayout title={t('plugins.title')} subtitle={t('plugins.subtitle')}>
      <Card className="flex max-w-2xl flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
            <CalendarDays size={ICON_SIZE.MD} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text-primary">{t('plugins.google.name')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('plugins.google.desc')}</p>
          </div>
        </div>
        {body}
        {notice && (
          <p className={`text-sm ${notice.tone === 'ok' ? 'text-success' : 'text-danger'}`} role="status">
            {notice.text}
          </p>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDisconnect}
        title={t('plugins.google.disconnectTitle')}
        message={t('plugins.google.disconnectConfirm')}
        confirmLabel={t('plugins.google.disconnect')}
        danger
        onConfirm={disconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </PageLayout>
  )
}
