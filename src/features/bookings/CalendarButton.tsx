import { CalendarCheck, CalendarPlus, Check, Loader2, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCalendar } from '../../cloud/useCalendar'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { A11Y, TRANSITION } from '../../config/constants'
import { formatDateDdMmYyyy } from '../../document/format'
import { useLocale } from '../../i18n/useLocale'
import type { BookingRecord } from '../../storage/db'
import { calendarErrorKey, calendarErrorKeyFor } from '../plugins/calendarError'

const ICON_BUTTON = `relative inline-flex items-center justify-center rounded-lg border border-border bg-surface p-1.5 text-text-primary hover:bg-accent-subtle hover:text-accent disabled:cursor-default disabled:opacity-60 ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-surface ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}

/**
 * The booking's Google Calendar icon on the Bookings page. Shown only while the
 * member has Google Calendar connected and the booking has a travel date.
 * "+" adds (after a confirm), ✓ = in the calendar (open or remove), "!" = the
 * last update failed (retry). Edits and deletes reach the event on their own
 * (bookings trigger → google-calendar-hook).
 */
export function CalendarButton({ booking }: { booking: BookingRecord }) {
  const cal = useCalendar()
  const { t } = useLocale()
  const [dialog, setDialog] = useState<'add' | 'added' | 'failed' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connection = cal.connection
  if (!connection || !booking.travelDate) return null

  if (connection.status === 'needs_reauth') {
    return (
      <Link to="/plugins" className={ICON_BUTTON} aria-label={t('calendar.reconnect')} title={t('calendar.reconnect')}>
        <CalendarPlus size={16} className="text-text-secondary" aria-hidden="true" />
        <Badge className="bg-warning">!</Badge>
      </Link>
    )
  }

  const event = cal.eventFor(booking.id)
  const busy = cal.isBusy(booking.id)
  // Not on the server yet (created offline or seconds ago): the function could not find it.
  const waiting = !booking.syncedAt && !event
  const label = busy
    ? t('calendar.working')
    : waiting
      ? t('calendar.waitSync')
      : event?.status === 'added'
        ? t('calendar.added')
        : event?.status === 'error'
          ? t('calendar.failed')
          : t('calendar.add')
  const vars = { no: booking.bookingNo, date: formatDateDdMmYyyy(booking.travelDate), email: connection.accountEmail }

  const run = async (work: () => Promise<void>) => {
    setDialog(null)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(t(calendarErrorKey(err)))
      setDialog('failed')
    }
  }
  const add = () => run(() => cal.add(booking.id))
  const remove = () => run(() => cal.remove(booking.id))

  return (
    <>
      <button
        type="button"
        className={ICON_BUTTON}
        aria-label={label}
        title={label}
        disabled={busy || waiting}
        aria-busy={busy}
        onClick={() => {
          setError(null)
          setDialog(event?.status === 'added' ? 'added' : event?.status === 'error' ? 'failed' : 'add')
        }}
      >
        {event?.status === 'added' ? (
          <CalendarCheck size={16} className="text-success" aria-hidden="true" />
        ) : (
          <CalendarPlus size={16} aria-hidden="true" />
        )}
        {busy ? (
          <Badge className="bg-surface text-accent">
            <Loader2 size={10} className="animate-spin" />
          </Badge>
        ) : event?.status === 'added' ? (
          <Badge className="bg-success">
            <Check size={9} strokeWidth={3.5} />
          </Badge>
        ) : event?.status === 'error' ? (
          <Badge className="bg-warning">!</Badge>
        ) : waiting ? null : (
          <Badge className="bg-accent">
            <Plus size={9} strokeWidth={3.5} />
          </Badge>
        )}
      </button>

      <Modal open={dialog === 'add'} onClose={() => setDialog(null)} title={t('calendar.addTitle')}>
        <p className="text-sm text-text-secondary">{t('calendar.addConfirm', vars)}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setDialog(null)}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={add} autoFocus>
            {t('calendar.addButton')}
          </Button>
        </div>
      </Modal>

      <Modal open={dialog === 'added'} onClose={() => setDialog(null)} title={t('calendar.addedTitle')}>
        <p className="text-sm text-text-secondary">{t('calendar.addedBody', vars)}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="danger" onClick={remove}>
            {t('calendar.remove')}
          </Button>
          {event?.htmlLink && (
            <Button
              variant="primary"
              autoFocus
              onClick={() => {
                window.open(event.htmlLink ?? '', '_blank', 'noopener,noreferrer')
                setDialog(null)
              }}
            >
              {t('calendar.open')}
            </Button>
          )}
        </div>
      </Modal>

      <Modal open={dialog === 'failed'} onClose={() => setDialog(null)} title={t('calendar.failed')}>
        <p className="text-sm text-danger" role="alert">
          {error ?? t(calendarErrorKeyFor(event?.error))}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {event && (
            <Button variant="danger" onClick={remove}>
              {t('calendar.remove')}
            </Button>
          )}
          <Button variant="primary" onClick={add} autoFocus>
            {t('calendar.retry')}
          </Button>
        </div>
      </Modal>
    </>
  )
}
