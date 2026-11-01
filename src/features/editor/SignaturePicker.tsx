import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Plus, Signature, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { A11Y, ICON_SIZE, SIGNATURE, TRANSITION } from '../../config/constants'
import type { SignatureMark as Mark } from '../../document/signature'
import { SignatureMark } from '../../document/SignatureMark'
import { useLocale } from '../../i18n/useLocale'
import { signatures } from '../../storage/signatures'

interface SignaturePickerProps {
  /** The booking's current signature snapshot. */
  value: Mark | null | undefined
  onChange: (mark: Mark | null) => void
  /** Leave the editor to create one (the editor saves first). */
  onCreate: () => void
  /** Signed-in member; their library only. */
  ownerId?: string
}

const ITEM = `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${TRANSITION.COLORS} hover:bg-accent-subtle focus-visible:bg-accent-subtle focus-visible:outline-none`

/**
 * "Add signature" dropdown: the member's saved signatures, "No signature
 * (print name)" while one is set, and "Create signature" last. Picking one
 * copies its mark onto the booking (a snapshot, not a reference).
 */
export function SignaturePicker({ value, onChange, onCreate, ownerId }: SignaturePickerProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const saved = useLiveQuery(() => signatures.list(ownerId), [ownerId]) ?? []

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (mark: Mark | null) => {
    setOpen(false)
    onChange(mark)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
      >
        <Signature size={ICON_SIZE.SM} aria-hidden="true" />
        {value ? (
          <>
            <span className="sr-only">{t('editor.signature.current')}</span>
            <span className={`h-7 max-w-40 rounded bg-white px-1.5 text-xl ${SIGNATURE.PREVIEW}`}>
              <SignatureMark mark={value} />
            </span>
          </>
        ) : (
          <span>{t('editor.signature.add')}</span>
        )}
        <ChevronDown size={ICON_SIZE.SM} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('editor.signature.menu')}
          className="absolute bottom-full left-0 z-20 mb-1 w-72 max-w-[calc(100vw-3rem)] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          <div className="max-h-64 overflow-y-auto">
            {saved.length === 0 && <p className="px-3 py-2 text-xs text-text-secondary">{t('editor.signature.empty')}</p>}
            {saved.map((s) => (
              <button key={s.id} type="button" role="menuitem" onClick={() => pick(s.mark)} className={ITEM} title={s.label}>
                <span className={`h-9 min-w-0 flex-1 rounded bg-white px-2 text-2xl ${SIGNATURE.PREVIEW}`}>
                  <SignatureMark mark={s.mark} />
                </span>
              </button>
            ))}
          </div>
          {value && (
            <button type="button" role="menuitem" onClick={() => pick(null)} className={`${ITEM} text-text-secondary`}>
              <X size={ICON_SIZE.SM} aria-hidden="true" />
              {t('editor.signature.none')}
            </button>
          )}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
            className={`${ITEM} font-medium text-accent`}
          >
            <Plus size={ICON_SIZE.SM} aria-hidden="true" />
            {t('editor.signature.create')}
          </button>
        </div>
      )}
    </div>
  )
}
