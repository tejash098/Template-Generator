import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarContext, type CalendarContextValue } from './CalendarContext'
import { CalendarCallError, type CalendarEvent, type CloudApi, type GoogleConnection } from './cloudApi'
import { codeChallenge, randomToken, redirectUri, safeReturnTo, savePending, takePending } from './googleOAuth'
import { useAuth } from './useAuth'

/*
 * Google Calendar state for the signed-in member: their connection and the
 * bookings they added. Everything that talks to Google happens in the
 * google-calendar Edge Function; this only calls it and mirrors the member's
 * rows (live, via Realtime — the bookings trigger edits them too). Modelled on
 * DocuDrive's CalendarProvider, without polling: the function answers once
 * Google has.
 */

interface Snapshot {
  userId: string
  connection: GoogleConnection | null
  events: Record<string, CalendarEvent>
}

/** The member's connection and events; null when they could not be read (not critical: no icons). */
async function fetchSnapshot(api: CloudApi, userId: string): Promise<Snapshot | null> {
  try {
    const connection = await api.googleConnection()
    const list = connection ? await api.listCalendarEvents() : []
    return { userId, connection, events: Object.fromEntries(list.map((e) => [e.bookingId, e])) }
  } catch (err) {
    console.warn('[calendar] could not load', err)
    return null
  }
}

/** A failed read keeps what we had for this member (or shows "not connected"). */
const applySnapshot = (next: Snapshot | null, userId: string) => (s: Snapshot | null) =>
  next ?? (s?.userId === userId ? s : { userId, connection: null, events: {} })

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { status, user, api } = useAuth()
  const userId = status === 'member' && api ? (user?.id ?? null) : null
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const reload = useCallback(async () => {
    if (!api || !userId) return
    const next = await fetchSnapshot(api, userId)
    setSnapshot(applySnapshot(next, userId))
  }, [api, userId])

  // Load on sign-in (and for another account) and follow the member's rows live.
  useEffect(() => {
    if (!api || !userId) return
    let cancelled = false
    const load = () =>
      fetchSnapshot(api, userId).then((next) => {
        if (!cancelled) setSnapshot(applySnapshot(next, userId))
      })
    void load()
    const unsubscribe = api.subscribeCalendarEvents(userId, () => void load())
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [api, userId])

  // A snapshot of a previous account is never shown (sign-out needs no reset).
  const mine = snapshot && snapshot.userId === userId ? snapshot : null

  const setEvent = useCallback(
    (bookingId: string, event: CalendarEvent | null) =>
      setSnapshot((s) => {
        if (!s || s.userId !== userId) return s
        const events = { ...s.events }
        if (event) events[bookingId] = event
        else delete events[bookingId]
        return { ...s, events }
      }),
    [userId],
  )

  const track = useCallback(async (bookingId: string, work: () => Promise<void>) => {
    setBusy((b) => ({ ...b, [bookingId]: true }))
    try {
      await work()
    } finally {
      setBusy((b) => {
        const next = { ...b }
        delete next[bookingId]
        return next
      })
    }
  }, [])

  const value = useMemo<CalendarContextValue>(() => {
    const requireApi = () => {
      if (!api || !userId) throw new CalendarCallError('not_signed_in')
      return api
    }
    return {
      available: userId !== null,
      loading: userId !== null && mine === null,
      connection: mine?.connection ?? null,
      eventFor: (bookingId) => mine?.events[bookingId],
      isBusy: (bookingId) => busy[bookingId] === true,

      connect: async (returnTo) => {
        const cloud = requireApi()
        const verifier = randomToken(32)
        const state = randomToken(16)
        const uri = redirectUri()
        const url = await cloud.calendarStart({ state, codeChallenge: await codeChallenge(verifier), redirectUri: uri })
        savePending({ state, verifier, redirectUri: uri, returnTo: safeReturnTo(returnTo) })
        window.location.assign(url)
      },

      finishConnect: async (params) => {
        const pending = takePending()
        const state = params.get('state')
        if (!pending || !state || state !== pending.state) throw new CalendarCallError('oauth_state_invalid')
        const denied = params.get('error')
        if (denied) throw new CalendarCallError(denied === 'access_denied' ? 'cancelled' : 'google_exchange_failed')
        const code = params.get('code')
        if (!code) throw new CalendarCallError('google_exchange_failed')
        await requireApi().calendarFinish({ code, codeVerifier: pending.verifier, redirectUri: pending.redirectUri })
        await reload()
        return pending.returnTo
      },

      disconnect: async () => {
        await requireApi().calendarDisconnect()
        await reload()
      },

      add: (bookingId) =>
        track(bookingId, async () => {
          try {
            setEvent(bookingId, await requireApi().calendarAdd(bookingId))
          } catch (err) {
            void reload() // e.g. the connection now needs a reconnect, or a retry marked the row
            throw err
          }
        }),

      remove: (bookingId) =>
        track(bookingId, async () => {
          await requireApi().calendarRemove(bookingId)
          setEvent(bookingId, null)
        }),

      reload,
    }
  }, [api, userId, mine, busy, reload, setEvent, track])

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}
