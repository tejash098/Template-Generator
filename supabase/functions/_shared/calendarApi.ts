// A small Google Calendar API v3 client: only what the booking events need.

import { GoogleReauthRequired } from './google.ts'
import type { CalendarEventBody } from './bookingEvent.ts'

const BASE = 'https://www.googleapis.com/calendar/v3'

export class CalendarError extends Error {
  constructor(
    readonly status: number,
    readonly reason = '',
  ) {
    super(`calendar HTTP ${status} ${reason}`.trim())
  }

  /** The calendar or event no longer exists. */
  get gone(): boolean {
    return this.status === 404 || this.status === 410
  }
}

export interface CalendarEvent {
  id: string
  htmlLink?: string
  status?: string
}

export function calendarClient(accessToken: string) {
  async function request<T>(method: string, path: string, init: { query?: Record<string, string>; body?: unknown } = {}) {
    const url = new URL(BASE + path)
    for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v)
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    if (res.status === 204) return null as T
    if (res.ok) {
      const text = await res.text()
      return (text ? JSON.parse(text) : null) as T
    }
    let reason = ''
    try {
      const data = await res.json()
      reason = String(data?.error?.errors?.[0]?.reason ?? data?.error?.status ?? '')
    } catch {
      // no JSON body
    }
    if (res.status === 401) throw new GoogleReauthRequired()
    throw new CalendarError(res.status, reason)
  }

  const events = (calendarId: string) => `/calendars/${encodeURIComponent(calendarId)}/events`

  return {
    async createCalendar(summary: string, description: string, timeZone: string): Promise<string> {
      const data = await request<{ id: string }>('POST', '/calendars', { body: { summary, description, timeZone } })
      return data.id
    },

    /** A calendar with this name that we own (e.g. after a disconnect + reconnect), else null. */
    async findCalendar(summary: string): Promise<string | null> {
      try {
        const data = await request<{ items?: { id: string; summary?: string; deleted?: boolean }[] }>(
          'GET',
          '/users/me/calendarList',
          { query: { minAccessRole: 'owner' } },
        )
        return data?.items?.find((c) => c.summary === summary && !c.deleted)?.id ?? null
      } catch (err) {
        if (err instanceof CalendarError) return null
        throw err
      }
    },

    async findEvent(calendarId: string, property: string, value: string): Promise<CalendarEvent | null> {
      const data = await request<{ items?: CalendarEvent[] }>('GET', events(calendarId), {
        query: { privateExtendedProperty: `${property}=${value}`, maxResults: '1' },
      })
      return data?.items?.[0] ?? null
    },

    insertEvent(calendarId: string, body: CalendarEventBody): Promise<CalendarEvent> {
      return request<CalendarEvent>('POST', events(calendarId), { body })
    },

    patchEvent(calendarId: string, eventId: string, body: CalendarEventBody): Promise<CalendarEvent> {
      return request<CalendarEvent>('PATCH', `${events(calendarId)}/${encodeURIComponent(eventId)}`, { body })
    },

    /** Already deleted (404/410) counts as done. */
    async deleteEvent(calendarId: string, eventId: string): Promise<void> {
      try {
        await request<null>('DELETE', `${events(calendarId)}/${encodeURIComponent(eventId)}`)
      } catch (err) {
        if (!(err instanceof CalendarError && err.gone)) throw err
      }
    },
  }
}

export type CalendarClient = ReturnType<typeof calendarClient>
