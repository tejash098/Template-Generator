// Service-role side of Google Calendar, shared by google-calendar (member
// actions) and google-calendar-hook (bookings trigger): tokens, the member's
// "Shri Ram Bus Service" calendar, and creating / updating / deleting events.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  BOOKING_PROPERTY,
  CALENDAR_DESCRIPTION,
  CALENDAR_NAME,
  TIME_ZONE,
  type BookingForEvent,
  type CalendarEventBody,
} from './bookingEvent.ts'
import { CalendarError, calendarClient, type CalendarClient, type CalendarEvent } from './calendarApi.ts'
import { AppError, GoogleReauthRequired, refreshAccessToken, type GoogleConfig } from './google.ts'

export type Admin = SupabaseClient

export interface Connection {
  user_id: string
  google_sub: string
  account_email: string
  calendar_id: string | null
  status: 'connected' | 'needs_reauth'
}

/** A booking row as the functions read it (event columns + who may see it). */
export interface BookingRow extends BookingForEvent {
  organization_id: string
  created_by: string
  deleted_at: string | null
}

export interface EventRow {
  booking_id: string
  user_id: string
  organization_id: string
  google_event_id: string | null
  html_link: string | null
  content_hash: string | null
  status: 'added' | 'error'
  error: string | null
}

export function adminClient(): Admin {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new AppError('function_not_configured', 500)
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export const appUrl = () => Deno.env.get('APP_URL') || 'https://template-generator-ruby.vercel.app'

export async function getConnection(admin: Admin, userId: string): Promise<Connection | null> {
  const { data, error } = await admin.from('google_connections').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data as Connection | null) ?? null
}

/** Mirrors the bookings RLS policy: an active member, and the owner or the booking's creator. */
export async function canSeeBooking(admin: Admin, userId: string, booking: BookingRow): Promise<boolean> {
  const { data, error } = await admin
    .from('memberships')
    .select('role')
    .eq('organization_id', booking.organization_id)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return false
  return data.role === 'owner' || booking.created_by === userId
}

/**
 * Google refused our refresh token (revoked, expired, or the 7-day limit of an
 * app in Testing): forget it and show "Reconnect" to the member.
 */
export async function markNeedsReauth(admin: Admin, userId: string): Promise<void> {
  await admin.from('google_connections').update({ status: 'needs_reauth' }).eq('user_id', userId)
  await admin.rpc('calendar_token_drop', { p_user_id: userId })
}

/** A Calendar client with a fresh access token (refreshed on every call; nothing cached). */
export async function clientFor(admin: Admin, cfg: GoogleConfig, conn: Connection): Promise<CalendarClient> {
  if (conn.status !== 'connected') throw new GoogleReauthRequired()
  const { data: refresh, error } = await admin.rpc('calendar_token_get', { p_user_id: conn.user_id })
  if (error) throw error
  if (!refresh) {
    await markNeedsReauth(admin, conn.user_id)
    throw new GoogleReauthRequired()
  }
  try {
    return calendarClient(await refreshAccessToken(cfg, refresh as string))
  } catch (err) {
    if (err instanceof GoogleReauthRequired) await markNeedsReauth(admin, conn.user_id)
    throw err
  }
}

/** The member's calendar: the saved one, else one found by name, else a new one. */
async function calendarId(admin: Admin, client: CalendarClient, conn: Connection, fresh: boolean): Promise<string> {
  if (!fresh && conn.calendar_id) return conn.calendar_id
  const id =
    (fresh ? null : await client.findCalendar(CALENDAR_NAME)) ??
    (await client.createCalendar(CALENDAR_NAME, CALENDAR_DESCRIPTION, TIME_ZONE))
  await admin.from('google_connections').update({ calendar_id: id }).eq('user_id', conn.user_id)
  conn.calendar_id = id
  return id
}

/**
 * Patches the booking's event, or creates it (reusing one we made earlier for
 * the same booking, e.g. before a disconnect). If the member deleted the whole
 * calendar in Google, a new one is created once.
 */
export async function upsertEvent(
  admin: Admin,
  client: CalendarClient,
  conn: Connection,
  eventId: string | null,
  body: CalendarEventBody,
): Promise<CalendarEvent> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cid = await calendarId(admin, client, conn, attempt > 0)
    try {
      if (eventId) {
        try {
          return await client.patchEvent(cid, eventId, body)
        } catch (err) {
          if (!(err instanceof CalendarError && err.gone)) throw err
          eventId = null // deleted in Google: make a new one
        }
      }
      const existing = await client.findEvent(cid, BOOKING_PROPERTY, body.extendedProperties.private[BOOKING_PROPERTY])
      if (existing && existing.status !== 'cancelled') return await client.patchEvent(cid, existing.id, body)
      return await client.insertEvent(cid, body)
    } catch (err) {
      if (err instanceof CalendarError && err.gone && attempt === 0) continue // the calendar itself is gone
      throw err
    }
  }
  throw new CalendarError(404, 'calendar_gone')
}

/** Deletes the event from Google (already gone is fine). */
export async function deleteEvent(client: CalendarClient, conn: Connection, eventId: string | null): Promise<void> {
  if (!eventId || !conn.calendar_id) return
  await client.deleteEvent(conn.calendar_id, eventId)
}
