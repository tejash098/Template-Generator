import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AuthError, User } from '@supabase/supabase-js'
import { db, setMeta } from '../storage/db'
import { bookings } from '../storage/bookings'
import { setNumberingMode } from '../storage/numbering'
import { AuthContext, type AuthContextValue, type AuthStatus, type AuthUser, type TokenHashType } from './AuthContext'
import type { CloudApi, Membership } from './cloudApi'
import { describeDevice, getDeviceId } from './device'
import { supabase } from './supabase'
import { supabaseCloud } from './supabaseCloud'
import { createSyncEngine, type SyncEngine } from './sync'
import { syncStore } from './syncStore'

/*
 * Owns the Supabase session and everything that follows from it: membership
 * lookup, device registration, numbering mode and the sync engine. The rest
 * of the app only reads `useAuth()`; feature code never touches Supabase.
 */

const api: CloudApi | null = supabase ? supabaseCloud(supabase) : null

const toAuthUser = (user: User | null): AuthUser | null => (user ? { id: user.id, email: user.email ?? '' } : null)

/** Map Supabase auth errors to i18n keys (see strings.ts `auth.error.*`). */
function authErrorKey(error: AuthError | Error | null): string | null {
  if (!error) return null
  const code = 'code' in error ? (error as AuthError).code : undefined
  if (code === 'invalid_credentials') return 'auth.error.invalid'
  if (code === 'otp_expired' || code === 'invalid_token' || code === 'bad_jwt') return 'auth.error.expiredLink'
  if (code === 'weak_password') return 'auth.error.weakPassword'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'auth.error.rateLimit'
  return error.message || 'auth.error.generic'
}

/** Forget everything cloud-related on this device; keeps the anonymous sequence. */
async function clearCloudState(discardUnsynced: boolean) {
  await db.transaction('rw', db.bookings, db.meta, async () => {
    if (discardUnsynced) await db.bookings.clear()
    else await db.bookings.where('dirty').equals(0).delete()
    await db.meta.bulkDelete(['deviceCode', 'organizationId', 'numberBlocks', 'provisionalCounter', 'syncCursor'])
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'disabled')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [deviceCode, setDeviceCode] = useState<string | null>(null)
  const engineRef = useRef<SyncEngine | null>(null)

  const teardown = useCallback(() => {
    engineRef.current?.stop()
    engineRef.current = null
    setNumberingMode({ kind: 'local' })
    syncStore.setState({ status: 'disabled', pendingCount: 0, error: null })
    setMembership(null)
    setDeviceCode(null)
  }, [])

  /** Signed-in user → membership → device → numbering → sync. */
  const establish = useCallback(
    async (authUser: AuthUser): Promise<boolean> => {
      if (!api) return false
      const m = await api.myMembership()
      if (!m) return false
      const deviceId = getDeviceId()
      const code = await api.registerDevice(deviceId, describeDevice())
      await setMeta(db, 'deviceCode', code)
      await setMeta(db, 'organizationId', m.organizationId)
      setNumberingMode({
        kind: 'cloud',
        deviceCode: code,
        isOnline: () => navigator.onLine !== false,
        reserve: (size) => api.reserveBlock(deviceId, size),
      })
      engineRef.current?.stop()
      engineRef.current = createSyncEngine({ api, db, userId: authUser.id, organizationId: m.organizationId, deviceId })
      engineRef.current.start()
      setMembership(m)
      setDeviceCode(code)
      return true
    },
    [],
  )

  // Restore the session and follow auth events for the lifetime of the app.
  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let disposed = false
    let lastUserId: string | null = null

    const handleUser = async (next: User | null) => {
      const authUser = toAuthUser(next)
      if (authUser?.id === lastUserId && authUser) return // token refresh, nothing to do
      lastUserId = authUser?.id ?? null
      setUser(authUser)
      if (!authUser) {
        teardown()
        setStatus('anonymous')
        return
      }
      setStatus('loading')
      try {
        const ok = await establish(authUser)
        if (disposed) return
        if (ok) {
          setStatus('member')
        } else {
          // Signed in but not (or no longer) a member: drop the session.
          teardown()
          setStatus('not-member')
          await client.auth.signOut()
        }
      } catch (err) {
        console.error('[auth] could not establish membership', err)
        if (!disposed) {
          teardown()
          setStatus('not-member')
        }
      }
    }

    void client.auth.getSession().then(({ data }) => {
      if (!disposed) void handleUser(data.session?.user ?? null)
    })
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (disposed) return
      if (event === 'SIGNED_OUT') void handleUser(null)
      else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') void handleUser(session?.user ?? null)
    })

    return () => {
      disposed = true
      sub.subscription.unsubscribe()
      teardown()
    }
  }, [establish, teardown])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'auth.error.disabled'
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return authErrorKey(error)
  }, [])

  const signOut = useCallback(
    async ({ discardUnsynced = false } = {}): Promise<'ok' | 'unsynced'> => {
      if (!supabase) return 'ok'
      if (!discardUnsynced) {
        let pending = await bookings.pendingCount()
        if (pending > 0 && engineRef.current) {
          await engineRef.current.runSync()
          pending = await bookings.pendingCount()
        }
        if (pending > 0) return 'unsynced'
      }
      engineRef.current?.stop()
      engineRef.current = null
      await clearCloudState(discardUnsynced)
      await supabase.auth.signOut()
      return 'ok'
    },
    [],
  )

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return 'auth.error.disabled'
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    return authErrorKey(error)
  }, [])

  const verifyTokenHash = useCallback(async (tokenHash: string, type: TokenHashType) => {
    if (!supabase) return 'auth.error.disabled'
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    return authErrorKey(error)
  }, [])

  const setPassword = useCallback(async (password: string) => {
    if (!supabase) return 'auth.error.disabled'
    const { error } = await supabase.auth.updateUser({ password })
    return authErrorKey(error)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      membership,
      deviceCode,
      isOwner: membership?.role === 'owner',
      api,
      signIn,
      signOut,
      requestPasswordReset,
      verifyTokenHash,
      setPassword,
    }),
    [status, user, membership, deviceCode, signIn, signOut, requestPasswordReset, verifyTokenHash, setPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
