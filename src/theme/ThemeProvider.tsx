import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './ThemeContext'

export const THEME_STORAGE_KEY = 'theme'

const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Light/dark theme as the `.dark` class on <html>, the same mechanism as the
 * owner's dashboard. Explicit choice only (no prefers-color-scheme), persisted
 * per device; index.html applies it before first paint to avoid a flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Storage blocked: the choice simply does not persist.
    }
    // Keep the browser chrome (mobile address bar) in step with the page.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) {
      const pageBg = getComputedStyle(root).getPropertyValue('--color-page-bg').trim()
      if (pageBg) meta.content = pageBg
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), [])
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
