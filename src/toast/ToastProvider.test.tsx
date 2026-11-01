import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../i18n/LocaleProvider'
import { ERROR_TOAST_TTL, TOAST_TTL, type ToastContextValue } from './ToastContext'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

const wrapper = ({ children }: { children: ReactNode }) => (
  <LocaleProvider>
    <ToastProvider>{children}</ToastProvider>
  </LocaleProvider>
)

let api: ToastContextValue

beforeEach(() => {
  vi.useFakeTimers()
  api = renderHook(() => useToast(), { wrapper }).result.current
})

afterEach(() => {
  vi.useRealTimers()
})

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('ToastProvider', () => {
  it('shows a success toast as a status and dismisses it after the default time', () => {
    act(() => void api.addToast({ message: 'Booking 0042 deleted' }))
    expect(screen.getByRole('status').textContent).toBe('Booking 0042 deleted')
    advance(TOAST_TTL - 1)
    expect(screen.queryByRole('status')).not.toBeNull()
    advance(1)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows errors as alerts with a detail line, for longer', () => {
    act(() => void api.addToast({ type: 'error', message: 'Export failed', detail: 'Canvas too large' }))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Export failed')
    expect(alert.textContent).toContain('Canvas too large')
    advance(TOAST_TTL)
    expect(screen.queryByRole('alert')).not.toBeNull()
    advance(ERROR_TOAST_TTL - TOAST_TTL)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stacks separate toasts but replaces a keyed one in place, restarting its timer', () => {
    act(() => {
      api.addToast({ message: 'first' })
      api.addToast({ key: 'share-pdf', type: 'loading', message: 'Preparing link…', duration: null })
    })
    expect(screen.getAllByRole('status')).toHaveLength(2)

    advance(TOAST_TTL * 3) // the pinned loading toast stays
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toEqual(['Preparing link…'])

    act(() => void api.addToast({ key: 'share-pdf', message: 'Link copied' }))
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toEqual(['Link copied'])
    advance(TOAST_TTL)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('dismisses with the close button or dismissToast', () => {
    let id = ''
    act(() => {
      api.addToast({ message: 'one', duration: null })
      id = api.addToast({ message: 'two', duration: null })
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0])
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toEqual(['two'])
    act(() => api.dismissToast(id))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps the stack out of printouts', () => {
    act(() => void api.addToast({ message: 'printed?' }))
    expect(screen.getByRole('status').parentElement?.classList.contains('no-print')).toBe(true)
  })
})

describe('useToast', () => {
  it('fails loudly outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow('useToast must be used within ToastProvider')
  })
})

function Probe() {
  useToast()
  return null
}
