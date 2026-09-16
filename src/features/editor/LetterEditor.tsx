import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LetterContent } from '../../document/LetterSheet'
import { fileStem, formatDateDdMmYyyy } from '../../document/format'
import { FIT_WARN_SCALE } from '../../document/useFitText'
import { letters, newLetterFields, type LetterFields } from '../../storage/letters'
import type { LetterRecord } from '../../storage/db'
import { TransliterateInput } from '../../transliteration/TransliterateInput'
import { useTransliterationPref } from '../../transliteration/useTransliterationPref'
import { ExportBar } from './ExportBar'
import { PageSetup } from './PageSetup'
import { SheetPreview } from './SheetPreview'

type SaveStatus = 'new' | 'loading' | 'saving' | 'saved' | 'error' | 'missing'

const AUTOSAVE_DELAY_MS = 400

const STATUS_TEXT: Record<SaveStatus, string> = {
  new: 'Not saved yet',
  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Could not save',
  missing: 'Letter not found',
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

function pickFields(rec: LetterRecord): LetterFields {
  const { date, recipient, subject, body, closing, signatoryName, signatoryTitle, page } = rec
  return { date, recipient, subject, body, closing, signatoryName, signatoryTitle, page }
}

/**
 * Form + live preview for one letter. Routes: `/new` (record is created on
 * the first edit so abandoned blank drafts never consume a पत्रांक) and
 * `/letters/:id`. Every change autosaves after a short delay.
 */
export function LetterEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [fields, setFields] = useState<LetterFields>(newLetterFields)
  const [record, setRecord] = useState<LetterRecord | null>(null)
  const [status, setStatus] = useState<SaveStatus>(id ? 'loading' : 'new')
  const [fitScale, setFitScale] = useState(1)
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form')
  const [hindiTyping, setHindiTyping] = useTransliterationPref()

  const sheetRef = useRef<HTMLDivElement>(null)
  const recordRef = useRef<LetterRecord | null>(null)
  const loadedIdRef = useRef<string | null>(null)
  const creatingRef = useRef<Promise<void> | null>(null)
  const latestFieldsRef = useRef(fields)
  const dirtyRef = useRef(false)

  // Keeps the unmount flush below able to see the newest fields.
  useEffect(() => {
    latestFieldsRef.current = fields
  }, [fields])

  // Load an existing letter, or reset when moving to /new.
  useEffect(() => {
    if (!id) {
      if (loadedIdRef.current !== null) {
        loadedIdRef.current = null
        recordRef.current = null
        setRecord(null)
        setFields(newLetterFields())
        setStatus('new')
      }
      return
    }
    if (loadedIdRef.current === id) return
    let cancelled = false
    setStatus('loading')
    letters.get(id).then((rec) => {
      if (cancelled) return
      if (!rec) {
        setStatus('missing')
        return
      }
      loadedIdRef.current = id
      recordRef.current = rec
      setRecord(rec)
      setFields(pickFields(rec))
      setStatus('saved')
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const persist = useCallback(
    async (next: LetterFields) => {
      setStatus('saving')
      try {
        if (recordRef.current) {
          await letters.update(recordRef.current.id, next)
        } else if (creatingRef.current) {
          // A create is in flight; queue this version behind it.
          await creatingRef.current
          const created = recordRef.current as LetterRecord | null // set by the create above
          if (created) await letters.update(created.id, next)
        } else {
          creatingRef.current = letters.create(next).then((rec) => {
            recordRef.current = rec
            loadedIdRef.current = rec.id
            setRecord(rec)
            navigate(`/letters/${rec.id}`, { replace: true })
          })
          try {
            await creatingRef.current
          } finally {
            creatingRef.current = null
          }
        }
        setStatus('saved')
      } catch (err) {
        console.error(err)
        setStatus('error')
      }
    },
    [navigate],
  )

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

  const update = (patch: Partial<LetterFields>) => {
    dirtyRef.current = true
    setFields((prev) => ({ ...prev, ...patch }))
  }

  const handleDuplicate = async () => {
    if (!record) return
    const copy = await letters.duplicate(record.id)
    navigate(`/letters/${copy.id}`)
  }

  const handleDelete = async () => {
    if (!record) return
    if (!window.confirm(`Delete letter ${record.letterNo}? This cannot be undone.`)) return
    await letters.remove(record.id)
    loadedIdRef.current = null
    recordRef.current = null
    navigate('/')
  }

  if (status === 'missing') {
    return (
      <div className="empty-state">
        <p>This letter no longer exists.</p>
        <Link className="btn" to="/">
          Back to letters
        </Link>
      </div>
    )
  }

  const letterNo = record?.letterNo ?? ''
  const content: LetterContent = {
    letterNo,
    date: fields.date,
    recipient: fields.recipient,
    subject: fields.subject,
    body: fields.body,
    closing: fields.closing,
    signatoryName: fields.signatoryName,
    signatoryTitle: fields.signatoryTitle,
  }
  const stem = fileStem(letterNo || 'draft', fields.date)
  const title = `Shri Ram Bus Service – पत्रांक ${letterNo || '—'} – ${formatDateDdMmYyyy(fields.date)}`
  const shrunk = fitScale < FIT_WARN_SCALE

  return (
    <div className={`editor view-${mobileView}`}>
      <div className="editor-toolbar no-print">
        <h2 className="editor-title">{record ? `पत्रांक ${record.letterNo}` : 'New letter'}</h2>
        <span className={`save-status status-${status}`} aria-live="polite">
          {STATUS_TEXT[status]}
        </span>
        <label className="switch">
          <input type="checkbox" checked={hindiTyping} onChange={(e) => setHindiTyping(e.target.checked)} />
          <span>Hindi typing</span>
        </label>
        <div className="mobile-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mobileView === 'form'} onClick={() => setMobileView('form')}>
            Form
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'preview'}
            onClick={() => setMobileView('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="editor-panes">
      <div className="editor-form no-print">
        <form className="letter-form" onSubmit={(e) => e.preventDefault()}>
          <div className="field-row">
            <Field id="letterNo" label="पत्रांक (auto)">
              <input id="letterNo" type="text" value={letterNo || 'assigned on first save'} readOnly />
            </Field>
            <Field id="date" label="दिनांक">
              <input id="date" type="date" value={fields.date} onChange={(e) => update({ date: e.target.value })} required />
            </Field>
          </div>

          <PageSetup page={fields.page} onChange={(page) => update({ page })} />

          <Field id="recipient" label="सेवा में (recipient)">
            <TransliterateInput
              id="recipient"
              multiline
              rows={3}
              enabled={hindiTyping}
              value={fields.recipient}
              onChange={(recipient) => update({ recipient })}
              placeholder="श्रीमान सचिव महोदय, क्षेत्रीय परिवहन प्राधिकार, पटना"
            />
          </Field>

          <Field id="subject" label="विषय (subject)">
            <TransliterateInput
              id="subject"
              enabled={hindiTyping}
              value={fields.subject}
              onChange={(subject) => update({ subject })}
              placeholder="बस समय-सारणी के संबंध में"
            />
          </Field>

          <Field id="body" label="Letter body">
            <TransliterateInput
              id="body"
              multiline
              rows={12}
              enabled={hindiTyping}
              value={fields.body}
              onChange={(body) => update({ body })}
              placeholder="महाशय, निवेदन है कि ..."
            />
          </Field>
          {shrunk && (
            <p className="warning" role="status">
              The text has been shrunk to {Math.round(fitScale * 100)}% to fit on one page. Consider shortening the
              letter or choosing a larger paper size.
            </p>
          )}

          <div className="field-row">
            <Field id="closing" label="Closing">
              <TransliterateInput
                id="closing"
                enabled={hindiTyping}
                value={fields.closing}
                onChange={(closing) => update({ closing })}
              />
            </Field>
            <Field id="signatoryName" label="Signatory">
              <TransliterateInput
                id="signatoryName"
                enabled={hindiTyping}
                value={fields.signatoryName}
                onChange={(signatoryName) => update({ signatoryName })}
              />
            </Field>
            <Field id="signatoryTitle" label="Designation">
              <TransliterateInput
                id="signatoryTitle"
                enabled={hindiTyping}
                value={fields.signatoryTitle}
                onChange={(signatoryTitle) => update({ signatoryTitle })}
              />
            </Field>
          </div>
        </form>

        <ExportBar sheetRef={sheetRef} page={fields.page} fileStem={stem} title={title} ready={record !== null} />

        {record && (
          <div className="record-actions">
            <button type="button" className="btn" onClick={handleDuplicate}>
              Duplicate as new letter
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="preview-pane">
        <SheetPreview content={content} page={fields.page} onFitChange={setFitScale} sheetRef={sheetRef} />
      </div>
      </div>
    </div>
  )
}
