import { afterEach, describe, expect, it } from 'vitest'
import { routeOAuthRedirect } from './oauthRedirect'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('routeOAuthRedirect', () => {
  it('moves Google’s ?code=…&state=… into the hash route and out of the query', () => {
    window.history.replaceState(null, '', '/?state=abc&code=4%2F0xyz&scope=email')
    expect(routeOAuthRedirect()).toBe(true)
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/oauth/google?state=abc&code=4%2F0xyz&scope=email')
  })

  it('also routes a refusal (?error=access_denied)', () => {
    window.history.replaceState(null, '', '/?error=access_denied&state=abc')
    expect(routeOAuthRedirect()).toBe(true)
    expect(window.location.hash).toBe('#/oauth/google?error=access_denied&state=abc')
  })

  it('leaves email links and ordinary pages alone', () => {
    window.history.replaceState(null, '', '/?token_hash=t&type=invite&state=x&code=y#/auth/set-password')
    expect(routeOAuthRedirect()).toBe(false)
    expect(window.location.hash).toBe('#/auth/set-password')

    window.history.replaceState(null, '', '/#/bookings')
    expect(routeOAuthRedirect()).toBe(false)
    expect(window.location.hash).toBe('#/bookings')
  })
})
