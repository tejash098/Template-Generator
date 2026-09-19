import { getMeta, setMeta, type AppDb, type BookingRecord } from '../storage/db'
import { onBookingsChanged } from '../storage/events'
import { allocateBookingNo } from '../storage/numbering'
import { BookingNoConflictError, type CloudApi } from './cloudApi'
import { fromRemote, toRemote } from './mapping'
import { shareFilePath } from './shareFiles'
import { syncStore } from './syncStore'

/*
 * Last-write-wins sync between the device's Dexie store and Supabase.
 *
 * One run = pull (rows changed on the server since the stored cursor, applied
 * unless the local copy is dirty AND newer) then push (every dirty row).
 * Conflicts are decided by the device clock in `updatedAt` /
 * `client_updated_at`; the server trigger `bookings_lww` drops stale pushes,
 * and the winner reaches the loser on its next pull. Runs are coalesced: a
 * request during a run schedules exactly one follow-up run.
 */

export interface SyncConfig {
  api: CloudApi
  db: AppDb
  userId: string
  organizationId: string
  deviceId: string
  isOnline?: () => boolean
  /** Overrides for tests. */
  localWriteDebounceMs?: number
  realtimeDebounceMs?: number
  periodicMs?: number
}

export type SyncReason = 'start' | 'online' | 'realtime' | 'local-write' | 'periodic' | 'manual' | 'retry'

export interface SyncEngine {
  start(): void
  stop(): void
  requestSync(reason: SyncReason): void
  /** Runs one full pull+push cycle; resolves when done (also used by tests). */
  runSync(): Promise<void>
}

const PULL_PAGE = 500
const MAX_BACKOFF_MS = 5 * 60_000

const defaultOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

export function createSyncEngine(config: SyncConfig): SyncEngine {
  const {
    api,
    db,
    localWriteDebounceMs = 1500,
    realtimeDebounceMs = 500,
    periodicMs = 5 * 60_000,
  } = config
  const isOnline = config.isOnline ?? defaultOnline
  const ctx = { organizationId: config.organizationId, userId: config.userId, deviceId: config.deviceId }

  let running: Promise<void> | null = null
  let queued = false
  let stopped = false
  let failures = 0
  const timers = new Set<number>()
  const cleanups: (() => void)[] = []

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
    return id
  }

  const refreshPending = async () => {
    const pendingCount = await db.bookings.where('dirty').equals(1).count()
    syncStore.setState({ pendingCount })
  }

  /** Before uploading never-synced rows, move the shared sequence past their numbers. */
  async function raiseCounterForLegacyRows(rows: BookingRecord[]) {
    const legacy = rows.filter((r) => !r.organizationId && r.seq !== null)
    if (legacy.length === 0) return
    const maxSeq = Math.max(...legacy.map((r) => r.seq as number))
    await api.ensureCounterAtLeast(maxSeq + 1)
  }

  async function pull() {
    let cursor = (await getMeta(db, 'syncCursor')) ?? null
    for (;;) {
      const rows = await api.pullSince(cursor, PULL_PAGE)
      if (rows.length === 0) break
      await db.transaction('rw', db.bookings, db.meta, async () => {
        for (const row of rows) {
          const existing = await db.bookings.get(row.id)
          // A dirty row with the *same* clock is this device's own pushed row
          // coming back, carrying un-pushed metadata (share paths); keep it.
          const localWins = existing && existing.dirty === 1 && existing.updatedAt >= row.client_updated_at
          if (!localWins) await db.bookings.put(fromRemote(row, existing))
          if (!cursor || row.updated_at > cursor) cursor = row.updated_at
        }
        if (cursor) await setMeta(db, 'syncCursor', cursor)
      })
      if (rows.length < PULL_PAGE) break
    }
  }

  /** Clears `dirty` only if the row was not edited again while it was in flight. */
  async function markClean(id: string, pushedUpdatedAt: number) {
    await db.transaction('rw', db.bookings, async () => {
      const current = await db.bookings.get(id)
      if (!current || current.updatedAt !== pushedUpdatedAt) return
      await db.bookings.update(id, {
        dirty: 0,
        syncedAt: Date.now(),
        organizationId: ctx.organizationId,
        createdBy: current.createdBy ?? ctx.userId,
      })
    })
  }

  /**
   * A deleted booking's hosted receipt goes with it. Both candidate files are
   * removed by their deterministic path (another device may have shared it
   * after this device last pulled), and the local paths are cleared only once
   * Storage confirms — until then they mark the cleanup as still pending.
   * `updatedAt` is left alone: the delete's clock is what LWW must carry.
   */
  async function releaseShareFiles(row: BookingRecord): Promise<BookingRecord> {
    if (!row.deletedAt) return row
    if (!row.organizationId && !row.sharePdfPath && !row.sharePngPath) return row // never reached the server
    const org = row.organizationId ?? ctx.organizationId
    await api.removeShareFiles([shareFilePath(org, row.id, 'pdf'), shareFilePath(org, row.id, 'png')])
    const cleared = { sharePdfPath: undefined, sharePngPath: undefined, shareRenderedAt: undefined }
    await db.bookings.update(row.id, cleared) // Dexie drops properties set to undefined
    return { ...row, ...cleared }
  }

  /** The number is taken in the organization: give this booking a fresh one. */
  async function renumber(id: string): Promise<BookingRecord | undefined> {
    return db.transaction('rw', db.bookings, db.meta, async () => {
      const current = await db.bookings.get(id)
      if (!current) return undefined
      const { seq, bookingNo } = await allocateBookingNo(db)
      const updated: BookingRecord = { ...current, seq, bookingNo, updatedAt: Date.now(), dirty: 1 }
      await db.bookings.put(updated)
      return updated
    })
  }

  async function push() {
    const dirty = await db.bookings.where('dirty').equals(1).toArray()
    await raiseCounterForLegacyRows(dirty)
    for (const dirtyRow of dirty) {
      const row = await releaseShareFiles(dirtyRow)
      try {
        await api.pushRow(toRemote(row, ctx))
        await markClean(row.id, row.updatedAt)
      } catch (err) {
        if (!(err instanceof BookingNoConflictError)) throw err
        const renumbered = await renumber(row.id)
        if (!renumbered) continue
        await api.pushRow(toRemote(renumbered, ctx))
        await markClean(renumbered.id, renumbered.updatedAt)
      }
    }
  }

  async function runOnce() {
    if (!isOnline()) {
      syncStore.setState({ status: 'offline' })
      await refreshPending()
      return
    }
    syncStore.setState({ status: 'syncing', error: null })
    try {
      await pull()
      await push()
      failures = 0
      syncStore.setState({ status: 'idle', lastSyncedAt: Date.now(), error: null })
    } catch (err) {
      failures += 1
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[sync] failed', err)
      syncStore.setState({ status: isOnline() ? 'error' : 'offline', error: message })
      const backoff = Math.min(MAX_BACKOFF_MS, 2000 * 2 ** Math.min(failures, 7))
      later(() => requestSync('retry'), backoff)
    } finally {
      await refreshPending()
    }
  }

  function runSync(): Promise<void> {
    if (stopped) return Promise.resolve()
    if (running) {
      queued = true
      return running
    }
    running = runOnce().finally(() => {
      running = null
      if (queued && !stopped) {
        queued = false
        void runSync()
      }
    })
    return running
  }

  let localWriteTimer: number | null = null
  let realtimeTimer: number | null = null

  function requestSync(reason: SyncReason) {
    if (stopped) return
    if (reason === 'local-write') {
      void refreshPending()
      if (localWriteTimer !== null) window.clearTimeout(localWriteTimer)
      localWriteTimer = later(() => {
        localWriteTimer = null
        void runSync()
      }, localWriteDebounceMs)
      return
    }
    if (reason === 'realtime') {
      if (realtimeTimer !== null) window.clearTimeout(realtimeTimer)
      realtimeTimer = later(() => {
        realtimeTimer = null
        void runSync()
      }, realtimeDebounceMs)
      return
    }
    void runSync()
  }

  function start() {
    stopped = false
    syncStore.setState({ status: isOnline() ? 'idle' : 'offline', error: null })
    cleanups.push(onBookingsChanged(() => requestSync('local-write')))
    cleanups.push(api.subscribe(ctx.organizationId, () => requestSync('realtime')))
    const onOnline = () => requestSync('online')
    window.addEventListener('online', onOnline)
    cleanups.push(() => window.removeEventListener('online', onOnline))
    const interval = window.setInterval(() => requestSync('periodic'), periodicMs)
    cleanups.push(() => window.clearInterval(interval))
    requestSync('start')
  }

  function stop() {
    stopped = true
    for (const c of cleanups.splice(0)) c()
    for (const id of timers) window.clearTimeout(id)
    timers.clear()
    syncStore.setState({ status: 'disabled', error: null })
  }

  return { start, stop, requestSync, runSync }
}
