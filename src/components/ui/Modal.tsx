import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Centered dialog rendered through a portal: scrim backdrop, Esc / backdrop
 * close, focus moved in on open and restored on close.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const { t } = useLocale()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl outline-none ${TRANSITION.COLORS_SLOW}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className={`-mr-2 -mt-2 rounded-lg p-1.5 text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
          >
            <X size={ICON_SIZE.SM} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
