import Dexie, { type EntityTable } from 'dexie'
import type { BookingContent } from '../document/BookingSheet'
import type { PageSpec } from '../document/pageSizes'
import type { SignatureMark } from '../document/signature'
import type { TemplateId } from '../templates/ids'

/**
 * Local-first store. We persist the FORM DATA of each booking, never the
 * rendered PDF/PNG — documents are regenerated on demand from these records.
 * The shape is flat and JSON-friendly; cloud/mapping.ts translates it to the
 * Supabase `bookings` row (snake_case) and back.
 */
export interface BookingRecord extends BookingContent {
  id: string
  /** Numeric sequence behind `bookingNo`; null for provisional (offline) numbers like `B/0007`. */
  seq: number | null
  template: TemplateId
  page: PageSpec
  createdAt: number
  updatedAt: number
  /** 1 = changed locally since the last successful push. Indexed for the sync engine. */
  dirty: 0 | 1
  /** Soft delete (epoch ms); lists hide these rows, sync propagates them. */
  deletedAt?: number
  syncedAt?: number
  organizationId?: string
  createdBy?: string
  sharePdfPath?: string
  sharePngPath?: string
  shareRenderedAt?: number
}

/**
 * One saved signature in the signed-in member's library (or this device's,
 * when signed out). Synced to Supabase `signatures`; bookings keep their own
 * snapshot of the mark, so deleting a signature never changes a receipt.
 */
export interface SignatureRecord {
  id: string
  /** Shown in the picker; the typed text, or "Drawn"/"Uploaded" plus a date. */
  label: string
  mark: SignatureMark
  createdAt: number
  updatedAt: number
  dirty: 0 | 1
  deletedAt?: number
  syncedAt?: number
  organizationId?: string
  createdBy?: string
}

/** A block of booking numbers reserved from the server for this device. */
export interface NumberBlock {
  start: number
  end: number
  next: number
}

/** Small settings table; each key has its own value type. */
export interface MetaValues {
  nextSeq: number
  letterNoPrefix: string
  deviceId: string
  deviceCode: string
  organizationId: string
  numberBlocks: NumberBlock[]
  provisionalCounter: number
  syncCursor: string
  signatureCursor: string
}
export type MetaKey = keyof MetaValues

export interface MetaRecord<K extends MetaKey = MetaKey> {
  key: K
  value: MetaValues[K]
}

export type AppDb = Dexie & {
  bookings: EntityTable<BookingRecord, 'id'>
  signatures: EntityTable<SignatureRecord, 'id'>
  meta: EntityTable<MetaRecord, 'key'>
}

export async function getMeta<K extends MetaKey>(db: AppDb, key: K): Promise<MetaValues[K] | undefined> {
  const row = (await db.meta.get(key)) as MetaRecord<K> | undefined
  return row?.value
}

export async function setMeta<K extends MetaKey>(db: AppDb, key: K, value: MetaValues[K]): Promise<void> {
  await db.meta.put({ key, value } as MetaRecord)
}

export function createDb(name = 'srbs-letters'): AppDb {
  const db = new Dexie(name) as AppDb
  // v1 held the provisional letter form. v2 replaced it with bookings; the
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
  // v3: sync bookkeeping. Every existing row becomes dirty so it uploads on
  // the first sign-in.
  db.version(3)
    .stores({
      bookings: 'id, seq, bookingDate, travelDate, updatedAt, dirty, deletedAt',
      meta: 'key',
    })
    .upgrade((tx) =>
      tx
        .table('bookings')
        .toCollection()
        .modify((row: Partial<BookingRecord>) => {
          row.dirty = 1
        }),
    )
  // v4: receipt template v2 — the single `place` becomes village/post/thana,
  // plus return date, second phone and the issuing staff member's name.
  db.version(4)
    .stores({
      bookings: 'id, seq, bookingDate, travelDate, updatedAt, dirty, deletedAt',
      meta: 'key',
    })
    .upgrade((tx) =>
      tx
        .table('bookings')
        .toCollection()
        .modify((row: Partial<BookingRecord> & { place?: string }) => {
          row.village = row.village ?? row.place ?? ''
          delete row.place
          row.post = row.post ?? ''
          row.thana = row.thana ?? ''
          row.returnDate = row.returnDate ?? ''
          row.mobile2 = row.mobile2 ?? ''
          row.issuedByName = row.issuedByName ?? ''
        }),
    )
  // v5: the signature library. Bookings gain an optional `signature`
  // snapshot, which needs no index and no upgrade (absent = print the name).
  db.version(5).stores({
    bookings: 'id, seq, bookingDate, travelDate, updatedAt, dirty, deletedAt',
    signatures: 'id, updatedAt, dirty, deletedAt',
    meta: 'key',
  })
  return db
}

export const db = createDb()
