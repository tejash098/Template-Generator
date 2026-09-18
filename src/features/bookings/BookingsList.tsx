import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { FORM, ICON_SIZE } from '../../config/constants'
import { bookingBalance } from '../../document/bookingText'
import { formatDateDdMmYyyy, monthRangeIso } from '../../document/format'
import { formatTimeHindi } from '../../document/hindiTime'
import { describePage } from '../../document/pageSizes'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'
import type { BookingRecord } from '../../storage/db'
import { bookings, type TravelDateRange } from '../../storage/bookings'
import { TEMPLATES } from '../../templates/registry'

const template = TEMPLATES['bus-booking']

type DateMode = 'all' | 'day' | 'month' | 'range'

/** Date/month pickers sit inline beside the mode control (FORM.INPUT is w-full). */
const DATE_W = 'w-40'

/** The inclusive travel-date bounds the current filter controls describe. */
function travelRange(mode: DateMode, day: string, month: string, from: string, to: string): TravelDateRange {
  switch (mode) {
    case 'day':
      return day ? { from: day, to: day } : {}
    case 'month':
      return monthRangeIso(month) ?? {}
    case 'range':
      return { from: from || undefined, to: to || undefined }
    default:
      return {}
  }
}

function AmountPill({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'bg-page-bg text-text-secondary',
    success: 'bg-success-subtle text-success',
    warning: 'bg-warning-subtle text-warning',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {label} ₹{value}
    </span>
  )
}

/** Saved bookings, newest first, with search, a travel-date filter, duplicate and delete. */
export function BookingsList() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<DateMode>('all')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [pendingDelete, setPendingDelete] = useState<BookingRecord | null>(null)
  const range = travelRange(mode, day, month, from, to)
  // Primitive deps: a fresh `range` object every render would re-subscribe the live query.
  const rows = useLiveQuery(() => bookings.list(query, range), [query, range.from, range.to])
  const filtered = Boolean(query || range.from || range.to)

  const dateModes: { value: DateMode; label: string }[] = [
    { value: 'all', label: t('bookings.filter.all') },
    { value: 'day', label: t('bookings.filter.day') },
    { value: 'month', label: t('bookings.filter.month') },
    { value: 'range', label: t('bookings.filter.range') },
  ]

  const duplicate = async (id: string) => {
    const copy = await bookings.duplicate(id)
    navigate(template.routes.edit(copy.id))
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await bookings.remove(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <PageLayout
      title={t('bookings.title')}
      subtitle={t('bookings.subtitle')}
      actions={
        <Button variant="primary" to={template.routes.start} icon={<Plus size={ICON_SIZE.SM} aria-hidden="true" />}>
          {t('bookings.new')}
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={ICON_SIZE.SM} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input
            type="search"
            className={`${FORM.INPUT} pl-9`}
            placeholder={t('bookings.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('bookings.search')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={FORM.LABEL}>{t('bookings.filter.label')}</span>
          <SegmentedControl value={mode} options={dateModes} onChange={setMode} label={t('bookings.filter.label')} />
          {mode === 'day' && (
            <div className={DATE_W}>
              <input type="date" className={FORM.INPUT} value={day} onChange={(e) => setDay(e.target.value)} aria-label={t('bookings.filter.day')} />
            </div>
          )}
          {mode === 'month' && (
            <div className={DATE_W}>
              <input type="month" className={FORM.INPUT} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('bookings.filter.month')} />
            </div>
          )}
          {mode === 'range' && (
            <>
              <div className={DATE_W}>
                <input
                  type="date"
                  className={FORM.INPUT}
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={t('bookings.filter.from')}
                />
              </div>
              <span className="text-sm text-text-secondary" aria-hidden="true">
                –
              </span>
              <div className={DATE_W}>
                <input
                  type="date"
                  className={FORM.INPUT}
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={t('bookings.filter.to')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {rows === undefined ? (
        <p className="text-sm text-text-secondary">{t('bookings.loading')}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-text-secondary">
          <p>{filtered ? t('bookings.noMatch') : t('bookings.empty')}</p>
          {!filtered && (
            <Button variant="primary" to={template.routes.start}>
              {t('bookings.first')}
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((b) => (
            <li key={b.id}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <Link to={template.routes.edit(b.id)} className="flex min-w-0 flex-1 flex-col gap-1 text-text-primary">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-semibold">पत्रांक {b.bookingNo}</span>
                    <span className="text-sm text-text-secondary">{formatDateDdMmYyyy(b.bookingDate)}</span>
                    <span lang="hi" className="font-hindi text-base">
                      {b.name || <em className="text-text-secondary">—</em>}
                    </span>
                    {(b.village || b.thana) && (
                      <span lang="hi" className="font-hindi text-sm text-text-secondary">
                        {[b.village, b.thana].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                    <span lang="hi" className="font-hindi">
                      {b.from || '—'} → {b.to || '—'}
                    </span>
                    <span>
                      {t('bookings.travel')}: {formatDateDdMmYyyy(b.travelDate)}
                      {b.departureTime && (
                        <span lang="hi" className="font-hindi">
                          {' '}
                          {formatTimeHindi(b.departureTime)}
                        </span>
                      )}
                    </span>
                    {b.mobile && <span>{b.mobile}</span>}
                    <span className="text-xs">{describePage(b.page)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <AmountPill label={t('bookings.fare')} value={b.fare} tone="neutral" />
                    <AmountPill label={t('bookings.advance')} value={b.advance} tone="success" />
                    <AmountPill label={t('bookings.balance')} value={bookingBalance(b)} tone="warning" />
                  </div>
                </Link>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => duplicate(b.id)} icon={<Copy size={14} aria-hidden="true" />}>
                    {t('bookings.duplicate')}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setPendingDelete(b)} icon={<Trash2 size={14} aria-hidden="true" />}>
                    {t('bookings.delete')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('bookings.deleteTitle')}
        message={t('bookings.deleteConfirm', { no: pendingDelete?.bookingNo ?? '' })}
        confirmLabel={t('bookings.delete')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </PageLayout>
  )
}
