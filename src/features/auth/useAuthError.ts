import { isStringKey } from '../../i18n/strings'
import { useLocale } from '../../i18n/useLocale'

/** Translates an error returned by the auth actions (an i18n key or raw text). */
export function useAuthError() {
  const { t } = useLocale()
  return (error: string | null) => (error && isStringKey(error) ? t(error) : error)
}
