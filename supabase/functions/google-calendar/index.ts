// google-calendar: a member's own Google Calendar connection and events.
//
// POST { action, ... }   Authorization: Bearer <member's access token>
//   start      { state, codeChallenge, redirectUri } → { url }        Google consent URL (PKCE)
//   finish     { code, codeVerifier, redirectUri }   → { accountEmail }
//   disconnect                                       → {}             revoke + forget (events stay in Google)
//   add        { bookingId }                         → { event }      create or update the booking's event
//   remove     { bookingId }                         → {}             delete it from Google
//
// Errors: { ok: false, error: <code> } with an HTTP status; codes map to
// `calendar.error.<code>` in the app. Google is called synchronously here; the
// bookings trigger keeps events in step afterwards (google-calendar-hook).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { BOOKING_EVENT_COLUMNS, bookingEventBody, contentHash } from '../_shared/bookingEvent.ts'
import { CalendarError } from '../_shared/calendarApi.ts'
import {
  AppError,
  GoogleReauthRequired,
  SCOPE_CALENDAR,
  buildAuthUrl,
  exchangeCode,
  googleConfig,
  idTokenClaims,
  revokeToken,
} from '../_shared/google.ts'
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const str = (v: unknown, max = 2048) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' })

  try {
    const admin = adminClient()
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: caller, error: callerError } = await admin.auth.getUser(token)
    if (callerError || !caller.user) return json(401, { ok: false, error: 'not_signed_in' })
    const user = { id: caller.user.id, email: caller.user.email ?? '' }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json(400, { ok: false, error: 'invalid_request' })
    }

    switch (body.action) {
      case 'start':
        return json(200, { ok: true, ...start(body, user.email) })
      case 'finish':
        return json(200, { ok: true, ...(await finish(admin, body, user.id)) })
      case 'disconnect':
        await disconnect(admin, user.id)
        return json(200, { ok: true })
      case 'add':
        return json(200, { ok: true, event: await add(admin, body, user.id) })
      case 'remove':
        await remove(admin, body, user.id)
        return json(200, { ok: true })
      default:
        return json(400, { ok: false, error: 'invalid_request' })
    }
  } catch (err) {
    if (err instanceof AppError) return json(err.status, { ok: false, error: err.code })
    if (err instanceof GoogleReauthRequired) return json(409, { ok: false, error: 'reauth' })
    if (err instanceof CalendarError) {
      console.warn('calendar error', err.message)
      return json(502, { ok: false, error: 'calendar_error' })
    }
    console.error('google-calendar failed', err)
    return json(500, { ok: false, error: 'unexpected' })
  }
})

function start(body: Record<string, unknown>, email: string) {
  const cfg = googleConfig()
  const state = str(body.state, 256)
  const codeChallenge = str(body.codeChallenge, 128)
  const redirectUri = str(body.redirectUri)
  if (!state || !codeChallenge || !redirectUri) throw new AppError('invalid_request', 400)
  if (!cfg.redirectUris.includes(redirectUri)) throw new AppError('redirect_not_allowed', 400)
  return { url: buildAuthUrl(cfg, { state, codeChallenge, redirectUri, loginHint: email || undefined }) }
}

async function finish(admin: Admin, body: Record<string, unknown>, userId: string) {
  const cfg = googleConfig()
  const code = str(body.code)
  const verifier = str(body.codeVerifier, 128)
  const redirectUri = str(body.redirectUri)
  if (!code || !verifier || !redirectUri) throw new AppError('invalid_request', 400)
  if (!cfg.redirectUris.includes(redirectUri)) throw new AppError('redirect_not_allowed', 400)

  const tokens = await exchangeCode(cfg, code, verifier, redirectUri)
  if (!tokens.scopes.has(SCOPE_CALENDAR)) throw new AppError('google_scope_missing', 400) // box unticked
  if (!tokens.idToken) throw new AppError('google_exchange_failed', 502)
  const identity = idTokenClaims(tokens.idToken, cfg.clientId)

  const existing = await getConnection(admin, userId)
  const sameAccount = existing?.google_sub === identity.sub
  if (!tokens.refreshToken) {
    // prompt=consent normally guarantees one; without it only a same-account reconnect can continue.
    const { data: kept } = await admin.rpc('calendar_token_get', { p_user_id: userId })
    if (!sameAccount || !kept) throw new AppError('google_exchange_failed', 502)
  }
  if (existing && !sameAccount) {
    // Another Google account: its calendar is a different one. Events made in the
    // old account stay there; we just stop tracking them.
    await admin.from('booking_calendar_events').delete().eq('user_id', userId)
  }
  if (tokens.refreshToken) {
    const { error } = await admin.rpc('calendar_token_put', { p_user_id: userId, p_token: tokens.refreshToken })
    if (error) throw error
  }
  const { error } = await admin.from('google_connections').upsert(
    {
      user_id: userId,
      google_sub: identity.sub,
      account_email: identity.email,
      calendar_id: sameAccount ? (existing?.calendar_id ?? null) : null,
      status: 'connected',
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
  return { accountEmail: identity.email }
}

async function disconnect(admin: Admin, userId: string) {
  const { data: refresh } = await admin.rpc('calendar_token_get', { p_user_id: userId })
  if (refresh) await revokeToken(refresh as string)
  await admin.rpc('calendar_token_drop', { p_user_id: userId })
  await admin.from('booking_calendar_events').delete().eq('user_id', userId)
  const { error } = await admin.from('google_connections').delete().eq('user_id', userId)
  if (error) throw error
}

async function loadBooking(admin: Admin, bookingId: unknown): Promise<BookingRow | null> {
  if (typeof bookingId !== 'string' || !UUID.test(bookingId)) throw new AppError('invalid_request', 400)
  const { data, error } = await admin.from('bookings').select(BOOKING_EVENT_COLUMNS).eq('id', bookingId).maybeSingle()
  if (error) throw error
  return (data as BookingRow | null) ?? null
}

async function eventRow(admin: Admin, bookingId: string, userId: string): Promise<EventRow | null> {
  const { data, error } = await admin
    .from('booking_calendar_events')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as EventRow | null) ?? null
}

async function add(admin: Admin, body: Record<string, unknown>, userId: string) {
  const cfg = googleConfig()
  const conn = await getConnection(admin, userId)
  if (!conn) throw new AppError('not_connected', 409)
  if (conn.status !== 'connected') throw new AppError('reauth', 409)

  const booking = await loadBooking(admin, body.bookingId)
  if (!booking || booking.deleted_at || !(await canSeeBooking(admin, userId, booking))) {
    throw new AppError('not_found', 404)
  }
  if (!booking.travel_date) throw new AppError('no_date', 400)

  const existing = await eventRow(admin, booking.id, userId)
  const event = bookingEventBody(booking, appUrl())
  const hash = await contentHash(event)
  try {
    const client = await clientFor(admin, cfg, conn)
    const saved = await upsertEvent(admin, client, conn, existing?.google_event_id ?? null, event)
    const row = {
      booking_id: booking.id,
      user_id: userId,
      organization_id: booking.organization_id,
      google_event_id: saved.id,
      html_link: saved.htmlLink ?? null,
      content_hash: hash,
      status: 'added',
      error: null,
    }
    const { data, error } = await admin
      .from('booking_calendar_events')
      .upsert(row, { onConflict: 'booking_id,user_id' })
      .select('*')
      .single()
    if (error) throw error
    return data
  } catch (err) {
    // A retry of an existing event that failed again keeps its row, marked.
    if (existing) {
      const code = err instanceof GoogleReauthRequired ? 'reauth' : 'calendar_error'
      await admin
        .from('booking_calendar_events')
        .update({ status: 'error', error: code })
        .eq('booking_id', booking.id)
        .eq('user_id', userId)
    }
    throw err
  }
}

async function remove(admin: Admin, body: Record<string, unknown>, userId: string) {
  if (typeof body.bookingId !== 'string' || !UUID.test(body.bookingId)) throw new AppError('invalid_request', 400)
  const row = await eventRow(admin, body.bookingId, userId)
  if (!row) return
  const conn = await getConnection(admin, userId)
  if (conn?.status === 'connected' && row.google_event_id) {
    try {
      const client = await clientFor(admin, googleConfig(), conn)
      await deleteEvent(client, conn, row.google_event_id)
    } catch (err) {
      // Can't reach the calendar any more: the event stays there, we just forget it.
      if (!(err instanceof GoogleReauthRequired)) throw err
    }
  }
  await admin.from('booking_calendar_events').delete().eq('booking_id', row.booking_id).eq('user_id', userId)
}
