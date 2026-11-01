import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastStack } from '../components/ui/ToastStack'
import { ERROR_TOAST_TTL, TOAST_TTL, ToastContext, type ToastInput, type ToastItem } from './ToastContext'

/**
 * The toast queue, ported from the owner's project-dashboard: any component
 * calls `addToast` and the stack renders at the provider root. A `key` makes
 * a toast updatable in place (a loading toast becoming "Link copied", or a
 * repeated failure not stacking); `duration: null` pins it open.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  // Auto-dismiss timers by toast id; cancellable so a re-keyed toast never
  // inherits its predecessor's countdown.
  const timers = useRef(new Map<string, number>())

  const clearTimer = useCallback((id: string) => {
    const handle = timers.current.get(id)
    if (handle === undefined) return
    window.clearTimeout(handle)
    timers.current.delete(id)
  }, [])

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    },
    [clearTimer],
  )

  const addToast = useCallback(
    ({ key, type = 'success', message, detail, duration }: ToastInput) => {
      const id = key ?? `toast-${nextId.current++}`
      const item: ToastItem = { id, type, message, detail }
      setToasts((prev) => {
        const index = prev.findIndex((t) => t.id === id)
        if (index === -1) return [...prev, item]
        // Replace in place so an updated toast keeps its slot in the stack.
        const next = [...prev]
        next[index] = item
        return next
      })
      clearTimer(id)
      const ms = duration === undefined ? (type === 'error' ? ERROR_TOAST_TTL : TOAST_TTL) : duration
      if (ms !== null) timers.current.set(id, window.setTimeout(() => dismissToast(id), ms))
      return id
    },
    [clearTimer, dismissToast],
  )

  useEffect(() => {
    const handles = timers.current
    return () => {
      handles.forEach((h) => window.clearTimeout(h))
      handles.clear()
    }
  }, [])

  const value = useMemo(() => ({ addToast, dismissToast }), [addToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}
