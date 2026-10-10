import { CheckCircle2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCalendar } from '../../cloud/useCalendar'
import { Button } from '../../components/ui/Button'
import { FORM, ICON_SIZE } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import { PluginCard } from './PluginCard'

interface ViaGoogleCardProps {
  icon: LucideIcon
  name: string
  description: string
  /** The app's own site, opened in a new tab. */
  openUrl: string
  openIcon?: ReactNode
}

/**
 * A calendar app that shows the member's Google calendars but offers no way
 * for other apps to add events (Notion Calendar, calendar.com). Nothing to
 * connect here: once Google Calendar is connected, adding the same Google
 * account in that app shows the "Shri Ram Bus Service" calendar there too.
 */
export function ViaGoogleCard({ icon, name, description, openUrl, openIcon }: ViaGoogleCardProps) {
  const cal = useCalendar()
  const { t } = useLocale()
  const google = cal.connection?.status === 'connected' ? cal.connection : null

  return (
    <PluginCard
      icon={icon}
      name={name}
      description={description}
      badge={{ label: t('plugins.badge.viaGoogle'), tone: 'accent' }}
    >
      <div className="flex flex-col gap-3">
        <p className={FORM.HINT}>{t('plugins.viaGoogle.how', { app: name })}</p>
        {google ? (
          <p className="flex items-start gap-2 text-sm text-success">
            <CheckCircle2 size={ICON_SIZE.SM} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t('plugins.viaGoogle.ready', { app: name, email: google.accountEmail })}
          </p>
        ) : (
          <p className="text-sm text-text-secondary">{t('plugins.viaGoogle.needsGoogle', { app: name })}</p>
        )}
        <div>
          <Button size="sm" href={openUrl} icon={openIcon}>
            {t('plugins.viaGoogle.open', { app: name })}
          </Button>
        </div>
      </div>
    </PluginCard>
  )
}
