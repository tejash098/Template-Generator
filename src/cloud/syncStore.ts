import { useSyncExternalStore } from 'react'

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt: number | null
  pendingCount: number
  error: string | null
}

let state: SyncState = { status: 'disabled', lastSyncedAt: null, pendingCount: 0, error: null }
const listeners = new Set<() => void>()

/** Minimal external store so the sidebar can show sync status without React context plumbing. */
export const syncStore = {
  getState: () => state,
  setState(patch: Partial<SyncState>) {
    state = { ...state, ...patch }
    for (const l of listeners) l()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(syncStore.subscribe, syncStore.getState, syncStore.getState)
}
