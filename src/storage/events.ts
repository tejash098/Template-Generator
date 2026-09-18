/**
 * Tiny in-process event bus: the repository announces local writes so the
 * sync engine can schedule a push without the UI knowing about the cloud.
 */
type Listener = () => void

const listeners = new Set<Listener>()

export function onBookingsChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitBookingsChanged(): void {
  for (const listener of listeners) listener()
}
