import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'
import { CalendarProvider } from './CalendarProvider'
import { CalendarCallError } from './cloudApi'
import { createFakeCloud } from './fakeCloud'
import { savePending, takePending } from './googleOAuth'
import { useCalendar } from './useCalendar'

let cloud: ReturnType<typeof createFakeCloud>
let status: AuthStatus

const authValue = (): AuthContextValue => ({
  status,
  user: status === 'member' ? { id: 'user-1', email: 'owner@srbs.test' } : null,
  membership: null,
  deviceCode: null,
  isOwner: true,
  api: cloud,
  signIn: async () => null,
  signOut: async () => 'ok',
  requestPasswordReset: async () => null,
  verifyTokenHash: async () => null,
  setPassword: async () => null,
})

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={authValue()}>
      <CalendarProvider>{children}</CalendarProvider>
    </AuthContext.Provider>
  )
}

const render = () => renderHook(() => useCalendar(), { wrapper })

beforeEach(() => {
  cloud = createFakeCloud()
  status = 'member'
})

afterEach(() => {
  sessionStorage.clear()
})

describe('CalendarProvider', () => {
  it('is unavailable while signed out and reads nothing', () => {
    status = 'anonymous'
    const { result } = render()
    expect(result.current.available).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.connection).toBeNull()
  })

  it('loads a member who has not connected yet', async () => {
    const { result } = render()
    expect(result.current.available).toBe(true)
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connection).toBeNull()
  })

  it('adds and removes a booking’s event', async () => {
    cloud.calendar.connection = { status: 'connected', accountEmail: 'owner@gmail.test' }
    const { result } = render()
    await waitFor(() => expect(result.current.connection?.accountEmail).toBe('owner@gmail.test'))

    await act(() => result.current.add('b-1'))
    expect(result.current.eventFor('b-1')?.status).toBe('added')
    expect(result.current.eventFor('b-1')?.htmlLink).toContain('b-1')
    expect(result.current.isBusy('b-1')).toBe(false)

    await act(() => result.current.remove('b-1'))
    expect(result.current.eventFor('b-1')).toBeUndefined()
    expect(cloud.calendar.calls).toEqual(['add', 'remove'])
  })

  it('surfaces a failed add as CalendarCallError and clears the busy flag', async () => {
    cloud.calendar.connection = { status: 'connected', accountEmail: 'owner@gmail.test' }
    const { result } = render()
    await waitFor(() => expect(result.current.connection).not.toBeNull())
    cloud.calendar.failWith = 'reauth'
    let caught: unknown
    await act(async () => {
      await result.current.add('b-1').catch((err: unknown) => {
        caught = err
      })
    })
    expect(caught).toBeInstanceOf(CalendarCallError)
    expect((caught as CalendarCallError).code).toBe('reauth')
    expect(result.current.isBusy('b-1')).toBe(false)
    expect(result.current.eventFor('b-1')).toBeUndefined()
  })

  it('follows server-side changes live (the bookings hook marking an error)', async () => {
    cloud.calendar.connection = { status: 'connected', accountEmail: 'owner@gmail.test' }
    cloud.calendar.events.set('b-2', { bookingId: 'b-2', status: 'added', htmlLink: 'x', error: null })
    const { result } = render()
    await waitFor(() => expect(result.current.eventFor('b-2')?.status).toBe('added'))

    cloud.calendar.events.set('b-2', { bookingId: 'b-2', status: 'error', htmlLink: 'x', error: 'calendar_error' })
    act(() => cloud.emitCalendar())
    await waitFor(() => expect(result.current.eventFor('b-2')?.status).toBe('error'))
  })

  it('starts a connect: asks for the consent URL and keeps verifier + state for the callback', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.connect('/plugins'))
    expect(cloud.calendar.calls).toEqual(['start'])
    const pending = takePending()
    expect(pending?.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(pending?.returnTo).toBe('/plugins')
  })

  it('finishes a connect only for the state this browser started', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.loading).toBe(false))

    savePending({ state: 'mine', verifier: 'v', redirectUri: 'http://localhost:5173/', returnTo: '/plugins' })
    await expect(result.current.finishConnect(new URLSearchParams('code=c&state=theirs'))).rejects.toMatchObject({
      code: 'oauth_state_invalid',
    })
    expect(cloud.calendar.calls).toEqual([])

    savePending({ state: 'mine', verifier: 'v', redirectUri: 'http://localhost:5173/', returnTo: '/bookings' })
    await expect(result.current.finishConnect(new URLSearchParams('error=access_denied&state=mine'))).rejects.toMatchObject({
      code: 'cancelled',
    })

    savePending({ state: 'mine', verifier: 'v', redirectUri: 'http://localhost:5173/', returnTo: '/bookings' })
    let back = ''
    await act(async () => {
      back = await result.current.finishConnect(new URLSearchParams('code=c&state=mine'))
    })
    expect(back).toBe('/bookings')
    expect(cloud.calendar.calls).toEqual(['finish'])
    expect(result.current.connection).toEqual({ status: 'connected', accountEmail: 'owner@gmail.test' })
  })

  it('disconnects and forgets the events', async () => {
    cloud.calendar.connection = { status: 'connected', accountEmail: 'owner@gmail.test' }
    cloud.calendar.events.set('b-3', { bookingId: 'b-3', status: 'added', htmlLink: 'x', error: null })
    const { result } = render()
    await waitFor(() => expect(result.current.eventFor('b-3')).toBeDefined())
    await act(() => result.current.disconnect())
    expect(result.current.connection).toBeNull()
    expect(result.current.eventFor('b-3')).toBeUndefined()
  })

  it('shows nothing of the previous member after sign-out', async () => {
    cloud.calendar.connection = { status: 'connected', accountEmail: 'owner@gmail.test' }
    const { result, rerender } = render()
    await waitFor(() => expect(result.current.connection).not.toBeNull())
    status = 'anonymous'
    rerender()
    expect(result.current.available).toBe(false)
    expect(result.current.connection).toBeNull()
  })
})
