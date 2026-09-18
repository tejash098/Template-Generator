import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { EDITOR } from '../../config/constants'
import type { BookingContent } from '../../document/BookingSheet'
import { fileStem, formatDateDdMmYyyy, todayIso } from '../../document/format'
import { isPadColorId } from '../../document/padColors'
import { FIT_WARN_SCALE } from '../../document/useFitText'
import { useLocale } from '../../i18n/useLocale'
import type { BookingRecord } from '../../storage/db'
import { bookings, type BookingFields } from '../../storage/bookings'
import { TEMPLATES, isTemplateId } from '../../templates/registry'
import { useTransliterationPref } from '../../transliteration/useTransliterationPref'
import { BookingForm } from './BookingForm'
import { ExportBar } from './ExportBar'
import { SheetPreview } from './SheetPreview'

type SaveStatus = 'new' | 'loading' | 'saving' | 'saved' | 'error' | 'missing'

const AUTOSAVE_DELAY_MS = 400

const template = TEMPLATES['bus-booking']

function pickFields(rec: BookingRecord): BookingFields {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, seq, bookingNo, createdAt, updatedAt, ...fields } = rec
  return fields
}

/**
 * Form + live preview for one booking. Routes: `/new?template=…&color=…`
 * (the record is created on the first edit so abandoned blank drafts never
 * consume a पत्रांक) and `/bookings/:id`. Every change autosaves after a
 * short delay.
 */
export function BookingEditor() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLocale()

  const requestedTemplate = params.get('template') ?? 'bus-booking'
  const requestedColor = params.get('color')
  const initialFields = () =>
    template.newFields({ padColor: isPadColorId(requestedColor) ? requestedColor : undefined })

  const [fields, setFields] = useState<BookingFields>(initialFields)
  const [record, setRecord] = useState<BookingRecord | null>(null)
  const [status, setStatus] = useState<SaveStatus>(id ? 'loading' : 'new')
  const [fitScale, setFitScale] = useState(1)
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hindiTyping, setHindiTyping] = useTransliterationPref()
  // Edits typed but not yet saved; while true, remote changes must not replace the form.
  const [pendingEdits, setPendingEdits] = useState(false)
  // updatedAt of the stored row the form currently reflects.
  const [appliedUpdatedAt, setAppliedUpdatedAt] = useState(0)
  // जारी दिनांक for an unsaved draft; saved bookings use their createdAt.
  const [draftIssuedDate] = useState(() => todayIso())

  const sheetRef = useRef<HTMLDivElement>(null)
  const recordRef = useRef<BookingRecord | null>(null)
  const loadedIdRef = useRef<string | null>(null)
  const creatingRef = useRef<Promise<void> | null>(null)
  const latestFieldsRef = useRef(fields)
  const dirtyRef = useRef(false)

  // Keeps the unmount flush below able to see the newest fields/record.
  useEffect(() => {
    latestFieldsRef.current = fields
  }, [fields])
  useEffect(() => {
    if (record) recordRef.current = record
  }, [record])

  // Load an existing booking, or reset when moving to /new.
  useEffect(() => {
    if (!id) {
      if (loadedIdRef.current !== null) {
        loadedIdRef.current = null
        recordRef.current = null
        setRecord(null)
        setFields(initialFields())
        setStatus('new')
      }
      return
    }
    if (loadedIdRef.current === id) return
    let cancelled = false
    setStatus('loading')
    bookings.get(id).then((rec) => {
      if (cancelled) return
      if (!rec) {
        setStatus('missing')
        return
      }
      loadedIdRef.current = id
      recordRef.current = rec
      setRecord(rec)
      setFields(pickFields(rec))
      setAppliedUpdatedAt(rec.updatedAt)
      setStatus('saved')
    })
    return () => {
      cancelled = true
    }
    // initialFields only depends on the URL params, which change with `id`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const persist = useCallback(
    async (next: BookingFields) => {
      setStatus('saving')
      try {
        if (recordRef.current) {
          await bookings.update(recordRef.current.id, next)
        } else if (creatingRef.current) {
          // A create is in flight; queue this version behind it.
          await creatingRef.current
          const created = recordRef.current as BookingRecord | null // set by the create above
          if (created) await bookings.update(created.id, next)
        } else {
          creatingRef.current = bookings.create(next).then((rec) => {
            recordRef.current = rec
            loadedIdRef.current = rec.id
            setRecord(rec)
            navigate(template.routes.edit(rec.id), { replace: true })
          })
          try {
            await creatingRef.current
          } finally {
            creatingRef.current = null
          }
        }
        setStatus('saved')
        setPendingEdits(false)
      } catch (err) {
        console.error(err)
        setStatus('error')
      }
    },
    [navigate],
  )

  // Follow the stored row so edits synced from other devices reach an open
  // editor. Applied during render (guarded) rather than in an effect.
  const live = useLiveQuery(() => (id ? bookings.get(id) : undefined), [id])
  if (live && record && live.id === record.id && live.updatedAt > appliedUpdatedAt && !pendingEdits) {
    setAppliedUpdatedAt(live.updatedAt)
    setRecord(live)
    setFields(pickFields(live))
  }
  const deletedRemotely = live === undefined && record !== null && id === record.id && status === 'saved'

  // Debounced autosave; flushes on unmount so quick navigation loses nothing.
  useEffect(() => {
    if (!dirtyRef.current) return
    const timer = window.setTimeout(() => {
      dirtyRef.current = false
      void persist(fields)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [fields, persist])

  useEffect(
    () => () => {
      if (dirtyRef.current) {
        dirtyRef.current = false
        void persist(latestFieldsRef.current)
      }
    },
    [persist],
  )

  const update = (patch: Partial<BookingFields>) => {
    dirtyRef.current = true
    setPendingEdits(true)
    setFields((prev) => ({ ...prev, ...patch }))
  }

  const handleDuplicate = async () => {
    if (!record) return
    const copy = await bookings.duplicate(record.id)
    navigate(template.routes.edit(copy.id))
  }

  const handleDelete = async () => {
    if (!record) return
    setConfirmDelete(false)
    await bookings.remove(record.id)
    loadedIdRef.current = null
    recordRef.current = null
    navigate(template.routes.list)
  }

  if (!id && !isTemplateId(requestedTemplate)) return <Navigate to="/templates" replace />

  if (status === 'missing' || deletedRemotely) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-text-secondary">
        <p>{t('editor.missing')}</p>
        <Button to={template.routes.list}>{t('editor.back')}</Button>
      </div>
    )
  }

  const bookingNo = record?.bookingNo ?? ''
  const content: BookingContent = {
    ...fields,
    bookingNo,
    issuedDate: record ? todayIso(new Date(record.createdAt)) : draftIssuedDate,
  }
  const stem = fileStem(bookingNo || 'draft', fields.bookingDate)
  const title = `Shri Ram Bus Service – बुकिंग ${bookingNo || '—'} – ${formatDateDdMmYyyy(fields.bookingDate)}`
  const shrunk = fitScale < FIT_WARN_SCALE
  const statusColor = status === 'error' ? 'text-danger' : status === 'saved' ? 'text-success' : 'text-text-secondary'

  return (
    <div className="editor flex min-h-0 flex-1 flex-col gap-3">
      <div className="no-print flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-text-primary">
          {record ? t('editor.number', { no: record.bookingNo }) : t('editor.new')}
        </h1>
        <span className={`text-xs ${statusColor}`} aria-live="polite">
          {t(`editor.status.${status}`)}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="accent-accent"
            checked={hindiTyping}
            onChange={(e) => setHindiTyping(e.target.checked)}
          />
          {t('editor.hindiTyping')}
        </label>
        <div className="ml-auto lg:hidden">
          <SegmentedControl<'form' | 'preview'>
            label="View"
            value={mobileView}
            onChange={setMobileView}
            options={[
              { value: 'form', label: t('editor.tab.form') },
              { value: 'preview', label: t('editor.tab.preview') },
            ]}
          />
        </div>
      </div>

      <div className={EDITOR.PANES}>
        <div
          className={`editor-form no-print overflow-auto rounded-xl border border-border bg-surface p-4 ${
            mobileView === 'preview' ? 'max-lg:hidden' : ''
          }`}
        >
          <BookingForm fields={fields} bookingNo={bookingNo} hindiTyping={hindiTyping} onChange={update} />

          {shrunk && (
            <p className="mt-3 rounded-lg bg-warning-subtle px-3 py-2 text-sm text-warning" role="status">
              {t('editor.shrunk', { pct: Math.round(fitScale * 100) })}
            </p>
          )}

          <ExportBar
            sheetRef={sheetRef}
            page={fields.page}
            fileStem={stem}
            title={title}
            ready={record !== null}
            bookingId={record?.id}
          />

          {record && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleDuplicate}>{t('editor.duplicate')}</Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                {t('editor.delete')}
              </Button>
            </div>
          )}
        </div>

        <div
          className={`preview-pane overflow-auto rounded-xl border border-border bg-page-bg p-4 ${
            mobileView === 'form' ? EDITOR.PREVIEW_PARKED : ''
          }`}
        >
          <SheetPreview content={content} page={fields.page} onFitChange={setFitScale} sheetRef={sheetRef} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t('bookings.deleteTitle')}
        message={t('bookings.deleteConfirm', { no: bookingNo })}
        confirmLabel={t('bookings.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
