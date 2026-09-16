import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY, ThemeProvider } from './ThemeProvider'
import { useTheme } from './useTheme'

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeProvider', () => {
  it('defaults to light, toggles the html class, and persists', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('restores the stored theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
