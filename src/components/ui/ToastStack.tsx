import { AlertCircle, CheckCircle2, Info, Loader2, X, type LucideIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import type { ToastItem, ToastType } from '../../toast/ToastContext'

/** Icon and colour per type; `loading` spins (unless reduced motion is on). */
const VARIANTS: Record<ToastType, { Icon: LucideIcon; className: string }> = {
  success: { Icon: CheckCircle2, className: 'text-success' },
  error: { Icon: AlertCircle, className: 'text-danger' },
  info: { Icon: Info, className: 'text-accent' },
  loading: { Icon: Loader2, className: 'text-accent animate-spin motion-reduce:animate-none' },
}

interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

/**
 * The toast stack, bottom-right (full width on phones), portalled to <body>
 * so it overlays every page. `no-print` keeps it off printouts; exports only
 * capture the sheet. Presentational: the queue lives in ToastProvider.
 */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  const { t } = useLocale()
  if (toasts.length === 0) return null

  return createPortal(
    // Above dialogs (z-50): a failure can be reported while a dialog is still open.
    <div className="no-print fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
      {toasts.map((toast) => {
        const { Icon, className } = VARIANTS[toast.type] ?? VARIANTS.success
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`flex w-full items-start gap-2 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg sm:w-auto sm:max-w-sm sm:min-w-72 ${TRANSITION.COLORS}`}
          >
            <Icon size={ICON_SIZE.SM} className={`mt-px shrink-0 ${className}`} aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm text-text-primary">
              <p>{toast.message}</p>
              {toast.detail && <p className="mt-0.5 text-xs break-words text-text-secondary">{toast.detail}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={t('toast.dismiss')}
              title={t('toast.dismiss')}
              className={`shrink-0 rounded text-text-secondary hover:text-text-primary ${A11Y.FOCUS_RING}`}
            >
              <X size={ICON_SIZE.SM} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
