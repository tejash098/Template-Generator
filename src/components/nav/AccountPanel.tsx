import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../cloud/useAuth'
import { useSyncState, type SyncStatus } from '../../cloud/syncStore'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useNow } from '../../hooks/useNow'
import { useLocale } from '../../i18n/useLocale'
import { bookings } from '../../storage/bookings'
import { ConfirmDialog } from '../ui/ConfirmDialog'

const DOT: Record<SyncStatus, string> = {
  disabled: 'bg-text-secondary/40',
  idle: 'bg-success',
  syncing: 'bg-warning animate-pulse',
  offline: 'bg-text-secondary',
  error: 'bg-danger',
}

const initialsOf = (name: string, email: string): string => {
  const source = name.trim() || email.split('@')[0]
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase()
}

/** Sidebar footer block: sign-in link when anonymous, account + sync status when signed in. */
export function AccountPanel({ compact }: { compact: boolean }) {
  const { status, user, membership, deviceCode, signOut } = useAuth()
  const sync = useSyncState()
  const now = useNow()
  const { t } = useLocale()
  const [dialog, setDialog] = useState<'none' | 'confirm' | 'unsynced'>('none')
  const [pending, setPending] = useState(0)

  if (status === 'disabled') return null

  if (status !== 'member' || !user || !membership) {
    return (
      <Link
        to="/signin"
        title={t('nav.signIn')}
        className={`flex items-center gap-2 rounded-lg p-2 text-sm text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING} ${compact ? 'justify-center' : ''}`}
      >
        <LogIn size={ICON_SIZE.MD} aria-hidden="true" />
        {!compact && <span>{t('nav.signIn')}</span>}
      </Link>
    )
  }

  const syncLine = (() => {
    if (sync.status === 'syncing') return t('sync.syncing')
    if (sync.status === 'offline') return sync.pendingCount ? `${t('sync.offline')} · ${t('sync.pending', { count: sync.pendingCount })}` : t('sync.offline')
    if (sync.status === 'error') return t('sync.error')
    if (sync.pendingCount) return t('sync.pending', { count: sync.pendingCount })
    if (!sync.lastSyncedAt) return t('sync.idle')
    const minutes = Math.round((now - sync.lastSyncedAt) / 60_000)
    const time = minutes < 1 ? t('sync.justNow') : minutes < 60 ? t('sync.minutesAgo', { n: minutes }) : t('sync.hoursAgo', { n: Math.round(minutes / 60) })
    return t('sync.lastSynced', { time })
  })()

  const attemptSignOut = async () => {
    const result = await signOut()
    if (result === 'unsynced') {
      setPending(await bookings.pendingCount())
      setDialog('unsynced')
    } else {
      setDialog('none')
    }
  }

  const roleLabel = membership.role === 'owner' ? t('account.role.owner') : t('account.role.staff')
  const displayName = membership.displayName || user.email

  return (
    <div className={compact ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-2'}>
      <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`} title={`${displayName} · ${roleLabel}`}>
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
          {initialsOf(membership.displayName, user.email)}
          <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar-bg ${DOT[sync.status]}`} aria-hidden="true" />
        </span>
        {!compact && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text-primary">{displayName}</div>
            <div className="truncate text-xs text-text-secondary">
              {roleLabel}
              {deviceCode && ` · ${t('account.device', { code: deviceCode })}`}
            </div>
            <div className="truncate text-xs text-text-secondary" aria-live="polite">
              {syncLine}
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDialog('confirm')}
        title={t('account.signOut')}
        className={`flex items-center gap-2 rounded-lg p-2 text-sm text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING} ${compact ? 'justify-center' : ''}`}
      >
        <LogOut size={ICON_SIZE.SM} aria-hidden="true" />
        {!compact && <span>{t('account.signOut')}</span>}
      </button>

      <ConfirmDialog
        open={dialog === 'confirm'}
        title={t('account.signOutTitle')}
        message={t('account.signOutNote')}
        confirmLabel={t('account.signOut')}
        onConfirm={attemptSignOut}
        onCancel={() => setDialog('none')}
      />
      <ConfirmDialog
        open={dialog === 'unsynced'}
        title={t('account.signOutTitle')}
        message={t('account.signOutUnsynced', { count: pending })}
        confirmLabel={t('account.discardAndSignOut')}
        danger
        onConfirm={async () => {
          setDialog('none')
          await signOut({ discardUnsynced: true })
        }}
        onCancel={() => setDialog('none')}
      />
    </div>
  )
}
