import { STRINGS, type Bilingual, type Locale, type StringKey } from './strings'

export type Vars = Record<string, string | number>

/** Look up `key` in `locale`, substituting `{name}` placeholders from `vars`. */
export function translate(locale: Locale, key: StringKey, vars?: Vars): string {
  const template = STRINGS[locale][key] ?? STRINGS.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export const pick = (text: Bilingual, locale: Locale): string => text[locale]
