import Dexie, { type EntityTable } from 'dexie'
import type { BookingContent } from '../document/BookingSheet'
import type { PageSpec } from '../document/pageSizes'
import type { TemplateId } from '../templates/ids'

/**
 * Local-first store. We persist the FORM DATA of each booking, never the
 * rendered PDF/PNG — documents are regenerated on demand from these records.
 * The shape is flat, JSON-friendly and indexable so it can later be mirrored
 * to Supabase without translation.
 *
 * `issuedDate` (printed as जारी दिनांक) is not stored: it is derived from
 * `createdAt` at render time so a receipt keeps its date when re-exported.
 */
export interface BookingRecord extends Omit<BookingContent, 'issuedDate'> {
  id: string
  /** Numeric sequence behind `bookingNo` (पत्रांक). */
  seq: number
  template: TemplateId
  page: PageSpec
  createdAt: number
  updatedAt: number
}

export interface MetaRecord {
  key: 'nextSeq' | 'letterNoPrefix'
  value: number | string
}

export type AppDb = Dexie & {
  bookings: EntityTable<BookingRecord, 'id'>
  meta: EntityTable<MetaRecord, 'key'>
}

export function createDb(name = 'srbs-letters'): AppDb {
  const db = new Dexie(name) as AppDb
  // v1 held the provisional letter form. v2 drops it and adds bookings; the
  // meta table (and with it the पत्रांक sequence) carries over untouched.
  db.version(1).stores({
    letters: 'id, seq, date, updatedAt',
    meta: 'key',
  })
  db.version(2).stores({
    letters: null,
    bookings: 'id, seq, bookingDate, travelDate, updatedAt',
    meta: 'key',
  })
  return db
}

export const db = createDb()
