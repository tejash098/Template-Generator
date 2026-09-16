import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LOCALE_STORAGE_KEY, LocaleProvider } from './LocaleProvider'
import { useLocale } from './useLocale'

afterEach(() => {
  localStorage.clear()
  document.documentElement.lang = ''
})

describe('LocaleProvider', () => {
  it('defaults to English, toggles to Hindi, and persists', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider })
    expect(result.current.locale).toBe('en')
    expect(result.current.t('nav.bookings')).toBe('Bookings')
    expect(document.documentElement.lang).toBe('en')

    act(() => result.current.toggle())
    expect(result.current.locale).toBe('hi')
    expect(result.current.t('nav.bookings')).toBe('बुकिंग')
    expect(document.documentElement.lang).toBe('hi')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('hi')
  })

  it('restores the stored language', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'hi')
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider })
    expect(result.current.locale).toBe('hi')
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useLocale())).toThrow(/LocaleProvider/)
  })
})
