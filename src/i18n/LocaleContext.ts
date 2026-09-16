import { createContext } from 'react'
import type { Locale, StringKey } from './strings'
import type { Vars } from './translate'

export interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggle: () => void
  t: (key: StringKey, vars?: Vars) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
