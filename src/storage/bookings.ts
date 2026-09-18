import { nextDayIso, todayIso } from '../document/format'
import { DEFAULT_PAD_COLOR, type PadColorId } from '../document/padColors'
import { DEFAULT_PAGE } from '../document/pageSizes'
import { db as defaultDb, type AppDb, type BookingRecord } from './db'
import { emitBookingsChanged } from './events'
import { getIssuer } from './issuer'
import { allocateBookingNo, prepareNumbers } from './numbering'

/** The user-editable part of a booking (everything except identity/bookkeeping). */
/** Inclusive ISO date bounds on `travelDate`; an empty/missing end is open. */
export interface TravelDateRange {
  from?: string
  to?: string
}

export type BookingFields = Omit<
  BookingRecord,
  'id' | 'seq' | 'bookingNo' | 'createdAt' | 'updatedAt' | 'dirty' | 'deletedAt' | 'syncedAt' | 'organizationId' | 'createdBy'
>

export function newBookingFields(init: Partial<BookingFields> = {}): BookingFields {
  const today = todayIso()
  return {
    template: 'bus-booking',
    bookingDate: today,
    issuedByName: getIssuer().name,
    name: '',
    village: '',
    post: '',
    thana: '',
    from: '',
    to: '',
    travelDate: today,
    departureTime: '',
    returnDate: nextDayIso(today),
    returnTime: '',
    fare: 0,
    advance: 0,
    mobile: '',
    mobile2: '',
    bus: '',
    padColor: DEFAULT_PAD_COLOR as PadColorId,
    page: DEFAULT_PAGE,
    ...init,
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Non-secure contexts (plain http on a LAN) lack randomUUID.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Fields a free-text search looks at. */
const searchable = (b: BookingRecord): string[] => [
  b.bookingNo,
  b.name,
  b.village,
  b.post,
  b.thana,
  b.from,
  b.to,
  b.mobile,
  b.mobile2,
  b.bus,
  b.bookingDate,
  b.travelDate,
]

/**
 * Repository for bookings. Every write marks the row `dirty` for the sync
 * engine and announces itself through storage/events.ts. Takes an optional
 * `db` so tests can run against an isolated database.
 */
export function bookingsRepo(db: AppDb = defaultDb) {
  /** Create a booking and assign it the next number (see storage/numbering.ts). */
  async function create(fields: BookingFields = newBookingFields()): Promise<BookingRecord> {
    await prepareNumbers(db) // network, so outside the transaction
    const record = await db.transaction('rw', db.bookings, db.meta, async () => {
      const { seq, bookingNo } = await allocateBookingNo(db)
      const now = Date.now()
      const row: BookingRecord = { id: newId(), seq, bookingNo, ...fields, createdAt: now, updatedAt: now, dirty: 1 }
      await db.bookings.add(row)
      return row
    })
    emitBookingsChanged()
    return record
  }

  return {
    create,

    /** Deleted rows are reported as missing. */
    async get(id: string): Promise<BookingRecord | undefined> {
      const row = await db.bookings.get(id)
      return row && !row.deletedAt ? row : undefined
    },

    /** Overwrite the editable fields; identity and sequence never change. */
    async update(id: string, fields: BookingFields): Promise<void> {
      const changed = await db.bookings.update(id, { ...fields, updatedAt: Date.now(), dirty: 1 })
      if (!changed) throw new Error(`Booking ${id} not found`)
      emitBookingsChanged()
    },

    /**
     * Newest first, optionally filtered by a free-text query and/or a travel-date
     * range (ISO, inclusive, either end open); never deleted rows. Rows without a
     * travel date are left out while a date filter is active.
     */
    async list(query = '', range: TravelDateRange = {}): Promise<BookingRecord[]> {
      const all = (await db.bookings.orderBy('updatedAt').reverse().toArray()).filter((b) => !b.deletedAt)
      const q = query.trim().toLowerCase()
      const matched = q ? all.filter((b) => searchable(b).some((v) => v.toLowerCase().includes(q))) : all
      const { from, to } = range
      if (!from && !to) return matched
      return matched.filter((b) => b.travelDate && (!from || b.travelDate >= from) && (!to || b.travelDate <= to))
    },

    /** Start a fresh booking (new number, today's booking date) with the same content. */
    async duplicate(id: string): Promise<BookingRecord> {
      const source = await db.bookings.get(id)
      if (!source || source.deletedAt) throw new Error(`Booking ${id} not found`)
      const {
        template, name, village, post, thana, from, to, travelDate, departureTime, returnDate, returnTime,
        fare, advance, mobile, mobile2, bus, padColor, page,
      } = source
      return create({
        template, name, village, post, thana, from, to, travelDate, departureTime, returnDate, returnTime,
        fare, advance, mobile, mobile2, bus, padColor, page,
        bookingDate: todayIso(),
        issuedByName: getIssuer().name,
      })
    },

    /** Soft delete so the deletion reaches other devices. */
    async remove(id: string): Promise<void> {
      const now = Date.now()
      await db.bookings.update(id, { deletedAt: now, updatedAt: now, dirty: 1 })
      emitBookingsChanged()
    },

    /** Rows waiting to be pushed. */
    pendingCount(): Promise<number> {
      return db.bookings.where('dirty').equals(1).count()
    },
  }
}

export const bookings = bookingsRepo()
