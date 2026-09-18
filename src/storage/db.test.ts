import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { bookingsRepo } from './bookings'
import { createDb } from './db'

/** The schema as it shipped in milestone 1, for migration tests. */
function createV1Db(name: string) {
  const db = new Dexie(name)
  db.version(1).stores({ letters: 'id, seq, date, updatedAt', meta: 'key' })
  return db
}

describe('database migrations', () => {
  it('drops the letters table, adds bookings, and keeps the number sequence', async () => {
    const name = 'test-migration'
    const v1 = createV1Db(name)
    await v1.table('letters').add({ id: 'old', seq: 4, date: '2026-09-16', updatedAt: 1, body: 'x' })
    await v1.table('meta').put({ key: 'nextSeq', value: 5 })
    v1.close()

    const v2 = createDb(name)
    await v2.open()
    const tables = v2.tables.map((t) => t.name).sort()
    expect(tables).toEqual(['bookings', 'meta'])
    expect(v2.verno).toBe(3)

    const created = await bookingsRepo(v2).create()
    expect(created.bookingNo).toBe('0005')
    await v2.delete()
  })

  it('marks every v2 booking dirty when upgrading to v3', async () => {
    const name = 'test-migration-v3'
    const v2 = new Dexie(name)
    v2.version(1).stores({ letters: 'id, seq, date, updatedAt', meta: 'key' })
    v2.version(2).stores({ letters: null, bookings: 'id, seq, bookingDate, travelDate, updatedAt', meta: 'key' })
    await v2.table('bookings').add({ id: 'b1', seq: 1, bookingNo: '0001', bookingDate: '2026-09-16', updatedAt: 1 })
    v2.close()

    const v3 = createDb(name)
    const row = await v3.bookings.get('b1')
    expect(row?.dirty).toBe(1)
    expect(row?.bookingNo).toBe('0001')
    expect(await bookingsRepo(v3).pendingCount()).toBe(1)
    await v3.delete()
  })
})
