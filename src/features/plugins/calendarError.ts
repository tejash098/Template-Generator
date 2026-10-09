import { CalendarCallError } from '../../cloud/cloudApi'
import { isStringKey, type StringKey } from '../../i18n/strings'

/** Router state /plugins reads after a connect attempt. */
export type PluginsRouteState = { notice?: 'connected'; error?: StringKey } | null

/** The message key for a google-calendar error code (unknown codes get the generic one). */
export function calendarErrorKeyFor(code: string | null | undefined): StringKey {
  const key = `calendar.error.${code ?? 'unexpected'}`
  return isStringKey(key) ? key : 'calendar.error.unexpected'
}

export const calendarErrorKey = (err: unknown): StringKey =>
  calendarErrorKeyFor(err instanceof CalendarCallError ? err.code : 'unexpected')
