import type { SignatureMark } from '../document/signature'
import { newId } from './bookings'
import { db as defaultDb, type AppDb, type SignatureRecord } from './db'
import { emitSignaturesChanged } from './events'
import { getIssuer } from './issuer'

/**
 * Repository for the signature library. Signatures are created or deleted,
 * never edited (bookings keep snapshots, so an edit would change nothing
 * already signed). Every write marks the row `dirty` for the sync engine.
 */
export function signaturesRepo(db: AppDb = defaultDb) {
  return {
    /**
     * Newest first, never deleted rows. With `ownerId` (the signed-in member),
     * rows owned by someone else are left out; unowned rows (made signed out,
     * not yet pushed) are kept.
     */
    async list(ownerId?: string | null): Promise<SignatureRecord[]> {
      const rows = await db.signatures.orderBy('updatedAt').reverse().toArray()
      return rows.filter((s) => !s.deletedAt && (!ownerId || !s.createdBy || s.createdBy === ownerId))
    },

    /** Deleted rows are reported as missing. */
    async get(id: string): Promise<SignatureRecord | undefined> {
      const row = await db.signatures.get(id)
      return row && !row.deletedAt ? row : undefined
    },

    async create(label: string, mark: SignatureMark): Promise<SignatureRecord> {
      const now = Date.now()
      const row: SignatureRecord = { id: newId(), label, mark, createdAt: now, updatedAt: now, dirty: 1, createdBy: getIssuer().userId }
      await db.signatures.add(row)
      emitSignaturesChanged()
      return row
    },

    /** Soft delete so the deletion reaches the member's other devices. */
    async remove(id: string): Promise<void> {
      const now = Date.now()
      await db.signatures.update(id, { deletedAt: now, updatedAt: now, dirty: 1 })
      emitSignaturesChanged()
    },
  }
}

export const signatures = signaturesRepo()
