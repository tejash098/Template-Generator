import type { CloudApi, Member, Membership, RemoteBooking, RemoteBookingInsert } from './cloudApi'
import { BookingNoConflictError } from './cloudApi'

/**
 * In-memory CloudApi for tests: behaves like the server (unique booking
 * numbers per organization, LWW trigger, server-side updated_at cursor).
 */
export function createFakeCloud(options: { membership?: Membership | null; online?: () => boolean } = {}) {
  const rows = new Map<string, RemoteBooking>()
  let clock = 0
  let counter = 1
  const listeners = new Set<() => void>()
  const isOnline = options.online ?? (() => true)
  const membership: Membership | null =
    options.membership === undefined
      ? { organizationId: 'org-1', organizationName: 'Test Org', role: 'owner', displayName: 'Owner' }
      : options.membership

  const tick = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, ++clock)).toISOString()
  const requireOnline = () => {
    if (!isOnline()) throw new Error('network unavailable')
  }

  const api: CloudApi & {
    rows: Map<string, RemoteBooking>
    counter: () => number
    /** Simulate another device writing a row directly on the server. */
    serverWrite: (row: Partial<RemoteBooking> & { id: string }) => RemoteBooking
    emit: () => void
  } = {
    rows,
    counter: () => counter,
    emit: () => listeners.forEach((l) => l()),
    serverWrite(patch) {
      const existing = rows.get(patch.id)
      const row: RemoteBooking = {
        ...(existing ?? blankRow(patch.id)),
        ...patch,
        updated_at: tick(),
      }
      rows.set(row.id, row)
      return row
    },
    async myMembership() {
      requireOnline()
      return membership
    },
    async registerDevice() {
      requireOnline()
      return 'A'
    },
    async reserveBlock(_deviceId, size) {
      requireOnline()
      const start = counter
      counter += size
      return { start, end: start + size - 1 }
    },
    async ensureCounterAtLeast(next) {
      requireOnline()
      counter = Math.max(counter, next)
    },
    async pullSince(cursor, limit) {
      requireOnline()
      return [...rows.values()]
        .filter((r) => !cursor || r.updated_at > cursor)
        .sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1))
        .slice(0, limit)
    },
    async pushRow(row: RemoteBookingInsert) {
      requireOnline()
      const clash = [...rows.values()].find(
        (r) => r.id !== row.id && r.organization_id === row.organization_id && r.booking_no === row.booking_no,
      )
      if (clash) throw new BookingNoConflictError(row.id)
      const existing = rows.get(row.id)
      if (existing && row.client_updated_at < existing.client_updated_at) return // bookings_lww trigger
      rows.set(row.id, { ...(existing ?? blankRow(row.id)), ...row, updated_at: tick() } as RemoteBooking)
    },
    subscribe(_org, onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    async uploadShareFile() {
      requireOnline()
    },
    async signedUrl(path) {
      requireOnline()
      return `https://files.test/${path}?signed`
    },
    async listMembers(): Promise<Member[]> {
      return []
    },
    async revokeMember() {},
    async updateMember() {},
    async removeMember() {},
    async invite() {},
  }
  return api
}

function blankRow(id: string): RemoteBooking {
  return {
    id,
    organization_id: 'org-1',
    template: 'bus-booking',
    seq: null,
    booking_no: '',
    booking_date: '2026-01-01',
    name: '',
    village: '',
    post: '',
    thana: '',
    from_place: '',
    to_place: '',
    travel_date: null,
    departure_time: '',
    return_date: null,
    return_time: '',
    fare: 0,
    advance: 0,
    mobile: '',
    mobile2: '',
    bus: '',
    issued_by_name: '',
    pad_color: 'navy',
    page: { size: 'letter', orientation: 'portrait' },
    created_by: 'user-1',
    updated_by: 'user-1',
    device_id: null,
    client_updated_at: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    share_pdf_path: null,
    share_png_path: null,
    share_rendered_at: null,
  }
}
