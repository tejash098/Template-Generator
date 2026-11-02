import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

/** How long a toast stays up (ms); errors get longer so they can be read. */
export const TOAST_TTL = 3500
export const ERROR_TOAST_TTL = 6000

export interface ToastInput {
  /** Stable id: adding again with the same key replaces that toast in place. */
  key?: string
  type?: ToastType
  message: string
  /** Optional smaller second line. */
  detail?: string
  /** Ms before auto-dismiss; null pins it until dismissed. Defaults by type. */
  duration?: number | null
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  detail?: string
}

export interface ToastContextValue {
  /** Shows (or updates) a toast; returns its id for `dismissToast`. */
  addToast: (toast: ToastInput) => string
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
