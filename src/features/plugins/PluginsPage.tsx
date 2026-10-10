import { AlertTriangle, CalendarClock, CalendarDays, CalendarRange, CheckCircle2, ExternalLink, LayoutList } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../cloud/useAuth'
import { useCalendar } from '../../cloud/useCalendar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FORM, ICON_SIZE } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'
import { calendarErrorKey, type PluginsRouteState } from './calendarError'
import { PluginCard } from './PluginCard'
import { ViaGoogleCard } from './ViaGoogleCard'

/** Google sends the browser back to a web address; the file:// shells must connect from the website. */
const CAN_REDIRECT = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)

type Notice = { tone: 'ok' | 'error'; text: string } | null

/**
 * Each member connects their own Google Calendar here (DocuDrive's "Plugins"
 * page). Notion Calendar and calendar.com have no API for adding events but
 * show Google calendars, so their cards explain the Google route; Microsoft
 * Outlook is announced as coming soon.
 */
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
      <div className="flex max-w-2xl flex-col gap-4">
        <PluginCard icon={CalendarDays} name={t('plugins.google.name')} description={t('plugins.google.desc')}>
          {body}
          {notice && (
            <p className={`text-sm ${notice.tone === 'ok' ? 'text-success' : 'text-danger'}`} role="status">
              {notice.text}
            </p>
          )}
        </PluginCard>

        <ViaGoogleCard
          icon={CalendarRange}
          name={t('plugins.notion.name')}
          description={t('plugins.notion.desc')}
          openUrl="https://calendar.notion.so/"
          openIcon={<ExternalLink size={14} aria-hidden="true" />}
        />

        <ViaGoogleCard
          icon={LayoutList}
          name={t('plugins.calendarCom.name')}
          description={t('plugins.calendarCom.desc')}
          openUrl="https://www.calendar.com/"
          openIcon={<ExternalLink size={14} aria-hidden="true" />}
        />

        <PluginCard
          icon={CalendarClock}
          name={t('plugins.microsoft.name')}
          description={t('plugins.microsoft.desc')}
          badge={{ label: t('plugins.badge.comingSoon'), tone: 'muted' }}
        />
      </div>

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
