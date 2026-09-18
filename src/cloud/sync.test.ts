import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, getMeta, setMeta, type AppDb } from '../storage/db'
import { bookingsRepo, newBookingFields } from '../storage/bookings'
import { setNumberingMode } from '../storage/numbering'
import { createFakeCloud } from './fakeCloud'
import { createSyncEngine, type SyncEngine } from './sync'
import { syncStore } from './syncStore'

let db: AppDb
let cloud: ReturnType<typeof createFakeCloud>
let engine: SyncEngine
let counter = 0

const ctx = { userId: 'user-1', organizationId: 'org-1', deviceId: 'device-1' }

beforeEach(() => {
  db = createDb(`test-sync-${counter++}`)
  cloud = createFakeCloud()
  engine = createSyncEngine({ api: cloud, db, ...ctx, isOnline: () => true })
  setNumberingMode({ kind: 'cloud', deviceCode: 'A', isOnline: () => true, reserve: (size) => cloud.reserveBlock('device-1', size) })
})

afterEach(async () => {
  engine.stop()
  setNumberingMode({ kind: 'local' })
  await db.delete()
})

describe('sync engine', () => {
  it('pushes dirty rows, clears the flag and advances the cursor', async () => {
    const repo = bookingsRepo(db)
    const a = await repo.create({ ...newBookingFields(), name: 'A' })
    expect(a.dirty).toBe(1)

    await engine.runSync()

    const remote = cloud.rows.get(a.id)
    expect(remote?.name).toBe('A')
    expect(remote?.created_by).toBe('user-1')
    expect(remote?.organization_id).toBe('org-1')
    const local = await db.bookings.get(a.id)
    expect(local?.dirty).toBe(0)
    expect(local?.organizationId).toBe('org-1')
    // The cursor moves on pull: the next run reads the pushed row back (a no-op under LWW).
    expect(await getMeta(db, 'syncCursor')).toBeUndefined()
    await engine.runSync()
    expect(await getMeta(db, 'syncCursor')).toBe(remote?.updated_at)
    expect((await db.bookings.get(a.id))?.dirty).toBe(0)
    expect(syncStore.getState().status).toBe('idle')
    expect(syncStore.getState().pendingCount).toBe(0)
  })

  it('pulls rows written elsewhere, including soft deletes', async () => {
    cloud.serverWrite({ id: 'remote-1', booking_no: '0042', seq: 42, name: 'Remote', client_updated_at: 5 })
    await engine.runSync()
    expect((await db.bookings.get('remote-1'))?.name).toBe('Remote')

    cloud.serverWrite({ id: 'remote-1', deleted_at: '2026-01-02T00:00:00.000Z', client_updated_at: 6 })
    await engine.runSync()
    const row = await db.bookings.get('remote-1')
    expect(row?.deletedAt).toBeTruthy()
    expect(await bookingsRepo(db).list()).toEqual([])
  })

  it('lets the newer device clock win on both sides', async () => {
    const repo = bookingsRepo(db)
    const a = await repo.create({ ...newBookingFields(), name: 'local v1' })
    await engine.runSync()

    // Older remote edit must not overwrite a newer local edit...
    await db.bookings.update(a.id, { name: 'local v2', updatedAt: a.updatedAt + 1000, dirty: 1 })
    cloud.serverWrite({ id: a.id, name: 'remote old', client_updated_at: a.updatedAt + 500 })
    await engine.runSync()
    expect((await db.bookings.get(a.id))?.name).toBe('local v2')
    expect(cloud.rows.get(a.id)?.name).toBe('local v2')

    // ...but a newer remote edit replaces a dirty older local one.
    await db.bookings.update(a.id, { name: 'local v3', updatedAt: a.updatedAt + 1500, dirty: 1 })
    cloud.serverWrite({ id: a.id, name: 'remote new', client_updated_at: a.updatedAt + 9000 })
    await engine.runSync()
    expect((await db.bookings.get(a.id))?.name).toBe('remote new')
    expect((await db.bookings.get(a.id))?.dirty).toBe(0)
  })

  it('renumbers a booking whose number is already taken and moves the counter past legacy rows', async () => {
    // A legacy (pre-sign-in) booking numbered 0007 sits on this device...
    await db.bookings.add({
      ...newBookingFields(),
      id: 'legacy',
      seq: 7,
      bookingNo: '0007',
      createdAt: 1,
      updatedAt: 1,
      dirty: 1,
    })
    // ...and the server already has a 0007 from another device.
    cloud.serverWrite({ id: 'other', booking_no: '0007', seq: 7, client_updated_at: 1 })
    await setMeta(db, 'numberBlocks', [{ start: 100, end: 119, next: 100 }])

    await engine.runSync()

    const legacy = await db.bookings.get('legacy')
    expect(legacy?.bookingNo).toBe('0100')
    expect(legacy?.dirty).toBe(0)
    expect(cloud.rows.get('legacy')?.booking_no).toBe('0100')
    expect(cloud.counter()).toBeGreaterThanOrEqual(8)
  })

  it('keeps a row dirty if it was edited while being pushed', async () => {
    const repo = bookingsRepo(db)
    const a = await repo.create({ ...newBookingFields(), name: 'first' })
    const original = cloud.pushRow.bind(cloud)
    cloud.pushRow = async (row) => {
      await original(row)
      await db.bookings.update(a.id, { name: 'edited meanwhile', updatedAt: Date.now() + 10, dirty: 1 })
    }
    await engine.runSync()
    expect((await db.bookings.get(a.id))?.dirty).toBe(1)
  })

  it('reports offline without touching the server', async () => {
    let online = false
    engine = createSyncEngine({ api: cloud, db, ...ctx, isOnline: () => online })
    await bookingsRepo(db).create({ ...newBookingFields(), name: 'offline' })
    await engine.runSync()
    expect(syncStore.getState().status).toBe('offline')
    expect(syncStore.getState().pendingCount).toBe(1)
    expect(cloud.rows.size).toBe(0)
    online = true
    await engine.runSync()
    expect(cloud.rows.size).toBe(1)
  })
})
