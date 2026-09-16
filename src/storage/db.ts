import Dexie, { type EntityTable } from 'dexie'
import type { LetterContent } from '../document/LetterSheet'
import type { PageSpec } from '../document/pageSizes'

/**
 * Local-first store. We persist the FORM DATA of each letter, never the
 * rendered PDF/PNG — documents are regenerated on demand from these records.
 * The shape is kept flat and JSON-friendly so it can later be mirrored to
 * Supabase without translation.
 */
export interface LetterRecord extends LetterContent {
  id: string
  /** Numeric sequence behind `letterNo` (पत्रांक). */
  seq: number
  page: PageSpec
  createdAt: number
  updatedAt: number
}

export interface MetaRecord {
  key: 'nextSeq' | 'letterNoPrefix'
  value: number | string
}

export type LetterDb = Dexie & {
  letters: EntityTable<LetterRecord, 'id'>
  meta: EntityTable<MetaRecord, 'key'>
}

export function createDb(name = 'srbs-letters'): LetterDb {
  const db = new Dexie(name) as LetterDb
  db.version(1).stores({
    // Only indexed fields are listed; the rest of the record is stored as-is.
    letters: 'id, seq, date, updatedAt',
    meta: 'key',
  })
  return db
}

export const db = createDb()
