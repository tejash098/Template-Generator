import { todayIso } from '../document/format'
import { formatLetterNo } from '../document/letterNo'
import { DEFAULT_PAD_COLOR, type PadColorId } from '../document/padColors'
import { DEFAULT_PAGE } from '../document/pageSizes'
import { db as defaultDb, type AppDb, type BookingRecord } from './db'

/** The user-editable part of a booking (everything except identity/bookkeeping). */
export type BookingFields = Omit<BookingRecord, 'id' | 'seq' | 'bookingNo' | 'createdAt' | 'updatedAt'>

export function newBookingFields(init: Partial<BookingFields> = {}): BookingFields {
  const today = todayIso()
  return {
    template: 'bus-booking',
    bookingDate: today,
    name: '',
    place: '',
    from: '',
    to: '',
    travelDate: today,
    departureTime: '',
    returnTime: '',
    fare: 0,
    advance: 0,
    mobile: '',
    bus: '',
    padColor: DEFAULT_PAD_COLOR as PadColorId,
    page: DEFAULT_PAGE,
    ...init,
  }
}

function newId(): string {
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
  b.place,
  b.from,
  b.to,
  b.mobile,
  b.bus,
  b.bookingDate,
  b.travelDate,
]

/**
 * Repository for bookings. Takes an optional `db` so tests can run against an
 * isolated database.
 */
export function bookingsRepo(db: AppDb = defaultDb) {
  /** Reserve the next पत्रांक. Must run inside a transaction covering `meta`. */
  async function allocateSeq(): Promise<{ seq: number; bookingNo: string }> {
    const next = await db.meta.get('nextSeq')
    const prefix = await db.meta.get('letterNoPrefix')
    const seq = typeof next?.value === 'number' ? next.value : 1
    await db.meta.put({ key: 'nextSeq', value: seq + 1 })
    return { seq, bookingNo: formatLetterNo(seq, typeof prefix?.value === 'string' ? prefix.value : '') }
  }

  /** Create a booking and assign it the next sequential number. */
  function create(fields: BookingFields = newBookingFields()): Promise<BookingRecord> {
    return db.transaction('rw', db.bookings, db.meta, async () => {
      const { seq, bookingNo } = await allocateSeq()
      const now = Date.now()
      const record: BookingRecord = { id: newId(), seq, bookingNo, ...fields, createdAt: now, updatedAt: now }
      await db.bookings.add(record)
      return record
    })
  }

  return {
    create,

    get(id: string): Promise<BookingRecord | undefined> {
      return db.bookings.get(id)
    },

    /** Overwrite the editable fields; identity and sequence never change. */
    async update(id: string, fields: BookingFields): Promise<void> {
      const changed = await db.bookings.update(id, { ...fields, updatedAt: Date.now() })
      if (!changed) throw new Error(`Booking ${id} not found`)
    },

    /** Newest first, optionally filtered by a free-text query. */
    async list(query = ''): Promise<BookingRecord[]> {
      const all = await db.bookings.orderBy('updatedAt').reverse().toArray()
      const q = query.trim().toLowerCase()
      if (!q) return all
      return all.filter((b) => searchable(b).some((v) => v.toLowerCase().includes(q)))
    },

    /** Start a fresh booking (new number, today's booking date) with the same content. */
    async duplicate(id: string): Promise<BookingRecord> {
      const source = await db.bookings.get(id)
      if (!source) throw new Error(`Booking ${id} not found`)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, seq: _seq, bookingNo: _no, createdAt: _c, updatedAt: _u, ...fields } = source
      return create({ ...fields, bookingDate: todayIso() })
    },

    remove(id: string): Promise<void> {
      return db.bookings.delete(id)
    },
  }
}

export const bookings = bookingsRepo()
