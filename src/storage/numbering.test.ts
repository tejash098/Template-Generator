import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDb, getMeta, setMeta, type AppDb } from './db'
import { bookingsRepo, newBookingFields } from './bookings'
import {
  BLOCK_SIZE,
  REFILL_THRESHOLD,
  allocateBookingNo,
  prepareNumbers,
  provisionalBookingNo,
  remainingInBlocks,
  setNumberingMode,
} from './numbering'

let db: AppDb
let counter = 0

beforeEach(() => {
  db = createDb(`test-numbering-${counter++}`)
})

afterEach(async () => {
  setNumberingMode({ kind: 'local' })
  await db.delete()
})

describe('numbering — signed out', () => {
  it('uses the device sequence', async () => {
    setNumberingMode({ kind: 'local' })
    expect(await allocateBookingNo(db)).toEqual({ seq: 1, bookingNo: '0001' })
    expect(await allocateBookingNo(db)).toEqual({ seq: 2, bookingNo: '0002' })
  })
})

describe('numbering — signed in', () => {
  const reserved: number[] = []
  let next = 1
  const reserve = async (size: number) => {
    reserved.push(size)
    const start = next
    next += size
    return { start, end: start + size - 1 }
  }

  beforeEach(() => {
    reserved.length = 0
    next = 1
  })

  it('reserves a block online and draws numbers from it', async () => {
    setNumberingMode({ kind: 'cloud', deviceCode: 'B', isOnline: () => true, reserve })
    await prepareNumbers(db)
    expect(reserved).toEqual([BLOCK_SIZE])
    expect(await allocateBookingNo(db)).toEqual({ seq: 1, bookingNo: '0001' })
    expect(await allocateBookingNo(db)).toEqual({ seq: 2, bookingNo: '0002' })
    expect(remainingInBlocks((await getMeta(db, 'numberBlocks')) ?? [])).toBe(BLOCK_SIZE - 2)
  })

  it('tops up when the remaining numbers fall to the threshold', async () => {
    setNumberingMode({ kind: 'cloud', deviceCode: 'B', isOnline: () => true, reserve })
    await setMeta(db, 'numberBlocks', [{ start: 1, end: 20, next: 20 - REFILL_THRESHOLD + 1 }])
    await prepareNumbers(db)
    expect(reserved).toEqual([BLOCK_SIZE])
    const blocks = (await getMeta(db, 'numberBlocks')) ?? []
    expect(blocks).toHaveLength(2)
    expect(remainingInBlocks(blocks)).toBe(REFILL_THRESHOLD + BLOCK_SIZE)
  })

  it('falls back to provisional numbers when offline with no block left', async () => {
    setNumberingMode({ kind: 'cloud', deviceCode: 'B', isOnline: () => false, reserve })
    await prepareNumbers(db)
    expect(reserved).toEqual([])
    expect(await allocateBookingNo(db)).toEqual({ seq: null, bookingNo: 'B/0001' })
    expect(await allocateBookingNo(db)).toEqual({ seq: null, bookingNo: 'B/0002' })
    expect(provisionalBookingNo('AB', 12)).toBe('AB/0012')
  })

  it('survives a failing reservation', async () => {
    setNumberingMode({
      kind: 'cloud',
      deviceCode: 'C',
      isOnline: () => true,
      reserve: async () => {
        throw new Error('boom')
      },
    })
    await prepareNumbers(db)
    expect(await allocateBookingNo(db)).toEqual({ seq: null, bookingNo: 'C/0001' })
  })

  it('is used by the repository', async () => {
    setNumberingMode({ kind: 'cloud', deviceCode: 'B', isOnline: () => true, reserve })
    const created = await bookingsRepo(db).create(newBookingFields())
    expect(created.bookingNo).toBe('0001')
    expect(created.seq).toBe(1)
    expect(created.dirty).toBe(1)
  })
})
