import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LocaleContext } from './LocaleContext'
import { DEFAULT_LOCALE, type Locale, type StringKey } from './strings'
import { translate, type Vars } from './translate'

export const LOCALE_STORAGE_KEY = 'srbs.locale'

const readStoredLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return stored === 'hi' || stored === 'en' ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

/**
 * UI language for app labels only; the generated document is always Hindi.
 * Persisted per device. index.html applies the stored value to <html lang>
 * before React mounts; this keeps it in sync afterwards.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Storage blocked: the choice simply does not persist.
    }
  }, [locale])

  const toggle = useCallback(() => setLocale((l) => (l === 'en' ? 'hi' : 'en')), [])
  const t = useCallback((key: StringKey, vars?: Vars) => translate(locale, key, vars), [locale])

  const value = useMemo(() => ({ locale, setLocale, toggle, t }), [locale, toggle, t])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
