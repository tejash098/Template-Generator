import { useContext } from 'react'
import { ToastContext } from './ToastContext'

/**
 * `addToast({ key?, type?, message, detail?, duration? })` and `dismissToast(id)`.
 * Use it for the result of an action (saved, deleted, failed); validation of a
 * form field stays next to that field.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
