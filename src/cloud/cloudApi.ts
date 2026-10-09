import type { Database } from './database.types'

/*
 * The seam between the sync engine / UI and Supabase. `supabaseCloud.ts`
 * implements it for real; tests use an in-memory fake so nothing here needs
 * the network.
 */

export type MembershipRole = Database['public']['Enums']['membership_role']

export interface Membership {
  organizationId: string
  organizationName: string
  role: MembershipRole
  displayName: string
}

export interface Member {
  userId: string
  displayName: string
  email: string
  role: MembershipRole
  revokedAt: string | null
  createdAt: string
}

export type RemoteBooking = Database['public']['Tables']['bookings']['Row']
export type RemoteBookingInsert = Database['public']['Tables']['bookings']['Insert']

export interface NumberBlockRange {
  start: number
  end: number
}

/** The signed-in member's own Google Calendar connection (tokens never leave the server). */
export interface GoogleConnection {
  status: 'connected' | 'needs_reauth'
  accountEmail: string
}

/** One booking the member added to their Google Calendar. */
export interface CalendarEvent {
  bookingId: string
  status: 'added' | 'error'
  htmlLink: string | null
  /** Error code from the Edge Functions while `status` is 'error'. */
  error: string | null
}

/** A google-calendar call failed; `code` maps to the i18n key `calendar.error.<code>`. */
export class CalendarCallError extends Error {
  readonly code: string
  constructor(code: string) {
    super(`google calendar: ${code}`)
    this.name = 'CalendarCallError'
    this.code = code
  }
}

/** Thrown by pushRow when a booking number is already taken in the organization. */
export class BookingNoConflictError extends Error {
  readonly bookingId: string
  constructor(bookingId: string) {
    super(`booking number already used (${bookingId})`)
    this.name = 'BookingNoConflictError'
    this.bookingId = bookingId
  }
}

export interface CloudApi {
  myMembership(): Promise<Membership | null>
  registerDevice(deviceId: string, name: string): Promise<string>
  reserveBlock(deviceId: string, size: number): Promise<NumberBlockRange>
  ensureCounterAtLeast(next: number): Promise<void>
  /** Rows changed on the server after `cursor` (ISO timestamp), oldest first. */
  pullSince(cursor: string | null, limit: number): Promise<RemoteBooking[]>
  /** Upsert one row; rejects with BookingNoConflictError on a number clash. */
  pushRow(row: RemoteBookingInsert): Promise<void>
  /** Live change notifications for the organization; returns an unsubscribe. */
  subscribe(organizationId: string, onChange: () => void): () => void
  uploadShareFile(path: string, blob: Blob, contentType: string): Promise<void>
  signedUrl(path: string, expiresInSeconds: number): Promise<string>
  /** Deletes hosted share files; paths that no longer exist are not an error. */
  removeShareFiles(paths: string[]): Promise<void>
  listMembers(organizationId: string): Promise<Member[]>
  revokeMember(organizationId: string, userId: string): Promise<void>
  /** Owner edits another member's printed name and role (RPC `update_member`). */
  updateMember(input: { organizationId: string; userId: string; displayName: string; role: MembershipRole }): Promise<void>
  /** Owner deletes another member's membership row; their login and bookings stay. */
  removeMember(organizationId: string, userId: string): Promise<void>
  invite(input: { email: string; displayName: string; role: MembershipRole }): Promise<void>

  // Google Calendar (Edge Function `google-calendar`; reads go through RLS, own rows only)
  googleConnection(): Promise<GoogleConnection | null>
  listCalendarEvents(): Promise<CalendarEvent[]>
  /** Live changes to the member's calendar events; returns an unsubscribe. */
  subscribeCalendarEvents(userId: string, onChange: () => void): () => void
  /** Google's consent URL for a PKCE flow started in this browser. */
  calendarStart(input: { state: string; codeChallenge: string; redirectUri: string }): Promise<string>
  calendarFinish(input: { code: string; codeVerifier: string; redirectUri: string }): Promise<{ accountEmail: string }>
  calendarDisconnect(): Promise<void>
  calendarAdd(bookingId: string): Promise<CalendarEvent>
  calendarRemove(bookingId: string): Promise<void>
}
