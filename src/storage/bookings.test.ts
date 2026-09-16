import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, type AppDb } from './db'
import { bookingsRepo, newBookingFields } from './bookings'

let db: AppDb
let repo: ReturnType<typeof bookingsRepo>
let counter = 0

beforeEach(() => {
  db = createDb(`test-bookings-${counter++}`)
  repo = bookingsRepo(db)
})

afterEach(async () => {
  await db.delete()
})

describe('bookingsRepo', () => {
  it('assigns sequential पत्रांक starting at 0001', async () => {
    const a = await repo.create()
    const b = await repo.create()
    expect(a.bookingNo).toBe('0001')
    expect(b.bookingNo).toBe('0002')
    expect(b.seq).toBe(2)
    expect(a.template).toBe('bus-booking')
    expect(a.padColor).toBe('navy')
  })

  it('never reuses a number, even after deletion', async () => {
    const a = await repo.create()
    await repo.remove(a.id)
    const b = await repo.create()
    expect(b.bookingNo).toBe('0002')
  })

  it('applies a stored prefix', async () => {
    await db.meta.put({ key: 'letterNoPrefix', value: 'SRBS/' })
    expect((await repo.create()).bookingNo).toBe('SRBS/0001')
  })

  it('updates editable fields without touching identity', async () => {
    const rec = await repo.create()
    await repo.update(rec.id, { ...newBookingFields(), name: 'प्रविन दुबे', fare: 12001 })
    const loaded = await repo.get(rec.id)
    expect(loaded?.name).toBe('प्रविन दुबे')
    expect(loaded?.fare).toBe(12001)
    expect(loaded?.bookingNo).toBe(rec.bookingNo)
    expect(loaded?.createdAt).toBe(rec.createdAt)
    expect(loaded?.updatedAt).toBeGreaterThanOrEqual(rec.updatedAt)
  })

  it('rejects updates to unknown bookings', async () => {
    await expect(repo.update('missing', newBookingFields())).rejects.toThrow()
  })

  it('lists newest first and searches across fields', async () => {
    const first = await repo.create({ ...newBookingFields(), name: 'ओमप्रकाश पाल', place: 'भगवानपुर' })
    const second = await repo.create({ ...newBookingFields(), from: 'डहला', to: 'नौहट्टा', mobile: '8709544189' })
    await repo.update(second.id, { ...newBookingFields(), from: 'डहला', to: 'नौहट्टा', mobile: '8709544189', bus: 'Star बस' })

    const all = await repo.list()
    expect(all.map((b) => b.id)).toEqual([second.id, first.id])
    expect((await repo.list('ओमप्रकाश')).map((b) => b.id)).toEqual([first.id])
    expect((await repo.list('भगवानपुर')).map((b) => b.id)).toEqual([first.id])
    expect((await repo.list('नौहट्टा')).map((b) => b.id)).toEqual([second.id])
    expect((await repo.list('8709')).map((b) => b.id)).toEqual([second.id])
    expect((await repo.list('star')).map((b) => b.id)).toEqual([second.id])
    expect((await repo.list('0001')).map((b) => b.id)).toEqual([first.id])
    expect(await repo.list('nothing')).toEqual([])
  })

  it('duplicates content into a new booking with a new number and today', async () => {
    const source = await repo.create({
      ...newBookingFields(),
      bookingDate: '2020-01-01',
      name: 'रामजी सिंह',
      fare: 5500,
      advance: 500,
      padColor: 'orange',
      page: { size: 'a4', orientation: 'landscape' },
    })
    const copy = await repo.duplicate(source.id)
    expect(copy.id).not.toBe(source.id)
    expect(copy.bookingNo).toBe('0002')
    expect(copy.bookingDate).not.toBe('2020-01-01')
    expect(copy.name).toBe('रामजी सिंह')
    expect(copy.fare).toBe(5500)
    expect(copy.advance).toBe(500)
    expect(copy.padColor).toBe('orange')
    expect(copy.page).toEqual({ size: 'a4', orientation: 'landscape' })
  })
})
