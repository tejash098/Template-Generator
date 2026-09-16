import type { LetterContent } from '../document/LetterSheet'
import { todayIso } from '../document/format'
import { formatLetterNo } from '../document/letterNo'
import { LETTER_DEFAULTS } from '../document/letterheadContent'
import { DEFAULT_PAGE, type PageSpec } from '../document/pageSizes'
import { db as defaultDb, type LetterDb, type LetterRecord } from './db'

/** The user-editable part of a letter (everything except identity/bookkeeping). */
export type LetterFields = Omit<LetterContent, 'letterNo'> & { page: PageSpec }

export function newLetterFields(): LetterFields {
  return {
    date: todayIso(),
    recipient: '',
    subject: '',
    body: '',
    closing: LETTER_DEFAULTS.closing,
    signatoryName: LETTER_DEFAULTS.signatoryName,
    signatoryTitle: LETTER_DEFAULTS.signatoryTitle,
    page: DEFAULT_PAGE,
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

/**
 * Repository for letters. Every function takes an optional `db` so tests can
 * run against an isolated database.
 */
export function lettersRepo(db: LetterDb = defaultDb) {
  /** Reserve the next पत्रांक. Must run inside a transaction covering `meta`. */
  async function allocateSeq(): Promise<{ seq: number; letterNo: string }> {
    const next = await db.meta.get('nextSeq')
    const prefix = await db.meta.get('letterNoPrefix')
    const seq = typeof next?.value === 'number' ? next.value : 1
    await db.meta.put({ key: 'nextSeq', value: seq + 1 })
    return { seq, letterNo: formatLetterNo(seq, typeof prefix?.value === 'string' ? prefix.value : '') }
  }

  /** Create a letter and assign it the next sequential number. */
  function create(fields: LetterFields = newLetterFields()): Promise<LetterRecord> {
    return db.transaction('rw', db.letters, db.meta, async () => {
      const { seq, letterNo } = await allocateSeq()
      const now = Date.now()
      const record: LetterRecord = { id: newId(), seq, letterNo, ...fields, createdAt: now, updatedAt: now }
      await db.letters.add(record)
      return record
    })
  }

  return {
    create,

    get(id: string): Promise<LetterRecord | undefined> {
      return db.letters.get(id)
    },

    /** Overwrite the editable fields; identity and sequence never change. */
    async update(id: string, fields: LetterFields): Promise<void> {
      const changed = await db.letters.update(id, { ...fields, updatedAt: Date.now() })
      if (!changed) throw new Error(`Letter ${id} not found`)
    },

    /** Newest first, optionally filtered by a free-text query. */
    async list(query = ''): Promise<LetterRecord[]> {
      const all = await db.letters.orderBy('updatedAt').reverse().toArray()
      const q = query.trim().toLowerCase()
      if (!q) return all
      return all.filter((l) =>
        [l.letterNo, l.date, l.subject, l.recipient, l.body].some((v) => v.toLowerCase().includes(q)),
      )
    },

    /** Start a fresh letter (new number, today's date) with the same content. */
    async duplicate(id: string): Promise<LetterRecord> {
      const source = await db.letters.get(id)
      if (!source) throw new Error(`Letter ${id} not found`)
      const { recipient, subject, body, closing, signatoryName, signatoryTitle, page } = source
      return create({
        date: todayIso(),
        recipient,
        subject,
        body,
        closing,
        signatoryName,
        signatoryTitle,
        page,
      })
    },

    remove(id: string): Promise<void> {
      return db.letters.delete(id)
    },
  }
}

export const letters = lettersRepo()
