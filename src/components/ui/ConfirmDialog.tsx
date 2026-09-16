import { Button } from './Button'
import { Modal } from './Modal'
import { useLocale } from '../../i18n/useLocale'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Replaces window.confirm, which some embedded webviews suppress. */
export function ConfirmDialog({ open, title, message, confirmLabel, danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useLocale()
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-text-secondary">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
