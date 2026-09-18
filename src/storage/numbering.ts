import { formatLetterNo } from '../document/letterNo'
import { getMeta, setMeta, type AppDb, type NumberBlock } from './db'

/*
 * Booking-number (पत्रांक) allocation.
 *
 * Signed out: the device's own running sequence in `meta.nextSeq` (milestone 1).
 * Signed in: numbers come from blocks the server reserved for this device
 * (`meta.numberBlocks`), so every device draws from the organization's single
 * sequence. Reserving needs the network and therefore happens *before* the
 * Dexie transaction (`prepareNumbers`); the allocation itself is transactional.
 * If no block has numbers left while offline, a provisional number
 * `<deviceCode>/0007` is issued with `seq = null` and is kept forever.
 */

export const BLOCK_SIZE = 20
/** Reserve the next block proactively when this few numbers remain. */
export const REFILL_THRESHOLD = 5
const RESERVE_TIMEOUT_MS = 5000

export type NumberingMode =
  | { kind: 'local' }
  | {
      kind: 'cloud'
      deviceCode: string
      isOnline: () => boolean
      reserve: (size: number) => Promise<{ start: number; end: number }>
    }

let mode: NumberingMode = { kind: 'local' }
let reserving: Promise<void> | null = null

export function setNumberingMode(next: NumberingMode): void {
  mode = next
}

export function getNumberingMode(): NumberingMode {
  return mode
}

export const remainingInBlocks = (blocks: NumberBlock[]): number =>
  blocks.reduce((sum, b) => sum + Math.max(0, b.end - b.next + 1), 0)

export const provisionalBookingNo = (deviceCode: string, counter: number): string =>
  `${deviceCode}/${String(counter).padStart(4, '0')}`

/**
 * Network side of allocation: top up the reserved blocks when they are low.
 * Best effort — failures and offline simply leave the blocks as they are.
 */
export async function prepareNumbers(db: AppDb): Promise<void> {
  if (mode.kind !== 'cloud' || !mode.isOnline()) return
  const blocks = (await getMeta(db, 'numberBlocks')) ?? []
  if (remainingInBlocks(blocks) > REFILL_THRESHOLD) return
  if (reserving) return reserving

  const cloud = mode
  reserving = (async () => {
    try {
      const block = await Promise.race([
        cloud.reserve(BLOCK_SIZE),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('reserve timeout')), RESERVE_TIMEOUT_MS)),
      ])
      const current = (await getMeta(db, 'numberBlocks')) ?? []
      await setMeta(db, 'numberBlocks', [...current, { start: block.start, end: block.end, next: block.start }])
    } catch (err) {
      console.warn('[numbering] could not reserve a block', err)
    } finally {
      reserving = null
    }
  })()
  return reserving
}

export interface AllocatedNumber {
  seq: number | null
  bookingNo: string
}

/** Transactional side: must run inside a `rw` transaction over `meta`. */
export async function allocateBookingNo(db: AppDb): Promise<AllocatedNumber> {
  const prefix = (await getMeta(db, 'letterNoPrefix')) ?? ''

  if (mode.kind === 'cloud') {
    const blocks = (await getMeta(db, 'numberBlocks')) ?? []
    const block = blocks.find((b) => b.next <= b.end)
    if (block) {
      const seq = block.next
      const remaining = blocks
        .map((b) => (b === block ? { ...b, next: b.next + 1 } : b))
        .filter((b) => b.next <= b.end)
      await setMeta(db, 'numberBlocks', remaining)
      return { seq, bookingNo: formatLetterNo(seq, prefix) }
    }
    const counter = ((await getMeta(db, 'provisionalCounter')) ?? 0) + 1
    await setMeta(db, 'provisionalCounter', counter)
    return { seq: null, bookingNo: provisionalBookingNo(mode.deviceCode, counter) }
  }

  const seq = (await getMeta(db, 'nextSeq')) ?? 1
  await setMeta(db, 'nextSeq', seq + 1)
  return { seq, bookingNo: formatLetterNo(seq, prefix) }
}
