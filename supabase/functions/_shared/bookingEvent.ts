// A booking → the Google Calendar event that stands for it.
//
// Pure (no Deno or npm imports) so vitest can test it from the app's test run.
// The event is ALL-DAY on the travel date (owner's choice); the departure time
// leads the title. Text is Hindi, like the receipt.

/** The bookings columns the event is built from (snake_case, as in Postgres). */
export interface BookingForEvent {
  id: string
  booking_no: string
  name: string
  village: string
  post: string
  thana: string
  from_place: string
  to_place: string
  /** yyyy-mm-dd */
  travel_date: string | null
  /** HH:mm or '' */
  departure_time: string
  return_date: string | null
  return_time: string
  fare: number
  advance: number
  mobile: string
  mobile2: string
  bus: string
  issued_by_name: string
}

export const BOOKING_EVENT_COLUMNS =
  'id, organization_id, created_by, deleted_at, booking_no, name, village, post, thana, from_place, to_place, travel_date, departure_time, return_date, return_time, fare, advance, mobile, mobile2, bus, issued_by_name'

/** Private extended property on every event we create (finds it again after a reconnect). */
export const BOOKING_PROPERTY = 'srbs_booking_id'
export const CALENDAR_NAME = 'Shri Ram Bus Service'
export const CALENDAR_DESCRIPTION = 'श्री राम बस सर्विस — ऐप से जोड़ी गई बस बुकिंग (यात्रा की तिथि पर)।'
export const TIME_ZONE = 'Asia/Kolkata'
/**
 * Popup reminders, in minutes before 00:00 of the travel date:
 * 1 week before at 09:00 (7 × 1440 − 540) and 1 day before at 09:00 (1440 − 540).
 */
export const REMINDER_MINUTES = [9540, 900]

export interface CalendarEventBody {
  summary: string
  description: string
  location?: string
  start: { date: string }
  end: { date: string }
  transparency: 'transparent'
  reminders: { useDefault: false; overrides: { method: 'popup'; minutes: number }[] }
  extendedProperties: { private: Record<string, string> }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** yyyy-mm-dd → dd/mm/yyyy, as printed on the pad. */
export function ddmmyyyy(iso: string): string {
  const m = ISO_DATE.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** The day after an ISO date (calendar arithmetic, no time zone involved). */
export function nextDay(iso: string): string {
  const m = ISO_DATE.exec(iso)
  if (!m) throw new Error(`not an ISO date: ${iso}`)
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1))
  return d.toISOString().slice(0, 10)
}

const t = (s: string | null | undefined) => (s ?? '').trim()
const joined = (parts: string[], sep: string) => parts.filter(Boolean).join(sep)
const rupees = (n: number) => `${Math.round(n || 0)}/-`

export function eventSummary(b: BookingForEvent): string {
  const route = t(b.from_place) || t(b.to_place) ? `${t(b.from_place) || '…'} → ${t(b.to_place) || '…'}` : ''
  return joined([t(b.departure_time), route, t(b.name)], ' · ') || `पत्रांक ${b.booking_no}`
}

export function eventDescription(b: BookingForEvent, appUrl: string): string {
  const address = joined(
    [t(b.village) && `ग्राम ${t(b.village)}`, t(b.post) && `पोस्ट ${t(b.post)}`, t(b.thana) && `थाना ${t(b.thana)}`],
    ', ',
  )
  const departure = joined([b.travel_date ? ddmmyyyy(b.travel_date) : '', t(b.departure_time)], ' ')
  const back = joined([b.return_date ? ddmmyyyy(b.return_date) : '', t(b.return_time)], ' ')
  const phones = joined([t(b.mobile), t(b.mobile2)], ', ')
  const balance = Math.max(0, (b.fare || 0) - (b.advance || 0))
  const amounts =
    b.fare > 0 ? `किराया ${rupees(b.fare)} · बयाना ${rupees(b.advance)} · बाकी ${rupees(balance)}` : ''

  const lines = [
    `पत्रांक: ${b.booking_no}`,
    t(b.name) && `यात्री: ${t(b.name)}`,
    address && `पता: ${address}`,
    (t(b.from_place) || t(b.to_place)) && `यात्रा: ${t(b.from_place) || '…'} → ${t(b.to_place) || '…'}`,
    departure && `प्रस्थान: ${departure}`,
    back && `वापसी: ${back}`,
    t(b.bus) && `बस: ${t(b.bus)}`,
    phones && `मोबाइल: ${phones}`,
    amounts,
    t(b.issued_by_name) && `जारीकर्ता: ${t(b.issued_by_name)}`,
  ].filter(Boolean)
  lines.push('', `ऐप में खोलें: ${appUrl.replace(/\/+$/, '')}/#/bookings/${b.id}`)
  return lines.join('\n')
}

/** The full event body. The booking must have a travel date. */
export function bookingEventBody(b: BookingForEvent, appUrl: string): CalendarEventBody {
  if (!b.travel_date) throw new Error('booking has no travel date')
  const body: CalendarEventBody = {
    summary: eventSummary(b),
    description: eventDescription(b, appUrl),
    start: { date: b.travel_date },
    end: { date: nextDay(b.travel_date) },
    // A trip on the calendar should not block the member's own day.
    transparency: 'transparent',
    reminders: { useDefault: false, overrides: REMINDER_MINUTES.map((minutes) => ({ method: 'popup', minutes })) },
    extendedProperties: { private: { [BOOKING_PROPERTY]: b.id } },
  }
  if (t(b.from_place)) body.location = t(b.from_place)
  return body
}

/** JSON with object keys sorted, so equal bodies hash equally. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** SHA-256 of the body: unchanged hash = nothing to send to Google. */
export async function contentHash(body: CalendarEventBody): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(body))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
