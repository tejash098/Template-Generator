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
  listMembers(organizationId: string): Promise<Member[]>
  revokeMember(organizationId: string, userId: string): Promise<void>
  /** Owner edits another member's printed name and role (RPC `update_member`). */
  updateMember(input: { organizationId: string; userId: string; displayName: string; role: MembershipRole }): Promise<void>
  /** Owner deletes another member's membership row; their login and bookings stay. */
  removeMember(organizationId: string, userId: string): Promise<void>
  invite(input: { email: string; displayName: string; role: MembershipRole }): Promise<void>
}
