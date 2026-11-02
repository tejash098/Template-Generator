import { useEffect } from 'react'
import { useLocale } from '../i18n/useLocale'
import { useToast } from '../toast/useToast'
import { syncStore } from './syncStore'

/**
 * Announces sync trouble without noise: one error toast when syncing starts
 * failing (retries with backoff stay quiet), one "Back in sync" when a run
 * succeeds again. Ordinary successful runs and offline spells say nothing;
 * the sidebar already shows the live status. Renders nothing.
 */
export function SyncToasts() {
  const { t } = useLocale()
  const { addToast } = useToast()

  useEffect(() => {
    let failing = syncStore.getState().status === 'error'
    const unsubscribe = syncStore.subscribe(() => {
      const { status, error } = syncStore.getState()
      if (status === 'error' && !failing) {
        failing = true
        addToast({ key: 'sync', type: 'error', message: t('toast.syncFailed'), detail: error ?? undefined })
      } else if (status === 'idle' && failing) {
        failing = false
        addToast({ key: 'sync', message: t('toast.syncRecovered') })
      } else if (status === 'disabled') {
        failing = false
      }
    })
    return () => {
      unsubscribe()
    }
  }, [addToast, t])

  return null
}
