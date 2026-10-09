// google-calendar-hook: keeps Google events in step with an edited booking.
//
// Called only by the bookings trigger `bookings_c_calendar` (pg_net), with
// POST { bookingId } and header x-hook-secret = the Vault secret
// 'calendar_hook_secret'. Deployed with verify_jwt off: the secret is the
// authentication. For every member who added the booking:
//   booking deleted / no travel date / member can no longer see it → delete event + row
//   connection needs reauth                                     → row 'error'
//   content changed (hash)                                      → patch (or re-create) the event
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { BOOKING_EVENT_COLUMNS, bookingEventBody, contentHash } from '../_shared/bookingEvent.ts'
import { type CalendarClient } from '../_shared/calendarApi.ts'
import { AppError, GoogleReauthRequired, googleConfig } from '../_shared/google.ts'
import {
  adminClient,
  appUrl,
  canSeeBooking,
  clientFor,
  deleteEvent,
  getConnection,
  upsertEvent,
  type Admin,
  type BookingRow,
  type EventRow,
} from '../_shared/sync.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let hookSecret: string | null = null

/** Constant-time comparison of two strings. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { ok: false })
  try {
    const admin = adminClient()
    if (!hookSecret) {
      const { data, error } = await admin.rpc('calendar_hook_secret')
      if (error || !data) throw new Error('hook secret unavailable')
      hookSecret = data as string
    }
    if (!sameSecret(req.headers.get('x-hook-secret') ?? '', hookSecret)) return json(401, { ok: false })

    const { bookingId } = await req.json().catch(() => ({}))
    if (typeof bookingId !== 'string') return json(400, { ok: false })
    const handled = await syncBooking(admin, bookingId)
    return json(200, { ok: true, handled })
  } catch (err) {
    console.error('google-calendar-hook failed', err instanceof Error ? err.message : err)
    return json(500, { ok: false })
  }
})

async function syncBooking(admin: Admin, bookingId: string): Promise<number> {
  const { data: rows, error } = await admin.from('booking_calendar_events').select('*').eq('booking_id', bookingId)
  if (error) throw error
  if (!rows?.length) return 0
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select(BOOKING_EVENT_COLUMNS)
    .eq('id', bookingId)
    .maybeSingle()
  if (bookingError) throw bookingError

  let cfg: ReturnType<typeof googleConfig> | null = null
  try {
    cfg = googleConfig()
  } catch (err) {
    if (!(err instanceof AppError)) throw err // not configured: rows are marked below
  }

  for (const row of rows as EventRow[]) {
    const b = booking as BookingRow | null
    const markError = (code: string) =>
      admin
        .from('booking_calendar_events')
        .update({ status: 'error', error: code })
        .eq('booking_id', row.booking_id)
        .eq('user_id', row.user_id)
    const dropRow = () =>
      admin.from('booking_calendar_events').delete().eq('booking_id', row.booking_id).eq('user_id', row.user_id)

    try {
      const conn = await getConnection(admin, row.user_id)
      if (!conn) {
        await dropRow()
        continue
      }
      const keep = !!b && !b.deleted_at && !!b.travel_date && (await canSeeBooking(admin, row.user_id, b))
      if (!keep) {
        // Deleted, undated, or the member left the team: the event goes too, so
        // customer details stop reaching a calendar that no longer should have them.
        if (cfg && conn.status === 'connected') {
          try {
            const client = await clientFor(admin, cfg, conn)
            await deleteEvent(client, conn, row.google_event_id)
          } catch (err) {
            if (!(err instanceof GoogleReauthRequired)) throw err
          }
        }
        await dropRow()
        continue
      }
      if (!cfg) {
        await markError('calendar_error')
        continue
      }
      if (conn.status !== 'connected') {
        await markError('reauth')
        continue
      }
      const event = bookingEventBody(b!, appUrl())
      const hash = await contentHash(event)
      if (row.status === 'added' && row.content_hash === hash) continue
      const client: CalendarClient = await clientFor(admin, cfg, conn)
      const saved = await upsertEvent(admin, client, conn, row.google_event_id, event)
      await admin
        .from('booking_calendar_events')
        .update({
          google_event_id: saved.id,
          html_link: saved.htmlLink ?? row.html_link,
          content_hash: hash,
          status: 'added',
          error: null,
        })
        .eq('booking_id', row.booking_id)
        .eq('user_id', row.user_id)
    } catch (err) {
      console.warn('calendar hook: event update failed', err instanceof Error ? err.message : err)
      await markError(err instanceof GoogleReauthRequired ? 'reauth' : 'calendar_error')
    }
  }
  return rows.length
}
